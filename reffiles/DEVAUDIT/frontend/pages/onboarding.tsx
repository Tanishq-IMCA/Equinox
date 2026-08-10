'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Check, ChevronRight, ChevronLeft, Eye, EyeOff,
  AlertTriangle, Plus, Briefcase, GraduationCap,
  Save, Pencil, Trash2, Calendar,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { showNotice } from '@/components/ui/NexusNotice';
import { Footer } from '@/components/Landing/Footer';
import { OnboardingData, ExperienceLevel, EducationItem, ProjectItem } from '@/types';
import GlitchyText from '@/components/ui/GlitchyText';
import { SegmentBar } from '@/components/ui/SegmentBar';
import { techCategories, allTechOptions, getTechInfo } from '@/lib/techConfig';
import { saveProfile } from '@/lib/api';
import { ResumeParser } from '@/components/ui/ResumeParser';
import { ParsedResume } from '@/lib/resumeParser';
import { TubeLightItem } from '@/components/ui/TubeLightItem';

const TOTAL_STEPS = 4;

const formatDateInput = (date?: string) => {
  if (!date) return '';
  try { return new Date(date).toISOString().split('T')[0]; } catch { return ''; }
};

const formatDateRange = (startDate?: string, endDate?: string, isPresent?: boolean) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmt = (date?: string) => {
    if (!date) return '';
    const d = new Date(date);
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };
  const start = fmt(startDate);
  const end = fmt(endDate);
  if (!start && !end && !isPresent) return '';
  if (isPresent) return start ? `${start} — Present` : 'Present';
  if (start && end) return `${start} — ${end}`;
  return start || end || '';
};

