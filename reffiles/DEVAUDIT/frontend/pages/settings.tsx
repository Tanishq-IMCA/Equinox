'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import {
  ArrowLeft, User as UserIcon, Github, Bell, Shield, LogOut, Save, Eye, EyeOff,
  Check, Trash2, RefreshCw, BarChart3, Plus, Briefcase, GraduationCap, Pencil, Palette, RotateCcw, AlertTriangle,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { THEMES } from '@/lib/themes';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRateLimit } from '@/hooks/useRateLimit';
import { Footer } from '@/components/Landing/Footer';
import { showNotice } from '@/components/ui/NexusNotice';
import GlitchyText from '@/components/ui/GlitchyText';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { ResumeParser } from '@/components/ui/ResumeParser';
import { RollingTimer } from '@/components/ui/RollingTimer';
import { allTechOptions, techCategories, getTechInfo } from '@/lib/techConfig';
import { saveProfile, getProfile, changePassword, deleteAccount, getToolsStatus, unlinkGitHub } from '@/lib/api';
import { User, EducationItem, ProjectItem } from '@/types';

const sections = ['Profile', 'Education', 'Projects', 'GitHub', 'Notifications', 'Security', 'Usage', 'Appearance'];

const sectionIcons: Record<string, React.ReactNode> = {
  Profile: <UserIcon size={13} />,
  Education: <GraduationCap size={13} />,
  Projects: <Briefcase size={13} />,
  GitHub: <Github size={13} />,
  Notifications: <Bell size={13} />,
  Security: <Shield size={13} />,
  Usage: <BarChart3 size={13} />,
  Appearance: <Palette size={13} />,
};

const inputClass = "w-full input-glass px-4 py-3.5 text-sm text-white";
const textareaClass = "w-full input-glass px-4 py-3 text-sm text-white resize-none leading-relaxed";

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function formatStorage(mb: number) {
  if (mb < 1) return { value: (mb * 1024).toFixed(1), unit: 'KB' };
  if (mb < 1024) return { value: mb.toFixed(1), unit: 'MB' };
  return { value: (mb / 1024).toFixed(1), unit: 'GB' };
}

function formatDateInput(date?: string) {
  if (!date) return '';
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function formatDateRange(startDate?: string, endDate?: string, isPresent?: boolean) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmt = (date?: string) => {
    if (!date) return '...';
    const d = new Date(date);
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };
  const start = fmt(startDate);
  if (isPresent) return `${start} — Present`;
  const end = fmt(endDate);
  return `${start} — ${end}`;
}

function validateEducation(edu: EducationItem): string | null {
  if (!edu.institution.trim()) return 'Institution is required.';
  if (!edu.startDate) return 'Start date is required.';
  if (!edu.isPresent && edu.endDate) {
    const start = new Date(edu.startDate).getTime();
    const end = new Date(edu.endDate).getTime();
    if (end < start) return 'End date must be after start date.';
  }
  return null;
}

function validateProject(proj: ProjectItem): string | null {
  if (!proj.name.trim()) return 'Project name is required.';
  if (!proj.startDate) return 'Start date is required.';
  if (!proj.isPresent && proj.endDate) {
    const start = new Date(proj.startDate).getTime();
    const end = new Date(proj.endDate).getTime();
    if (end < start) return 'End date must be after start date.';
  }
  return null;
}

function smoothLine(points: { x: number; y: number }[]) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
    const cpx2 = curr.x - (curr.x - prev.x) * 0.4;
    d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

interface ToolInfo {
  id: string;
  name: string;
  description: string;
  implemented: boolean;
  backendName: string;
  disabled?: boolean;
}

