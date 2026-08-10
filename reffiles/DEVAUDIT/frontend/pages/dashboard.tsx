'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import {
  Settings, LogOut, Play, CheckCircle2, Clock, AlertCircle,
  Star, GitFork, Shield, Zap, Brain, Layout,
  TrendingUp, TrendingDown, Minus, Code2, Lock,
  AlertTriangle, Info, ChevronDown, FileCode, TestTube,
  BarChart3, Layers, GitPullRequest, BookOpen, ShieldAlert,
  ChevronRight, XCircle, CheckSquare, Flame, Cpu,
  Terminal, GitBranch, Box, Workflow, Hexagon, Upload, Link as LinkIcon, Github,
} from 'lucide-react';
import { useScan, mergeScannerResults } from '@/hooks/useScan';
import { useAuth } from '@/hooks/useAuth';
import { useRateLimit } from '@/hooks/useRateLimit';
import { Footer } from '@/components/Landing/Footer';
import { showNotice } from '@/components/ui/NexusNotice';
import { Repository, SeverityLevel, CodeSmell, LastScan } from '@/types';
import { getRepositories, getLatestAnalysis } from '@/lib/api';
import { SegmentBar } from '@/components/ui/SegmentBar';
import GlitchyText from '@/components/ui/GlitchyText';
import Link from 'next/link';

const BRAILLE_SPINNER = [
  String.fromCharCode(0x2807), String.fromCharCode(0x280F),
  String.fromCharCode(0x2817), String.fromCharCode(0x2837),
  String.fromCharCode(0x2836), String.fromCharCode(0x2826),
  String.fromCharCode(0x2806), String.fromCharCode(0x2802),
];

function CliSpinner() {
  const [frame, setFrame] = useState(0);
  const ref = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    ref.current = setInterval(() => {
      setFrame(f => (f + 1) % BRAILLE_SPINNER.length);
    }, 65);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);

  return (
    <motion.span
      key={frame}
      initial={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.05 }}
    >
      {BRAILLE_SPINNER[frame]}
    </motion.span>
  );
}

const TABS = ['Overview', 'Security', 'Code Quality', 'Architecture', 'Skills', 'Hotspots'] as const;
type Tab = typeof TABS[number];

const langColors: Record<string, string> = {
  Python: '#fbbf24', TypeScript: '#10b981', JavaScript: '#f59e0b',
  Go: '#00add8', Rust: '#f97316', Ruby: '#dc2626',
};

const severityConfig: Record<SeverityLevel, { color: string; bg: string; border: string; icon: React.ElementType; label: string }> = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.18)', icon: AlertCircle, label: 'Critical' },
  high:     { color: '#fb923c', bg: 'rgba(251,146,60,0.07)', border: 'rgba(251,146,60,0.18)', icon: AlertTriangle, label: 'High' },
  medium:   { color: '#facc15', bg: 'rgba(250,204,21,0.07)', border: 'rgba(250,204,21,0.18)', icon: AlertTriangle, label: 'Medium' },
  low:      { color: '#4ade80', bg: 'rgba(74,222,128,0.07)', border: 'rgba(74,222,128,0.18)', icon: Info, label: 'Low' },
  info:     { color: '#60a5fa', bg: 'rgba(96,165,250,0.07)', border: 'rgba(96,165,250,0.18)', icon: Info, label: 'Info' },
};

const verdictConfig = {
  overestimated: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', icon: TrendingDown },
  underestimated:{ color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', icon: TrendingUp },
  accurate:       { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', icon: Minus },
};

const trendIcon = (v: number) =>
  v > 0 ? <TrendingUp size={12} className="text-emerald-400" /> :
  v < 0 ? <TrendingDown size={12} className="text-red-400" /> :
  <Minus size={12} className="text-white/30" />;

function AnimatedScoreDisplay({ label, value, delay = 0 }: { label: string; value: number; delay?: number }) {
  const ref = useRef(null);
  const [displayVal, setDisplayVal] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const steps = 40;
      const stepMs = 28;
      let s = 0;
      const iv = setInterval(() => {
        s++;
        const t = s / steps;
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplayVal(Math.round(value * eased));
        if (s >= steps) { setDisplayVal(value); clearInterval(iv); }
      }, stepMs);
      return () => clearInterval(iv);
    }, delay * 1000);
    return () => clearTimeout(t);
  }, [value, delay]);

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline gap-3">
        <motion.span
          className="text-4xl text-white"
          style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay, duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
        >
          {displayVal}
        </motion.span>
        <span className="text-xs text-white/30 uppercase tracking-[0.2em]" style={{ fontFamily: 'var(--font-mono)' }}>/100</span>
      </div>
      <SegmentBar value={value} segments={20} segmentHeight={7} showValue={false} delay={delay} />
      <div className="text-[11px] uppercase tracking-[0.2em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>
        {label}
      </div>
    </div>
  );
}

