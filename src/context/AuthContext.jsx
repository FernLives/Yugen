import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, updateUserProfile, getSession, setSession, clearSession } from '../data/dataStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const saved = getSession();
    if (saved) setUser(saved);
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    const u = await loginUser(username, password);
    setUser(u);
    setSession(u);
    return u;
  }, []);

  const register = useCallback(async (username, password, callsign) => {
    const u = await registerUser(username, password, callsign);
    setUser(u);
    setSession(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    clearSession();
  }, []);

  const updateProfile = useCallback(async (data) => {
    if (!user) return;
    const updated = await updateUserProfile(user.id, data);
    setUser(updated);
    setSession(updated);
    return updated;
  }, [user]);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