const SCAN_TOOLS: ToolInfo[] = [
  { id: 'semgrep', name: 'Pattern Audit', backendName: 'Semgrep', description: 'Static pattern search across code for security and quality issues. Currently being rewritten.', implemented: true, disabled: true },
  { id: 'bandit', name: 'Python Audit', backendName: 'Bandit', description: 'Python-specific security vulnerability scanner. Checks for common security issues like hardcoded passwords, SQL injections, and unsafe imports.', implemented: true },
  { id: 'ruff', name: 'Python Lint', backendName: 'Ruff', description: 'Fast Python linter and style checker. Enforces PEP 8, detects unused imports, and suggests modern Python idioms.', implemented: true },
  { id: 'eslint', name: 'JS/TS Lint', backendName: 'ESLint', description: 'JavaScript/TypeScript static analysis and style enforcement. Catches bugs, enforces conventions, and auto-fixes common issues.', implemented: true },
  { id: 'lizard', name: 'Code Complexity', backendName: 'Lizard', description: 'Cyclomatic complexity analysis across Python, JavaScript, TypeScript, and more. Identifies overly complex functions and files.', implemented: true },
  { id: 'madge', name: 'Architecture Map', backendName: 'Madge', description: 'JavaScript/TypeScript dependency graph generator. Maps module relationships and detects circular dependencies.', implemented: true },
  { id: 'jscpd', name: 'Duplicate Detection', backendName: 'jscpd', description: 'Copy-paste detection across multiple languages. Finds duplicated code blocks that should be refactored.', implemented: true },
  { id: 'pydeps', name: 'Python Architecture', backendName: 'pydeps', description: 'Python module dependency visualisation. Maps import relationships and detects architectural coupling issues.', implemented: true },
  { id: 'radon', name: 'Python Metrics', backendName: 'Radon', description: 'Python code metrics including McCabe complexity, maintainability index, and raw LOC statistics.', implemented: true },
  { id: 'osv-scanner', name: 'Dependency Audit', backendName: 'OSV Scanner', description: 'Open-source vulnerability scanner for project dependencies. Cross-references lock files against the OSV database.', implemented: true },
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-11 h-6 border transition-all duration-300"
      style={{
        borderRadius: '1px',
        backgroundColor: value ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.08)',
        borderColor: value ? 'rgba(16,185,129,0.45)' : 'rgba(239,68,68,0.35)',
        boxShadow: value ? '0 0 16px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.05)' : '0 0 12px rgba(239,68,68,0.08)',
      }}
    >
      <div
        className="absolute top-1/2 left-1.5 right-1.5 h-[1px] transition-opacity duration-300"
        style={{ opacity: value ? 0.3 : 0, background: 'linear-gradient(90deg, transparent, #10b981, transparent)' }}
      />
      <motion.div
        animate={{ x: value ? 21 : 2, backgroundColor: value ? '#10b981' : '#ef4444' }}
        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
        className="absolute top-[3px] w-[18px] h-[18px]"
        style={{ borderRadius: '1px' }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user: authUser, logout, updateUser } = useAuth();
  const { scansUsed, scansAllowed, timeUntilReset, windowProgress } = useRateLimit();
  const { themeId, setThemeId, isCycling, startCycle, stopCycle, isSaving: isThemeSaving } = useTheme();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState('Profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Profile state
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [bio, setBio] = useState('');
  const [techStack, setTechStack] = useState<string[]>([]);
  const [role, setRole] = useState<User['occupation']>('professional');
  const [linkedin, setLinkedin] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [showMoreTech, setShowMoreTech] = useState(false);

  // Education / Projects
  const [education, setEducation] = useState<EducationItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [editingEducation, setEditingEducation] = useState<Set<string>>(new Set());
  const [editingProjects, setEditingProjects] = useState<Set<string>>(new Set());

  // Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notifications
  const [emailAlerts, setEmailAlerts] = useState(true);

  // Tools status (fetched live from backend)
  const [toolStatuses, setToolStatuses] = useState<Record<string, 'available' | 'unavailable' | 'checking' | 'disabled'>>(
    Object.fromEntries(SCAN_TOOLS.map(t => [t.id, t.disabled ? 'disabled' : 'checking']))
  );
  const [isCheckingTools, setIsCheckingTools] = useState(false);

  // Storage cap slider
  const [storageCap, setStorageCap] = useState(200);
  const [maxDiskSpace, setMaxDiskSpace] = useState(2000);
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      navigator.storage.estimate().then(est => {
        if (est.quota) setMaxDiskSpace(Math.round(est.quota / 1024 / 1024));
      }).catch(() => {});
    }
  }, []);

  // Check tool status on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await getToolsStatus();
        if (res.success) {
          setToolStatuses(Object.fromEntries(
            SCAN_TOOLS.map(t => [t.id, t.disabled ? 'disabled' : (res.tools[t.id] ? 'available' : 'unavailable')])
          ));
        } else {
          setToolStatuses(Object.fromEntries(SCAN_TOOLS.map(t => [t.id, t.disabled ? 'disabled' : 'unavailable'])));
        }
      } catch {
        setToolStatuses(Object.fromEntries(SCAN_TOOLS.map(t => [t.id, t.disabled ? 'disabled' : 'unavailable'])));
      }
    })();
  }, []);

  // Local storage usage / clear storage
  const [storageInfo, setStorageInfo] = useState({ used: 0, quota: 5 });
  const [showClearStorage, setShowClearStorage] = useState(false);
  const maxUsable = useMemo(() => {
    const free = Math.max(0, storageInfo.quota - storageInfo.used);
    return Math.max(0, free * 0.7);
  }, [storageInfo.quota, storageInfo.used]);
  const maxSlider = useMemo(() => Math.max(50, Math.round(maxUsable)), [maxUsable]);

  useEffect(() => {
    const fallback = () => {
      let total = 0;
      if (typeof window !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) total += (localStorage.getItem(key) || '').length;
        }
        total *= 2; // UTF-16
      }
      setStorageInfo({ used: total / 1024 / 1024, quota: 5 });
    };
    const estimate = async () => {
      if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
        try {
          const est = await navigator.storage.estimate();
          const used = (est.usage || 0) / 1024 / 1024;
          const quota = (est.quota || 5 * 1024 * 1024) / 1024 / 1024;
          if (used > 0) {
            setStorageInfo({ used, quota });
            return;
          }
        } catch { /* fall through to fallback */ }
      }
      fallback();
    };
    estimate();
  }, []);

  const handleClearStorage = () => {
    try {
      if (typeof window !== 'undefined') localStorage.clear();
      setStorageInfo({ used: 0, quota: storageInfo.quota });
      setShowClearStorage(false);
      showNotice('STORAGE CLEARED', 'Local storage has been reset. You may need to sign in again.', 'success');
    } catch {
      showNotice('CLEAR FAILED', 'Could not clear storage.', 'error');
    }
  };

  // Load user data from auth context (and refresh from backend)
  useEffect(() => {
    if (!authUser) return;
    setName(authUser.name || '');
    setAge(authUser.age ?? '');
    setTechStack(authUser.techStack || []);
    setEducation(authUser.education || []);
    setProjects(authUser.projects || []);
  }, [authUser]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getProfile()
      .then(res => {
        if (cancelled || !res.user) return;
        const u = res.user as Record<string, unknown>;
        const profile = (u.profile as Record<string, unknown>) || {};
        const dev = (u.developer as Record<string, unknown>) || {};
        // Keep the name derived from auth context if the backend has no fullName yet,
        // so the save payload never sends an empty fullName that fails validation.
        setName(prev => String(profile.fullName || prev || authUser?.name || ''));
        setAge(profile.age ? Number(profile.age) : '');
        setBio(String(profile.bio || ''));
        setRole((profile.role as User['occupation']) || 'professional');
        setTechStack((dev.techStack as string[]) || []);
        setLinkedin(String(dev.linkedin || ''));
        setPortfolio(String(dev.portfolio || ''));
        setEducation(((dev.education as unknown[]) || []).filter(Boolean) as EducationItem[]);
        setProjects(((dev.projects as unknown[]) || []).filter(Boolean) as ProjectItem[]);
      })
      .catch(() => {
        showNotice('PROFILE LOAD FAILED', 'Could not refresh profile from the server.', 'error');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const toggleTech = (t: string) => {
    setTechStack(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        profile: {
          fullName: name,
          age: age === '' ? null : Number(age),
          bio,
          role,
        },
        developer: {
          techStack,
          linkedin: linkedin || null,
          portfolio: portfolio || null,
          education,
          projects,
        },
      };
      const res = await saveProfile(payload);
      updateUser({
        name,
        age: age === '' ? undefined : Number(age),
        occupation: role,
        techStack,
        education,
        projects,
      });
      showNotice('SETTINGS SAVED', 'Your profile has been updated.', 'success');
      if (res.user) {
        const u = res.user as Record<string, unknown>;
        const profile = (u.profile as Record<string, unknown>) || {};
        const dev = (u.developer as Record<string, unknown>) || {};
        setName(String(profile.fullName || ''));
        setAge(profile.age ? Number(profile.age) : '');
        setBio(String(profile.bio || ''));
        setRole((profile.role as User['occupation']) || 'professional');
        setTechStack((dev.techStack as string[]) || []);
        setEducation(((dev.education as unknown[]) || []).filter(Boolean) as EducationItem[]);
        setProjects(((dev.projects as unknown[]) || []).filter(Boolean) as ProjectItem[]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      showNotice('SAVE FAILED', msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = () => {
    logout();
    router.push('/');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showNotice('MISSING FIELDS', 'Please fill in all password fields.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotice('PASSWORDS DO NOT MATCH', 'New password and confirmation must match.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showNotice('PASSWORD TOO SHORT', 'New password must be at least 8 characters.', 'error');
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      showNotice('PASSWORD UPDATED', 'Your password has been changed.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Password update failed';
      showNotice('PASSWORD UPDATE FAILED', msg, 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      showNotice('PASSWORD REQUIRED', 'Enter your password to delete your account.', 'error');
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAccount({ password: deletePassword });
      logout();
      router.push('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Account deletion failed';
      showNotice('DELETE FAILED', msg, 'error');
      setIsDeleting(false);
    }
  };

  // Education helpers
  const addEducation = () => {
    const id = generateId();
    setEducation(e => [...e, {
      id,
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      isPresent: true,
      description: '',
    }]);
    setEditingEducation(s => new Set(s).add(id));
  };

  const updateEducation = (id: string, updates: Partial<EducationItem>) => {
    setEducation(e => e.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeEducation = (id: string) => {
    setEducation(e => e.filter(item => item.id !== id));
    setEditingEducation(s => { const n = new Set(s); n.delete(id); return n; });
  };

  const saveEducationCard = (id: string) => {
    const item = education.find(e => e.id === id);
    if (!item) return;
    const error = validateEducation(item);
    if (error) {
      showNotice('INVALID EDUCATION', error, 'error');
      return;
    }
    setEditingEducation(s => { const n = new Set(s); n.delete(id); return n; });
  };

  const editEducationCard = (id: string) => {
    setEditingEducation(s => new Set(s).add(id));
  };

  // Project helpers
  const addProject = () => {
    const id = generateId();
    setProjects(p => [...p, {
      id,
      name: '',
      description: '',
      url: '',
      startDate: '',
      endDate: '',
      isPresent: true,
      technologies: [],
    }]);
    setEditingProjects(s => new Set(s).add(id));
  };

  const updateProject = (id: string, updates: Partial<ProjectItem>) => {
    setProjects(p => p.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeProject = (id: string) => {
    setProjects(p => p.filter(item => item.id !== id));
    setEditingProjects(s => { const n = new Set(s); n.delete(id); return n; });
  };

  const saveProjectCard = (id: string) => {
    const item = projects.find(p => p.id === id);
    if (!item) return;
    const error = validateProject(item);
    if (error) {
      showNotice('INVALID PROJECT', error, 'error');
      return;
    }
    setEditingProjects(s => { const n = new Set(s); n.delete(id); return n; });
  };

  const editProjectCard = (id: string) => {
    setEditingProjects(s => new Set(s).add(id));
  };

  const toggleProjectTech = (id: string, tech: string) => {
    setProjects(p => p.map(item => {
      if (item.id !== id) return item;
      const techs = item.technologies.includes(tech)
        ? item.technologies.filter(t => t !== tech)
        : [...item.technologies, tech];
      return { ...item, technologies: techs };
    }));
  };

  const handleResumeParsed = (parsed: import('@/lib/resumeParser').ParsedResume, mode: 'merge' | 'overwrite' = 'merge') => {
    if (mode === 'overwrite') {
      setName(parsed.name || name);
      setBio(parsed.bio || bio);
      setTechStack(parsed.skills);
    } else {
      if (parsed.name && !name) setName(parsed.name);
      if (parsed.bio && !bio) setBio(parsed.bio);
      if (parsed.skills.length) setTechStack(s => Array.from(new Set([...s, ...parsed.skills])));
    }
    if (parsed.experience) {
      // Experience is stored as a project-like entry for now; append a summary project if none exists
    }
    const newEducation = parsed.education.map(e => ({ ...e, id: generateId() }));
    const newProjects = parsed.projects.map(p => ({ ...p, id: generateId() }));
    if (mode === 'overwrite') {
      setEducation(newEducation);
      setProjects(newProjects);
    } else {
      setEducation(e => [...e, ...newEducation]);
      setProjects(p => [...p, ...newProjects]);
    }
    newEducation.forEach(e => setEditingEducation(s => new Set(s).add(e.id)));
    newProjects.forEach(p => setEditingProjects(s => new Set(s).add(p.id)));
    // Only jump to a section if the resume actually yielded something to review.
    if (newEducation.length) setActiveSection('Education');
    else if (newProjects.length) setActiveSection('Projects');
    else if (parsed.skills.length) setActiveSection('Profile');
    showNotice('RESUME PARSED', 'Review the extracted details before saving.', 'success');
  };

  const handleRecheckTools = async () => {
    setIsCheckingTools(true);
    setToolStatuses(Object.fromEntries(SCAN_TOOLS.map(t => [t.id, 'checking'])));
    try {
      const res = await getToolsStatus();
      if (res.success) {
        setToolStatuses(Object.fromEntries(
          SCAN_TOOLS.map(t => [t.id, res.tools[t.id] ? 'available' : 'unavailable'])
        ));
      } else {
        setToolStatuses(Object.fromEntries(SCAN_TOOLS.map(t => [t.id, 'unavailable'])));
      }
    } catch {
      setToolStatuses(Object.fromEntries(SCAN_TOOLS.map(t => [t.id, 'unavailable'])));
    }
    setIsCheckingTools(false);
  };

  // Graph data (sample until real scan history is implemented)
  const graphWidth = 600;
  const graphHeight = 120;
  const graphPoints = [
    { x: 0, y: 80 }, { x: 80, y: 60 }, { x: 160, y: 90 }, { x: 240, y: 40 },
    { x: 320, y: 70 }, { x: 400, y: 30 }, { x: 480, y: 50 }, { x: 560, y: 20 },
  ];
  const linePath = smoothLine(graphPoints);
  const areaPath = `${linePath} L ${graphWidth} ${graphHeight} L 0 ${graphHeight} Z`;

  const renderStatusDot = (status: string, disabled?: boolean) => {
    const isDisabled = disabled || status === 'disabled';
    const color = isDisabled ? '#facc15' : status === 'available' ? 'var(--accent)' : status === 'checking' ? '#fbbf24' : '#ef4444';
    const label = isDisabled ? 'Under Maintenance' : status === 'available' ? 'Available' : status === 'checking' ? 'Checking' : status === 'failed' ? 'Failed' : 'Unavailable';
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          {status === 'checking' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />}
          {isDisabled && <span className="animate-pulse absolute inline-flex h-full w-full rounded-full opacity-50" style={{ backgroundColor: color }} />}
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: color }} />
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color, fontFamily: 'var(--font-mono)' }}>
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ fontFamily: 'var(--font-display)' }}>
      {/* Header */}
      <header className="border-b border-white/[0.05] sticky top-0 z-40 backdrop-blur-md bg-[rgba(5,8,22,0.7)]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-1.5 text-white/25 hover:text-white/60 transition-colors">
              <ArrowLeft size={14} />
            </Link>
            <div className="w-px h-4 bg-white/[0.08]" />
            <a href="/" className="text-sm uppercase tracking-[0.22em] text-white/40 hover:text-white/70 transition-colors smooth-glow">
              REPOSIGHT
            </a>
            <div className="text-white/15 text-sm">·</div>
            <span className="text-[11px] uppercase tracking-[0.22em] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>Settings</span>
          </div>
          <ConfirmButton
            onConfirm={handleSignOut}
            confirmText="Are you sure?"
            timeout={3000}
            lineColor="#ef4444"
            className="flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-white/25 hover:text-red-400/70 transition-colors border border-transparent hover:border-red-500/15 hover:bg-red-500/[0.04]"
            style={{ fontFamily: 'var(--font-mono)', borderRadius: '1px' }}>
            <LogOut size={12} />
            Sign out
          </ConfirmButton>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-[180px_1fr] gap-8">

          {/* Sidebar */}
          <nav className="space-y-0.5">
            {sections.map(s => {
              const active = activeSection === s;
              return (
                <button key={s} onClick={() => setActiveSection(s)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-xs text-left transition-all duration-300 border theme-reactive"
                  style={{
                    borderRadius: '1px',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '0.1em',
                    backgroundColor: active ? 'var(--accent-glow)' : 'transparent',
                    borderColor: active ? 'var(--accent-dim)' : 'rgba(255,255,255,0.08)',
                    color: active ? 'var(--accent)' : 'rgba(255,255,255,0.35)',
                    textShadow: active ? '0 0 12px var(--accent-glow)' : 'none',
                    boxShadow: active ? 'inset 2px 0 0 var(--accent), 0 0 16px -4px var(--accent-glow)' : 'none',
                  }}>
                  {sectionIcons[s]}
                  {s}
                </button>
              );
            })}
            <div className="pt-4 border-t border-white/[0.06]">
              <ConfirmButton
                onConfirm={handleSignOut}
                confirmText="Are you sure?"
                timeout={3000}
                lineColor="#ef4444"
                className="w-full flex items-center gap-3 px-4 py-3 text-xs text-left text-red-400/50 hover:text-red-400 transition-all duration-200 border border-transparent hover:border-red-500/15 hover:bg-red-500/[0.04]"
                style={{ borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
                <LogOut size={13} />
                Sign Out
              </ConfirmButton>
            </div>
          </nav>

          {/* Content */}
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeSection === 'Profile' && (
              <div className="glass border border-white/[0.07] p-8" style={{ borderRadius: '1px' }}>
                <GlitchyText text="PROFILE" as="h2"
                  className="text-xl text-white tracking-[0.12em] mb-1"
                  style={{ fontFamily: 'var(--font-display)' } as React.CSSProperties} />
                <p className="text-xs text-white/30 mb-8" style={{ fontFamily: 'var(--font-body)' }}>
                  Your identity used for audit calibration.
                </p>

                <div className="space-y-6">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 flex items-center justify-center text-2xl border border-white/[0.1] bg-white/[0.04]"
                      style={{ borderRadius: '1px', color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
                      {name[0]?.toUpperCase() || 'A'}
                    </div>
                    <div>
                      <p className="text-sm text-white" style={{ fontFamily: 'var(--font-display)' }}>{name || 'Anonymous'}</p>
                      <p className="text-[11px] text-white/30 mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                        {authUser?.email || 'demo@reposight.dev'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                        Display Name
                      </label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                        Age <span className="text-white/15">(opt)</span>
                      </label>
                      <input type="number" min={13} max={100} value={age} placeholder="25"
                        onChange={e => setAge(e.target.value === '' ? '' : Math.min(100, Math.max(13, Number(e.target.value))))}
                        className={inputClass} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                      Bio
                    </label>
                    <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                      placeholder="Short bio..."
                      className={textareaClass} />
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                      Role
                    </label>
                    <select value={role} onChange={e => setRole(e.target.value as User['occupation'])}
                      className={`${inputClass} bg-transparent`}>
                      {['student', 'junior', 'professional', 'senior', 'freelancer'].map(r => (
                        <option key={r} value={r} className="bg-[#0a0f24] text-white capitalize">{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-3 block" style={{ fontFamily: 'var(--font-mono)' }}>
                      Tech Stack
                    </label>
                    <div className="relative">
                      <div className={`overflow-hidden transition-all duration-300 ${showMoreTech ? 'max-h-[1000px]' : 'max-h-[180px]'}`}>
                        <div className="space-y-5">
                          {techCategories.map(category => (
                            <div key={category.name}>
                              <p className="text-xs text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                                {category.name}
                              </p>
                              <p className="text-[10px] text-white/30 mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                                {category.question}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {category.options.map(t => {
                                  const sel = techStack.includes(t);
                                  const info = getTechInfo(t);
                                  return (
                                    <motion.button key={t} onClick={() => toggleTech(t)}
                                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs transition-all duration-200 border"
                                      style={{
                                        borderRadius: '1px',
                                        fontFamily: 'var(--font-mono)',
                                        borderColor: sel ? info.color : 'rgba(255,255,255,0.07)',
                                        backgroundColor: sel ? info.bg : 'rgba(255,255,255,0.02)',
                                        color: sel ? info.color : 'rgba(255,255,255,0.35)',
                                        boxShadow: sel ? `0 0 12px ${info.bg}` : 'none',
                                      }}>
                                      <motion.div animate={{ scale: sel ? 1 : 0.8, opacity: sel ? 1 : 0.5 }}>
                                        {info.icon}
                                      </motion.div>
                                      {t}
                                      <AnimatePresence>
                                        {sel && (
                                          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                                            <Check size={9} />
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {!showMoreTech && (
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0a0f24]/90 to-transparent" />
                      )}
                    </div>
                    <button
                      onClick={() => setShowMoreTech(v => !v)}
                      className="mt-3 text-[10px] uppercase tracking-[0.24em] text-white/40 hover:text-white/70 transition-colors"
                      style={{ fontFamily: 'var(--font-mono)' }}>
                      {showMoreTech ? 'Show less' : 'Show more'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                        LinkedIn
                      </label>
                      <input type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." className={inputClass} />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                        Portfolio
                      </label>
                      <input type="url" value={portfolio} onChange={e => setPortfolio(e.target.value)} placeholder="https://..." className={inputClass} />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/[0.06]">
                    <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-3 block" style={{ fontFamily: 'var(--font-mono)' }}>
                      Import from Resume
                    </label>
                    <p className="text-xs text-white/30 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
                      Upload a PDF, DOCX, or TXT resume to auto-fill your profile details.
                    </p>
                    <ResumeParser
                      onParsed={handleResumeParsed}
                      hasExistingData={education.length > 0 || projects.length > 0}
                      compact
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'Education' && (
              <div className="glass border border-white/[0.07] p-8" style={{ borderRadius: '1px' }}>
                <div className="flex items-center justify-between mb-1">
                  <GlitchyText text="EDUCATION" as="h2"
                    className="text-xl text-white tracking-[0.12em]"
                    style={{ fontFamily: 'var(--font-display)' } as React.CSSProperties} />
                  <motion.button onClick={addEducation} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-black transition-all duration-200"
                    style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
                    <Plus size={13} /> Add
                  </motion.button>
                </div>
                <p className="text-xs text-white/30 mb-8" style={{ fontFamily: 'var(--font-body)' }}>
                  Schools, bootcamps, and certifications.
                </p>

                <div className="space-y-4">
                  {education.length === 0 && (
                    <p className="text-xs text-white/20" style={{ fontFamily: 'var(--font-body)' }}>
                      No education added yet. Click "Add" to start.
                    </p>
                  )}
                  {education.map((edu, index) => {
                    const isEditing = editingEducation.has(edu.id);
                    return isEditing ? (
                      <div key={edu.id} className="p-5 border border-white/[0.07] bg-white/[0.02] card-fade-in" style={{ borderRadius: '1px', animationDelay: `${index * 0.08}s` }}>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="col-span-2">
                            <label className="text-[10px] uppercase tracking-[0.28em] text-white/30 mb-1.5 block" style={{ fontFamily: 'var(--font-mono)' }}>Institution</label>
                            <input type="text" value={edu.institution}
                              onChange={e => updateEducation(edu.id, { institution: e.target.value })}
                              placeholder="University or school" className={inputClass} />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-[0.28em] text-white/30 mb-1.5 block" style={{ fontFamily: 'var(--font-mono)' }}>Degree</label>
                            <input type="text" value={edu.degree}
                              onChange={e => updateEducation(edu.id, { degree: e.target.value })}
                              placeholder="B.Sc., M.Sc." className={inputClass} />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-[0.28em] text-white/30 mb-1.5 block" style={{ fontFamily: 'var(--font-mono)' }}>Field of Study</label>
                            <input type="text" value={edu.field}
                              onChange={e => updateEducation(edu.id, { field: e.target.value })}
                              placeholder="Computer Science" className={inputClass} />
                          </div>
                        </div>
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-4 items-end mb-4">
                          <div>
                            <label className="text-[10px] uppercase tracking-[0.28em] text-white/30 mb-1.5 block" style={{ fontFamily: 'var(--font-mono)' }}>Start Date</label>
                            <input type="date" value={formatDateInput(edu.startDate)}
                              onChange={e => updateEducation(edu.id, { startDate: e.target.value })}
                              className={inputClass} />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-[0.28em] text-white/30 mb-1.5 block" style={{ fontFamily: 'var(--font-mono)' }}>
                              {edu.isPresent ? 'Graduation Date' : 'Ending Date'}
                            </label>
                            <input type="date" value={formatDateInput(edu.endDate)}
                              disabled={edu.isPresent}
                              onChange={e => updateEducation(edu.id, { endDate: e.target.value })}
                              className={`${inputClass} ${edu.isPresent ? 'opacity-30' : ''}`} />
                          </div>
                          <label className="flex items-center gap-2 text-[11px] text-white/40" style={{ fontFamily: 'var(--font-mono)' }}>
                            <input type="checkbox" checked={edu.isPresent}
                              onChange={e => updateEducation(edu.id, { isPresent: e.target.checked, endDate: e.target.checked ? '' : edu.endDate })}
                              className="accent-emerald-500" />
                            Present
                          </label>
                        </div>
                        <div className="mb-4">
                          <label className="text-[10px] uppercase tracking-[0.28em] text-white/30 mb-1.5 block" style={{ fontFamily: 'var(--font-mono)' }}>Description</label>
                          <textarea value={edu.description} rows={2}
                            onChange={e => updateEducation(edu.id, { description: e.target.value })}
                            placeholder="Honors, GPA, relevant coursework..." className={textareaClass} />
                        </div>
                        <div className="flex justify-between">
                          <button onClick={() => removeEducation(edu.id)}
                            className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-red-400/50 hover:text-red-400 transition-colors"
                            style={{ fontFamily: 'var(--font-display)' }}>
                            <Trash2 size={12} /> Remove
                          </button>
                          <motion.button onClick={() => saveEducationCard(edu.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-black transition-all duration-200"
                            style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
                            <Save size={12} /> Save Card
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      <div key={edu.id} className="p-5 border border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] transition-colors card-fade-in" style={{ borderRadius: '1px', animationDelay: `${index * 0.08}s` }}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="text-sm text-white truncate" style={{ fontFamily: 'var(--font-display)' }}>
                                {edu.institution || 'N/A'}
                              </p>
                              <span className="text-[10px] uppercase tracking-[0.2em] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>
                                {formatDateRange(edu.startDate, edu.endDate, edu.isPresent)}
                              </span>
                            </div>
                            <p className="text-xs text-white/50 mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                              {edu.degree || 'N/A'}{edu.field ? ` · ${edu.field}` : ''}
                            </p>
                            {edu.description && (
                              <p className="text-[11px] text-white/30 leading-relaxed line-clamp-2" style={{ fontFamily: 'var(--font-body)' }}>
                                {edu.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => editEducationCard(edu.id)}
                              className="p-2 text-white/25 hover:text-white/60 transition-colors border border-white/[0.07] hover:border-white/[0.15]"
                              style={{ borderRadius: '1px' }}>
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => removeEducation(edu.id)}
                              className="p-2 text-red-400/30 hover:text-red-400/70 transition-colors border border-red-500/[0.07] hover:border-red-500/[0.2]"
                              style={{ borderRadius: '1px' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeSection === 'Projects' && (
              <div className="glass border border-white/[0.07] p-8" style={{ borderRadius: '1px' }}>
                <div className="flex items-center justify-between mb-1">
                  <GlitchyText text="PROJECTS" as="h2"
                    className="text-xl text-white tracking-[0.12em]"
                    style={{ fontFamily: 'var(--font-display)' } as React.CSSProperties} />
                  <motion.button onClick={addProject} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-black transition-all duration-200"
                    style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
                    <Plus size={13} /> Add
                  </motion.button>
                </div>
                <p className="text-xs text-white/30 mb-8" style={{ fontFamily: 'var(--font-body)' }}>
                  Notable work you want the audit to consider.
                </p>

                <div className="space-y-4">
                  {projects.length === 0 && (
                    <p className="text-xs text-white/20" style={{ fontFamily: 'var(--font-body)' }}>
                      No projects added yet. Click "Add" to start.
                    </p>
                  )}
                  {projects.map((proj, index) => {
                    const isEditing = editingProjects.has(proj.id);
                    return isEditing ? (
                      <div key={proj.id} className="p-5 border border-white/[0.07] bg-white/[0.02] card-fade-in" style={{ borderRadius: '1px', animationDelay: `${index * 0.08}s` }}>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="col-span-2">
                            <label className="text-[10px] uppercase tracking-[0.28em] text-white/30 mb-1.5 block" style={{ fontFamily: 'var(--font-mono)' }}>Project Name</label>
                            <input type="text" value={proj.name}
                              onChange={e => updateProject(proj.id, { name: e.target.value })}
                              placeholder="e.g. RepoSight" className={inputClass} />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] uppercase tracking-[0.28em] text-white/30 mb-1.5 block" style={{ fontFamily: 'var(--font-mono)' }}>URL</label>
                            <input type="url" value={proj.url}
                              onChange={e => updateProject(proj.id, { url: e.target.value })}
                              placeholder="https://github.com/..." className={inputClass} />
                          </div>
                        </div>
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-4 items-end mb-4">
                          <div>
                            <label className="text-[10px] uppercase tracking-[0.28em] text-white/30 mb-1.5 block" style={{ fontFamily: 'var(--font-mono)' }}>Start Date</label>
                            <input type="date" value={formatDateInput(proj.startDate)}
                              onChange={e => updateProject(proj.id, { startDate: e.target.value })}
                              className={inputClass} />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-[0.28em] text-white/30 mb-1.5 block" style={{ fontFamily: 'var(--font-mono)' }}>Ending Date</label>
                            <input type="date" value={formatDateInput(proj.endDate)}
                              disabled={proj.isPresent}
                              onChange={e => updateProject(proj.id, { endDate: e.target.value })}
                              className={`${inputClass} ${proj.isPresent ? 'opacity-30' : ''}`} />
                          </div>
                          <label className="flex items-center gap-2 text-[11px] text-white/40" style={{ fontFamily: 'var(--font-mono)' }}>
                            <input type="checkbox" checked={proj.isPresent}
                              onChange={e => updateProject(proj.id, { isPresent: e.target.checked, endDate: e.target.checked ? '' : proj.endDate })}
                              className="accent-emerald-500" />
                            Present
                          </label>
                        </div>
                        <div className="mb-4">
                          <label className="text-[10px] uppercase tracking-[0.28em] text-white/30 mb-1.5 block" style={{ fontFamily: 'var(--font-mono)' }}>Description</label>
                          <textarea value={proj.description} rows={2}
                            onChange={e => updateProject(proj.id, { description: e.target.value })}
                            placeholder="What it does, your role, outcomes..." className={textareaClass} />
                        </div>
                        <div className="mb-4">
                          <label className="text-[10px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>Technologies</label>
                          <div className="flex flex-wrap gap-2">
                            {allTechOptions.map(t => {
                              const sel = proj.technologies.includes(t);
                              const info = getTechInfo(t);
                              return (
                                <button key={t} onClick={() => toggleProjectTech(proj.id, t)}
                                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] transition-all duration-200 border"
                                  style={{
                                    borderRadius: '1px',
                                    fontFamily: 'var(--font-mono)',
                                    borderColor: sel ? info.color : 'rgba(255,255,255,0.07)',
                                    backgroundColor: sel ? info.bg : 'rgba(255,255,255,0.02)',
                                    color: sel ? info.color : 'rgba(255,255,255,0.35)',
                                  }}>
                                  {info.icon} {t}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <button onClick={() => removeProject(proj.id)}
                            className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-red-400/50 hover:text-red-400 transition-colors"
                            style={{ fontFamily: 'var(--font-display)' }}>
                            <Trash2 size={12} /> Remove
                          </button>
                          <motion.button onClick={() => saveProjectCard(proj.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-black transition-all duration-200"
                            style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
                            <Save size={12} /> Save Card
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      <div key={proj.id} className="p-5 border border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] transition-colors card-fade-in" style={{ borderRadius: '1px', animationDelay: `${index * 0.08}s` }}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="text-sm text-white truncate" style={{ fontFamily: 'var(--font-display)' }}>
                                {proj.name || 'N/A'}
                              </p>
                              <span className="text-[10px] uppercase tracking-[0.2em] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>
                                {formatDateRange(proj.startDate, proj.endDate, proj.isPresent)}
                              </span>
                            </div>
                            {proj.url && (
                              <a href={proj.url} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-emerald-400/50 hover:text-emerald-400 truncate block mb-2"
                                style={{ fontFamily: 'var(--font-mono)' }}>
                                {proj.url}
                              </a>
                            )}
                            {proj.description && (
                              <p className="text-[11px] text-white/30 leading-relaxed line-clamp-2 mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                                {proj.description}
                              </p>
                            )}
                            {proj.technologies.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {proj.technologies.map(t => {
                                  const info = getTechInfo(t);
                                  return (
                                    <span key={t} className="px-1.5 py-0.5 text-[9px] border"
                                      style={{ borderRadius: '1px', fontFamily: 'var(--font-mono)', borderColor: info.color, color: info.color, backgroundColor: info.bg }}>
                                      {t}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => editProjectCard(proj.id)}
                              className="p-2 text-white/25 hover:text-white/60 transition-colors border border-white/[0.07] hover:border-white/[0.15]"
                              style={{ borderRadius: '1px' }}>
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => removeProject(proj.id)}
                              className="p-2 text-red-400/30 hover:text-red-400/70 transition-colors border border-red-500/[0.07] hover:border-red-500/[0.2]"
                              style={{ borderRadius: '1px' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeSection === 'GitHub' && (
              <div className="glass border border-white/[0.07] p-8" style={{ borderRadius: '1px' }}>
                <GlitchyText text="GITHUB CONNECTION" as="h2"
                  className="text-xl text-white tracking-[0.12em] mb-1"
                  style={{ fontFamily: 'var(--font-display)' } as React.CSSProperties} />
                <p className="text-xs text-white/30 mb-8" style={{ fontFamily: 'var(--font-body)' }}>
                  Connect your GitHub account to import repositories for analysis.
                </p>

                <div className="space-y-6">
                  {authUser?.githubUsername ? (
                    <div className="flex items-center gap-4 p-5 border border-emerald-500/[0.15] bg-emerald-500/[0.05]" style={{ borderRadius: '1px' }}>
                      <Github size={15} className="text-emerald-400/70" />
                      <div>
                        <p className="text-sm text-white" style={{ fontFamily: 'var(--font-display)' }}>
                          Connected as{' '}
                          <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                            @{authUser.githubUsername}
                          </span>
                        </p>
                        <p className="text-[11px] text-white/30 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>Public repositories accessible</p>
                      </div>
                      <div className="ml-auto flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Active
                        </div>
                        <ConfirmButton
                          onConfirm={async () => {
                            try {
                              const res = await unlinkGitHub();
                              if (res.success) updateUser({ githubUsername: undefined });
                              showNotice('GITHUB DISCONNECTED', res.message || 'GitHub account has been unlinked.', 'success');
                            } catch {
                              showNotice('DISCONNECT FAILED', 'Could not unlink GitHub. Try again later.', 'error');
                            }
                          }}
                          confirmText="Are you sure?"
                          timeout={3000}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-red-400/60 hover:text-red-400 transition-colors border border-red-400/20 hover:border-red-400/40"
                          style={{ borderRadius: '1px', fontFamily: 'var(--font-mono)' } as React.CSSProperties}
                          lineColor="#ef4444"
                        >
                          Unlink
                        </ConfirmButton>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 border border-white/[0.07] bg-white/[0.02]" style={{ borderRadius: '1px' }}>
                      <p className="text-sm text-white/60 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
                        GitHub is not connected. Connect your account to pull repositories into the dashboard.
                      </p>
                      <motion.button
                        onClick={() => window.location.href = '/api/auth/github'}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-5 py-2.5 text-[11px] uppercase tracking-[0.24em] text-black transition-all duration-200"
                        style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
                        <Github size={13} /> Connect with GitHub
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'Notifications' && (
              <div className="glass border border-white/[0.07] p-8" style={{ borderRadius: '1px' }}>
                <GlitchyText text="NOTIFICATIONS" as="h2"
                  className="text-xl text-white tracking-[0.12em] mb-1"
                  style={{ fontFamily: 'var(--font-display)' } as React.CSSProperties} />
                <p className="text-xs text-white/30 mb-8" style={{ fontFamily: 'var(--font-body)' }}>
                  Control when and how we reach you.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/[0.06]" style={{ borderRadius: '1px' }}>
                    <div>
                      <p className="text-sm text-white" style={{ fontFamily: 'var(--font-display)' }}>Scan complete alerts</p>
                      <p className="text-[11px] text-white/30 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>Email when a repository scan finishes</p>
                    </div>
                    <Toggle value={emailAlerts} onChange={setEmailAlerts} />
                  </div>
                  <div className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/[0.06]" style={{ borderRadius: '1px' }}>
                    <div>
                      <p className="text-sm text-white" style={{ fontFamily: 'var(--font-display)' }}>Weekly digest</p>
                      <p className="text-[11px] text-white/30 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>Summary of new findings every Monday</p>
                    </div>
                    <span className="px-3 py-1 text-[9px] uppercase tracking-[0.2em] text-white/40 border border-white/[0.12] bg-white/[0.02]" style={{ borderRadius: '1px', fontFamily: 'var(--font-mono)' }}>
                      Coming soon
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'Security' && (
              <div className="glass border border-white/[0.07] p-8" style={{ borderRadius: '1px' }}>
                <GlitchyText text="SECURITY" as="h2"
                  className="text-xl text-white tracking-[0.12em] mb-1"
                  style={{ fontFamily: 'var(--font-display)' } as React.CSSProperties} />
                <p className="text-xs text-white/30 mb-8" style={{ fontFamily: 'var(--font-body)' }}>
                  Manage your account security settings.
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                      Current Password
                    </label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="••••••••" className={`${inputClass} pr-12`} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                      New Password
                    </label>
                    <input type={showPassword ? 'text' : 'password'} value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                      Confirm New Password
                    </label>
                    <input type={showPassword ? 'text' : 'password'} value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••" className={inputClass} />
                  </div>
                  <motion.button onClick={handleChangePassword} disabled={isChangingPassword}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-6 py-3 text-[11px] uppercase tracking-[0.24em] text-black transition-all duration-200 disabled:opacity-60"
                    style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
                    {isChangingPassword ? <RefreshCw size={13} className="animate-spin" /> : <Shield size={13} />}
                    {isChangingPassword ? 'Updating...' : 'Update Password'}
                  </motion.button>

                  <div className="pt-6 border-t border-white/[0.06]">
                    <h3 className="text-xs uppercase tracking-[0.28em] text-red-400/70 mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                      Danger Zone
                    </h3>
                    <p className="text-xs text-white/25 mb-4 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                      Permanently delete your account and all associated data. This cannot be undone.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                          Confirm with Password
                        </label>
                        <div className="relative">
                          <input type={showDeletePassword ? 'text' : 'password'} value={deletePassword}
                            onChange={e => setDeletePassword(e.target.value)}
                            placeholder="Enter password to delete" className={`${inputClass} pr-12`} />
                          <button type="button" onClick={() => setShowDeletePassword(!showDeletePassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                            {showDeletePassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      <ConfirmButton
                        onConfirm={handleDeleteAccount}
                        confirmText="Are you sure?"
                        timeout={4000}
                        lineColor="#ef4444"
                        className="flex items-center gap-2 px-5 py-2.5 text-xs text-red-400/55 border border-red-500/[0.18] hover:text-red-400 hover:border-red-500/35 hover:bg-red-500/[0.05] transition-all duration-200 disabled:opacity-60"
                        style={{ borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
                        {isDeleting ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        {isDeleting ? 'Deleting...' : 'Delete Account'}
                      </ConfirmButton>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'Usage' && (
              <div className="glass border border-white/[0.07] p-8" style={{ borderRadius: '1px' }}>
                <GlitchyText text="SCAN USAGE" as="h2"
                  className="text-xl text-white tracking-[0.12em] mb-1"
                  style={{ fontFamily: 'var(--font-display)' } as React.CSSProperties} />
                <p className="text-xs text-white/30 mb-8" style={{ fontFamily: 'var(--font-body)' }}>
                  Your scan quota resets every 48 hours.
                </p>

                <div className="space-y-6">
                  {/* Quota */}
                  <div className="p-6 border border-white/[0.07] bg-white/[0.02]" style={{ borderRadius: '1px' }}>
                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                          Scan Quota
                        </div>
                        <div className="text-3xl text-white" style={{ fontFamily: 'var(--font-display)' }}>
                          {scansUsed}<span className="text-white/30 text-xl">/{scansAllowed}</span>
                        </div>
                        <div className="text-[11px] text-white/40 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                          {scansUsed} used of {scansAllowed} scans
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-white/20 mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                          Resets In
                        </div>
                        {authUser ? (
                          <RollingTimer
                            value={timeUntilReset || '48:00:00'}
                            className="text-2xl md:text-3xl text-[var(--accent)] drop-shadow-[0_0_8px_rgba(16,185,129,0.45)]"
                          />
                        ) : (
                          <div className="text-sm text-white/50" style={{ fontFamily: 'var(--font-mono)' }}>
                            Login required
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="h-[4px] bg-white/[0.05] overflow-hidden" style={{ borderRadius: '1px' }}>
                      <motion.div
                        className="h-full relative"
                        animate={{ width: `${windowProgress}%` }}
                        transition={{ duration: 1, ease: 'linear' }}
                        style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}
                      >
                        <div className="absolute right-0 top-0 bottom-0 w-[6px] bg-white/80" style={{ boxShadow: '0 0 8px var(--accent)' }} />
                      </motion.div>
                    </div>
                    <p className="text-[11px] text-white/20 mt-2" style={{ fontFamily: 'var(--font-mono)' }}>
                      Resets every 48 hours. Check the dashboard for live quota.
                    </p>
                  </div>

                  {/* Quota disclaimer */}
                  <div className="p-5 border border-[var(--accent)]/30 bg-white/[0.02]" style={{ borderRadius: '1px', boxShadow: '0 0 18px rgba(16,185,129,0.12), inset 0 0 0 1px rgba(16,185,129,0.15)' }}>
                    <p className="text-[11px] text-white/60 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                      Daily credits refresh in <span className="text-[var(--accent)] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{timeUntilReset || '48:00:00'}</span>. Unused credits do not carry over for future scans; a fresh quota is granted every 48 hours.
                    </p>
                  </div>

                  {/* Combined Storage */}
                  <div className="p-6 border border-white/[0.07] bg-white/[0.02]" style={{ borderRadius: '1px' }}>
                    {/* ── Repository Storage ── */}
                    <div className="flex items-start gap-3 mb-1">
                      <div className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                        Repository Storage
                      </div>
                    </div>
                    <p className="text-[11px] text-white/50 leading-relaxed mb-4 max-w-[48ch]" style={{ fontFamily: 'var(--font-body)' }}>
                      Large repositories are cloned locally to your device for offline scanning and analysis. Your source code never leaves your machine — all checks run locally against the cloned copy. Temporary files are cleaned up after each scan completes.
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-white/30 mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
                      <span className="flex items-center gap-1.5">
                        <Check size={10} className="text-emerald-400/70" /> Local-only processing
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Check size={10} className="text-emerald-400/70" /> Auto-cleaned after scan
                      </span>
                    </div>

                    {/* Thin separator */}
                    <hr className="border-t border-white/[0.06] my-5" />

                    {/* ── Storage Cap ── */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 gap-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                          Scan Storage Cap
                        </div>
                        <div className="text-3xl text-white" style={{ fontFamily: 'var(--font-display)' }}>
                          {Math.round(storageCap)}<span className="text-white/30 text-xl"> MB</span>
                          <span className="text-[13px] text-white/25 ml-3" style={{ fontFamily: 'var(--font-mono)' }}>
                            of {Math.round(maxUsable)} MB usable
                          </span>
                        </div>
                        <div className="text-[11px] text-white/40 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                          Max disk space for cloned repos. Slider capped at 70% of free space — system reserves 30% for safe operation.
                        </div>
                      </div>
                      <motion.button onClick={() => setShowClearStorage(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-white transition-all duration-200 border border-white/[0.1] hover:border-white/[0.2] self-start sm:self-auto"
                        style={{ borderRadius: '1px', fontFamily: 'var(--font-mono)' }}>
                        <Trash2 size={11} /> Clear Cache
                      </motion.button>
                    </div>

                    {/* Mixed-fill bar: green = available, red = used, yellow = system reserved */}
                    {(() => {
                      const quota = storageInfo.quota;
                      const used = storageInfo.used;
                      const free = Math.max(0, quota - used);
                      const usableFree = free * 0.7; // 70% of free is user-accessible
                      const sysReserved = free * 0.3; // 30% kept for safe operation
                      const usedPct = Math.min(100, (used / quota) * 100);
                      const usablePct = Math.min(100 - usedPct, (usableFree / quota) * 100);
                      const sysPct = Math.min(100 - usedPct - usablePct, (sysReserved / quota) * 100);
                      const emptyPct = Math.max(0, 100 - usedPct - usablePct - sysPct);
                      return (
                        <div className="h-[4px] w-full bg-white/[0.04] overflow-hidden flex" style={{ borderRadius: '1px' }}>
                          {usedPct > 0 && <div className="h-full" style={{ width: `${usedPct}%`, backgroundColor: '#ef4444', minWidth: usedPct > 0 ? '2px' : 0 }} />}
                          {usablePct > 0 && <div className="h-full" style={{ width: `${usablePct}%`, backgroundColor: 'var(--accent)', minWidth: usablePct > 0 ? '2px' : 0 }} />}
                          {sysPct > 0 && <div className="h-full" style={{ width: `${sysPct}%`, backgroundColor: '#eab308', minWidth: sysPct > 0 ? '2px' : 0 }} />}
                          {emptyPct > 0 && <div className="h-full flex-1" style={{ backgroundColor: 'transparent' }} />}
                        </div>
                      );
                    })()}

                    {/* Slider */}
                    <input
                      type="range"
                      min={50}
                      max={maxSlider}
                      value={Math.min(storageCap, maxSlider)}
                      onChange={e => setStorageCap(Number(e.target.value))}
                      className="w-full h-[3px] appearance-none cursor-pointer mt-4"
                      style={{
                        background: `linear-gradient(90deg, var(--accent) ${((Math.min(storageCap, maxSlider) - 50) / (maxSlider - 50)) * 100}%, rgba(255,255,255,0.08) ${((Math.min(storageCap, maxSlider) - 50) / (maxSlider - 50)) * 100}%)`,
                        borderRadius: '1px',
                        outline: 'none',
                      }}
                    />
                    <div className="flex items-center justify-between text-[10px] text-white/20 mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
                      <span>50 MB</span>
                      <span>{maxSlider} MB max</span>
                    </div>
                    <p className="text-[11px] text-white/30 mt-2 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                      Once the cap is reached, older scan data is cleaned automatically to make room for new scans.
                    </p>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/[0.06]">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-white/20" style={{ fontFamily: 'var(--font-mono)' }}>Legend</span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-[1px]" style={{ backgroundColor: 'var(--accent)' }} />
                        <span className="text-[10px] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>Available</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-[1px]" style={{ backgroundColor: '#ef4444' }} />
                        <span className="text-[10px] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>Used</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-[1px]" style={{ backgroundColor: '#eab308' }} />
                        <span className="text-[10px] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>System Reserved</span>
                      </div>
                    </div>
                  </div>

                  {/* Scan tools */}
                  <div className="p-6 border border-white/[0.07] bg-white/[0.02]" style={{ borderRadius: '1px' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[11px] uppercase tracking-[0.28em] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>
                        Scan Tools
                      </div>
                      <motion.button onClick={handleRecheckTools} disabled={isCheckingTools}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-white/50 hover:text-white transition-all duration-200 border border-white/[0.1] hover:border-white/[0.2] disabled:opacity-50"
                        style={{ borderRadius: '1px', fontFamily: 'var(--font-mono)' }}>
                        {isCheckingTools ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                        {isCheckingTools ? 'Checking...' : 'Recheck status'}
                      </motion.button>
                    </div>
                    <div className="space-y-2">
                      {SCAN_TOOLS.map(tool => {
                        const status = toolStatuses[tool.id] || 'unavailable';
                        return (
                          <div key={tool.id} className="group relative flex items-center justify-between p-4 border border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] transition-colors" style={{ borderRadius: '1px' }}>
                            <div className="flex items-center gap-3">
                              <span className="px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] border border-white/[0.1] bg-white/[0.03] text-white/70" style={{ borderRadius: '1px', fontFamily: 'var(--font-mono)' }}>
                                {tool.name}
                              </span>
                              <span className="text-[10px] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>
                                {tool.backendName}
                              </span>
                            </div>
                            {renderStatusDot(status, tool.disabled)}
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 border border-white/[0.12] bg-black/80 backdrop-blur-xl z-10" style={{ borderRadius: '1px' }}>
                              <p className="text-[11px] text-white/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                                {tool.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Plan details */}
                  <div className="space-y-3">
                    <h3 className="text-[11px] uppercase tracking-[0.28em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>
                      Plan Details
                    </h3>
                    <div className="p-4 border border-white/[0.07] bg-white/[0.02]" style={{ borderRadius: '1px' }}>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[11px] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>Scan Quota</span>
                        <span className="text-sm text-white/70" style={{ fontFamily: 'var(--font-display)' }}>0/3 used</span>
                      </div>
                      <div className="h-[3px] bg-white/[0.05] overflow-hidden" style={{ borderRadius: '1px' }}>
                        <div className="h-full" style={{ width: '0%', backgroundColor: 'var(--accent)' }} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-4 border border-white/[0.07] bg-white/[0.02]" style={{ borderRadius: '1px' }}>
                      <span className="text-[11px] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>Repositories</span>
                      <span className="text-sm text-white/70" style={{ fontFamily: 'var(--font-display)' }}>All connected</span>
                    </div>
                    <div className="group relative flex justify-between items-center p-4 border border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] transition-colors" style={{ borderRadius: '1px' }}>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>History retention</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/70" style={{ fontFamily: 'var(--font-display)' }}>30 days</span>
                        <span className="px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] border border-emerald-500/20 bg-emerald-500/5 text-emerald-400/70" style={{ borderRadius: '1px', fontFamily: 'var(--font-mono)' }}>
                          Active
                        </span>
                      </div>
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 border border-white/[0.12] bg-black/80 backdrop-blur-xl z-10" style={{ borderRadius: '1px' }}>
                        <p className="text-[11px] text-white/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                          We retain your scan history for 30 days. After that, raw results are removed but your aggregate audit summary is kept.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'Appearance' && (
              <div className="glass border border-white/[0.07] p-8" style={{ borderRadius: '1px' }}>
                <GlitchyText text="APPEARANCE" as="h2"
                  className="text-xl text-white tracking-[0.12em] mb-1"
                  style={{ fontFamily: 'var(--font-display)' } as React.CSSProperties} />
                <p className="text-xs text-white/30 mb-8" style={{ fontFamily: 'var(--font-body)' }}>
                  Select a colour theme. Changes are applied instantly and saved to your profile.
                </p>

                {/* Theme cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
                  {THEMES.map((t, i) => {
                    const active = themeId === t.id;
                    return (
                      <motion.button
                        key={t.id}
                        onClick={() => setThemeId(t.id)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: [0, 1, 0.4, 1], y: 0 }}
                        transition={{ duration: 0.5, delay: i * 0.05, times: [0, 0.4, 0.6, 1] }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="relative flex flex-col overflow-hidden text-left transition-all duration-300 border theme-reactive"
                        style={{
                          borderRadius: '1px',
                          borderColor: active ? t.accent : 'rgba(255,255,255,0.07)',
                          backgroundColor: active ? `${t.accent}12` : 'rgba(255,255,255,0.02)',
                          boxShadow: active ? `0 0 24px ${t.accentGlow}` : 'none',
                        }}
                      >
                        {/* Swatch area */}
                        <div className="h-20 w-full relative overflow-hidden"
                          style={{ background: `radial-gradient(ellipse at 30% 50%, ${t.blobs[0]}55, transparent 60%), radial-gradient(ellipse at 70% 50%, ${t.blobs[1]}44, transparent 60%), #07070a` }}>
                          {/* CLI icon */}
                          <span className="absolute top-3 left-3 text-[11px] select-none"
                            style={{ fontFamily: 'var(--font-mono)', color: `${t.accent}cc` }}>
                            &gt;_
                          </span>
                          {/* Active check */}
                          {active && (
                            <motion.div
                              initial={{ scale: 0 }} animate={{ scale: 1 }}
                              className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center"
                              style={{ backgroundColor: t.accent, borderRadius: '1px' }}>
                              <Check size={10} className="text-black" />
                            </motion.div>
                          )}
                          {/* Duotone accent bar — every theme carries two accent colours */}
                          <div className="absolute bottom-0 left-0 right-0 h-[4px] flex">
                            <div className="flex-1" style={{ backgroundColor: t.accent }} />
                            <div className="flex-1" style={{ backgroundColor: t.accent2 }} />
                          </div>
                        </div>

                        {/* Name + tagline */}
                        <div className="px-3 py-2.5">
                          <p className="text-[11px] text-white tracking-[0.18em] uppercase"
                            style={{ fontFamily: 'var(--font-theme-title)' }}>
                            {t.name}
                          </p>
                          <p className="text-[10px] text-white/35 mt-0.5 truncate"
                            style={{ fontFamily: 'var(--font-body)' }}>
                            {t.tagline}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Cycle mode */}
                <div className="p-5 border border-white/[0.07] bg-white/[0.02]" style={{ borderRadius: '1px' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white mb-0.5" style={{ fontFamily: 'var(--font-display)' }}>
                        Cycle Mode
                      </p>
                      <p className="text-[11px] text-white/30" style={{ fontFamily: 'var(--font-body)' }}>
                        Slowly drifts through every theme, one every few seconds.
                      </p>
                    </div>
                    <motion.button
                      onClick={isCycling ? stopCycle : startCycle}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] border transition-all duration-200"
                      style={{
                        borderRadius: '1px',
                        fontFamily: 'var(--font-display)',
                        borderColor: isCycling ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                        backgroundColor: isCycling ? 'var(--accent-glow)' : 'transparent',
                        color: isCycling ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                      }}>
                      <RotateCcw size={11} className={isCycling ? 'animate-spin' : ''} />
                      {isCycling ? 'Stop' : 'Start'}
                    </motion.button>
                  </div>
                </div>

                {isThemeSaving && (
                  <p className="text-[10px] text-white/25 mt-3" style={{ fontFamily: 'var(--font-mono)' }}>
                    Saving theme…
                  </p>
                )}
              </div>
            )}

            {/* Clear storage modal */}
            <AnimatePresence>
              {showClearStorage && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-6"
                  style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(16px)' }}
                  onClick={() => setShowClearStorage(false)}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 12, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.98, y: 8, filter: 'blur(6px)' }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="glass border border-white/[0.1] p-10 max-w-2xl w-full"
                    style={{ borderRadius: '1px' }}
                    onClick={e => e.stopPropagation()}>
                    <div className="flex items-start gap-5 mb-8">
                      <div className="w-12 h-12 flex items-center justify-center border border-yellow-500/25 bg-yellow-500/[0.08]" style={{ borderRadius: '1px' }}>
                        <AlertTriangle size={20} className="text-yellow-400/70" />
                      </div>
                      <div>
                        <h3 className="text-xl text-white tracking-[0.12em] uppercase mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                          Clear Local Storage!
                        </h3>
                        <p className="text-sm text-white/50 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                          This will remove all cached data stored in your browser — theme preference, session token, profile draft, and local scan history. You will be signed out and may need to reconnect GitHub.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <motion.button onClick={() => setShowClearStorage(false)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="flex-1 px-5 py-3.5 text-[12px] uppercase tracking-[0.2em] text-white/60 border border-white/[0.1] hover:bg-white/[0.04] transition-all duration-200"
                        style={{ borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
                        Keep My Data
                      </motion.button>
                      <motion.button onClick={handleClearStorage} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="flex-1 px-5 py-3.5 text-[12px] uppercase tracking-[0.2em] text-black transition-all duration-200"
                        style={{ backgroundColor: '#ef4444', borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
                        Clear Everything
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Save bar */}
            <div className="mt-8 flex items-center justify-between">
              {isLoading && (
                <span className="text-[11px] uppercase tracking-[0.22em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>
                  Loading profile...
                </span>
              )}
              <div className="ml-auto">
                <motion.button onClick={handleSave} disabled={isSaving}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-6 py-3 text-[11px] uppercase tracking-[0.24em] text-black transition-all duration-200 disabled:opacity-60"
                  style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
                  {isSaving ? <RefreshCw size={13} className="animate-spin text-black/70" /> : <Save size={13} />}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
