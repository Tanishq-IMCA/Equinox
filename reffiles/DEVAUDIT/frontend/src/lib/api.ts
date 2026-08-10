'use client';

const BASE_URL = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

// Access tokens are short-lived. Rather than let every mid-session request fail
// with "Invalid or expired access token", we transparently refresh once and
// retry the original request. Concurrent 401s share a single in-flight
// refresh call so we don't hammer the refresh endpoint.
let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  _isRetry = false
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (response.status === 401 && !_isRetry && path !== '/api/auth/refresh' && path !== '/api/auth/login') {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return apiFetch<T>(path, options, true);
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'GET' });
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

// ── Auth ────────────────────────────────────────────────────────────────────
export async function registerUser(body: { email: string; password: string }) {
  return apiPost<{ success: boolean; user: Record<string, unknown> }>('/api/auth/register', body);
}

export async function loginUser(body: { email: string; password: string }) {
  return apiPost<{ success: boolean; user: Record<string, unknown> }>('/api/auth/login', body);
}

export async function logoutUser() {
  return apiPost<{ success: boolean }>('/api/auth/logout', {});
}

export async function changePassword(body: { currentPassword: string; newPassword: string }) {
  return apiPatch<{ success: boolean }>('/api/auth/password', body);
}

export async function deleteAccount(body: { password: string }) {
  return apiFetch<{ success: boolean }>('/api/auth/account', {
    method: 'DELETE',
    body: JSON.stringify(body),
  });
}

export async function getCurrentUser() {
  return apiGet<{ success: boolean; user: Record<string, unknown> }>('/api/auth/me');
}

// ── Profile ─────────────────────────────────────────────────────────────────
export async function getProfile() {
  return apiGet<{ success: boolean; user: Record<string, unknown> }>('/api/profile');
}

export async function saveProfile(body: Record<string, unknown>) {
  return apiPatch<{ success: boolean; user: Record<string, unknown> }>('/api/profile', body);
}

// ── GitHub Repositories ─────────────────────────────────────────────────────
export async function getRepositories() {
  return apiGet<{ success: boolean; repositories: Array<Record<string, unknown>> }>('/api/githubpull/repositories');
}

export async function unlinkGitHub() {
  return apiPost<{ success: boolean; message: string }>('/api/auth/github/unlink', {});
}

// ── Analysis ─────────────────────────────────────────────────────────────────
export async function getLatestAnalysis(fullName: string) {
  return apiGet<{ success: boolean; analysis: Record<string, unknown> }>(`/api/analysis/latest?fullName=${encodeURIComponent(fullName)}`);
}

export async function startAnalysis(body: Record<string, unknown>) {
  return apiPost<{ success: boolean; analysis: Record<string, unknown> }>('/api/analysis', body);
}

export async function getAnalysis(id: string) {
  return apiGet<{ success: boolean; analysis: Record<string, unknown> }>(`/api/analysis/${id}`);
}

export async function listAnalyses() {
  return apiGet<{ success: boolean; analyses: Array<Record<string, unknown>> }>('/api/analysis');
}

export async function getScanRateLimit() {
  return apiGet<{ success: boolean; scansUsed: number; scansAllowed: number; canScan: boolean; resetAt: string | null }>('/api/analysis/ratelimit');
}

export async function getToolsStatus() {
  return apiGet<{ success: boolean; tools: Record<string, boolean> }>('/api/analysis/tools/status');
}
