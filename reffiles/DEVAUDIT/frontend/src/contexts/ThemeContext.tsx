'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { THEMES, DEFAULT_THEME_ID, getTheme, type Theme } from '@/lib/themes';
import { saveProfile, getProfile } from '@/lib/api';

interface ThemeContextValue {
  theme: Theme;
  themeId: string;
  setThemeId: (id: string) => void;
  isCycling: boolean;
  startCycle: () => void;
  stopCycle: () => void;
  isSaving: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'reposight_theme';
const CYCLING_KEY = 'reposight_theme_cycling';
let pulseTimeout: ReturnType<typeof setTimeout> | null = null;

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-dim', theme.accentDim);
  root.style.setProperty('--accent-glow', theme.accentGlow);
  root.style.setProperty('--accent-2', theme.accent2);
  root.style.setProperty('--accent-2-dim', theme.accent2Dim);
  root.style.setProperty('--accent-2-glow', theme.accent2Glow);
  root.style.setProperty('--blob-1', theme.blobs[0]);
  root.style.setProperty('--blob-2', theme.blobs[1]);
  root.style.setProperty('--blob-3', theme.blobs[2]);
  root.style.setProperty('--blob-4', theme.blobs[3]);
  root.style.setProperty('--blob-5', theme.blobs[4]);
  root.style.setProperty('--blob-6', theme.blobs[5]);
}

// Read synchronously so the very first paint on any page already uses the
// user's chosen theme instead of flashing the default while the profile
// request is in flight — this is what made theme choice look "inconsistent"
// when navigating between pages.
function readCachedThemeId(): string {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  try {
    const cached = window.localStorage.getItem(STORAGE_KEY);
    if (cached && THEMES.find(t => t.id === cached)) return cached;
  } catch { /* localStorage unavailable */ }
  return DEFAULT_THEME_ID;
}

function readCachedCycling(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(CYCLING_KEY) === 'true';
  } catch { /* localStorage unavailable */ }
  return false;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState(readCachedThemeId);
  const [isCycling, setIsCycling] = useState(readCachedCycling);
  const [isSaving, setIsSaving] = useState(false);
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cycleIndexRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cyclingSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track current themeId inside cycle without re-binding the interval
  const themeIdRef = useRef(themeId);
  useEffect(() => { themeIdRef.current = themeId; }, [themeId]);
  const isCyclingRef = useRef(isCycling);
  useEffect(() => { isCyclingRef.current = isCycling; }, [isCycling]);

  // Load from backend on mount — reconciles with the source of truth once it
  // arrives, and keeps localStorage (and thus every other tab/page) in sync.
  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then(res => {
        if (cancelled) return;
        const u = res.user as Record<string, unknown>;
        const profile = (u.profile as Record<string, unknown>) || {};
        const prefs = (profile.preferences as Record<string, unknown>) || {};
        const saved = prefs.theme as string | undefined;
        if (saved && THEMES.find(t => t.id === saved) && saved !== themeIdRef.current) {
          setThemeIdState(saved);
          applyTheme(getTheme(saved));
        }
        if (saved) {
          try { window.localStorage.setItem(STORAGE_KEY, saved); } catch { /* ignore */ }
        }
        const savedCycling = Boolean(prefs.themeCycling);
        if (savedCycling !== isCyclingRef.current) {
          setIsCycling(savedCycling);
          try { window.localStorage.setItem(CYCLING_KEY, String(savedCycling)); } catch { /* ignore */ }
        }
      })
      .catch(() => {/* silent – not logged in */});
    return () => { cancelled = true; };
  }, []);

  // Apply CSS vars whenever themeId changes, and cache for next navigation/load.
  useEffect(() => {
    applyTheme(getTheme(themeId));
    try { window.localStorage.setItem(STORAGE_KEY, themeId); } catch { /* ignore */ }
  }, [themeId]);

  const persistTheme = useCallback((id: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await saveProfile({ profile: { preferences: { theme: id } } });
      } catch {/* silent */} finally {
        setIsSaving(false);
      }
    }, 600);
  }, []);

  const persistCycling = useCallback((cycling: boolean) => {
    if (cyclingSaveTimerRef.current) clearTimeout(cyclingSaveTimerRef.current);
    cyclingSaveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await saveProfile({ profile: { preferences: { themeCycling: cycling } } });
      } catch {/* silent */} finally {
        setIsSaving(false);
      }
    }, 600);
  }, []);

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    persistTheme(id);
  }, [persistTheme]);

  const stopCycle = useCallback(() => {
    if (cycleRef.current) {
      clearInterval(cycleRef.current);
      cycleRef.current = null;
    }
    setIsCycling(false);
    try { window.localStorage.setItem(CYCLING_KEY, 'false'); } catch { /* ignore */ }
    // Persist whatever theme is currently displayed
    persistTheme(themeIdRef.current);
    persistCycling(false);
  }, [persistTheme, persistCycling]);

  const startCycle = useCallback(() => {
    // Idempotent: clear any existing interval first
    if (cycleRef.current) {
      clearInterval(cycleRef.current);
      cycleRef.current = null;
    }
    setIsCycling(true);
    try { window.localStorage.setItem(CYCLING_KEY, 'true'); } catch { /* ignore */ }
    persistCycling(true);
    cycleIndexRef.current = THEMES.findIndex(t => t.id === themeIdRef.current);
    cycleRef.current = setInterval(() => {
      cycleIndexRef.current = (cycleIndexRef.current + 1) % THEMES.length;
      const next = THEMES[cycleIndexRef.current];
      setThemeIdState(next.id);
      applyTheme(next);
    }, 6500);
  }, [persistCycling]);

  // Resume cycling if it was left on (e.g. after refresh or navigating back)
  useEffect(() => {
    if (isCycling && !cycleRef.current) {
      cycleIndexRef.current = THEMES.findIndex(t => t.id === themeIdRef.current);
      cycleRef.current = setInterval(() => {
        cycleIndexRef.current = (cycleIndexRef.current + 1) % THEMES.length;
        const next = THEMES[cycleIndexRef.current];
        setThemeIdState(next.id);
        applyTheme(next);
      }, 6500);
    }
  }, [isCycling]);

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (cyclingSaveTimerRef.current) clearTimeout(cyclingSaveTimerRef.current);
    };
  }, []);

  const theme = getTheme(themeId);

  return (
    <ThemeContext.Provider value={{ theme, themeId, setThemeId, isCycling, startCycle, stopCycle, isSaving }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
