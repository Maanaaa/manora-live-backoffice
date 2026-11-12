import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, api, getToken, setToken, setUnauthorizedHandler } from '../lib/api';
import type { User } from '../lib/types';

type Status = 'checking' | 'anonymous' | 'authenticated' | 'unreachable';

interface AuthValue {
  status: Status;
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  retry: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState(getToken);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>(token ? 'checking' : 'anonymous');
  const [attempt, setAttempt] = useState(0);

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Au démarrage, vérifie que le jeton gardé est toujours valable.
  useEffect(() => {
    if (!token || user) return;
    let cancelled = false;
    api<User>('/auth/me')
      .then((me) => {
        if (cancelled) return;
        if (me.role !== 'admin') return logout();
        setUser(me);
        setStatus('authenticated');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.unreachable) setStatus('unreachable');
        else logout();
      });
    return () => {
      cancelled = true;
    };
  }, [token, user, attempt, logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { email, password } });
    if (res.user.role !== 'admin') throw new ApiError(403, 'Le back-office est réservé aux administrateurs.');
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    setStatus('authenticated');
  }, []);

  const retry = useCallback(() => {
    setStatus('checking');
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo(() => ({ status, user, token, login, logout, retry }), [status, user, token, login, logout, retry]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
