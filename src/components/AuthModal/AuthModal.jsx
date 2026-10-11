import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Eye, EyeOff, ArrowRight, AtSign, KeyRound, UserRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useScrollLock } from '../../lib/hooks';
import Logo from '../ui/Logo';
import './AuthModal.css';

const MIN_PASSWORD = 8;

function strength(pw) {
  if (pw.length < MIN_PASSWORD) return 0;
  let s = 1;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}
const STRENGTH_LABEL = [`Use at least ${MIN_PASSWORD} characters`, 'Weak', 'Fair', 'Good', 'Strong'];

function Field({ icon: Icon, label, type = 'text', value, onChange, trailing, ...rest }) {
  return (
    <label className="af">
      <span className="af-label">{label}</span>
      <span className="af-box">
        <Icon size={16} className="af-ico" />
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
        {trailing}
      </span>
    </label>
  );
}

export default function AuthModal({ onClose }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [callsign, setCallsign] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const [loading, setLoading] = useState(false);
  useScrollLock(true);

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const score = useMemo(() => strength(password), [password]);
  const mismatch = mode === 'register' && confirm && confirm !== password;

  // Shake the dialog without remounting it (a remount would drop input focus and replay the entrance).
  const shake = () => {
    const el = dialogRef.current;
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    el.animate(
      [{ translate: '0' }, { translate: '-10px' }, { translate: '9px' }, { translate: '-6px' }, { translate: '4px' }, { translate: '0' }],
      { duration: 400, easing: 'ease-out' },
    );
  };

  const switchMode = (m) => { setMode(m); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'login' && (!username.trim() || !password)) { setError('Enter your username and password'); shake(); return; }
    if (mode === 'register') {
      let problem = '';
      if (!/^[A-Za-z0-9_]{3,24}$/.test(username.trim())) problem = 'Username must be 3–24 letters, numbers or underscores';
      else if (callsign.trim().length < 2) problem = 'Callsign must be at least 2 characters';
      else if (password.length < MIN_PASSWORD) problem = `Password must be at least ${MIN_PASSWORD} characters`;
      else if (password !== confirm) problem = 'Passwords do not match';
      if (problem) { setError(problem); shake(); return; }
    }
    setLoading(true);
    try {
      if (mode === 'register') await register(username, password, callsign);
      else await login(username, password);
      onClose();
    } catch (err) {
      setError(err.message);
      shake();
    }
    setLoading(false);
  };

  return (
    <motion.div
      className="auth-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        ref={dialogRef}
        className="auth glass"
        role="dialog" aria-modal="true" aria-labelledby="auth-title"
        initial={{ opacity: 0, y: 28, scale: 0.96, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: 16, scale: 0.98, filter: 'blur(6px)' }}
        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
      >
        <aside className="auth-side" aria-hidden="true">
          <div className="auth-side-glow" />
          <Logo size={44} id="auth" draw />
          <div className="auth-quote">
            <p className="serif">Depth of information defines the boundary between survival and success.</p>
            <span>— Yūgen manifesto</span>
          </div>
          <ul className="auth-perks">
            <li><ShieldCheck size={14} /> Encrypted sessions, 7-day expiry</li>
            <li><ShieldCheck size={14} /> Public profile & clearance tiers</li>
          </ul>
        </aside>

        <div className="auth-main">
          <button className="auth-close btn ghost icon sm" onClick={onClose} aria-label="Close"><X size={16} /></button>

          <header className="auth-head">
            <h2 id="auth-title" className="serif">{mode === 'login' ? 'Welcome back' : 'Join the network'}</h2>
            <p>{mode === 'login' ? 'Sign in to your Yūgen account.' : 'Create an account to claim your callsign.'}</p>
          </header>

          <div className="auth-seg" role="tablist">
            {['login', 'register'].map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? 'on' : ''} onClick={() => switchMode(m)}>
                {mode === m && <motion.span layoutId="auth-pill" className="auth-pill" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
                <span>{m === 'login' ? 'Sign in' : 'Register'}</span>
              </button>
            ))}
          </div>

          <form className="auth-form" onSubmit={submit} noValidate>
            <Field icon={AtSign} label="Username" value={username} onChange={setUsername} placeholder="your handle" autoFocus spellCheck={false} autoComplete="username" maxLength={24} required />

            <AnimatePresence initial={false}>
              {mode === 'register' && (
                <motion.div key="callsign" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
                  <Field icon={UserRound} label="Callsign" value={callsign} onChange={setCallsign} placeholder="display name" spellCheck={false} maxLength={32} required />
                </motion.div>
              )}
            </AnimatePresence>

            <Field
              icon={KeyRound} label="Password" type={reveal ? 'text' : 'password'} value={password} onChange={setPassword} placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} maxLength={72} required
              trailing={<button type="button" className="af-reveal" onClick={() => setReveal((r) => !r)} aria-label={reveal ? 'Hide password' : 'Show password'}>{reveal ? <EyeOff size={15} /> : <Eye size={15} />}</button>}
            />

            <AnimatePresence initial={false}>
              {mode === 'register' && (
                <motion.div key="reg-extra" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
                  <div className="meter" data-score={score} aria-live="polite">
                    <div className="meter-bars">{[0, 1, 2, 3].map((i) => <i key={i} className={i < score ? 'on' : ''} />)}</div>
                    <span>{password ? STRENGTH_LABEL[score] : 'Choose a strong password'}</span>
                  </div>
                  <Field icon={KeyRound} label="Confirm password" type={reveal ? 'text' : 'password'} value={confirm} onChange={setConfirm} placeholder="••••••••" autoComplete="new-password" required aria-invalid={mismatch || undefined} />
                  {mismatch && <p className="auth-hint bad">Passwords don’t match yet.</p>}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.div className="auth-error" role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{error}</motion.div>
              )}
            </AnimatePresence>

            <button type="submit" className="btn primary auth-submit" disabled={loading}>
              {loading ? <span className="spinner" /> : <>{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight /></>}
            </button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
