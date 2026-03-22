import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client';
import { SessionUser } from '../types';

interface AuthContextValue {
  user: SessionUser | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    apiFetch<SessionUser>('/auth/me').then(setUser).catch(() => setUser(null));
  }, []);

  const value = useMemo(
    () => ({
      user,
      login: async (username: string, password: string) => {
        const next = await apiFetch<SessionUser>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
        setUser(next);
      },
      register: async (username: string, password: string) => {
        await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) });
      },
      logout: async () => {
        await apiFetch('/auth/logout', { method: 'POST' });
        setUser(null);
      }
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
