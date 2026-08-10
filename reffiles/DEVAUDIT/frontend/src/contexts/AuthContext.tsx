'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '@/types';
import { loginUser, registerUser, logoutUser, getCurrentUser } from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  loginWithGoogle: () => void;
  loginWithGithub: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeBackendUser(raw: Record<string, unknown>): User {
  const profile = (raw.profile as Record<string, unknown>) || {};
  const dev = (raw.developer as Record<string, unknown>) || {};
  const github = (dev.github as Record<string, unknown>) || {};
  return {
    id: String(raw._id || raw.id || ''),
    name: String(profile.fullName || raw.email?.toString().split('@')[0] || 'User'),
    email: String(raw.email || ''),
    age: profile.age ? Number(profile.age) : undefined,
    occupation: (profile.role as User['occupation']) || 'professional',
    techStack: (dev.techStack as string[]) || [],
    education: ((dev.education as unknown[]) || []).filter(Boolean) as User['education'],
    projects: ((dev.projects as unknown[]) || []).filter(Boolean) as User['projects'],
    githubUsername: (github.username as string) || undefined,
    avatarUrl: (profile.avatar as string) || undefined,
    bio: (profile.bio as string) || undefined,
    role: (raw.role as string) || 'user',
    createdAt: (raw.createdAt as string) || new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
  }>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Restore session on mount. Try the API first, then fall back to localStorage
  // so a freshly logged-in user doesn't flash the sign-in screen while cookies
  // are still settling or on a cold navigation.
  useEffect(() => {
    let cancelled = false;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as User;
        if (!cancelled) {
          setState({ user: parsed, isAuthenticated: true, isLoading: false });
        }
      } catch {
        localStorage.removeItem('auth_user');
      }
    }

    getCurrentUser()
      .then(res => {
        if (cancelled) return;
        if (res.success && res.user) {
          const user = normalizeBackendUser(res.user);
          localStorage.setItem('auth_user', JSON.stringify(user));
          setState({ user, isAuthenticated: true, isLoading: false });
        } else {
          if (!cancelled) setState(s => ({ ...s, isLoading: false }));
        }
      })
      .catch(() => {
        if (!cancelled) setState(s => ({ ...s, isLoading: false }));
      });

    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginUser({ email, password });
    const user = normalizeBackendUser(res.user);
    localStorage.setItem('auth_user', JSON.stringify(user));
    setState({ user, isAuthenticated: true, isLoading: false });
    return user;
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const res = await registerUser({ email, password });
    const user = normalizeBackendUser(res.user);
    localStorage.setItem('auth_user', JSON.stringify(user));
    setState({ user, isAuthenticated: true, isLoading: false });
    return user;
  }, []);

  const logout = useCallback(async () => {
    try { await logoutUser(); } catch { /* ignore */ }
    localStorage.removeItem('auth_user');
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setState(s => {
      if (!s.user) return s;
      const updated = { ...s.user, ...updates };
      localStorage.setItem('auth_user', JSON.stringify(updated));
      return { ...s, user: updated };
    });
  }, []);

  const loginWithGoogle = useCallback(() => {
    window.location.href = '/api/auth/google';
  }, []);

  const loginWithGithub = useCallback(() => {
    window.location.href = '/api/auth/github';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        updateUser,
        loginWithGoogle,
        loginWithGithub,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