function RepoCard({
  repo, isSelected, onSelect, onScan,
}: {
  repo: Repository; isSelected: boolean; onSelect: () => void; onScan: () => void;
}) {
  return (
    <motion.div
      layout
      onClick={onSelect}
      className="p-5 border cursor-pointer transition-all duration-300 group"
      style={{
        borderRadius: '1px',
        backgroundColor: isSelected ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
        borderColor: isSelected ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.07)',
      }}
      whileHover={{ scale: 1.005 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-white truncate" style={{ fontFamily: 'var(--font-display)' }}>
              {repo.name}
            </span>
            {repo.private && (
              <Lock size={10} className="text-white/25 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-white/30 truncate leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            {repo.description}
          </p>
        </div>
        <div className="ml-3 flex-shrink-0">
          {repo.lastScan ? (
            <div className="text-right">
              <div className="text-lg text-white" style={{ fontFamily: 'var(--font-display)' }}>
                {repo.lastScan.overallScore}
              </div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>score</div>
            </div>
          ) : (
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/20 border border-white/[0.07] px-2 py-1" style={{ fontFamily: 'var(--font-mono)', borderRadius: '1px' }}>
              unscanned
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3">
        {repo.language && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: langColors[repo.language] || '#ffffff40' }} />
            <span className="text-[11px] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>{repo.language}</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-white/20">
          <Star size={10} />
          <span className="text-[11px]" style={{ fontFamily: 'var(--font-mono)' }}>{repo.stars}</span>
        </div>
        <div className="flex items-center gap-1 text-white/20">
          <GitFork size={10} />
          <span className="text-[11px]" style={{ fontFamily: 'var(--font-mono)' }}>{repo.forks}</span>
        </div>
      </div>

      {repo.lastScan && (
        <SegmentBar value={repo.lastScan.overallScore} segments={16} segmentHeight={4} showValue={false} />
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5 text-white/20">
          {repo.lastScan ? <CheckCircle2 size={10} className="text-emerald-400/60" /> : <Clock size={10} />}
          <span className="text-[11px]" style={{ fontFamily: 'var(--font-mono)' }}>
            {repo.lastScan ? `scanned ${repo.lastScan.scanDate}` : 'not scanned'}
          </span>
        </div>
        <motion.button
          onClick={e => { e.stopPropagation(); onScan(); }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] px-3 py-1.5 border transition-all duration-200 group-hover:border-white/18"
          style={{
            fontFamily: 'var(--font-mono)',
            borderRadius: '1px',
            color: 'var(--accent)',
            borderColor: 'rgba(16,185,129,0.2)',
            backgroundColor: 'rgba(16,185,129,0.05)',
          }}
        >
          <Play size={9} fill="currentColor" />
          {repo.lastScan ? 'Rescan' : 'Scan'}
        </motion.button>
      </div>
    </motion.div>
  );
}

function MiniBar({ label, value, max, color, delay = 0 }: { label: string; value: number; max: number; color: string; delay?: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] text-white/30 w-16 flex-shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>{label}</span>
      <div className="flex-1 h-[6px] bg-white/[0.05] overflow-hidden" style={{ borderRadius: '1px' }}>
        <motion.div
          className="h-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay, duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}66` }}
        />
      </div>
      <span className="text-[11px] text-white/40 w-8 text-right tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );
}

function ComplexityMiniChart({ dist, delay = 0 }: { dist: Array<{ range: string; count: number }>; delay?: number }) {
  const max = Math.max(...dist.map(d => d.count), 1);
  return (
    <div className="space-y-2">
      {dist.map((d, i) => (
        <div key={d.range} className="flex items-center gap-2.5">
          <span className="text-[11px] text-white/30 w-12 flex-shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>{d.range}</span>
          <div className="flex-1 h-[5px] bg-white/[0.04] overflow-hidden" style={{ borderRadius: '1px' }}>
            <motion.div
              className="h-full"
              initial={{ width: 0 }}
              animate={{ width: `${(d.count / max) * 100}%` }}
              transition={{ delay: delay + i * 0.06, duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
              style={{
                backgroundColor: i < 2 ? 'var(--accent)' : i === 2 ? '#facc15' : '#ef4444',
                opacity: 0.7 + (1 - i / dist.length) * 0.3,
              }}
            />
          </div>
          <span className="text-[11px] text-white/40 w-6 text-right tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{d.count}</span>
        </div>
      ))}
    </div>
  );
}

function TestMetricCard({ icon: Icon, label, value, sub, color, delay = 0 }: {
  icon: React.ElementType; label: string; value: string; sub: string; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
      className="p-4 bg-white/[0.02] border border-white/[0.05] text-center"
      style={{ borderRadius: '1px' }}
    >
      <Icon size={16} style={{ color }} className="mx-auto mb-2" />
      <div className="text-lg text-white mb-0.5" style={{ fontFamily: 'var(--font-display)' }}>{value}</div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>{label}</div>
      <div className="text-[11px] text-white/20 mt-1" style={{ fontFamily: 'var(--font-mono)' }}>{sub}</div>
    </motion.div>
  );
}

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const LOCAL_REPO_ID = 'local-upload';

const UPLOAD_MESSAGES = [
  'Receiving files...',
  'Reading file tree...',
  'Staging for analysis...',
];

const DOWNLOAD_MESSAGES = [
  'Resolving repository...',
  'Downloading archive...',
  'Extracting files...',
  'Staging for analysis...',
];

function parseGitHubUrl(url: string): { owner: string; repo: string; branch: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, ''), branch: match[3] || 'main' };
}

function FileTree({ files, onRemove }: { files: File[]; onRemove: (i: number) => void }) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['.']));
  const [showTree, setShowTree] = useState(false);

  useEffect(() => {
    if (files.length > 0) {
      const t = setTimeout(() => setShowTree(true), 50);
      return () => clearTimeout(t);
    }
    setShowTree(false);
  }, [files.length]);

  const tree = React.useMemo(() => {
    const root: Record<string, any> = { __files: [] as { file: File; index: number }[], __dirs: {} as Record<string, any> };
    files.forEach((file, index) => {
      const parts = file.name.split('/');
      let current = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current.__dirs[part]) current.__dirs[part] = { __files: [], __dirs: {} };
        current = current.__dirs[part];
      }
      current.__files.push({ file, index });
    });
    return root;
  }, [files]);

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderNode = (node: any, path: string, depth: number, totalItems: number) => {
    const isExpanded = expandedDirs.has(path);
    const dirNames = Object.keys(node.__dirs).sort();
    const hasDirs = dirNames.length > 0;
    const hasFiles = node.__files.length > 0;
    const isRoot = path === '.';

    return (
      <motion.div
        key={path}
        initial={{ opacity: 0 }}
        animate={{ opacity: showTree ? 1 : 0 }}
        transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
      >
        {isRoot && (
          <div className="flex items-center gap-1 py-1 px-1 text-[10px] text-white/30 border-b border-white/[0.05] mb-1"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <span>📁</span>
            <span>root</span>
            <span className="text-white/15 ml-0.5">({files.length})</span>
          </div>
        )}
        {hasDirs && (
          <div>
            {dirNames.map((name: string, dirIdx: number) => {
              const childPath = path === '.' ? name : `${path}/${name}`;
              const child = node.__dirs[name];
              const childExpanded = expandedDirs.has(childPath);
              const childFileCount = (child.__files?.length || 0);
              const childDirCount = Object.keys(child.__dirs || {}).length;
              const childTotal = childFileCount + childDirCount;
              const isLastDir = dirIdx === dirNames.length - 1 && !hasFiles;
              return (
                <div key={childPath} className="relative">
                  {/* Branch line */}
                  <div className="absolute left-[11px] top-0 bottom-0 w-px bg-white/[0.08]" style={{ bottom: isLastDir && !childExpanded ? '50%' : undefined }} />
                  <div className="flex items-start">
                    {/* Horizontal connector */}
                    <div className="flex-shrink-0 w-[22px] h-[18px] relative">
                      <div className="absolute right-0 top-[9px] w-[11px] h-px bg-white/[0.08]" />
                      {!isLastDir && <div className="absolute left-[11px] top-0 bottom-0 w-px bg-white/[0.08]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => toggleDir(childPath)}
                        className="flex items-center gap-1 w-full text-left py-0.5 text-[10px] text-white/40 hover:text-white/60 transition-colors"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {childExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        <span>{name}</span>
                        <span className="text-white/15 ml-0.5">({childTotal})</span>
                      </button>
                      <AnimatePresence>
                        {childExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            {renderNode(child, childPath, depth + 1, totalItems)}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {hasFiles && (
          <div>
            {node.__files.map(({ file, index }: { file: File; index: number }, fileIdx: number) => {
              const isLastFile = fileIdx === node.__files.length - 1;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: showTree ? 1 : 0, x: showTree ? 0 : -6 }}
                  transition={{
                    duration: 0.2,
                    delay: 0.15 + fileIdx * 0.03,
                    ease: [0.22, 0.61, 0.36, 1],
                  }}
                  className="flex items-start relative"
                >
                  {/* Branch line */}
                  <div className="flex-shrink-0 w-[22px] h-[18px] relative">
                    <div className="absolute right-0 top-[9px] w-[11px] h-px bg-white/[0.08]" />
                    {!isLastFile && <div className="absolute left-[11px] top-0 bottom-0 w-px bg-white/[0.08]" />}
                  </div>
                  <div className="flex items-center justify-between flex-1 text-[10px] text-white/30 py-0.5 hover:bg-white/[0.03] pr-1" style={{ fontFamily: 'var(--font-mono)' }}>
                    <span className="truncate max-w-[160px]">{file.name.split('/').pop()}</span>
                    <button onClick={() => onRemove(index)} className="text-white/15 hover:text-white/50 ml-1 flex-shrink-0">
                      <XCircle size={9} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    );
  };

  if (files.length === 0) return null;
  return (
    <div className="border border-white/[0.05] bg-white/[0.015] overflow-auto mt-2" style={{ borderRadius: '1px', maxHeight: 260 }}>
      {renderNode(tree, '.', 0, files.length)}
    </div>
  );
}

function FileUploadZone({
  files,
  onFilesChange,
  onScan,
  onStartScan,
  isScanning,
  publicRepoUrl,
  onPublicRepoUrlChange,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onScan: () => void;
  onStartScan: (repo: Repository) => void;
  isScanning: boolean;
  publicRepoUrl: string;
  onPublicRepoUrlChange: (url: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMsgIndex, setUploadMsgIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadMsgIndex, setDownloadMsgIndex] = useState(0);
  const uploadTimers = useRef<{ progress?: NodeJS.Timeout; msg?: NodeJS.Timeout }>({});
  const downloadTimers = useRef<{ progress?: NodeJS.Timeout; msg?: NodeJS.Timeout }>({});

  // GitHub username fetch panel state
  const [ghUsername, setGhUsername] = useState('');
  const [ghRepos, setGhRepos] = useState<Array<{ full_name: string; name: string; description: string | null; stargazers_count: number; language: string | null; private: boolean }>>([]);
  const [ghFetching, setGhFetching] = useState(false);
  const [ghFetchError, setGhFetchError] = useState<string | null>(null);
  const [ghScanningRepo, setGhScanningRepo] = useState<string | null>(null);
  const [workspaceHandle, setWorkspaceHandle] = useState<any>(null);
  const [workspacePermission, setWorkspacePermission] = useState<PermissionState | null>(null);
  const [workspaceSize, setWorkspaceSize] = useState(0);

  const clearUploadTimers = () => {
    if (uploadTimers.current.progress) clearInterval(uploadTimers.current.progress);
    if (uploadTimers.current.msg) clearInterval(uploadTimers.current.msg);
    uploadTimers.current = {};
  };

  const clearDownloadTimers = () => {
    if (downloadTimers.current.progress) clearInterval(downloadTimers.current.progress);
    if (downloadTimers.current.msg) clearInterval(downloadTimers.current.msg);
    downloadTimers.current = {};
  };

  useEffect(() => {
    return () => {
      clearUploadTimers();
      clearDownloadTimers();
    };
  }, []);

  const startUploadAnimation = () => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadMsgIndex(0);
    clearUploadTimers();
    const start = Date.now();
    const duration = 2000;
    uploadTimers.current.progress = setInterval(() => {
      const elapsed = Date.now() - start;
      setUploadProgress(Math.min((elapsed / duration) * 100, 95));
    }, 80);
    uploadTimers.current.msg = setInterval(() => {
      setUploadMsgIndex(i => (i + 1) % UPLOAD_MESSAGES.length);
    }, 700);
    setTimeout(() => {
      clearUploadTimers();
      setUploadProgress(100);
      setTimeout(() => setIsUploading(false), 350);
    }, duration);
  };

  const startDownloadAnimation = () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadMsgIndex(0);
    clearDownloadTimers();
    const start = Date.now();
    const duration = 3000;
    downloadTimers.current.progress = setInterval(() => {
      const elapsed = Date.now() - start;
      setDownloadProgress(Math.min((elapsed / duration) * 100, 95));
    }, 80);
    downloadTimers.current.msg = setInterval(() => {
      setDownloadMsgIndex(i => (i + 1) % DOWNLOAD_MESSAGES.length);
    }, 700);
  };

  const stopDownloadAnimation = () => {
    clearDownloadTimers();
    setDownloadProgress(100);
    setTimeout(() => setIsDownloading(false), 350);
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    const currentSize = files.reduce((s, f) => s + f.size, 0);
    const incomingSize = incoming.reduce((s, f) => s + f.size, 0);
    if (currentSize + incomingSize > MAX_UPLOAD_BYTES) {
      showNotice('UPLOAD TOO LARGE', 'Total upload limit is 100 MB. Files are not sent to the server.', 'error');
      return;
    }
    onPublicRepoUrlChange('');
    startUploadAnimation();
    setTimeout(() => {
      onFilesChange([...files, ...incoming]);
      showNotice('FILES READY', `${incoming.length} file(s) staged for local analysis.`, 'success');
    }, 2000);
  };

  const removeFile = (index: number) => {
    const next = [...files];
    next.splice(index, 1);
    onFilesChange(next);
  };

  const handleScanUserRepo = async (fullName: string) => {
    if (ghScanningRepo) return;
    const ghRepo = ghRepos.find(r => r.full_name === fullName) as Record<string, any> | undefined;
    if (!ghRepo) {
      showNotice('REPO NOT FOUND', 'Could not find repository in search results.', 'error');
      return;
    }
    const tempRepo: Repository = {
      id: `github-${fullName}`,
      name: ghRepo.name || fullName.split('/')[1] || fullName,
      fullName: ghRepo.full_name || fullName,
      language: ghRepo.language || 'Mixed',
      private: ghRepo.private ?? false,
      description: ghRepo.description || '',
      stars: ghRepo.stargazers_count ?? 0,
      forks: ghRepo.forks_count ?? 0,
      htmlUrl: ghRepo.html_url || `https://github.com/${fullName}`,
      defaultBranch: ghRepo.default_branch || 'main',
    };
    setGhScanningRepo(fullName);
    onStartScan(tempRepo);
    setGhScanningRepo(null);
  };

  const handleDownloadRepo = async () => {
    const parsed = parseGitHubUrl(publicRepoUrl.trim());
    if (!parsed) {
      showNotice('INVALID URL', 'Please paste a valid GitHub repository URL.', 'error');
      return;
    }
    startDownloadAnimation();
    try {
      const { owner, repo } = parsed;
      const response = await fetch('/api/public-repo/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: publicRepoUrl.trim() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Could not download repository (HTTP ${response.status}).`);
      }
      const blob = await response.blob();
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(blob);
      const entries = Object.entries(zip.files).filter(([path, file]) => !file.dir && path.includes('/'));
      if (entries.length === 0) throw new Error('No files found in the downloaded archive.');
      const baseFolder = entries[0][0].split('/')[0];
      const extracted = await Promise.all(
        entries
          .filter(([path]) => path.startsWith(`${baseFolder}/`))
          .map(async ([path, file]) => {
            const name = path.slice(`${baseFolder}/`.length);
            if (!name) return null;
            const content = await file.async('blob');
            return new File([content], name);
          })
      );
      const filesWithContent = extracted.filter((f): f is File => f !== null);
      const totalSize = filesWithContent.reduce((s, f) => s + f.size, 0);

      // Write to browser temp workspace if one is selected and writable
      if (workspaceHandle && workspacePermission === 'granted') {
        await clearWorkspace();
        const filesToWrite = filesWithContent.map(f => ({ path: f.name, blob: f as Blob }));
        const written = await writeFilesToWorkspace(workspaceHandle, filesToWrite);
        await updateWorkspaceSize(workspaceHandle);
        if (totalSize <= MAX_UPLOAD_BYTES) {
          onFilesChange(filesWithContent);
        }
        stopDownloadAnimation();
        showNotice('REPO SAVED TO WORKSPACE', `${written} file(s) written to temp folder (${formatBytes(totalSize)}).`, 'success');
        return;
      }

      if (totalSize > MAX_UPLOAD_BYTES) {
        onFilesChange([]);
        showNotice('REPO TOO LARGE', 'Downloaded repository exceeds 100 MB. Try a smaller repo, fewer files, or select a temp folder.', 'error');
        stopDownloadAnimation();
        return;
      }
      onFilesChange(filesWithContent);
      stopDownloadAnimation();
      showNotice('REPO READY', `${filesWithContent.length} file(s) extracted from ${owner}/${repo}.`, 'success');
    } catch (err) {
      stopDownloadAnimation();
      showNotice('DOWNLOAD FAILED', String(err instanceof Error ? err.message : 'Could not fetch repository.'), 'error');
    }
  };

  const formatBytes = (n: number) => {
    if (n === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(n) / Math.log(k));
    return `${(n / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const selectWorkspace = async () => {
    try {
      const picker = (window as any).showDirectoryPicker;
      if (!picker) {
        showNotice('NOT SUPPORTED', 'Your browser does not support folder selection.', 'error');
        return;
      }
      const root = await picker();
      const temp = await root.getDirectoryHandle('reposight-temp', { create: true });
      const perm = await temp.queryPermission({ mode: 'readwrite' });
      setWorkspaceHandle(temp);
      setWorkspacePermission(perm);
      await updateWorkspaceSize(temp);
      showNotice('WORKSPACE READY', `Selected ${root.name}/reposight-temp`, 'success');
    } catch (err) {
      if ((err as any).name === 'AbortError' || (err as any).name === 'NotAllowedError') {
        showNotice('PERMISSION NEEDED', 'Allow disk access in the browser prompt to use the temp folder.', 'error');
      } else {
        showNotice('WORKSPACE ERROR', String(err instanceof Error ? err.message : 'Could not select folder.'), 'error');
      }
    }
  };

  const requestWorkspacePermission = async () => {
    if (!workspaceHandle) return;
    try {
      const perm = await workspaceHandle.requestPermission({ mode: 'readwrite' });
      setWorkspacePermission(perm);
      if (perm === 'granted') {
        showNotice('PERMISSION GRANTED', 'Disk access enabled.', 'success');
      } else {
        showNotice('PERMISSION DENIED', 'Click Request again and allow access in the browser prompt.', 'error');
      }
    } catch (err) {
      showNotice('PERMISSION ERROR', String(err instanceof Error ? err.message : 'Could not request permission.'), 'error');
    }
  };

  const updateWorkspaceSize = async (handle: any) => {
    let size = 0;
    try {
      for await (const [, entry] of handle.entries()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          size += file.size;
        }
      }
    } catch {}
    setWorkspaceSize(size);
  };

  const writeFilesToWorkspace = async (handle: any, files: Array<{ path: string; blob: Blob }>) => {
    let written = 0;
    for (const { path, blob } of files) {
      const parts = path.split('/').filter(Boolean);
      let dir = handle;
      for (let i = 0; i < parts.length - 1; i++) {
        dir = await dir.getDirectoryHandle(parts[i], { create: true });
      }
      const fileName = parts[parts.length - 1] || path;
      const fileHandle = await dir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      written++;
    }
    return written;
  };

  const clearWorkspace = async () => {
    if (!workspaceHandle) return;
    try {
      for await (const [name, entry] of workspaceHandle.entries()) {
        if (entry.kind === 'file') {
          await workspaceHandle.removeEntry(name);
        } else if (entry.kind === 'directory') {
          await workspaceHandle.removeEntry(name, { recursive: true });
        }
      }
      setWorkspaceSize(0);
    } catch {}
  };

  const handleFetchUserRepos = async () => {
    const username = ghUsername.trim();
    if (!username) return;
    setGhFetching(true);
    setGhFetchError(null);
    setGhRepos([]);
    try {
      const allRepos: typeof ghRepos = [];
      for (let page = 1; page <= 10; page++) {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&type=public&sort=updated`);
        if (res.status === 404) throw new Error(`User "${username}" not found.`);
        if (!res.ok) throw new Error(`GitHub API error (${res.status}).`);
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) break;
        allRepos.push(...data);
        if (data.length < 100) break;
      }
      if (allRepos.length === 0) {
        setGhFetchError(`No public repositories found for "${username}".`);
      } else {
        setGhRepos(allRepos);
      }
    } catch (err) {
      setGhFetchError(err instanceof Error ? err.message : 'Failed to fetch repositories.');
    } finally {
      setGhFetching(false);
    }
  };


  const hasFiles = files.length > 0;
  const hasLink = publicRepoUrl.trim().length > 0;
  const dropDisabled = isDownloading || hasLink || isUploading;
  const linkDisabled = hasFiles || isUploading;

  const renderAnimation = (progress: number, msgIndex: number, messages: string[]) => (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 overflow-hidden border border-emerald-500/20 bg-[rgba(5,8,22,0.85)]" style={{ borderRadius: '1px' }}>
      <motion.div
        className="absolute inset-0 origin-left"
        style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.10) 100%)' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: progress / 100 }}
        transition={{ duration: 0.12, ease: 'linear' }}
      />
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 w-full">
        <span className="text-[11px] text-emerald-400/60 tracking-widest select-none" style={{ fontFamily: 'var(--font-mono)' }}>
          &gt;_
        </span>
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIndex}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.2 }}
            className="text-xs text-white/70 text-center"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {messages[msgIndex]}
          </motion.p>
        </AnimatePresence>
        <span className="text-[10px] text-emerald-400/50" style={{ fontFamily: 'var(--font-mono)' }}>
          {Math.round(progress)}%
        </span>
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

  return (
    <div className="space-y-3">
      <div className="text-[11px] uppercase tracking-[0.28em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>
        Local Upload
      </div>
      <div className="relative">
        <div
          onDragOver={e => { if (!dropDisabled) { e.preventDefault(); setIsDragging(true); } }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { if (!dropDisabled) { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); } }}
          onClick={() => { if (!dropDisabled) document.getElementById('local-file-input')?.click(); }}
          className={`p-5 border border-dashed text-center transition-all duration-200 ${dropDisabled ? 'cursor-not-allowed border-white/[0.06] bg-white/[0.01]' : 'cursor-pointer ' + (isDragging ? 'border-white/30 bg-white/[0.04]' : 'border-white/[0.1] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.03]')}`}
          style={{ borderRadius: '1px' }}
        >
          <Upload size={16} className="mx-auto mb-2 text-white/25" />
          <div className="text-[11px] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>
            {hasLink ? 'Public repo link active' : 'Drop files here or click to browse'}
          </div>
          <div className="text-[10px] text-white/20 mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
            Max 100 MB total · stored in this tab only
          </div>
          <input
            id="local-file-input"
            type="file"
            multiple
            disabled={dropDisabled}
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>
        {(isUploading || isDownloading) && renderAnimation(isUploading ? uploadProgress : downloadProgress, isUploading ? uploadMsgIndex : downloadMsgIndex, isUploading ? UPLOAD_MESSAGES : DOWNLOAD_MESSAGES)}
      </div>

      {/* Public repo link panel */}
      <div className="relative border border-white/[0.08] bg-white/[0.02] p-3" style={{ borderRadius: '1px' }}>
        <div className="flex items-center gap-2 mb-2">
          <LinkIcon size={12} className="text-white/25" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>
            Have a public repo link?
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={publicRepoUrl}
            onChange={e => onPublicRepoUrlChange(e.target.value)}
            disabled={linkDisabled}
            placeholder={linkDisabled ? 'Clear files to use a link' : 'github.com/owner/repo'}
            className="flex-1 min-w-0 px-3 py-2 text-[11px] text-white/60 bg-white/[0.03] border border-white/[0.08] outline-none focus:border-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-mono)', borderRadius: '1px' }}
          />
          <button
            onClick={handleDownloadRepo}
            disabled={linkDisabled || !publicRepoUrl.trim() || isDownloading}
            className="px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-black transition-all duration-200 disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}
          >
            {isDownloading ? '...' : 'Fetch'}
          </button>
        </div>
        {isDownloading && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-white/40 mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
              <span>{DOWNLOAD_MESSAGES[downloadMsgIndex]}</span>
              <span>{Math.round(downloadProgress)}%</span>
            </div>
            <div className="h-[2px] bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full"
                style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.4), var(--accent))' }}
                initial={{ width: 0 }}
                animate={{ width: `${downloadProgress}%` }}
                transition={{ duration: 0.12, ease: 'linear' }}
              />
            </div>
          </div>
        )}
        <div className="mt-3 flex flex-col gap-2">
          {!workspaceHandle ? (
            <button
              onClick={selectWorkspace}
              className="w-full px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/70 border border-white/[0.08] hover:border-emerald-500/40 transition-colors"
              style={{ borderRadius: '1px', fontFamily: 'var(--font-display)' }}
            >
              Select temp folder
            </button>
          ) : (
            <div className="px-3 py-2 border border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-center justify-between text-[10px] text-white/60 mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                <span>Temp folder selected</span>
                <span className={workspacePermission === 'granted' ? 'text-emerald-400' : 'text-amber-400'}>
                  {workspacePermission === 'granted' ? 'writable' : 'permission needed'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-white/40 mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                <span>{formatBytes(workspaceSize)} used</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={requestWorkspacePermission}
                  className="flex-1 px-2 py-1.5 text-[9px] uppercase tracking-[0.14em] text-white/70 border border-white/[0.08] hover:border-emerald-500/40 transition-colors"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Request again
                </button>
                <button
                  onClick={clearWorkspace}
                  className="flex-1 px-2 py-1.5 text-[9px] uppercase tracking-[0.14em] text-white/70 border border-white/[0.08] hover:border-rose-500/40 transition-colors"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Clear
                </button>
                <button
                  onClick={selectWorkspace}
                  className="flex-1 px-2 py-1.5 text-[9px] uppercase tracking-[0.14em] text-white/70 border border-white/[0.08] hover:border-emerald-500/40 transition-colors"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Change
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GitHub username fetch panel */}
      <div className="border border-white/[0.08] bg-white/[0.02] p-3" style={{ borderRadius: '1px' }}>
        <div className="flex items-center gap-2 mb-2">
          <Github size={12} className="text-white/25" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>
            Fetch all repos by specific GitHub username
          </span>
        </div>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={ghUsername}
            onChange={e => { setGhUsername(e.target.value); setGhRepos([]); setGhFetchError(null); }}
            onKeyDown={e => e.key === 'Enter' && handleFetchUserRepos()}
            placeholder="github-username"
            className="flex-1 min-w-0 px-3 py-2 text-[11px] text-white/60 bg-white/[0.03] border border-white/[0.08] outline-none focus:border-white/20 transition-colors"
            style={{ fontFamily: 'var(--font-mono)', borderRadius: '1px' }}
          />
          <button
            onClick={handleFetchUserRepos}
            disabled={ghFetching || !ghUsername.trim()}
            className="px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-black transition-all duration-200 disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}
          >
            {ghFetching ? '...' : 'Fetch'}
          </button>
        </div>

        {ghFetchError && (
          <p className="text-[10px] text-red-400/70 mt-1 mb-1" style={{ fontFamily: 'var(--font-mono)' }}>{ghFetchError}</p>
        )}

        {ghRepos.length > 0 && (
          <div className="mt-2 space-y-1 max-h-56 overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
            <div className="text-[9px] uppercase tracking-[0.22em] text-white/20 mb-1.5 px-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
              {ghRepos.length} public repos · click scan to import
            </div>
            {ghRepos.map(repo => (
              <div
                key={repo.full_name}
                className="flex items-center gap-2 px-2.5 py-2 border border-white/[0.06] bg-white/[0.015] group hover:border-white/[0.12] hover:bg-white/[0.03] transition-all"
                style={{ borderRadius: '1px' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-white/70 truncate" style={{ fontFamily: 'var(--font-display)' }}>
                      {repo.name}
                    </span>
                    {repo.language && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 border border-white/[0.07] text-white/25 shrink-0"
                        style={{ fontFamily: 'var(--font-mono)', borderRadius: '1px', backgroundColor: 'rgba(255,255,255,0.02)' }}
                      >
                        {repo.language}
                      </span>
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-[9px] text-white/25 truncate mt-0.5 leading-tight" style={{ fontFamily: 'var(--font-mono)' }}>
                      {repo.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleScanUserRepo(repo.full_name)}
                  disabled={!!ghScanningRepo || isDownloading || isUploading}
                  className="shrink-0 flex items-center gap-1 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-black transition-all duration-200 disabled:opacity-40"
                  style={{ backgroundColor: ghScanningRepo === repo.full_name ? 'rgba(16,185,129,0.6)' : 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}
                >
                  {ghScanningRepo === repo.full_name ? (
                    <><CliSpinner />&nbsp;Scanning</>
                  ) : (
                    <><Play size={8} fill="currentColor" />&nbsp;Scan</>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>
            {files.length} file(s) · {(files.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(2)} MB
          </span>
          <button
            onClick={() => onFilesChange([])}
            className="text-[10px] uppercase tracking-[0.2em] text-white/25 hover:text-white/50 transition-colors"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Clear
          </button>
        </div>
      )}
      <button
        onClick={onScan}
        disabled={isScanning || isUploading || isDownloading}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] uppercase tracking-[0.24em] text-black transition-all duration-200 disabled:opacity-50"
        style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}
      >
        <Play size={11} fill="currentColor" />
        {isScanning ? 'Scanning...' : files.length > 0 ? 'Scan Local Files' : 'Run First Scan'}
      </button>
      <FileTree files={files} onRemove={removeFile} />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, isLoading: authLoading } = useAuth();
  const { scansUsed, scansAllowed, canScan, isAdmin, timeUntilReset, recordScan } = useRateLimit();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [reposError, setReposError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const { startScan, startLocalScan, scanState, isScanning, result: scanResult, scanTarget } = useScan();
  const [scanResults, setScanResults] = useState<Record<string, LastScan>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const toggleFilter = (key: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const isFiltered = activeFilters.size > 0;
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [publicRepoUrl, setPublicRepoUrl] = useState('');
  const [localRepo, setLocalRepo] = useState<Repository | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  // Fetch real repositories
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    getRepositories()
      .then(res => {
        if (cancelled) return;
        const mapped = (res.repositories || []).map((r: Record<string, unknown>) => ({
          id: String(r.id),
          name: String(r.name),
          fullName: String(r.fullName || `${r.owner}/${r.name}`),
          language: String(r.language || 'Unknown'),
          stars: Number(r.stars || 0),
          forks: Number(r.forks || 0),
          private: Boolean(r.private),
          description: String(r.description || ''),
          lastScanned: r.updatedAt as string | undefined,
          scanStatus: 'idle' as const,
        })) as Repository[];
        setRepos(mapped);
        if (mapped.length > 0 && !selectedRepo) {
          setSelectedRepo(mapped[0]);
        }
        setReposLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setReposError(err instanceof Error ? err.message : 'Failed to load repositories');
        setReposLoading(false);
      });
    return () => { cancelled = true; };
  }, [authLoading, selectedRepo]);

  // Store scan result under the repo that initiated it (not current selection)
  useEffect(() => {
    if (scanResult && scanTarget) {
      setScanResults(prev => ({ ...prev, [scanTarget.id]: scanResult }));
    }
  }, [scanResult, scanTarget]);

  // Load the most recent completed analysis for the selected repo on first view
  useEffect(() => {
    if (!selectedRepo || selectedRepo.id === LOCAL_REPO_ID) return;
    const fullName = selectedRepo.fullName;
    if (!fullName) return;
    getLatestAnalysis(fullName)
      .then(res => {
        if (res?.analysis?.status === 'completed' && res.analysis.deterministicResults) {
          const lastScan = mergeScannerResults(res.analysis.deterministicResults as Record<string, unknown>);
          setScanResults(prev => (prev[selectedRepo.id] ? prev : { ...prev, [selectedRepo.id]: lastScan }));
        }
      })
      .catch(() => {});
  }, [selectedRepo]);

  const handleScan = (repo: Repository | null) => {
    if (!repo || isScanning) return;
    if (repo.id === LOCAL_REPO_ID) {
      handleLocalScan();
      return;
    }
    if (!canScan) {
      showNotice(
        'SCAN LIMIT REACHED',
        `3/3 scans used. Resets in ${timeUntilReset || '48h'}.`,
        'error'
      );
      return;
    }
    setSelectedRepo(repo);
    setRepos(prev => (prev.find(r => r.id === repo.id) ? prev : [repo, ...prev]));
    recordScan();
    startScan({
      id: repo.id,
      name: repo.name,
      fullName: repo.fullName,
      language: repo.language,
      private: repo.private,
    });
    showNotice('SCAN INITIATED', `Analyzing ${repo.name}...`, 'system');
  };

  const handleLocalScan = () => {
    if (isScanning) return;
    if (localFiles.length === 0) {
      showNotice('NO INPUT', 'Upload your files or provide a public repo link first.', 'info');
      return;
    }
    if (!canScan) {
      showNotice('SCAN LIMIT REACHED', `3/3 scans used. Resets in ${timeUntilReset || '48h'}.`, 'error');
      return;
    }
    const localRepoObj: Repository = {
      id: 'local-upload',
      name: 'Local Upload',
      fullName: 'local-upload',
      language: 'Mixed',
      stars: 0,
      forks: 0,
      private: false,
      description: `${localFiles.length} file(s) staged for client-side analysis`,
    };
    setLocalRepo(localRepoObj);
    setSelectedRepo(localRepoObj);
    recordScan();
    startLocalScan(localFiles);
    showNotice('LOCAL SCAN INITIATED', `Analyzing ${localFiles.length} file(s)...`, 'system');
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const perRepoResult = selectedRepo ? scanResults[selectedRepo.id] : null;
  const scan = perRepoResult ?? selectedRepo?.lastScan;

  const filteredFindings = useMemo(() => {
    if (!scan) return [];
    const all = scan.findings ?? [];
    const keys = new Set(Array.from(activeFilters).filter(k => ['critical','high','medium','low','info'].includes(k)));
    return keys.size > 0 ? all.filter(f => keys.has(f.severity)) : all;
  }, [scan, activeFilters]);

  // Group consecutive findings with same title+file+severity into range tiles
  const groupedFindings = useMemo(() => {
    if (!filteredFindings.length) return [];
    const groups: Array<typeof filteredFindings[number] & { lineRange?: string; lineCount?: number }> = [];
    let current: (typeof filteredFindings[number])[] = [];
    const flush = () => {
      if (!current.length) return;
      const base = current[0];
      if (current.length <= 1) {
        groups.push(base);
      } else {
        const lines = current.map(f => f.line).sort((a, b) => a - b);
        const first = lines[0];
        const last = lines[lines.length - 1];
        const lineRange = first === last ? String(first) : `${first} – ${last}`;
        groups.push({ ...base, line: first, lineRange, lineCount: current.length });
      }
      current = [];
    };
    for (let i = 0; i < filteredFindings.length; i++) {
      const f = filteredFindings[i];
      if (current.length === 0 || (current[0].title === f.title && current[0].file === f.file && current[0].severity === f.severity)) {
        current.push(f);
      } else {
        flush();
        current.push(f);
      }
    }
    flush();
    return groups;
  }, [filteredFindings]);

  const filteredSmells = useMemo(() => {
    if (!scan?.codeSmells) return [];
    const keys = new Set(Array.from(activeFilters).filter(k => k.startsWith('smell-')));
    return keys.size > 0 ? scan.codeSmells.filter((s: CodeSmell) => keys.has(`smell-${s.severity ?? 'medium'}`)) : scan.codeSmells;
  }, [scan, activeFilters]);

  const filteredSkills = useMemo(() => {
    if (!scan?.skillAssessment) return [];
    const keys = new Set(Array.from(activeFilters).filter(k => k.startsWith('skill-')));
    return keys.size > 0 ? scan.skillAssessment.filter((s: { verdict: string }) => keys.has(`skill-${s.verdict}`)) : scan.skillAssessment;
  }, [scan, activeFilters]);

  const findingFilterActive = Array.from(activeFilters).some(k => ['critical','high','medium','low','info'].includes(k));
  const smellFilterActive = Array.from(activeFilters).some(k => k.startsWith('smell-'));
  const skillFilterActive = Array.from(activeFilters).some(k => k.startsWith('skill-'));

  return (
    <div className="min-h-screen" style={{ fontFamily: 'var(--font-display)' }}>
      {/* Header */}
      <header className="border-b border-white/[0.05] sticky top-0 z-40 backdrop-blur-md bg-[rgba(5,8,22,0.7)]">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm uppercase tracking-[0.22em] text-white/50 hover:text-white transition-colors smooth-glow">
              REPOSIGHT
            </Link>
            <div className="w-px h-4 bg-white/[0.1]" />
            <div className="flex items-center gap-2 text-white/25">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
              <span className="text-[11px] uppercase tracking-[0.22em]" style={{ fontFamily: 'var(--font-mono)' }}>
                {user?.githubUsername || 'dashboard'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/settings">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="p-2 text-white/30 hover:text-white/60 transition-colors">
                <Settings size={15} />
              </motion.button>
            </Link>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/25 hover:text-red-400/70 transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}>
              <LogOut size={13} />
              Exit
            </motion.button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="grid grid-cols-[320px_1fr] gap-6">

          {/* —— SIDEBAR —— */}
          <aside className="max-h-[calc(100vh-140px)] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] uppercase tracking-[0.28em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>
                Repositories
              </div>
              <div className="text-[11px] text-white/20" style={{ fontFamily: 'var(--font-mono)' }}>
                {repos.length} total
              </div>
            </div>

            {/* Scan quota */}
            <div className="mb-4 p-3 border border-white/[0.06] bg-white/[0.015]" style={{ borderRadius: '1px' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-[0.28em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>
                  Scan Quota
                </span>
                <span className="text-[10px] tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: canScan ? 'var(--accent)' : 'rgba(239,68,68,0.7)' }}>
                  {isAdmin ? 'UNLIMITED' : `${scansUsed}/${scansAllowed}`}
                </span>
              </div>
              <div className="h-[3px] bg-white/[0.05] overflow-hidden" style={{ borderRadius: '1px' }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: isAdmin ? '100%' : `${(scansUsed / scansAllowed) * 100}%`,
                    backgroundColor: canScan ? 'var(--accent)' : '#ef4444',
                    boxShadow: canScan ? '0 0 6px rgba(16,185,129,0.5)' : '0 0 6px rgba(239,68,68,0.5)',
                  }}
                />
              </div>
              {!isAdmin && !canScan && timeUntilReset && (
                <p className="text-[10px] text-white/20 mt-1.5" style={{ fontFamily: 'var(--font-mono)' }}>
                  Resets in {timeUntilReset}
                </p>
              )}
            </div>

            {/* Local file upload (no GitHub required) */}
            <div className="mb-5">
              <FileUploadZone
                files={localFiles}
                onFilesChange={setLocalFiles}
                onScan={handleLocalScan}
                onStartScan={handleScan}
                isScanning={isScanning}
                publicRepoUrl={publicRepoUrl}
                onPublicRepoUrlChange={setPublicRepoUrl}
              />
            </div>

            {reposLoading && (
              <div className="flex items-center justify-center py-12">
                <CliSpinner />
                <span className="ml-3 text-[11px] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>Loading...</span>
              </div>
            )}

            {reposError && (
              <div className="p-5 border border-white/[0.07] bg-white/[0.02] text-center" style={{ borderRadius: '1px' }}>
                <div className="text-[11px] text-white/30 mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                  {reposError}
                </div>
                <p className="text-xs text-white/20 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
                  Connect your GitHub account to import repositories.
                </p>
                <button
                  onClick={() => router.push('/settings')}
                  className="text-[11px] uppercase tracking-[0.24em] px-4 py-2 border border-white/[0.1] text-white/40 hover:text-white/70 hover:border-white/20 transition-all"
                  style={{ fontFamily: 'var(--font-mono)', borderRadius: '1px' }}
                >
                  Open Settings
                </button>
              </div>
            )}

            {!reposLoading && repos.length === 0 && !reposError && (
              <div className="p-5 border border-white/[0.07] bg-white/[0.02] text-center" style={{ borderRadius: '1px' }}>
                <div className="text-[11px] uppercase tracking-[0.28em] text-white/20 mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                  No Repositories Found
                </div>
                <p className="text-xs text-white/25 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
                  Connect your GitHub account or use the Local Upload above to drop files directly into RepoSight.
                </p>
                <button
                  onClick={() => router.push('/settings')}
                  className="text-[11px] uppercase tracking-[0.24em] px-4 py-2 border border-white/[0.1] text-white/40 hover:text-white/70 hover:border-white/20 transition-all"
                  style={{ fontFamily: 'var(--font-mono)', borderRadius: '1px' }}
                >
                  Connect GitHub
                </button>
              </div>
            )}

            <div className="space-y-2">
              {repos.map(repo => (
                <RepoCard
                  key={repo.id}
                  repo={{ ...repo, lastScan: scanResults[repo.id] ?? repo.lastScan }}
                  isSelected={selectedRepo?.id === repo.id}
                  onSelect={() => setSelectedRepo(repo)}
                  onScan={() => handleScan(repo)}
                />
              ))}
            </div>
          </aside>

          {/* —— MAIN PANEL —— */}
          <main>
            {/* Repo header */}
            {selectedRepo && (
            <div className="mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <GlitchyText
                    text={selectedRepo.name.toUpperCase()}
                    as="h1"
                    triggerOnMount
                    className="text-2xl text-white tracking-[0.1em]"
                    style={{ fontFamily: 'var(--font-display)' } as React.CSSProperties}
                  />
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-white/30" style={{ fontFamily: 'var(--font-body)' }}>
                      {selectedRepo.description}
                    </p>
                    {selectedRepo.id === LOCAL_REPO_ID && (
                      <span className="px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] border border-white/[0.15] text-white/40" style={{ fontFamily: 'var(--font-mono)', borderRadius: '1px' }}>
                        Preview
                      </span>
                    )}
                  </div>
                </div>
                <motion.button
                  onClick={() => handleScan(selectedRepo)}
                  disabled={isScanning}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-5 py-2.5 text-[11px] uppercase tracking-[0.24em] text-black transition-all duration-200 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}
                >
                  <Play size={11} fill="currentColor" />
                  {isScanning ? 'Scanning...' : 'Run Scan'}
                </motion.button>
              </div>
            </div>
            )}

            {/* Scan progress */}
            <AnimatePresence>
              {isScanning && scanState && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 glass border border-white/[0.07] overflow-hidden"
                  style={{ borderRadius: '1px' }}
                >
                  <div className="px-5 py-3.5 border-b border-white/[0.05] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent)' }} />
                    <span className="text-[11px] uppercase tracking-[0.28em] text-white/40" style={{ fontFamily: 'var(--font-mono)' }}>
                      Audit Engine Active
                    </span>
                  </div>
                  <div className="p-5 space-y-2">
                    {scanState.steps.map((step: { name: string; status: string; error?: string }, i: number) => {
                      const isSemgrep = step.name.toLowerCase().includes('semgrep');
                      const effectiveStatus = isSemgrep ? 'failed' : step.status;
                      return (
                      <div key={i} className="flex items-center gap-2">
                        <div className="text-[10px] w-3 text-center flex-shrink-0" style={{ fontFamily: 'var(--font-mono)', color: effectiveStatus === 'done' ? 'var(--accent)' : effectiveStatus === 'running' ? '#facc15' : effectiveStatus === 'failed' ? (isSemgrep ? '#eab308' : '#ef4444') : 'rgba(255,255,255,0.2)' }}>
                          {effectiveStatus === 'done' ? (
                            <span>✓</span>
                          ) : effectiveStatus === 'running' ? (
                            <CliSpinner />
                          ) : effectiveStatus === 'failed' ? (
                            <span className={isSemgrep ? 'text-yellow-400' : 'text-red-400'}>!</span>
                          ) : (
                            <span>○</span>
                          )}
                        </div>
                        <span className="text-[10px]" style={{ fontFamily: 'var(--font-mono)', color: effectiveStatus === 'done' ? 'rgba(255,255,255,0.45)' : effectiveStatus === 'running' ? 'white' : effectiveStatus === 'failed' ? (isSemgrep ? 'rgba(234,179,8,0.7)' : 'rgba(239,68,68,0.7)') : 'rgba(255,255,255,0.2)' }}>
                          {step.name}
                        </span>
                        {step.status === 'failed' && step.error && (
                          <span className="text-[9px] text-red-400/60 ml-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                            — {step.error}
                          </span>
                        )}
                        {isSemgrep && step.status === 'running' && (
                          <span className="text-[9px] text-yellow-400/60 ml-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                            — under maintenance
                          </span>
                        )}
                        {/* Thin bar beside text — fills to 100% forward only */}
                        <div className="h-[1px] w-12 bg-white/[0.06] overflow-hidden flex-shrink-0" style={{ borderRadius: '1px' }}>
                          <motion.div
                            className="h-full"
                            initial={{ width: 0 }}
                            animate={{
                              width: effectiveStatus === 'done' ? '100%' : effectiveStatus === 'failed' ? '100%' : effectiveStatus === 'running' ? '100%' : '0%',
                            }}
                            transition={effectiveStatus === 'running' ? { duration: 3, ease: 'linear' } : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                              backgroundColor: effectiveStatus === 'done' ? 'var(--accent)' : effectiveStatus === 'failed' ? (isSemgrep ? '#eab308' : '#ef4444') : effectiveStatus === 'running' ? '#facc15' : 'transparent',
                            }}
                          />
                        </div>
                      </div>
                      );
                    })}
                    <div className="flex items-center gap-3 pt-2">
                      <span className="text-[11px] uppercase tracking-[0.28em] text-white/25 flex-shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>
                        PROGRESS
                      </span>
                      <span className="text-[11px] flex-shrink-0" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                        {Math.round(scanState.progress)}%
                      </span>
                      <div className="h-[3px] flex-1 bg-white/[0.05] overflow-hidden relative">
                        <motion.div
                          className="h-full relative overflow-hidden"
                          initial={{ width: 0 }}
                          animate={{ width: `${scanState.progress}%` }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          style={{
                            background: 'linear-gradient(90deg, rgba(16,185,129,0.5) 0%, #10b981 100%)',
                            boxShadow: '0 0 8px rgba(16,185,129,0.6), 0 0 20px rgba(16,185,129,0.2)',
                          }}
                        >
                          <div
                            className="absolute inset-0 w-full h-full"
                            style={{
                              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                              animation: 'barReflect 1.8s ease-in-out infinite',
                            }}
                          />
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tabs */}
            <div className="flex gap-0 border-b border-white/[0.06] mb-6">
              {TABS.filter(tab => !isScanning).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="relative px-5 py-3 text-[11px] uppercase tracking-[0.24em] transition-all duration-200"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.28)',
                  }}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-[1px]"
                      style={{ backgroundColor: 'var(--accent)' }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >

                {/* ── OVERVIEW TAB ── */}
                {activeTab === 'Overview' && scan && (
                  <div className="space-y-5">
                    {/* Score grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Overall Score', value: scan.overallScore, delay: 0 },
                        { label: 'Security (Maint.)', value: 0, delay: 0.06 },
                        { label: 'Code Quality', value: scan.codeQualityScore ?? 0, delay: 0.12 },
                        { label: 'Architecture', value: scan.architectureScore ?? 0, delay: 0.18 },
                      ].map(item => (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: item.delay * 0.5, duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
                          className="glass border border-white/[0.07] p-5"
                          style={{ borderRadius: '1px' }}
                        >
                          <AnimatedScoreDisplay label={item.label} value={item.value} delay={item.delay} />
                        </motion.div>
                      ))}
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Metrics */}
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                        className="glass border border-white/[0.07] p-5"
                        style={{ borderRadius: '1px' }}
                      >
                        <div className="text-[11px] uppercase tracking-[0.28em] text-white/25 mb-5" style={{ fontFamily: 'var(--font-mono)' }}>
                          Code Metrics
                        </div>
                        <div className="space-y-3">
                          {[
                            { label: 'Total Files', value: (scan.metrics?.totalFiles ?? 0).toLocaleString() },
                            { label: 'Lines of Code', value: (scan.metrics?.linesOfCode ?? 0).toLocaleString() },
                            { label: 'Test Coverage', value: `${scan.metrics?.testCoverage ?? 0}%` },
                            { label: 'Avg Complexity', value: scan.metrics?.avgComplexity ?? 0 },
                            { label: 'Duplication', value: `${scan.metrics?.duplication ?? 0}%` },
                          ].map((m, i) => (
                            <motion.div
                              key={m.label}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.25 + i * 0.05, duration: 0.35 }}
                              className="flex justify-between items-center"
                            >
                              <span className="text-[11px] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>{m.label}</span>
                              <span className="text-sm text-white" style={{ fontFamily: 'var(--font-display)' }}>{m.value}</span>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>

                      {/* Score breakdown bars */}
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.4 }}
                        className="glass border border-white/[0.07] p-5"
                        style={{ borderRadius: '1px' }}
                      >
                        <div className="text-[11px] uppercase tracking-[0.28em] text-white/25 mb-5" style={{ fontFamily: 'var(--font-mono)' }}>
                          Score Breakdown
                        </div>
                        <div className="space-y-4">
                          {[
                            { label: 'Overall', value: scan.overallScore },
                            { label: 'Security', value: scan.securityScore ?? 0 },
                            { label: 'Quality', value: scan.codeQualityScore ?? 0 },
                            { label: 'Arch', value: scan.architectureScore ?? 0 },
                            { label: 'Skills', value: scan.skillScore ?? 78 },
                          ].map((s, i) => (
                            <SegmentBar key={s.label} label={s.label} value={s.value} segments={16} segmentHeight={7} delay={0.3 + i * 0.06} labelWidth={64} />
                          ))}
                        </div>
                      </motion.div>
                    </div>

                    {/* Findings summary */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35, duration: 0.4 }}
                      className="glass border border-white/[0.07] p-5"
                      style={{ borderRadius: '1px' }}
                    >
                      <div className="text-[11px] uppercase tracking-[0.28em] text-white/25 mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
                        Finding Summary
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {(['critical', 'high', 'medium', 'low'] as SeverityLevel[]).map(sev => {
                          const cfg = severityConfig[sev];
                          const count = (scan.findings ?? []).filter((f: { severity: string }) => f.severity === sev).length;
                          return (
                            <motion.div
                              key={sev}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.4 + ['critical','high','medium','low'].indexOf(sev) * 0.06, duration: 0.35, ease: [0.34,1.56,0.64,1] }}
                              className="p-4 border text-center"
                              style={{ borderRadius: '1px', backgroundColor: cfg.bg, borderColor: cfg.border }}
                            >
                              <div className="text-2xl mb-1" style={{ color: cfg.color, fontFamily: 'var(--font-display)' }}>{count}</div>
                              <div className="text-[11px] uppercase tracking-[0.2em] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>{sev}</div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>

                    {/* Scan tool status panels */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.4 }}
                    >
                      <div className="text-[11px] uppercase tracking-[0.28em] text-white/25 mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
                        Scan Pipeline
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                        {[
                          { id: 'semgrep', name: 'Pattern Audit', desc: 'Static pattern search', disabled: true },
                          { id: 'bandit', name: 'Python Audit', desc: 'Security vulnerability scanner', disabled: false },
                          { id: 'ruff', name: 'Python Lint', desc: 'Style & quality checker', disabled: false },
                          { id: 'eslint', name: 'JS/TS Lint', desc: 'Static analysis & style', disabled: false },
                          { id: 'lizard', name: 'Complexity', desc: 'Cyclomatic complexity analysis', disabled: false },
                          { id: 'madge', name: 'Architecture', desc: 'Module dependency mapping', disabled: false },
                          { id: 'jscpd', name: 'Duplicates', desc: 'Copy-paste detection', disabled: false },
                          { id: 'pydeps', name: 'Py Architecture', desc: 'Python module graph', disabled: false },
                          { id: 'radon', name: 'Py Metrics', desc: 'Code quality metrics', disabled: false },
                          { id: 'osv-scanner', name: 'Dependencies', desc: 'Vulnerability scanner', disabled: false },
                        ].map(tool => (
                          <div
                            key={tool.id}
                            className={`relative p-3 border ${tool.disabled ? 'border-yellow-500/20 bg-yellow-500/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'} transition-all overflow-hidden`}
                            style={{ borderRadius: '1px' }}
                          >
                            {tool.disabled && (
                              <>
                                <div className="absolute inset-0 backdrop-blur-[2px] bg-[rgba(5,8,22,0.55)] z-10" />
                                <div className="absolute inset-0 z-20 flex items-center justify-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <AlertTriangle size={14} className="text-yellow-400/80 animate-pulse" />
                                    <span className="text-[9px] uppercase tracking-[0.14em] text-yellow-400/70 text-center px-2" style={{ fontFamily: 'var(--font-mono)' }}>
                                      Under Maintenance
                                    </span>
                                  </div>
                                </div>
                              </>
                            )}
                            <div className={tool.disabled ? 'opacity-20' : ''}>
                              <div className="text-[10px] text-white/60 mb-0.5" style={{ fontFamily: 'var(--font-display)' }}>{tool.name}</div>
                              <div className="text-[8px] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>{tool.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* ── SECURITY TAB ── */}
                {activeTab === 'Security' && scan && (
                  <div className="space-y-3 relative max-h-[420px] overflow-hidden">
                    {/* Maintenance blur when semgrep is under maintenance */}
                    <div className="absolute inset-0 z-30 bg-[rgba(5,8,22,0.65)] backdrop-blur-[3px] flex flex-col items-center gap-4" style={{ borderRadius: '1px', paddingTop: '80px', minHeight: '320px' }}>
                      <div className="w-14 h-14 rounded-[1px] border border-yellow-500/30 flex items-center justify-center" style={{ background: 'rgba(234,179,8,0.08)', boxShadow: '0 0 24px rgba(234,179,8,0.18)' }}>
                        <AlertTriangle size={28} className="text-yellow-400/80" />
                      </div>
                      <span className="text-[13px] uppercase tracking-[0.28em] text-yellow-400/70" style={{ fontFamily: 'var(--font-mono)' }}>
                        Security module under maintenance
                      </span>
                      <p className="text-sm text-white/40 max-w-sm text-center leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                        Semgrep, our pattern-based security scanner, is being rewritten. Security findings are unavailable until the new engine is deployed.
                      </p>
                    </div>
                    {/* Blurred content beneath */}
                    <div className="pointer-events-none select-none" style={{ filter: 'blur(4px)' }}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[11px] uppercase tracking-[0.28em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>
                        {`${groupedFindings.length} findings detected`}
                      </span>
                      <div className="flex-1 h-px bg-white/[0.05]" />
                      <span className="text-[11px] text-white/20" style={{ fontFamily: 'var(--font-mono)' }}>
                        by Semgrep + Bandit
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(['critical','high','medium','low'] as SeverityLevel[]).map(sev => {
                        const cfg = severityConfig[sev];
                        const isActive = activeFilters.has(sev);
                        return (
                          <button
                            key={sev}
                            onClick={() => toggleFilter(sev)}
                            className="text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 border transition-all"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              borderRadius: '1px',
                              color: isActive ? cfg.color : 'rgba(255,255,255,0.25)',
                              borderColor: isActive ? cfg.border : 'rgba(255,255,255,0.08)',
                              backgroundColor: isActive ? cfg.bg : 'rgba(255,255,255,0.02)',
                            }}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                    {findingFilterActive && groupedFindings.length === 0 ? (
                      <div className="text-[11px] text-white/20 py-6 text-center" style={{ fontFamily: 'var(--font-mono)' }}>No findings match selected filters.</div>
                    ) : (
                      groupedFindings.map((finding: { id: string; severity: SeverityLevel; title: string; description: string; file: string; line: number; tool: string; recommendation: string; lineRange?: string; lineCount?: number }) => {
                        const cfg = severityConfig[finding.severity];
                        const Icon = cfg.icon;
                        const isOpen = expanded === finding.id;
                        return (
                          <motion.div
                            key={finding.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
                            className="border overflow-hidden"
                            style={{ borderRadius: '1px', backgroundColor: cfg.bg, borderColor: cfg.border }}
                          >
                            <button
                              onClick={() => setExpanded(isOpen ? null : finding.id)}
                              className="w-full flex items-center gap-4 p-4 text-left"
                            >
                              <Icon size={14} style={{ color: cfg.color, flexShrink: 0 }} />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-white/80" style={{ fontFamily: 'var(--font-display)' }}>{finding.title}</div>
                                <div className="text-[11px] text-white/30 mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                                  {finding.file}:{finding.lineRange || finding.line}{finding.lineCount ? ` (${finding.lineCount} hits)` : ''}
                                </div>
                              </div>
                              <span
                                className="text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 border"
                                style={{ color: cfg.color, borderColor: cfg.border, borderRadius: '1px', fontFamily: 'var(--font-mono)' }}
                              >
                                {finding.tool}
                              </span>
                              <span
                                className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 border"
                                style={{ color: cfg.color, borderColor: cfg.border, borderRadius: '1px', fontFamily: 'var(--font-mono)' }}
                              >
                                {finding.severity}
                              </span>
                              <motion.div
                                animate={{ rotate: isOpen ? 180 : 0 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                              >
                                <ChevronDown size={12} className="text-white/25 flex-shrink-0" />
                              </motion.div>
                            </button>
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
                                  className="border-t border-white/[0.06] overflow-hidden"
                                >
                                  <div className="px-4 py-4 space-y-3">
                                    <p className="text-xs text-white/45 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{finding.description}</p>
                                    <div className="p-3 bg-white/[0.03] border border-white/[0.05]" style={{ borderRadius: '1px' }}>
                                      <div className="text-[11px] uppercase tracking-[0.22em] text-white/20 mb-1.5" style={{ fontFamily: 'var(--font-mono)' }}>Recommendation</div>
                                      <p className="text-xs text-white/55 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{finding.recommendation}</p>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                  </div>
                )}

                {/* ── CODE QUALITY TAB ── */}
                {activeTab === 'Code Quality' && scan && (
                  <div className="space-y-4">
                    {/* Quality Metrics bars */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="glass border border-white/[0.07] p-5"
                      style={{ borderRadius: '1px' }}
                    >
                      <div className="text-[11px] uppercase tracking-[0.28em] text-white/25 mb-5" style={{ fontFamily: 'var(--font-mono)' }}>
                        Quality Metrics
                      </div>
                      <div className="space-y-4">
                        {[
                          { label: 'Maintainability', value: scan.codeQualityScore ?? 0 },
                          { label: 'Lint Score', value: scan.codeQualityDetails?.lintScore ?? 0 },
                          { label: 'Doc Coverage', value: scan.codeQualityDetails?.docCoverage ?? 0 },
                          { label: 'Test Quality', value: scan.codeQualityDetails?.testQuality ?? 0 },
                          { label: 'Consistency', value: scan.codeQualityDetails?.consistencyScore ?? 0 },
                        ].map((m, i) => (
                          <SegmentBar key={m.label} label={m.label} value={m.value} segments={24} segmentHeight={8} delay={i * 0.07} labelWidth={120} />
                        ))}
                      </div>
                    </motion.div>

                    {/* Complexity + Test metrics side-by-side */}
                    <div className="grid grid-cols-2 gap-4">
                      {scan.codeQualityDetails?.complexityDist && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1, duration: 0.4 }}
                          className="glass border border-white/[0.07] p-5"
                          style={{ borderRadius: '1px' }}
                        >
                          <div className="text-[11px] uppercase tracking-[0.28em] text-white/25 mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
                            Complexity Distribution
                          </div>
                          <ComplexityMiniChart dist={scan.codeQualityDetails.complexityDist} delay={0.15} />
                        </motion.div>
                      )}

                      {scan.codeQualityDetails?.testMetrics && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15, duration: 0.4 }}
                          className="glass border border-white/[0.07] p-5"
                          style={{ borderRadius: '1px' }}
                        >
                          <div className="text-[11px] uppercase tracking-[0.28em] text-white/25 mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
                            Test Health
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <TestMetricCard icon={TestTube} label="Total" value={`${scan.codeQualityDetails.testMetrics.totalTests}`} sub="tests" color="var(--accent)" delay={0.2} />
                            <TestMetricCard icon={CheckSquare} label="Passing" value={`${scan.codeQualityDetails.testMetrics.passing}`} sub={`${Math.round(scan.codeQualityDetails.testMetrics.passing / scan.codeQualityDetails.testMetrics.totalTests * 100)}%`} color="#4ade80" delay={0.25} />
                            <TestMetricCard icon={XCircle} label="Failing" value={`${scan.codeQualityDetails.testMetrics.failing}`} sub="need attention" color="#ef4444" delay={0.3} />
                            <TestMetricCard icon={Flame} label="Flaky" value={`${scan.codeQualityDetails.testMetrics.flaky}`} sub={`${scan.codeQualityDetails.testMetrics.avgDuration}s avg`} color="#facc15" delay={0.35} />
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Code Smells — expandable */}
                    {scan.codeSmells && scan.codeSmells.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                        className="glass border border-white/[0.07] p-5"
                        style={{ borderRadius: '1px' }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-[11px] uppercase tracking-[0.28em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>
                            Code Smells
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(['critical','high','medium','low'] as SeverityLevel[]).map(sev => {
                              const cfg = severityConfig[sev];
                              const isActive = activeFilters.has(`smell-${sev}`);
                              return (
                                <button
                                  key={sev}
                                  onClick={() => toggleFilter(`smell-${sev}`)}
                                  className="text-[9px] uppercase tracking-[0.16em] px-1.5 py-0.5 border transition-all"
                                  style={{
                                    fontFamily: 'var(--font-mono)',
                                    borderRadius: '1px',
                                    color: isActive ? cfg.color : 'rgba(255,255,255,0.25)',
                                    borderColor: isActive ? cfg.border : 'rgba(255,255,255,0.08)',
                                    backgroundColor: isActive ? cfg.bg : 'rgba(255,255,255,0.02)',
                                  }}
                                >
                                  {cfg.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {smellFilterActive && filteredSmells.length === 0 ? (
                          <div className="text-[11px] text-white/20 py-4 text-center" style={{ fontFamily: 'var(--font-mono)' }}>No smells match selected filters.</div>
                        ) : (
                          <div className="space-y-2.5">
                            {filteredSmells.map((smell: CodeSmell, i: number) => {
                              const isOpen = expanded === smell.id;
                              const sev = smell.severity ?? 'medium';
                              const cfg = severityConfig[sev];
                              return (
                                <motion.div
                                  key={smell.id}
                                  layout
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.25 + i * 0.04, duration: 0.3 }}
                                  className="border overflow-hidden"
                                  style={{ borderRadius: '1px', backgroundColor: 'rgba(255,255,255,0.02)', borderColor: cfg.border }}
                                >
                                  <button
                                    onClick={() => setExpanded(isOpen ? null : smell.id)}
                                    className="w-full flex items-center gap-3 p-3 text-left"
                                  >
                                    <span
                                      className="text-[10px] uppercase tracking-[0.18em] px-1.5 py-0.5 border flex-shrink-0"
                                      style={{ color: cfg.color, borderColor: cfg.border, borderRadius: '1px', fontFamily: 'var(--font-mono)' }}
                                    >
                                      {sev}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs text-white/60" style={{ fontFamily: 'var(--font-display)' }}>{smell.type}</div>
                                      <div className="text-[11px] text-white/25 mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>{smell.file}</div>
                                    </div>
                                    <span className="text-sm text-white/40 flex-shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>×{smell.count}</span>
                                    <motion.div
                                      animate={{ rotate: isOpen ? 180 : 0 }}
                                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                    >
                                      <ChevronDown size={12} className="text-white/25 flex-shrink-0" />
                                    </motion.div>
                                  </button>
                                  <AnimatePresence initial={false}>
                                    {isOpen && smell.description && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
                                        className="border-t border-white/[0.06] overflow-hidden"
                                      >
                                        <div className="px-3 py-3 space-y-2.5">
                                          <p className="text-xs text-white/45 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{smell.description}</p>
                                          {smell.codeSnippet && (
                                            <div className="p-2.5 bg-black/40 border border-white/[0.06]" style={{ borderRadius: '1px' }}>
                                              <pre className="text-[11px] text-white/35 leading-relaxed overflow-x-auto" style={{ fontFamily: 'var(--font-mono)' }}>
                                                <code>{smell.codeSnippet}</code>
                                              </pre>
                                            </div>
                                          )}
                                          {smell.recommendation && (
                                            <div className="p-2.5 bg-white/[0.02] border border-white/[0.05]" style={{ borderRadius: '1px' }}>
                                              <div className="text-[10px] uppercase tracking-[0.22em] text-white/20 mb-1" style={{ fontFamily: 'var(--font-mono)' }}>Fix</div>
                                              <p className="text-xs text-white/50 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{smell.recommendation}</p>
                                            </div>
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}

                {/* ── ARCHITECTURE TAB ── */}
                {activeTab === 'Architecture' && scan && (
                  <div className="space-y-4">
                    {/* Architecture score + sub-scores */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="glass border border-white/[0.07] p-5"
                      style={{ borderRadius: '1px' }}
                    >
                      <div className="text-[11px] uppercase tracking-[0.28em] text-white/25 mb-5" style={{ fontFamily: 'var(--font-mono)' }}>
                        Architecture Health
                      </div>
                      <div className="grid grid-cols-4 gap-4 mb-5">
                        {[
                          { label: 'Overall', value: scan.architectureScore ?? 0 },
                          { label: 'Coupling', value: scan.architectureDetails?.couplingScore ?? 0 },
                          { label: 'Cohesion', value: scan.architectureDetails?.cohesionScore ?? 0 },
                          { label: 'Modularity', value: scan.architectureDetails?.modularityScore ?? 0 },
                        ].map((s, i) => (
                          <div key={s.label} className="text-center">
                            <motion.span
                              className="text-3xl text-white block mb-1"
                              style={{ fontFamily: 'var(--font-display)' }}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.06, duration: 0.4 }}
                            >
                              {s.value}
                            </motion.span>
                            <span className="text-[11px] uppercase tracking-[0.18em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>{s.label}</span>
                            <div className="mt-2">
                              <SegmentBar value={s.value} segments={12} segmentHeight={4} showValue={false} delay={i * 0.06} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <MiniBar label="Layer Sep" value={scan.architectureDetails?.layerSeparation ?? 0} max={100} color="var(--accent)" delay={0.25} />
                      </div>
                    </motion.div>

                    {/* Layer breakdown */}
                    {scan.architectureDetails?.layerBreakdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                        className="glass border border-white/[0.07] p-5"
                        style={{ borderRadius: '1px' }}
                      >
                        <div className="text-[11px] uppercase tracking-[0.28em] text-white/25 mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
                          Layer Breakdown
                        </div>
                        <div className="space-y-2.5">
                          {scan.architectureDetails.layerBreakdown.map((layer, i) => (
                            <div key={layer.layer} className="flex items-center gap-3">
                              <span className="text-[11px] text-white/40 w-28 flex-shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>{layer.layer}</span>
                              <div className="flex-1 h-[6px] bg-white/[0.04] overflow-hidden" style={{ borderRadius: '1px' }}>
                                <motion.div
                                  className="h-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${layer.score}%` }}
                                  transition={{ delay: 0.15 + i * 0.07, duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
                                  style={{
                                    backgroundColor: layer.score > 75 ? 'var(--accent)' : layer.score > 50 ? '#facc15' : '#ef4444',
                                    opacity: 0.8,
                                    boxShadow: layer.score > 75 ? `0 0 6px var(--accent)44` : undefined,
                                  }}
                                />
                              </div>
                              <span className="text-[11px] text-white/30 w-8 text-right" style={{ fontFamily: 'var(--font-mono)' }}>{layer.files}</span>
                              <span className="text-[11px] text-white/40 w-6 text-right" style={{ fontFamily: 'var(--font-mono)' }}>{layer.score}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Coupling graph */}
                    {scan.architectureDetails?.couplingGraph && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.4 }}
                        className="glass border border-white/[0.07] p-5"
                        style={{ borderRadius: '1px' }}
                      >
                        <div className="text-[11px] uppercase tracking-[0.28em] text-white/25 mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
                          Coupling Graph
                        </div>
                        <div className="space-y-2">
                          {scan.architectureDetails.couplingGraph.map((edge, i) => (
                            <div key={`${edge.from}-${edge.to}`} className="flex items-center gap-2">
                              <span className="text-[11px] text-white/40" style={{ fontFamily: 'var(--font-mono)' }}>{edge.from}</span>
                              <ChevronRight size={10} className="text-white/15" />
                              <span className="text-[11px] text-white/40" style={{ fontFamily: 'var(--font-mono)' }}>{edge.to}</span>
                              <div className="flex-1 h-[4px] bg-white/[0.04] overflow-hidden" style={{ borderRadius: '1px' }}>
                                <motion.div
                                  className="h-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${edge.strength}%` }}
                                  transition={{ delay: 0.2 + i * 0.06, duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
                                  style={{
                                    backgroundColor: edge.strength > 75 ? '#ef4444' : edge.strength > 50 ? '#facc15' : 'var(--accent)',
                                    opacity: 0.7,
                                  }}
                                />
                              </div>
                              <span className="text-[11px] text-white/30 w-8 text-right" style={{ fontFamily: 'var(--font-mono)' }}>{edge.strength}%</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Patterns + Anti-patterns */}
                    <div className="grid grid-cols-2 gap-4">
                      {scan.architectureDetails?.detectedPatterns && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2, duration: 0.4 }}
                          className="glass border border-white/[0.07] p-5"
                          style={{ borderRadius: '1px' }}
                        >
                          <div className="text-[11px] uppercase tracking-[0.28em] text-white/25 mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
                            Detected Patterns
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {scan.architectureDetails.detectedPatterns.map((p, i) => (
                              <motion.span
                                key={p}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.25 + i * 0.05, duration: 0.3, ease: [0.34,1.56,0.64,1] }}
                                className="text-[11px] px-2.5 py-1 border"
                                style={{
                                  borderRadius: '1px',
                                  color: 'var(--accent)',
                                  borderColor: 'rgba(16,185,129,0.2)',
                                  backgroundColor: 'rgba(16,185,129,0.05)',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                {p}
                              </motion.span>
                            ))}
                          </div>
                        </motion.div>
                      )}
                      {scan.architectureDetails?.antiPatterns && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.25, duration: 0.4 }}
                          className="glass border border-white/[0.07] p-5"
                          style={{ borderRadius: '1px' }}
                        >
                          <div className="text-[11px] uppercase tracking-[0.28em] text-white/25 mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
                            Anti-Patterns
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {scan.architectureDetails.antiPatterns.map((p, i) => (
                              <motion.span
                                key={p}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 + i * 0.05, duration: 0.3, ease: [0.34,1.56,0.64,1] }}
                                className="text-[11px] px-2.5 py-1 border"
                                style={{
                                  borderRadius: '1px',
                                  color: '#fb923c',
                                  borderColor: 'rgba(251,146,60,0.2)',
                                  backgroundColor: 'rgba(251,146,60,0.05)',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                {p}
                              </motion.span>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Dependency health */}
                    {scan.dependencies && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="glass border border-white/[0.07] p-5"
                        style={{ borderRadius: '1px' }}
                      >
                        <div className="text-[11px] uppercase tracking-[0.28em] text-white/25 mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
                          Dependency Health
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: 'Up to date', value: scan.dependencies.upToDate, color: 'var(--accent)' },
                            { label: 'Outdated', value: scan.dependencies.outdated, color: '#facc15' },
                            { label: 'Vulnerable', value: scan.dependencies.vulnerable, color: '#ef4444' },
                          ].map((d, i) => (
                            <motion.div
                              key={d.label}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.35 + i * 0.06, duration: 0.35, ease: [0.34,1.56,0.64,1] }}
                              className="text-center p-4 bg-white/[0.02] border border-white/[0.05]"
                              style={{ borderRadius: '1px' }}
                            >
                              <div className="text-2xl mb-1" style={{ color: d.color, fontFamily: 'var(--font-display)' }}>{d.value}</div>
                              <div className="text-[11px] uppercase tracking-[0.2em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>{d.label}</div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* ── SKILLS TAB ── */}
                {activeTab === 'Skills' && scan && (
                  <div className="space-y-4">
                    {/* Skills score card */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="glass border border-white/[0.07] p-5"
                      style={{ borderRadius: '1px' }}
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div className="text-[11px] uppercase tracking-[0.28em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>
                          Skill Assessment
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(['overestimated','underestimated','accurate'] as const).map(v => {
                            const cfg = verdictConfig[v];
                            const isActive = activeFilters.has(`skill-${v}`);
                            return (
                              <button
                                key={v}
                                onClick={() => toggleFilter(`skill-${v}`)}
                                className="text-[9px] uppercase tracking-[0.16em] px-1.5 py-0.5 border transition-all"
                                style={{
                                  fontFamily: 'var(--font-mono)',
                                  borderRadius: '1px',
                                  color: isActive ? cfg.color : 'rgba(255,255,255,0.25)',
                                  borderColor: isActive ? cfg.border : 'rgba(255,255,255,0.08)',
                                  backgroundColor: isActive ? cfg.bg : 'rgba(255,255,255,0.02)',
                                }}
                              >
                                {v}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {skillFilterActive && filteredSkills.length === 0 ? (
                        <div className="text-[11px] text-white/20 py-4 text-center" style={{ fontFamily: 'var(--font-mono)' }}>No skills match selected filters.</div>
                      ) : (
                        <div className="space-y-5">
                          {filteredSkills.map((skill: { name: string; verdict: 'overestimated' | 'underestimated' | 'accurate'; claimed: number; actual: number; trend: number; evidence: string }, i: number) => {
                            const verdict = verdictConfig[skill.verdict];
                            const VerdictIcon = verdict.icon;
                            const isOpen = expanded === `skill-${skill.name}`;
                            return (
                              <motion.div
                                key={skill.name}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.07, duration: 0.35 }}
                                className="border overflow-hidden"
                                style={{ borderRadius: '1px', backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
                              >
                                <button
                                  onClick={() => setExpanded(isOpen ? null : `skill-${skill.name}`)}
                                  className="w-full p-4 text-left"
                                >
                                  <div className="flex items-center justify-between mb-2.5">
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm text-white/70" style={{ fontFamily: 'var(--font-display)' }}>{skill.name}</span>
                                      <span
                                        className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 border"
                                        style={{
                                          borderRadius: '1px',
                                          color: verdict.color,
                                          borderColor: verdict.border,
                                          backgroundColor: verdict.bg,
                                          fontFamily: 'var(--font-mono)',
                                        }}
                                      >
                                        <VerdictIcon size={10} />
                                        {skill.verdict}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {trendIcon(skill.trend)}
                                      <motion.div
                                        animate={{ rotate: isOpen ? 180 : 0 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                      >
                                        <ChevronDown size={12} className="text-white/25" />
                                      </motion.div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    {/* Claimed bar */}
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] uppercase tracking-[0.14em] text-white/20" style={{ fontFamily: 'var(--font-mono)' }}>Claimed</span>
                                        <span className="text-[11px] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>{skill.claimed}</span>
                                      </div>
                                      <div className="h-[4px] bg-white/[0.05] overflow-hidden" style={{ borderRadius: '1px' }}>
                                        <motion.div
                                          className="h-full"
                                          initial={{ width: 0 }}
                                          animate={{ width: `${skill.claimed}%` }}
                                          transition={{ delay: 0.15 + i * 0.07, duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
                                          style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                                        />
                                      </div>
                                    </div>
                                    {/* Actual bar */}
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] uppercase tracking-[0.14em] text-emerald-400/50" style={{ fontFamily: 'var(--font-mono)' }}>Actual</span>
                                        <span className="text-[11px] text-emerald-400" style={{ fontFamily: 'var(--font-mono)' }}>{skill.actual}</span>
                                      </div>
                                      <div className="h-[4px] bg-white/[0.05] overflow-hidden" style={{ borderRadius: '1px' }}>
                                        <motion.div
                                          className="h-full"
                                          initial={{ width: 0 }}
                                          animate={{ width: `${skill.actual}%` }}
                                          transition={{ delay: 0.25 + i * 0.07, duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
                                          style={{
                                            backgroundColor: 'var(--accent)',
                                            boxShadow: skill.actual >= skill.claimed ? '0 0 8px rgba(16,185,129,0.4)' : undefined,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </button>

                                <AnimatePresence initial={false}>
                                  {isOpen && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
                                      className="border-t border-white/[0.06] overflow-hidden"
                                    >
                                      <div className="px-4 py-3">
                                        <div className="text-[11px] uppercase tracking-[0.22em] text-white/20 mb-1.5" style={{ fontFamily: 'var(--font-mono)' }}>Evidence</div>
                                        <p className="text-xs text-white/45 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{skill.evidence}</p>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  </div>
                )}

                {/* ── HOTSPOTS TAB ── */}
                {activeTab === 'Hotspots' && scan && (
                  <div className="space-y-4">
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="glass border border-white/[0.07] p-5"
                      style={{ borderRadius: '1px' }}
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <Flame size={14} className="text-orange-400" />
                          <div className="text-[11px] uppercase tracking-[0.28em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>
                            Refactor Hotspots
                          </div>
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-white/20" style={{ fontFamily: 'var(--font-mono)' }}>
                          High churn + high complexity
                        </div>
                      </div>
                      {scan.hotspots && scan.hotspots.length > 0 ? (
                        <div className="space-y-3">
                          {scan.hotspots.map((spot, i) => (
                            <motion.div
                              key={spot.file}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05, duration: 0.35 }}
                              className="flex items-center justify-between p-3 border"
                              style={{ borderRadius: '1px', backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-xs text-white/70 truncate" style={{ fontFamily: 'var(--font-display)' }}>{spot.file}</div>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[10px] uppercase tracking-[0.14em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>
                                    {spot.language || 'unknown'}
                                  </span>
                                  <span className="text-[10px] uppercase tracking-[0.14em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>
                                    {spot.changes} changes
                                  </span>
                                  <span className="text-[10px] uppercase tracking-[0.14em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>
                                    complexity {spot.complexity}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="text-lg text-orange-400" style={{ fontFamily: 'var(--font-display)' }}>{spot.risk}</div>
                                  <div className="text-[9px] uppercase tracking-[0.14em] text-white/20" style={{ fontFamily: 'var(--font-mono)' }}>risk</div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-white/20 py-6 text-center" style={{ fontFamily: 'var(--font-mono)' }}>
                          No hotspot data available yet. Run a scan to generate churn + complexity hotspots.
                        </div>
                      )}
                    </motion.div>
                  </div>
                )}

                {!scan && !isScanning && (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="text-[11px] uppercase tracking-[0.4em] text-white/15 mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
                      No scan data
                    </div>
                    <p className="text-sm text-white/25 mb-6" style={{ fontFamily: 'var(--font-body)' }}>
                      {selectedRepo
                        ? 'Run a scan to see results for this repository.'
                        : 'Select a repository from the sidebar or upload files to begin.'}
                    </p>
                    {selectedRepo ? (
                      <motion.button
                        onClick={() => handleScan(selectedRepo)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-6 py-3 text-[11px] uppercase tracking-[0.24em] text-black"
                        style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}
                      >
                        <Play size={11} fill="currentColor" />
                        Run First Scan
                      </motion.button>
                    ) : (
                      <motion.button
                        onClick={() => {
                          const firstRepo = repos[0];
                          if (firstRepo) {
                            setSelectedRepo(firstRepo);
                            handleScan(firstRepo);
                          } else if (localFiles.length > 0) {
                            handleLocalScan();
                          } else {
                            showNotice('NO REPO SELECTED', 'Upload files in the sidebar or connect GitHub first.', 'info');
                          }
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-6 py-3 text-[11px] uppercase tracking-[0.24em] text-black"
                        style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}
                      >
                        <Play size={11} fill="currentColor" />
                        Run First Scan
                      </motion.button>
                    )}
                  </div>
                )}

              </motion.div>
            </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
