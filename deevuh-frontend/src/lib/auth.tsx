'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from './api';
import type { User, AuthTokens } from './types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.setToken(token);
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get<User>('/users/me');
      setUser(res.data ?? null);
    } catch {
      api.setToken(null);
      localStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<AuthTokens>(
      '/auth/login',
      { email, password }
    );
    api.setToken(res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    setUser(res.data.user);

    // Merge guest cart
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      try {
        await api.post('/cart/merge', { sessionId });
      } catch { /* silent fail */ }
    }
  }, []);

  const register = useCallback(async (data: { email: string; password: string; firstName: string; lastName: string }) => {
    const res = await api.post<AuthTokens>(
      '/auth/register',
      data
    );
    api.setToken(res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    api.setToken(null);
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
