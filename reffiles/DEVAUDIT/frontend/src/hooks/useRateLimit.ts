'use client';

import { useState, useCallback, useEffect } from 'react';
import { getScanRateLimit } from '@/lib/api';

const SCAN_WINDOW_MS = 48 * 60 * 60 * 1000;

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function useRateLimit() {
  const [scansUsed, setScansUsed] = useState(0);
  const [scansAllowed, setScansAllowed] = useState(3);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canScan, setCanScan] = useState(true);
  const [resetAt, setResetAt] = useState<Date | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState('');
  const [windowProgress, setWindowProgress] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const data = await getScanRateLimit();
      setScansUsed(data.scansUsed);
      setScansAllowed(data.scansAllowed === Infinity || data.scansAllowed === null ? -1 : data.scansAllowed);
      setIsAdmin(data.scansAllowed === Infinity || data.scansAllowed === null);
      setCanScan(data.canScan);
      if (data.resetAt) {
        const newResetAt = new Date(data.resetAt);
        setResetAt((prev) => {
          if (!prev) return newResetAt;
          // If the new reset is earlier, adopt it (a scan was used / window shifted).
          // If the current reset is already in the past, adopt the new one.
          if (newResetAt <= prev || Date.now() >= prev.getTime()) return newResetAt;
          // Otherwise ignore later server-side values to avoid jumpy resets.
          return prev;
        });
      }
    } catch {
      // Not authenticated yet or network issue — leave defaults
    }
  }, []);

  // Refresh on mount and every 60s
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Countdown timer + rolling window progress (second-precise, smooth animation)
  useEffect(() => {
    if (!resetAt) {
      setTimeUntilReset('');
      setWindowProgress(0);
      return;
    }
    const tick = () => {
      const diff = resetAt.getTime() - Date.now();
      if (diff <= 0) {
        setTimeUntilReset('');
        setWindowProgress(100);
        refresh();
        return;
      }
      setTimeUntilReset(formatCountdown(diff));
      const elapsed = SCAN_WINDOW_MS - diff;
      setWindowProgress(Math.min(100, Math.max(0, (elapsed / SCAN_WINDOW_MS) * 100)));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [resetAt, refresh]);

  // No-op kept for API compat — backend now tracks this
  const recordScan = useCallback(() => {
    refresh();
  }, [refresh]);

  return { scansUsed, scansAllowed, canScan, isAdmin, resetAt, timeUntilReset, windowProgress, recordScan };
}
