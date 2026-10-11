/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  loginUser, registerUser, updateUserProfile, fetchUserProfileStrict,
  getSession, setSession, clearSession, SESSION_EXPIRED_EVENT,
} from '../data/dataStore';

const AuthContext = createContext(null);

/** Reads the stored session once. Sessions created before JWTs existed are discarded. */
function readStoredUser() {
  const saved = getSession();
  if (!saved) return null;
  if (saved.token) return saved;
  console.warn('⚠️ Legacy session detected (no token). Clearing for security...');
  clearSession();
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  // Refresh the cached profile (role / clearance may have changed) and drop sessions for deleted accounts.
  useEffect(() => {
    const saved = getSession();
    if (!saved?.token || !saved.username) return;
    let live = true;
    fetchUserProfileStrict(saved.username)
      .then((fresh) => {
        if (!live || !fresh) return;
        const merged = { ...saved, ...fresh, token: saved.token };
        setSession(merged);
        setUser(merged);
      })
      .catch((err) => {
        if (live && /not found/i.test(err.message)) { clearSession(); setUser(null); }
      });
    return () => { live = false; };
  }, []);

  // The API told us our token is no longer valid.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
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
    const merged = { ...user, ...updated };
    setUser(merged);
    setSession(merged);
    return merged;
  }, [user]);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, isAdmin, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