interface EducationCardProps {
  edu: EducationItem;
  index: number;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

function EducationCard({ edu, index, isExpanded, onExpand, onCollapse, onEdit, onRemove }: EducationCardProps) {
  return (
    <div
      onMouseEnter={onExpand}
      onMouseLeave={onCollapse}
      className="border border-white/[0.07] bg-white/[0.02] overflow-hidden cursor-pointer group card-fade-in transition-all duration-300 ease-out hover:bg-white/[0.04]"
      style={{ borderRadius: '1px', animationDelay: `${index * 0.08}s` }}
    >
      <div className="p-4">
        {/* Always-visible header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white truncate" style={{ fontFamily: 'var(--font-display)' }}>{edu.institution || 'N/A Institution'}</p>
            <p className="text-[10px] text-white/40 mt-0.5 truncate" style={{ fontFamily: 'var(--font-body)' }}>
              {edu.degree || edu.field ? `${edu.degree || ''}${edu.degree && edu.field ? ' · ' : ''}${edu.field || ''}` : 'N/A Field / Degree'}
            </p>
          </div>
          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 text-white/25 hover:text-white/60 transition-colors border border-white/[0.07]" style={{ borderRadius: '1px' }}><Pencil size={10} /></button>
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1.5 text-red-400/30 hover:text-red-400/70 transition-colors border border-red-500/[0.07]" style={{ borderRadius: '1px' }}><Trash2 size={10} /></button>
          </div>
        </div>

        {/* Expandable presentable body */}
        <div className={`overflow-hidden transition-all duration-300 ease-out ${isExpanded ? 'max-h-[300px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
          <div className="pt-3 border-t border-white/[0.06] space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-white truncate" style={{ fontFamily: 'var(--font-display)' }}>{edu.institution || 'N/A'}</p>
                <p className="text-xs text-emerald-400/70 mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>{formatDateRange(edu.startDate, edu.endDate, edu.isPresent)}</p>
              </div>
            </div>
            <p className="text-xs text-white/50" style={{ fontFamily: 'var(--font-body)' }}>
              {edu.degree || edu.field ? `${edu.degree || ''}${edu.degree && edu.field ? ' · ' : ''}${edu.field || ''}` : 'N/A Field / Degree'}
            </p>
            {edu.description && (
              <p className="text-xs text-white/40 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{edu.description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProjectCardProps {
  proj: ProjectItem;
  index: number;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

function ProjectCard({ proj, index, isExpanded, onExpand, onCollapse, onEdit, onRemove }: ProjectCardProps) {
  return (
    <div
      onMouseEnter={onExpand}
      onMouseLeave={onCollapse}
      className="border border-white/[0.07] bg-white/[0.02] overflow-hidden cursor-pointer group card-fade-in transition-all duration-300 ease-out hover:bg-white/[0.04]"
      style={{ borderRadius: '1px', animationDelay: `${index * 0.08}s` }}
    >
      <div className="p-4">
        {/* Always-visible header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white truncate" style={{ fontFamily: 'var(--font-display)' }}>{proj.name || 'N/A'}</p>
            {formatDateRange(proj.startDate, proj.endDate, proj.isPresent) && <p className="text-[10px] text-white/40 mt-0.5 truncate" style={{ fontFamily: 'var(--font-mono)' }}>{formatDateRange(proj.startDate, proj.endDate, proj.isPresent)}</p>}
          </div>
          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 text-white/25 hover:text-white/60 transition-colors border border-white/[0.07]" style={{ borderRadius: '1px' }}><Pencil size={10} /></button>
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1.5 text-red-400/30 hover:text-red-400/70 transition-colors border border-red-500/[0.07]" style={{ borderRadius: '1px' }}><Trash2 size={10} /></button>
          </div>
        </div>

        {/* Expandable presentable body */}
        <div className={`overflow-hidden transition-all duration-300 ease-out ${isExpanded ? 'max-h-[400px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
          <div className="pt-3 border-t border-white/[0.06] space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-white truncate" style={{ fontFamily: 'var(--font-display)' }}>{proj.name || 'N/A'}</p>
                {formatDateRange(proj.startDate, proj.endDate, proj.isPresent) && <p className="text-xs text-emerald-400/70 mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>{formatDateRange(proj.startDate, proj.endDate, proj.isPresent)}</p>}
                {proj.url && <p className="text-[10px] text-emerald-400/50 truncate mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>{proj.url}</p>}
              </div>
            </div>
            {proj.description && (
              <p className="text-xs text-white/40 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{proj.description}</p>
            )}
            {proj.technologies.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {proj.technologies.map(t => {
                  const info = getTechInfo(t);
                  return (
                    <span key={t} className="flex items-center gap-1 px-2 py-0.5 text-[9px] border" style={{ borderRadius: '1px', fontFamily: 'var(--font-mono)', borderColor: info.color, backgroundColor: info.bg, color: info.color }}>
                      {info.icon} {t}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const occupations: { value: ExperienceLevel; label: string; desc: string }[] = [
  { value: 'student',      label: 'Student',      desc: 'Learning the craft' },
  { value: 'junior',       label: 'Junior Dev',   desc: '0–2 years experience' },
  { value: 'professional', label: 'Professional', desc: '2–8 years experience' },
  { value: 'senior',       label: 'Senior',       desc: '8+ years experience' },
  { value: 'freelancer',   label: 'Freelancer',   desc: 'Independent contractor' },
];

const stepSlide = {
  initial: (dir: number) => ({ opacity: 0, x: dir * 32, filter: 'blur(4px)' }),
  animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit:    (dir: number) => ({ opacity: 0, x: dir * -32, filter: 'blur(4px)' }),
};

const STEP_LABELS = ['Profile', 'Tech Stack', 'Skills', 'GitHub'];

export default function OnboardingPage() {
  const router = useRouter();
  const { updateUser } = useAuth();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPat, setShowPat] = useState(false);

  // Resume upload state
  const [resumeMode, setResumeMode] = useState<'upload' | 'manual'>('upload');

  const [data, setData] = useState<OnboardingData>({
    name: '',
    age: undefined,
    occupation: 'professional',
    techStack: [],
    education: [],
    projects: [],
    bio: '',
    resumeText: '',
    linkedinUrl: '',
    githubUsername: '',
    githubPat: '',
  });

  // Manual skills form
  const [manualSkills, setManualSkills] = useState('');
  const [manualExperience, setManualExperience] = useState('');
  const [editingEducation, setEditingEducation] = useState<Set<string>>(new Set());
  const [editingProjects, setEditingProjects] = useState<Set<string>>(new Set());
  const [expandedEducation, setExpandedEducation] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [typewriterTargets, setTypewriterTargets] = useState<Set<string>>(new Set());
  const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set());
  const typewriterAbortRef = useRef<Record<string, number>>({});

  const goNext = () => {
    if (step === 1 && !data.name.trim()) {
      showNotice('NAME REQUIRED', 'Enter your name before continuing.', 'error');
      return;
    }
    setDirection(1);
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  };
  const goPrev = () => { setDirection(-1); setStep(s => Math.max(s - 1, 1)); };

  const generateId = () => Math.random().toString(36).substring(2, 10);


  const validateEducation = (edu: EducationItem): string | null => {
    if (!edu.institution.trim()) return 'Institution is required.';
    if (!edu.startDate) return 'Start date is required.';
    if (!edu.isPresent && edu.endDate) {
      const start = new Date(edu.startDate).getTime();
      const end = new Date(edu.endDate).getTime();
      if (end < start) return 'End date must be after start date.';
    }
    return null;
  };

  const validateProject = (proj: ProjectItem): string | null => {
    if (!proj.name.trim()) return 'Project name is required.';
    if (!proj.isPresent && proj.startDate && proj.endDate) {
      const start = new Date(proj.startDate).getTime();
      const end = new Date(proj.endDate).getTime();
      if (end < start) return 'End date must be after start date.';
    }
    return null;
  };

  const typewriteField = (
    key: string,
    value: string,
    setter: (v: string) => void,
    onDone?: () => void,
    charDelay = 12,
  ) => {
    // Use a generation counter stored on the ref to abort stale animations
    const abortMap = typewriterAbortRef.current as Record<string, number>;
    abortMap[key] = (abortMap[key] ?? 0) + 1;
    const gen = abortMap[key];

    setTypewriterTargets(s => new Set(s).add(key));
    setter('');

    let i = 0;
    const tick = () => {
      if (abortMap[key] !== gen) return; // newer call took over
      if (i > value.length) {
        setRevealedFields(s => new Set(s).add(key));
        setTypewriterTargets(s => { const n = new Set(s); n.delete(key); return n; });
        onDone?.();
        return;
      }
      setter(value.slice(0, i));
      i++;
      setTimeout(tick, charDelay);
    };
    setTimeout(tick, charDelay);
  };

  const handleResumeParsed = (parsed: ParsedResume, mode: 'merge' | 'overwrite' = 'merge') => {
    setResumeMode('manual');

    const runTypewriter = async () => {
      if (mode === 'overwrite') {
        setData(d => ({ ...d, name: parsed.name || d.name, bio: parsed.bio || d.bio, education: [], projects: [] }));
        await new Promise(r => setTimeout(r, 80));
      } else {
        setData(d => ({
          ...d,
          name: parsed.name && !d.name ? parsed.name : d.name,
          bio: parsed.bio && !d.bio ? parsed.bio : d.bio,
        }));
      }

      // Typewrite skills
      const skillsTarget = mode === 'overwrite'
        ? parsed.skills.join(', ')
        : (() => {
          let prev = '';
          setManualSkills(cur => { prev = cur; return cur; });
          // We can't read the current state synchronously in a closure here —
          // instead we read it via a callback approach
          return '';
        })();

      if (parsed.skills.length || mode === 'overwrite') {
        if (mode === 'merge') {
          // For merge: append new skills to existing
          setManualSkills(prev => {
            const existing = prev.split(',').map(s => s.trim()).filter(Boolean);
            const merged = Array.from(new Set([...existing, ...parsed.skills])).join(', ');
            typewriteField('skills', merged, setManualSkills);
            return prev; // Return current; typewriteField will overwrite it
          });
        } else {
          typewriteField('skills', parsed.skills.join(', '), setManualSkills);
        }
      }

      if (parsed.experience) {
        await new Promise(r => setTimeout(r, 100));
        typewriteField('experience', parsed.experience, setManualExperience, undefined, 8);
      }

      // Auto-fill the occupation/seniority field the same way skills get
      // auto-filled — previously only skills loaded from a parsed resume
      // while the experience-level dropdown silently stayed on its default.
      if (parsed.experienceLevel) {
        setData(d => ({ ...d, occupation: parsed.experienceLevel! }));
      }

      // Stagger education cards in as already-saved entries at the top
      for (const edu of parsed.education) {
        const newId = generateId();
        setData(d => ({ ...d, education: [{ ...edu, id: newId }, ...d.education] }));
        await new Promise(r => setTimeout(r, 350));
      }

      // Stagger project cards in as already-saved entries at the top
      for (const proj of parsed.projects) {
        const newId = generateId();
        setData(d => ({ ...d, projects: [{ ...proj, id: newId }, ...d.projects] }));
        await new Promise(r => setTimeout(r, 350));
      }

      showNotice('RESUME PARSED', 'Review your details, then hit Continue when ready.', 'success');
    };

    // Stay on this step so the reveal animation is visible — the user
    // advances explicitly via the Continue button once they've reviewed
    // what was parsed. (Previously this auto-advanced to the next step 200ms
    // after parsing, cutting the reveal animation off mid-flight.)
    runTypewriter();
  };

  const addEducation = () => {
    const id = generateId();
    setData(d => ({ ...d, education: [{ id, institution: '', degree: '', field: '', startDate: '', endDate: '', isPresent: true, description: '' }, ...d.education] }));
    setEditingEducation(s => new Set(s).add(id));
  };
  const updateEducation = (id: string, updates: Partial<EducationItem>) => {
    setData(d => ({ ...d, education: d.education.map(item => item.id === id ? { ...item, ...updates } : item) }));
  };
  const removeEducation = (id: string) => {
    setData(d => ({ ...d, education: d.education.filter(item => item.id !== id) }));
    setEditingEducation(s => { const n = new Set(s); n.delete(id); return n; });
  };
  const saveEducationCard = (id: string) => {
    const item = data.education.find(e => e.id === id);
    if (!item) return;
    const error = validateEducation(item);
    if (error) {
      showNotice('INVALID EDUCATION', error, 'error');
      return;
    }
    setEditingEducation(s => { const n = new Set(s); n.delete(id); return n; });
  };
  const editEducationCard = (id: string) => { setEditingEducation(s => new Set(s).add(id)); };

  const addProject = () => {
    const id = generateId();
    setData(d => ({ ...d, projects: [{ id, name: '', description: '', url: '', startDate: '', endDate: '', isPresent: true, technologies: [] }, ...d.projects] }));
    setEditingProjects(s => new Set(s).add(id));
  };
  const updateProject = (id: string, updates: Partial<ProjectItem>) => {
    setData(d => ({ ...d, projects: d.projects.map(item => item.id === id ? { ...item, ...updates } : item) }));
  };
  const removeProject = (id: string) => {
    setData(d => ({ ...d, projects: d.projects.filter(item => item.id !== id) }));
    setEditingProjects(s => { const n = new Set(s); n.delete(id); return n; });
  };
  const saveProjectCard = (id: string) => {
    const item = data.projects.find(p => p.id === id);
    if (!item) return;
    const error = validateProject(item);
    if (error) {
      showNotice('INVALID PROJECT', error, 'error');
      return;
    }
    setEditingProjects(s => { const n = new Set(s); n.delete(id); return n; });
  };
  const editProjectCard = (id: string) => { setEditingProjects(s => new Set(s).add(id)); };
  const toggleProjectTech = (id: string, tech: string) => {
    setData(d => ({ ...d, projects: d.projects.map(item => {
      if (item.id !== id) return item;
      const techs = item.technologies.includes(tech) ? item.technologies.filter(t => t !== tech) : [...item.technologies, tech];
      return { ...item, technologies: techs };
    })}));
  };

  const toggleTech = (name: string) => {
    setData(d => ({
      ...d,
      techStack: d.techStack.includes(name)
        ? d.techStack.filter(t => t !== name)
        : [...d.techStack, name],
    }));
  };

  const buildResumeText = () => {
    if (resumeMode === 'upload' && data.resumeText) return data.resumeText;
    if (resumeMode === 'manual') {
      const parts: string[] = [];
      if (manualSkills) parts.push(`SKILLS:\n${manualSkills}`);
      if (manualExperience) parts.push(`EXPERIENCE:\n${manualExperience}`);
      if (data.education.length) {
        parts.push(`EDUCATION:\n${data.education.map(e => `${e.institution} — ${e.degree}${e.field ? `, ${e.field}` : ''} (${formatDateRange(e.startDate, e.endDate, e.isPresent)})`).join('\n')}`);
      }
      if (data.projects.length) {
        parts.push(`PROJECTS:\n${data.projects.map(p => `${p.name}${p.url ? ` (${p.url})` : ''} — ${p.description || ''} (${formatDateRange(p.startDate, p.endDate, p.isPresent)})`).join('\n')}`);
      }
      return parts.join('\n\n');
    }
    return '';
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    const resumeText = buildResumeText();

    try {
      await saveProfile({
        profile: { fullName: data.name, age: data.age, role: data.occupation, bio: data.bio },
        developer: {
          techStack: data.techStack,
          education: data.education,
          projects: data.projects,
          github: data.githubUsername ? { username: data.githubUsername } : undefined,
          resume: resumeText || undefined,
        },
        isProfileComplete: true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Profile save failed';
      showNotice('PROFILE SAVE FAILED', msg, 'error');
      setIsSubmitting(false);
      return;
    }

    updateUser({
      name: data.name,
      age: data.age,
      occupation: data.occupation,
      techStack: data.techStack,
      education: data.education,
      projects: data.projects,
      bio: data.bio,
      githubUsername: data.githubUsername || undefined,
    });

    showNotice('PROFILE CONFIGURED', 'Fetching your repositories...', 'success');
    router.push('/dashboard');
  };

  const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;
  const inputClass = "w-full input-glass px-4 py-3.5 text-sm text-white";
  const textareaClass = "w-full input-glass px-4 py-3 text-sm text-white resize-none leading-relaxed";

  return (
    <div className="min-h-screen flex flex-col px-6 py-12 relative overflow-hidden" style={{ fontFamily: 'var(--font-display)' }}>
      <div className="relative z-10 w-full max-w-2xl mx-auto">

        {/* Logo */}
        <div className="mb-12">
          <Link href="/" className="text-sm uppercase tracking-[0.24em] text-white/40 hover:text-white/70 transition-colors smooth-glow">
            REPOSIGHT
          </Link>
        </div>

        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-[0.28em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>
              Step {step} of {TOTAL_STEPS}
            </span>
            <span className="text-[11px] uppercase tracking-[0.28em] text-white/25" style={{ fontFamily: 'var(--font-mono)' }}>
              {STEP_LABELS[step - 1]}
            </span>
          </div>
          <SegmentBar value={progressPct} segments={TOTAL_STEPS * 6} segmentHeight={4} showValue={false} />
          <div className="flex justify-between mt-3">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div key={i} className="w-1.5 h-1.5 transition-all duration-300"
                style={{ backgroundColor: i + 1 <= step ? 'var(--accent)' : 'rgba(255,255,255,0.08)' }} />
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="glass border border-white/[0.07] p-8 overflow-hidden" style={{ borderRadius: '1px' }}>
          <AnimatePresence mode="wait" custom={direction}>

            {/* STEP 1 — Profile */}
            {step === 1 && (
              <motion.div key="step1" custom={direction} variants={stepSlide}
                initial="initial" animate="animate" exit="exit"
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                <GlitchyText text="ABOUT YOU" as="h2" triggerOnMount
                  className="text-xl text-white tracking-[0.12em] uppercase mb-1"
                  style={{ fontFamily: 'var(--font-display)' } as React.CSSProperties} />
                <p className="text-xs text-white/30 mb-8" style={{ fontFamily: 'var(--font-body)' }}>
                  This shapes the tone and depth of your audit results.
                </p>

                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                        Full Name
                      </label>
                      <input type="text" placeholder="Your name" value={data.name}
                        onChange={e => setData(d => ({ ...d, name: e.target.value }))}
                        className={inputClass} />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                        Age <span className="text-white/15">(opt)</span>
                      </label>
                      <input type="number" placeholder="25" min="15" max="80"
                        value={data.age || ''}
                        onChange={e => setData(d => ({ ...d, age: parseInt(e.target.value) || undefined }))}
                        className={inputClass} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                      Bio <span className="text-white/15">(opt)</span>
                    </label>
                    <textarea placeholder="Short bio..." value={data.bio || ''}
                      onChange={e => setData(d => ({ ...d, bio: e.target.value }))}
                      rows={3} className={inputClass} />
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-3 block" style={{ fontFamily: 'var(--font-mono)' }}>
                      Role
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {occupations.map(occ => (
                        <button key={occ.value}
                          onClick={() => setData(d => ({ ...d, occupation: occ.value }))}
                          className="relative p-4 text-left transition-all duration-200 border"
                          style={{
                            borderRadius: '1px',
                            borderColor: data.occupation === occ.value ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.07)',
                            backgroundColor: data.occupation === occ.value ? 'rgba(16,185,129,0.07)' : 'rgba(255,255,255,0.02)',
                          }}>
                          {data.occupation === occ.value && (
                            <div className="absolute top-2.5 right-2.5 w-4 h-4 flex items-center justify-center"
                              style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}>
                              <Check size={9} style={{ color: 'var(--accent)' }} />
                            </div>
                          )}
                          <div className="text-sm text-white mb-0.5" style={{ fontFamily: 'var(--font-display)' }}>{occ.label}</div>
                          <div className="text-[11px] text-white/30" style={{ fontFamily: 'var(--font-body)' }}>{occ.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2 — Tech Stack */}
            {step === 2 && (
              <motion.div key="step2" custom={direction} variants={stepSlide}
                initial="initial" animate="animate" exit="exit"
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                <GlitchyText text="TECH STACK" as="h2" triggerOnMount
                  className="text-xl text-white tracking-[0.12em] uppercase mb-1"
                  style={{ fontFamily: 'var(--font-display)' } as React.CSSProperties} />
                <p className="text-xs text-white/30 mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                  Select everything relevant. The AI uses this to calibrate its assessment.
                </p>
                <p className="text-[11px] uppercase tracking-[0.28em] mb-8" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                  {data.techStack.length} selected
                </p>

                <div className="space-y-6 max-h-[420px] overflow-y-auto pr-1">
                  {techCategories.map((category, ci) => (
                    <div key={category.name}>
                      <p className="text-xs text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                        {category.name}
                      </p>
                      <p className="text-[10px] text-white/30 mb-3" style={{ fontFamily: 'var(--font-body)' }}>
                        {category.question}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {category.options.map((tech, i) => {
                          const selected = data.techStack.includes(tech);
                          const info = getTechInfo(tech);
                          return (
                            <TubeLightItem key={tech} index={ci * 50 + i} stagger={0.015} className="inline-flex">
                              <motion.button
                                onClick={() => toggleTech(tech)}
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                className="flex items-center gap-1.5 px-3.5 py-2 text-xs transition-all duration-200 border"
                                style={{
                                  borderRadius: '1px',
                                  fontFamily: 'var(--font-mono)',
                                  borderColor: selected ? info.color : 'rgba(255,255,255,0.07)',
                                  backgroundColor: selected ? info.bg : 'rgba(255,255,255,0.02)',
                                  color: selected ? info.color : 'rgba(255,255,255,0.35)',
                                  boxShadow: selected ? `0 0 12px ${info.bg}` : 'none',
                                }}>
                                <motion.div
                                  animate={{ scale: selected ? 1 : 0.8, opacity: selected ? 1 : 0.5 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                  style={{ color: selected ? info.color : 'rgba(255,255,255,0.3)' }}>
                                  {info.icon}
                                </motion.div>
                                {tech}
                                <AnimatePresence>
                                  {selected && (
                                    <motion.div
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      exit={{ scale: 0, opacity: 0 }}
                                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
                                      <Check size={9} />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.button>
                            </TubeLightItem>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3 — Skills / Resume */}
            {step === 3 && (
              <motion.div key="step3" custom={direction} variants={stepSlide}
                initial="initial" animate="animate" exit="exit"
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                <GlitchyText text="WHAT YOU CLAIM" as="h2" triggerOnMount
                  className="text-xl text-white tracking-[0.12em] uppercase mb-1"
                  style={{ fontFamily: 'var(--font-display)' } as React.CSSProperties} />
                <p className="text-xs text-white/30 mb-6" style={{ fontFamily: 'var(--font-body)' }}>
                  The AI cross-references your stated skills against your actual code.
                </p>

                {/* Mode toggle */}
                <div className="flex mb-6 border border-white/[0.07] p-0.5" style={{ borderRadius: '1px' }}>
                  {(['upload', 'manual'] as const).map(m => (
                    <button key={m} onClick={() => setResumeMode(m)}
                      className="flex-1 py-2 text-[11px] uppercase tracking-[0.24em] transition-all duration-200"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        borderRadius: '1px',
                        backgroundColor: resumeMode === m ? 'rgba(255,255,255,0.06)' : 'transparent',
                        color: resumeMode === m ? 'white' : 'rgba(255,255,255,0.3)',
                      }}>
                      {m === 'upload' ? '↑ Upload Resume' : '✎ Manual Entry'}
                    </button>
                  ))}
                </div>

                {resumeMode === 'upload' ? (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ResumeParser
                      onParsed={handleResumeParsed}
                      hasExistingData={data.education.length > 0 || data.projects.length > 0 || manualSkills.length > 0 || manualExperience.length > 0}
                    />
                    <p className="text-[11px] text-white/20 mt-4 text-center" style={{ fontFamily: 'var(--font-mono)' }}>
                      No resume handy?{' '}
                      <button type="button" onClick={() => setResumeMode('manual')}
                        className="underline decoration-dotted underline-offset-2 hover:text-white/50 transition-colors"
                        style={{ color: 'var(--accent)' }}>
                        Type everything in manually instead
                      </button>
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                        Skills
                      </label>
                      <textarea
                        placeholder="e.g. Python, TypeScript, FastAPI, PostgreSQL, Docker, CI/CD..."
                        value={manualSkills}
                        onChange={e => setManualSkills(e.target.value)}
                        rows={2}
                        className={textareaClass}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                        Experience
                      </label>
                      <textarea
                        placeholder="e.g. 5 years building production Python APIs, led team of 3, deployed to AWS..."
                        value={manualExperience}
                        onChange={e => setManualExperience(e.target.value)}
                        rows={3}
                        className={textareaClass}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-[11px] uppercase tracking-[0.28em] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>
                          Education <span className="text-white/20">(optional)</span>
                        </label>
                        <motion.button onClick={addEducation} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-black transition-all duration-200"
                          style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
                          <Plus size={11} /> Add
                        </motion.button>
                      </div>
                      <div className="max-h-[260px] overflow-y-auto pr-1 space-y-2">
                        {data.education.length === 0 && <p className="text-[11px] text-white/20" style={{ fontFamily: 'var(--font-body)' }}>No education added yet.</p>}
                        {data.education.map((edu, index) => {
                          const isEditing = editingEducation.has(edu.id);
                          return isEditing ? (
                            <div key={edu.id} className="p-4 border border-white/[0.07] bg-white/[0.02] card-fade-in" style={{ borderRadius: '1px', animationDelay: `${index * 0.08}s` }}>
                              <div className="space-y-3">
                                <input type="text" value={edu.institution} onChange={e => updateEducation(edu.id, { institution: e.target.value })} placeholder="Institution" className={inputClass} />
                                <div className="grid grid-cols-2 gap-3">
                                  <input type="text" value={edu.degree} onChange={e => updateEducation(edu.id, { degree: e.target.value })} placeholder="Degree" className={inputClass} />
                                  <input type="text" value={edu.field} onChange={e => updateEducation(edu.id, { field: e.target.value })} placeholder="Field" className={inputClass} />
                                </div>
                                <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                                  <input type="date" value={formatDateInput(edu.startDate)} onChange={e => updateEducation(edu.id, { startDate: e.target.value })} className={inputClass} />
                                  <input type="date" value={formatDateInput(edu.endDate)} disabled={edu.isPresent} onChange={e => updateEducation(edu.id, { endDate: e.target.value })} className={`${inputClass} ${edu.isPresent ? 'opacity-30' : ''}`} />
                                  <label className="flex items-center gap-1.5 text-[10px] text-white/40" style={{ fontFamily: 'var(--font-mono)' }}>
                                    <input type="checkbox" checked={edu.isPresent} onChange={e => updateEducation(edu.id, { isPresent: e.target.checked, endDate: e.target.checked ? '' : edu.endDate })} className="accent-emerald-500" /> Present
                                  </label>
                                </div>
                                <textarea value={edu.description} onChange={e => updateEducation(edu.id, { description: e.target.value })} rows={2} placeholder="Description" className={textareaClass} />
                              </div>
                              <div className="flex justify-between mt-4">
                                <button onClick={() => removeEducation(edu.id)} className="flex items-center gap-1.5 text-[10px] text-red-400/50 hover:text-red-400 transition-colors"><Trash2 size={10} /> Remove</button>
                                <motion.button onClick={() => saveEducationCard(edu.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-black uppercase tracking-[0.2em]" style={{ backgroundColor: 'var(--accent)', borderRadius: '1px' }}><Save size={10} /> Save</motion.button>
                              </div>
                            </div>
                          ) : (
                            <EducationCard
                              key={edu.id}
                              edu={edu}
                              index={index}
                              isExpanded={expandedEducation === edu.id}
                              onExpand={() => setExpandedEducation(edu.id)}
                              onCollapse={() => setExpandedEducation(null)}
                              onEdit={() => editEducationCard(edu.id)}
                              onRemove={() => removeEducation(edu.id)}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-[11px] uppercase tracking-[0.28em] text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>
                          Projects <span className="text-white/20">(optional)</span>
                        </label>
                        <motion.button onClick={addProject} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-black transition-all duration-200"
                          style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
                          <Plus size={11} /> Add
                        </motion.button>
                      </div>
                      <div className="max-h-[260px] overflow-y-auto pr-1 space-y-2">
                        {data.projects.length === 0 && <p className="text-[11px] text-white/20" style={{ fontFamily: 'var(--font-body)' }}>No projects added yet.</p>}
                        {data.projects.map((proj, index) => {
                          const isEditing = editingProjects.has(proj.id);
                          return isEditing ? (
                            <div key={proj.id} className="p-4 border border-white/[0.07] bg-white/[0.02] card-fade-in" style={{ borderRadius: '1px', animationDelay: `${index * 0.08}s` }}>
                              <div className="space-y-3">
                                <input type="text" value={proj.name} onChange={e => updateProject(proj.id, { name: e.target.value })} placeholder="Project name" className={inputClass} />
                                <input type="url" value={proj.url} onChange={e => updateProject(proj.id, { url: e.target.value })} placeholder="URL" className={inputClass} />
                                <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                                  <input type="date" value={formatDateInput(proj.startDate)} onChange={e => updateProject(proj.id, { startDate: e.target.value })} className={inputClass} />
                                  <input type="date" value={formatDateInput(proj.endDate)} disabled={proj.isPresent} onChange={e => updateProject(proj.id, { endDate: e.target.value })} className={`${inputClass} ${proj.isPresent ? 'opacity-30' : ''}`} />
                                  <label className="flex items-center gap-1.5 text-[10px] text-white/40" style={{ fontFamily: 'var(--font-mono)' }}>
                                    <input type="checkbox" checked={proj.isPresent} onChange={e => updateProject(proj.id, { isPresent: e.target.checked, endDate: e.target.checked ? '' : proj.endDate })} className="accent-emerald-500" /> Present
                                  </label>
                                </div>
                                <textarea value={proj.description} onChange={e => updateProject(proj.id, { description: e.target.value })} rows={2} placeholder="Description" className={textareaClass} />
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-1.5">
                                    {proj.technologies.length === 0 && <span className="text-[10px] text-white/20" style={{ fontFamily: 'var(--font-mono)' }}>No tech selected</span>}
                                    {proj.technologies.map(t => {
                                      const info = getTechInfo(t);
                                      return (
                                        <button key={t} onClick={() => toggleProjectTech(proj.id, t)} className="flex items-center gap-1 px-2 py-0.5 text-[9px] transition-all border hover:opacity-70" style={{ borderRadius: '1px', fontFamily: 'var(--font-mono)', borderColor: info.color, backgroundColor: info.bg, color: info.color }}>
                                          {info.icon} {t} <span className="opacity-50">×</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Add custom tech (e.g. Solidity, CUDA)"
                                      className={`${inputClass} flex-1`}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const value = e.currentTarget.value.trim();
                                          if (value && !proj.technologies.includes(value)) {
                                            toggleProjectTech(proj.id, value);
                                            e.currentTarget.value = '';
                                          }
                                        }
                                      }}
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                                    {allTechOptions.map(t => {
                                      const sel = proj.technologies.includes(t);
                                      const info = getTechInfo(t);
                                      return <button key={t} onClick={() => toggleProjectTech(proj.id, t)} className="flex items-center gap-1 px-2 py-0.5 text-[9px] transition-all border" style={{ borderRadius: '1px', fontFamily: 'var(--font-mono)', borderColor: sel ? info.color : 'rgba(255,255,255,0.07)', backgroundColor: sel ? info.bg : 'rgba(255,255,255,0.02)', color: sel ? info.color : 'rgba(255,255,255,0.35)' }}>{info.icon} {t}</button>;
                                    })}
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-between mt-4">
                                <button onClick={() => removeProject(proj.id)} className="flex items-center gap-1.5 text-[10px] text-red-400/50 hover:text-red-400 transition-colors"><Trash2 size={10} /> Remove</button>
                                <motion.button onClick={() => saveProjectCard(proj.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-black uppercase tracking-[0.2em]" style={{ backgroundColor: 'var(--accent)', borderRadius: '1px' }}><Save size={10} /> Save</motion.button>
                              </div>
                            </div>
                          ) : (
                            <ProjectCard
                              key={proj.id}
                              proj={proj}
                              index={index}
                              isExpanded={expandedProject === proj.id}
                              onExpand={() => setExpandedProject(proj.id)}
                              onCollapse={() => setExpandedProject(null)}
                              onEdit={() => editProjectCard(proj.id)}
                              onRemove={() => removeProject(proj.id)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 4 — GitHub (Coming Soon) */}
            {step === 4 && (
              <motion.div key="step4" custom={direction} variants={stepSlide}
                initial="initial" animate="animate" exit="exit"
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="relative">
                {/* Coming Soon overlay */}
                <div className="absolute inset-0 z-30 bg-[rgba(5,8,22,0.92)] backdrop-blur-[3px] flex flex-col items-center gap-4" style={{ borderRadius: '1px', paddingTop: '80px', minHeight: '320px' }}>
                  <div className="w-14 h-14 rounded-[1px] border border-white/15 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', boxShadow: '0 0 24px rgba(255,255,255,0.06)' }}>
                    <Calendar size={28} className="text-white/50" />
                  </div>
                  <span className="text-[13px] uppercase tracking-[0.28em] text-white/50" style={{ fontFamily: 'var(--font-mono)' }}>
                    Coming Soon
                  </span>
                  <p className="text-sm text-white/25 max-w-sm text-center leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                    GitHub integration is being reworked. You'll be able to connect your repositories in a future update.
                  </p>
                </div>

                {/* Blurred content beneath */}
                <div className="pointer-events-none select-none" style={{ filter: 'blur(4px)' }}>
                  <GlitchyText text="CONNECT GITHUB" as="h2" triggerOnMount
                    className="text-xl text-white tracking-[0.12em] uppercase mb-1"
                    style={{ fontFamily: 'var(--font-display)' } as React.CSSProperties} />
                  <p className="text-xs text-white/30 mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                    Optional — needed to fetch and audit your repositories.
                  </p>
                  <p className="text-[11px] text-white/20 mb-8" style={{ fontFamily: 'var(--font-mono)' }}>
                    You can also add this later in Settings.
                  </p>

                  <div className="space-y-5">
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                        GitHub Username
                      </label>
                      <input type="text" placeholder="your-github-username"
                        value={data.githubUsername}
                        onChange={e => setData(d => ({ ...d, githubUsername: e.target.value }))}
                        className={`${inputClass} font-mono`} />
                    </div>

                    <div>
                      <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                        Personal Access Token <span className="text-white/18">(private repos)</span>
                      </label>
                      <div className="relative">
                        <input type={showPat ? 'text' : 'password'}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                          value={data.githubPat}
                          onChange={e => setData(d => ({ ...d, githubPat: e.target.value }))}
                          className={`${inputClass} font-mono pr-12`} />
                        <button type="button" onClick={() => setShowPat(!showPat)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                          {showPat ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 border border-yellow-500/[0.15] bg-yellow-500/[0.05]" style={{ borderRadius: '1px' }}>
                      <AlertTriangle size={13} className="text-yellow-400/60 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-white/35 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                        Your PAT is encrypted and never stored in plaintext. We only request{' '}
                        <span className="text-white/55" style={{ fontFamily: 'var(--font-mono)' }}>repo:read</span> scope. Revoke anytime from GitHub settings.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button onClick={goPrev} disabled={step === 1}
            className="flex items-center gap-2 px-5 py-2.5 text-xs text-white/30 hover:text-white/60 transition-colors disabled:opacity-0"
            style={{ fontFamily: 'var(--font-mono)' }}>
            <ChevronLeft size={14} />
            Back
          </button>

          {step < TOTAL_STEPS ? (
            <motion.button onClick={goNext}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-7 py-3 text-[11px] uppercase tracking-[0.24em] text-black transition-all duration-200"
              style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
              Continue
              <ChevronRight size={14} />
            </motion.button>
          ) : (
            <motion.button onClick={handleFinish} disabled={isSubmitting}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-7 py-3 text-[11px] uppercase tracking-[0.24em] text-black transition-all duration-200 disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
              {isSubmitting ? (
                <span className="animate-pulse">Saving...</span>
              ) : (
                <><Check size={14} /> Launch Dashboard</>
              )}
            </motion.button>
          )}
        </div>

      </div>
      <div className="mt-16" />
      <Footer />
    </div>
  );
}
