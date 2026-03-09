import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { fetchWithAuth } from '../utils/api';

interface AuthContextType {
  user: User | null;
  actingAs: any | null;
  isImpersonating: boolean;
  isLoading: boolean;
  login: (username: string) => Promise<void>;
  logout: () => void;
  startImpersonation: (userId: string, tenantId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  switchRole: (role: 'tenant_admin' | 'user') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [actingAs, setActingAs] = useState<any | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMe();
  }, []);

  const fetchMe = async () => {
    setIsLoading(true);
    try {
      const data = await fetchWithAuth('/api/me');
      setUser(data.user);
      setActingAs(data.actingAs);
      setIsImpersonating(data.isImpersonating);
    } catch (e) {
      console.error("Failed to fetch user", e);
      setUser(null);
      setActingAs(null);
      setIsImpersonating(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'password' })
    });
    if (res.ok) {
      const { token } = await res.json();
      localStorage.setItem('auth_token', token);
      await fetchMe();
    } else {
      const data = await res.json();
      throw new Error(data.error);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('app_session');
    setUser(null);
    setActingAs(null);
    setIsImpersonating(false);
  };

  const startImpersonation = async (userId: string, tenantId: string) => {
    try {
      const data = await fetchWithAuth('/api/impersonation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, tenantId })
      });
      
      localStorage.setItem('app_session', data.token);
      const actingAs = JSON.parse(atob(data.token));
      await fetchMe();
      
      const target = actingAs.role === 'tenant_admin' ? '/tenant-admin' : '/app';
      window.history.pushState({}, '', target);
      window.dispatchEvent(new Event('app-navigate'));
    } catch (err) {
      console.error("Impersonation failed", err);
      alert("Failed to start impersonation: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const switchRole = async (targetRole: 'tenant_admin' | 'user') => {
    try {
      const data = await fetchWithAuth('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole })
      });
      
      if (data.token) {
        localStorage.setItem('app_session', data.token);
      } else {
        localStorage.removeItem('app_session');
      }
      await fetchMe();
      
      const target = targetRole === 'tenant_admin' ? '/tenant-admin' : '/app';
      window.history.pushState({}, '', target);
      window.dispatchEvent(new Event('app-navigate'));
    } catch (err) {
      console.error("Role switch failed", err);
    }
  };

  const stopImpersonation = async () => {
    localStorage.removeItem('app_session');
    await fetchMe();
    
    let target = '/app';
    if (user?.role === 'super_admin' || user?.role === 'support') target = '/super-admin';
    else if (user?.role === 'tenant_admin') target = '/tenant-admin';
    
    window.history.pushState({}, '', target);
    window.dispatchEvent(new Event('app-navigate'));
  };

  return (
    <AuthContext.Provider value={{ user, actingAs, isImpersonating, login, logout, startImpersonation, stopImpersonation, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
