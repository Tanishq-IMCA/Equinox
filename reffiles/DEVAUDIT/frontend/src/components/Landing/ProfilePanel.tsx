'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { ConfirmButton } from '@/components/ui/ConfirmButton';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfilePanel({ isOpen, onClose }: ProfilePanelProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    onClose();
    router.push('/');
  };

  const handleOpenProfile = () => {
    onClose();
    router.push('/settings');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/35"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.97 }}
            transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
            className="fixed right-8 top-24 z-50 w-full max-w-[22rem] border border-white/10 bg-black/70 p-5 shadow-2xl backdrop-blur-xl"
            style={{ borderRadius: '1px' }}
          >
            <div className="flex items-center gap-4 border-b border-white/10 pb-4">
              <div className="h-12 w-12 flex items-center justify-center text-sm border border-white/15 bg-white/[0.06] rounded-full text-white uppercase tracking-[0.22em]" style={{ fontFamily: 'var(--font-display)' }}>
                {user.name[0]}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg uppercase tracking-[0.16em] text-white" style={{ fontFamily: 'var(--font-display)' }}>{user.name}</p>
                <p className="truncate text-xs uppercase tracking-[0.24em] text-white/45" style={{ fontFamily: 'var(--font-mono)' }}>{user.email}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <button onClick={handleOpenProfile} className="w-full text-left border border-white/10 bg-white/[0.03] px-4 py-3 text-xs uppercase tracking-[0.28em] text-white transition hover:border-white/25 hover:bg-white/[0.06]" style={{ borderRadius: '1px', fontFamily: 'var(--font-display)' }}>
                Open Profile
              </button>
              <div className="pt-1" />
              <ConfirmButton
                onConfirm={handleLogout}
                confirmText="Are you sure?"
                timeout={3000}
                lineColor="#ef4444"
                className="w-full border border-white/10 bg-transparent px-4 py-3 text-xs uppercase tracking-[0.28em] text-white/70 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300"
                style={{ borderRadius: '1px', fontFamily: 'var(--font-display)' }}
              >
                Sign Out
              </ConfirmButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
