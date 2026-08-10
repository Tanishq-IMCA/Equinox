'use client';

import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProfilePanel } from '@/components/Landing/ProfilePanel';
import { LegalCyclingText } from '@/components/Landing/LegalCyclingText';
import GlitchyText from '@/components/ui/GlitchyText';

function HeaderAccentBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const [shimKey, setShimKey] = useState(0);
  const [glow, setGlow] = useState(false);
  return (
    <motion.button
      onHoverStart={() => { setShimKey((k) => k + 1); setGlow(true); }}
      onHoverEnd={() => setGlow(false)}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative overflow-hidden px-5 py-2 text-[11px] uppercase tracking-[0.34em] text-black"
      style={{
        backgroundColor: 'var(--accent)',
        borderRadius: 0,
        fontFamily: 'var(--font-display)',
        boxShadow: glow ? '0 0 32px rgba(16,185,129,0.4)' : '0 0 16px rgba(16,185,129,0.18)',
        transition: 'box-shadow 0.25s',
      }}
    >
      <motion.span
        key={shimKey}
        className="pointer-events-none absolute inset-0"
        initial={{ x: '-110%', skewX: '-10deg' }}
        animate={{ x: '250%' }}
        transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }}
      />
      <span className="relative">{children}</span>
    </motion.button>
  );
}

function HeaderGhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative overflow-hidden flex items-center justify-center px-5 py-2 text-[11px] uppercase tracking-[0.34em]"
      style={{
        borderRadius: 0,
        fontFamily: 'var(--font-display)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
        color: hovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)',
        transition: 'color 0.22s, border-color 0.22s',
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      <motion.span
        className="pointer-events-none absolute inset-0"
        initial={false}
        animate={{ scaleX: hovered ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ transformOrigin: 'left', background: 'rgba(255,255,255,0.05)' }}
      />
      <span className="relative">{children}</span>
    </motion.button>
  );
}

const authLabels = ['Sign In', 'Login'];

function AlphaBadge() {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      className="relative flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className="text-[11px] uppercase tracking-[0.22em] text-red-500/80 hover:text-red-400 transition-colors cursor-help"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        BETA
      </span>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 p-3.5 border border-white/[0.12] bg-white/[0.08] backdrop-blur-xl text-white/70 text-[10px] leading-relaxed z-50 shadow-2xl pointer-events-none"
            style={{ fontFamily: 'var(--font-body)', borderRadius: '2px' }}
          >
            Beta release — RepoSight is under active development. Features, APIs, and the user experience are subject to change as we iterate toward a stable release.
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

export function Header() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [authLabelIndex, setAuthLabelIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const { scrollY } = useScroll();
  const frostOpacity = useTransform(scrollY, [0, 80], [0, 1]);
  const frostBlur = useTransform(scrollY, [0, 80], [0, 12]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) return;
    const interval = setInterval(() => {
      setAuthLabelIndex(prev => (prev + 1) % authLabels.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 z-50 w-full"
        style={{
          backgroundColor: useTransform(frostOpacity, (v) => `rgba(5, 8, 22, ${0.55 * v})`),
          backdropFilter: useTransform(frostBlur, (v) => `blur(${v}px)`),
          WebkitBackdropFilter: useTransform(frostBlur, (v) => `blur(${v}px)`),
          borderBottomColor: useTransform(frostOpacity, (v) => `rgba(255, 255, 255, ${0.06 * v})`),
          borderBottomWidth: '1px',
          borderBottomStyle: 'solid',
        }}
      >
        <div className="flex items-center justify-between px-8 py-5">
          <Link
            href={isAuthenticated ? '/dashboard' : '/'}
            className="flex items-center gap-3 text-lg uppercase tracking-[0.3em] text-white cursor-pointer select-none"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <GlitchyText text="REPOSIGHT" triggerOnMount delay={200} />
            <span className="relative inline-flex items-center h-5 w-[2px] overflow-hidden">
              <span className="absolute inset-0 bg-white/30" />
              <span
                className="absolute left-0 w-full h-full bg-white/70"
                style={{ animation: 'barSlideUp 2.2s infinite cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
            </span>
            <AlphaBadge />
          </Link>

          <div className="flex items-center gap-10">
            <a
              href="#features"
              className="hidden md:block text-[11px] uppercase tracking-[0.34em] text-white/30 hover:text-white/70 transition-colors duration-200"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Features
            </a>
            <a
              href="#how"
              className="hidden md:block text-[11px] uppercase tracking-[0.34em] text-white/30 hover:text-white/70 transition-colors duration-200"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              How It Works
            </a>
            <a
              href="/about"
              className="hidden md:block text-[11px] uppercase tracking-[0.34em] text-white/30 hover:text-white/70 transition-colors duration-200"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              About
            </a>
            <a
              href="/legal"
              className="hidden md:block text-[11px] uppercase tracking-[0.34em] text-white/30 hover:text-white/70 transition-colors duration-200"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <LegalCyclingText />
            </a>

            <div className="flex items-center gap-3">
              {mounted && isAuthenticated && user ? (
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(v => !v)}
                  className="flex items-center gap-3 border border-white/10 bg-white/[0.03] px-2 py-2 text-white transition hover:border-white/25 hover:bg-white/[0.06]"
                  style={{ borderRadius: '1px' }}
                >
                  <div className="h-9 w-9 flex items-center justify-center text-xs border border-white/15 bg-white/[0.06] rounded-full text-white uppercase tracking-[0.22em]" style={{ fontFamily: 'var(--font-display)' }}>
                    {user.name[0]?.toUpperCase() || 'A'}
                  </div>
                  <div className="hidden min-w-0 text-left sm:block">
                    <p className="max-w-[10ch] truncate text-xs uppercase tracking-[0.24em] text-white" style={{ fontFamily: 'var(--font-display)' }}>
                      {user.name}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/40" style={{ fontFamily: 'var(--font-mono)' }}>
                      Profile
                    </p>
                  </div>
                </button>
              ) : (
                <>
                  <HeaderGhostBtn onClick={() => router.push('/auth')}>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={authLabelIndex}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.4 }}
                        className="relative"
                      >
                        {authLabels[authLabelIndex]}
                      </motion.span>
                    </AnimatePresence>
                  </HeaderGhostBtn>
                  <HeaderAccentBtn onClick={() => router.push('/auth')}>Begin Audit</HeaderAccentBtn>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.header>
      <ProfilePanel isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
}
