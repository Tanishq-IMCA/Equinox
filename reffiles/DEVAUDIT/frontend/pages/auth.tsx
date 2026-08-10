'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { showNotice } from '@/components/ui/NexusNotice';
import { Footer } from '@/components/Landing/Footer';
import { LegalCyclingText } from '@/components/Landing/LegalCyclingText';
import GlitchyText from '@/components/ui/GlitchyText';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [flashAgree, setFlashAgree] = useState(false);
  const checkboxRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setMode(params.get('mode') === 'signup' ? 'signup' : 'signin');
  }, []);

  const { login, register, loginWithGoogle, loginWithGithub } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && !agreed) {
      setFlashAgree(true);
      setTimeout(() => setFlashAgree(false), 800);
      showNotice('AGREEMENT REQUIRED', 'You must agree to the terms before using our services.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      if (mode === 'signup') {
        await register(email, password);
        showNotice('ACCOUNT CREATED', 'Welcome. Complete your profile setup.', 'success');
        router.push('/onboarding');
      } else {
        await login(email, password);
        showNotice('ACCESS GRANTED', 'Initializing your workspace...', 'success');
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      showNotice('AUTH FAILED', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = () => {
    showNotice(
      'COMING SOON',
      mode === 'signup'
        ? 'Please sign up using your email instead. Google and GitHub are under maintenance.'
        : 'Please log in using your email instead. Google and GitHub are under maintenance.',
      'info'
    );
  };

  const handleGithub = () => {
    showNotice(
      'COMING SOON',
      mode === 'signup'
        ? 'Please sign up using your email instead. Google and GitHub are under maintenance.'
        : 'Please log in using your email instead. Google and GitHub are under maintenance.',
      'info'
    );
  };

  const inputClass = "w-full input-glass px-4 py-3.5 text-sm text-white placeholder-white/20";

  return (
    <div className="min-h-screen flex flex-col items-center px-6 pt-12 pb-8"
      style={{ fontFamily: 'var(--font-display)' }}>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-12"
      >
        <Link href="/" className="text-xl uppercase tracking-[0.24em] text-white/60 hover:text-white transition-colors smooth-glow">
          REPOSIGHT
        </Link>
      </motion.div>

      {/* Maintenance notice */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full max-w-sm mb-4 bg-white/[0.04] backdrop-blur-2xl saturate-[180%] p-2.5 pr-5 border border-white/[0.09] shadow-[0_15px_35px_rgba(0,0,0,0.3)] flex items-center gap-4 overflow-hidden"
        style={{ borderRadius: '1px' }}
      >
        <div
          className="relative w-[3px] self-stretch overflow-hidden flex-shrink-0"
          style={{ backgroundColor: '#fbbf24', boxShadow: '0 0 15px rgba(251, 191, 36, 0.5)' }}
        >
          <div
            className="absolute left-0 w-full h-full bg-white opacity-30"
            style={{ animation: 'barSlideUp 2.5s infinite cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </div>
        <div className="flex flex-col justify-center relative flex-1 py-1">
          <div
            className="text-sm tracking-widest text-yellow-100 leading-tight uppercase"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            NOTICE
          </div>
          <div className="h-px w-full bg-white/10 my-1.5" />
          <div
            className="text-xs text-yellow-100/70 tracking-wide"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            GOOGLE AND GITHUB SIGN-IN ARE CURRENTLY UNDER MAINTENANCE. PLEASE USE EMAIL/PASSWORD TO {mode === 'signin' ? 'SIGN IN' : 'SIGN UP'} FOR NOW.
          </div>
        </div>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="w-full max-w-sm glass border border-white/[0.07] p-8"
        style={{ borderRadius: '1px' }}
      >
        {/* Mode toggle */}
        <div className="flex mb-8 border border-white/[0.07] p-0.5" style={{ borderRadius: '1px' }}>
          {(['signin', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 py-2.5 text-[11px] uppercase tracking-[0.28em] transition-all duration-200"
              style={{
                fontFamily: 'var(--font-display)',
                borderRadius: '1px',
                backgroundColor: mode === m ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: mode === m ? 'white' : 'rgba(255,255,255,0.3)',
              }}
            >
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Heading */}
            <div className="mb-6">
              <GlitchyText
                text={mode === 'signin' ? 'WELCOME BACK.' : 'CREATE ACCOUNT.'}
                as="h2"
                triggerOnMount
                className="text-xl text-white tracking-[0.1em] uppercase"
                style={{ fontFamily: 'var(--font-display)' } as React.CSSProperties}
              />
              <p className="text-[11px] text-white/30 mt-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                {mode === 'signin' ? 'Enter your credentials to continue.' : 'Set up your audit account.'}
              </p>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            )}

            <div>
              <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-[0.28em] text-white/30 mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`${inputClass} pr-12`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <div className="h-2" />
                <div className="flex items-center gap-3">
                  <button
                    ref={checkboxRef}
                    type="button"
                    onClick={() => setAgreed(!agreed)}
                    className="relative w-4 h-4 flex-shrink-0 flex items-center justify-center transition-all duration-200"
                    style={{
                      border: '1px solid',
                      borderColor: flashAgree ? '#facc15' : agreed ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
                      boxShadow: flashAgree ? '0 0 12px rgba(250,204,21,0.4)' : 'none',
                      borderRadius: '1px',
                    }}
                  >
                    <motion.span
                      initial={false}
                      animate={agreed ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <Check size={12} className="text-white" strokeWidth={2.5} />
                    </motion.span>
                  </button>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-white/90" style={{ fontFamily: 'var(--font-mono)' }}>
                    BY USING OUR SERVICE YOU AGREE TO{' '}
                    <Link href="/legal" className="text-white/70 hover:text-white transition-colors underline decoration-white/20">
                      <LegalCyclingText />
                    </Link>
                  </span>
                </div>
              </div>
            )}

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full flex items-center justify-center gap-3 py-3.5 text-[12px] uppercase tracking-[0.28em] text-black font-medium transition-all duration-200 hover:opacity-90 disabled:opacity-50 mt-6"
              style={{ backgroundColor: 'var(--accent)', borderRadius: '1px', fontFamily: 'var(--font-display)' }}
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin text-black/70" />
              ) : (
                mode === 'signin' ? '> Sign In' : '> Create Account'
              )}
            </motion.button>
          </motion.form>
        </AnimatePresence>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-[11px] uppercase tracking-[0.24em] text-white/20" style={{ fontFamily: 'var(--font-mono)' }}>or</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* OAuth buttons */}
        <div className="space-y-2">
          {(['Google', 'GitHub'] as const).map(provider => (
            <button
              key={provider}
              type="button"
              onClick={provider === 'Google' ? handleGoogle : handleGithub}
              className="relative w-full flex items-center justify-center gap-3 py-3.5 border border-white/[0.1] text-white/50 text-[11px] uppercase tracking-[0.28em] transition-all duration-200 hover:border-white/20 hover:text-white/80 hover:bg-white/[0.03] overflow-hidden cursor-pointer"
              style={{ borderRadius: '1px', fontFamily: 'var(--font-display)' }}
            >
              {provider === 'Google' ? (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.33v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.11z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M12 1C5.925 1 1 5.925 1 12c0 4.867 3.153 8.993 7.529 10.454.55.099.75-.238.75-.529 0-.262-.009-1.129-.014-2.049-3.066.665-3.714-1.462-3.714-1.462-.502-1.276-1.225-1.616-1.225-1.616-.999-.682.076-.668.076-.668 1.105.078 1.686 1.134 1.686 1.134.982 1.682 2.576 1.196 3.205.915.1-.711.384-1.196.699-1.471-2.447-.278-5.019-1.224-5.019-5.449 0-1.204.428-2.188 1.132-2.958-.114-.279-.491-1.398.107-2.915 0 0 .923-.296 3.025 1.13.878-.244 1.819-.367 2.755-.371.936.004 1.877.127 2.755.371 2.101-1.426 3.024-1.13 3.024-1.13.599 1.517.222 2.636.108 2.915.704.77 1.132 1.754 1.132 2.958 0 4.235-2.576 5.167-5.026 5.441.394.339.747 1.005.747 2.027 0 1.465-.014 2.646-.014 3.006 0 .295.199.633.753.526C19.851 20.989 23 16.867 23 12c0-6.075-4.925-11-11-11z" fill="currentColor"/>
                </svg>
              )}
              <span className="invisible">Continue with {provider}</span>
              {/* Coming soon overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] pointer-events-none">
                <span className="text-sm uppercase tracking-[0.28em] text-white font-bold" style={{ fontFamily: 'var(--font-display)' }}>COMING SOON</span>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      <div className="mt-10 w-full flex-shrink-0">
        <Footer />
      </div>
    </div>
  );
}

