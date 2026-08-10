'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, FileX } from 'lucide-react';
import { parseResume, ParsedResume } from '@/lib/resumeParser';

const SCAN_MESSAGES = [
  'Scanning document...',
  'Extracting education...',
  'Parsing work history...',
  'Identifying skills...',
  'Mapping projects...',
  'Finalising...',
];

const PROGRESS_DURATION = 4200;

interface ResumeParserProps {
  onParsed: (parsed: ParsedResume, mode: 'merge' | 'overwrite') => void;
  compact?: boolean;
  hasExistingData?: boolean;
}

export function ResumeParser({ onParsed, compact = false, hasExistingData = false }: ResumeParserProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer refs for cleanup
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgSwapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
      if (msgSwapTimeoutRef.current) clearTimeout(msgSwapTimeoutRef.current);
    };
  }, []);

  const clearTimers = () => {
    if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; }
    if (msgIntervalRef.current) { clearInterval(msgIntervalRef.current); msgIntervalRef.current = null; }
    if (msgSwapTimeoutRef.current) { clearTimeout(msgSwapTimeoutRef.current); msgSwapTimeoutRef.current = null; }
  };

  const startScan = useCallback(async (f: File, mode: 'merge' | 'overwrite' = 'merge') => {
    setFile(f);
    setIsScanning(true);
    setError(null);
    setProgress(0);
    setMsgIndex(0);
    setMsgVisible(true);
    clearTimers();

    const startTime = Date.now();

    // Progress ticker
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / PROGRESS_DURATION) * 100, 95);
      setProgress(pct);
    }, 80);

    // Message cycle – fade out → swap → fade in every 700ms
    let idx = 0;
    msgIntervalRef.current = setInterval(() => {
      setMsgVisible(false);
      msgSwapTimeoutRef.current = setTimeout(() => {
        idx = (idx + 1) % SCAN_MESSAGES.length;
        setMsgIndex(idx);
        setMsgVisible(true);
      }, 220);
    }, 700);

    const parsed = await parseResume(f);

    clearTimers();
    setProgress(100);

    // Brief pause at 100% so the bar fills visibly before hiding
    await new Promise(r => setTimeout(r, 350));
    setIsScanning(false);

    if (!parsed.isValid) {
      setError(parsed.error ?? "That file doesn't appear to be a resume. Please upload the correct document.");
      setFile(null);
      return;
    }

    if (!parsed.education.length && !parsed.projects.length && !parsed.skills.length) {
      setError("We couldn't extract any education, projects, or skills from that file. Try a different format or use manual entry.");
      setFile(null);
      return;
    }

    onParsed(parsed, mode);
  }, [onParsed]);

  const isValidFile = (f: File) =>
    f.type === 'application/pdf' ||
    f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    f.name.endsWith('.docx') ||
    f.name.endsWith('.txt');

  const pickFile = (f: File) => {
    if (!isValidFile(f)) {
      setError('Unsupported file type. Please upload a PDF, DOCX, or TXT document.');
      return;
    }
    if (hasExistingData) { setFile(f); setShowConfirm(true); return; }
    startScan(f);
  };

  const confirmOverride = (mode: 'merge' | 'overwrite') => {
    setShowConfirm(false);
    if (file) startScan(file, mode);
  };

  const clear = () => {
    clearTimers();
    setFile(null);
    setError(null);
    setShowConfirm(false);
    setIsScanning(false);
    setProgress(0);
  };

  const height = compact ? 'py-8' : 'py-12';

  // ── Confirm merge/overwrite ──────────────────────────────────────────────
  if (showConfirm && file) {
    return (
      <div className="p-5 border border-yellow-500/25 bg-yellow-500/[0.04]" style={{ borderRadius: '1px' }}>
        <div className="flex items-start gap-3">
          <AlertTriangle size={15} className="text-yellow-400/70 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              Profile data already exists
            </p>
            <p className="text-[11px] text-white/40 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
              Merge adds the resume items on top of your existing entries.
              Overwrite replaces everything with what was extracted.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => confirmOverride('merge')}
                className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-black font-medium"
                style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
                Merge
              </button>
              <button onClick={() => confirmOverride('overwrite')}
                className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/60 border border-white/10 hover:bg-white/[0.04] transition-colors"
                style={{ borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
                Overwrite
              </button>
              <button onClick={clear}
                className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white/50 transition-colors"
                style={{ fontFamily: 'var(--font-display)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Scanning state — full-tile green fill from left ──────────────────────
  if (isScanning) {
    return (
      <div className={`relative overflow-hidden border border-emerald-500/20 ${height} flex flex-col items-center justify-center gap-4`}
        style={{ borderRadius: '1px' }}>
        {/* Green fill layer sweeping left-to-right */}
        <motion.div
          className="absolute inset-0 origin-left"
          style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.10) 100%)' }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress / 100 }}
          transition={{ duration: 0.12, ease: 'linear' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-3 px-6 w-full">
          {/* CLI icon */}
          <span className="text-[11px] text-emerald-400/60 tracking-widest select-none" style={{ fontFamily: 'var(--font-mono)' }}>
            &gt;_
          </span>

          {/* Fade-cycling message */}
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: msgVisible ? 1 : 0, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.2 }}
              className="text-xs text-white/70 text-center"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {SCAN_MESSAGES[msgIndex]}
            </motion.p>
          </AnimatePresence>

          {/* Percent */}
          <span className="text-[10px] text-emerald-400/50" style={{ fontFamily: 'var(--font-mono)' }}>
            {Math.round(progress)}%
          </span>

          {/* Bottom accent bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.04]">
            <motion.div
              className="h-full"
              style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.4), var(--accent))' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.12, ease: 'linear' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative overflow-hidden border border-red-500/30 bg-red-500/[0.04] ${height} flex flex-col items-center justify-center gap-3 px-6`}
        style={{ borderRadius: '1px' }}
      >
        <FileX size={compact ? 18 : 22} className="text-red-400/60" />
        <div className="text-center">
          <p className="text-xs text-red-300/80 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            Document not recognised
          </p>
          <p className="text-[11px] text-red-400/50 max-w-[26ch] mx-auto leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            {error}
          </p>
        </div>
        <button onClick={clear}
          className="mt-1 px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] text-red-400/60 border border-red-500/20 hover:bg-red-500/[0.06] transition-colors"
          style={{ borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
          Try again
        </button>
      </motion.div>
    );
  }

  // ── Drop zone ────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`relative border border-dashed cursor-pointer transition-all duration-200 ${height} flex flex-col items-center justify-center gap-3`}
      style={{
        borderRadius: '1px',
        borderColor: isDragging ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
        backgroundColor: isDragging ? 'var(--accent-glow)' : 'rgba(255,255,255,0.015)',
      }}
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }}
      onClick={() => fileInputRef.current?.click()}
    >
      <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ''; }} />

      {/* CLI prompt icon */}
      <span className="text-[13px] text-white/20 select-none tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>
        &gt;_
      </span>

      <div className="text-center">
        <p className="text-sm text-white/35" style={{ fontFamily: 'var(--font-body)' }}>
          Drop your resume here or{' '}
          <span style={{ color: 'var(--accent)' }}>browse</span>
        </p>
        <p className="text-[11px] text-white/15 mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
          PDF · DOCX · TXT
        </p>
      </div>
    </motion.div>
  );
}
