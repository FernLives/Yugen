import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUniverseTime, generateSystemId } from '../../data/dataStore';
import AuthModal from '../AuthModal/AuthModal';
import './SystemShell.css';

const systems = ['Stanton', 'Pyro', 'Nyx'];

export default function SystemShell({ 
  activeModule, 
  activeSystem, onSystemChange,
  children 
}) {
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const [time, setTime] = useState(getUniverseTime());
  const [nodeId] = useState(() => generateSystemId());
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdInput, setCmdInput] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const avatarRef = useRef(null);

  // Build modules dynamically based on role
  const modules = [
    { id: 'refinery', label: 'Refinery', shortcut: '/refinery' },
    { id: 'resources', label: 'Resources', shortcut: '/resources' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', shortcut: '/admin' }] : []),
  ];

  useEffect(() => {
    const timer = setInterval(() => setTime(getUniverseTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
      if (e.key === 'Escape') { setCmdOpen(false); setUserMenuOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Draw mini avatar
  const drawMiniAvatar = useCallback((canvas, seed) => {
    if (!canvas || !seed) return;
    const ctx = canvas.getContext('2d');
    const size = 28;
    canvas.width = size;
    canvas.height = size;
    const nums = [];
    for (let i = 0; i < seed.length; i += 2) {
      nums.push(parseInt(seed.substr(i, 2), 16) || 0);
    }
    const hue = nums[0] * 1.4;
    const sat = 30 + (nums[1] % 30);
    ctx.fillStyle = `hsl(${hue}, ${sat}%, 15%)`;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    // Simple hex pattern
    const cx = size / 2, cy = size / 2;
    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        const idx = (Math.abs(r * 3 + c) + 2) % nums.length;
        if (nums[idx] % 3 === 0) continue;
        const x = cx + c * 7 + (r % 2 ? 3.5 : 0);
        const y = cy + r * 6;
        ctx.fillStyle = `hsla(${hue + (nums[idx] % 40) - 20}, ${sat + 10}%, ${45 + nums[idx] % 20}%, 0.5)`;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          const px = x + 3.5 * Math.cos(a);
          const py = y + 3.5 * Math.sin(a);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, 50%, 0.3)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (user?.avatarSeed && avatarRef.current) {
      drawMiniAvatar(avatarRef.current, user.avatarSeed);
    }
  }, [user, drawMiniAvatar]);

  const handleCmd = (e) => {
    if (e.key === 'Enter' && cmdInput.trim()) {
      const cmd = cmdInput.trim().toLowerCase().replace('/', '');
      const mod = modules.find(m => m.id === cmd);
      if (mod) navigate(mod.shortcut);
      setCmdInput('');
      setCmdOpen(false);
    }
  };

  return (
    <div className="shell">
      {/* ── Top Navigation ── */}
      <header className="shell-nav">
        <div className="nav-left">
          <div className="nav-wordmark">
            <span className="wordmark-symbol">◆</span>
            <span className="wordmark-text">YŪGEN</span>
          </div>
          <span className="nav-divider" />
          <div className="system-selector">
            {systems.map(sys => (
              <button
                key={sys}
                className={`system-link ${activeSystem === sys ? 'active' : ''}`}
                onClick={() => onSystemChange(sys)}
              >
                {sys.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <nav className="nav-modules">
          {modules.map(mod => (
            <button
              key={mod.id}
              className={`nav-module ${activeModule === mod.id ? 'active' : ''}`}
              onClick={() => navigate(mod.shortcut)}
            >
              {mod.label}
              {activeModule === mod.id && <span className="nav-module-indicator" />}
            </button>
          ))}
        </nav>

        <div className="nav-right">
          <span className="nav-time">{time}</span>
          <button className="nav-cmd-trigger" onClick={() => setCmdOpen(!cmdOpen)}>
            <span className="cmd-key">⌘K</span>
          </button>

          {/* User area */}
          {user ? (
            <div className="nav-user-area">
              <button className="nav-user-btn" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                <canvas ref={avatarRef} className="nav-avatar" />
                <span className="nav-callsign">{user.callsign}</span>
              </button>

              {userMenuOpen && (
                <div className="user-dropdown" onClick={() => setUserMenuOpen(false)}>
                  <button className="dropdown-item" onClick={() => navigate(`/profile/${user.username}`)}>
                    Profile
                  </button>
                  <button className="dropdown-item logout" onClick={logout}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="nav-signin-btn" onClick={() => setAuthOpen(true)}>
              SIGN IN
            </button>
          )}
        </div>
      </header>

      {/* ── Content ── */}
      <main className="shell-content">
        <div className="content-inner">
          {children}
        </div>
      </main>

      {/* ── Command Palette ── */}
      {cmdOpen && (
        <div className="cmd-overlay" onClick={() => setCmdOpen(false)}>
          <div className="cmd-palette" onClick={e => e.stopPropagation()}>
            <div className="cmd-input-wrapper">
              <span className="cmd-chevron">›</span>
              <input
                type="text"
                className="cmd-input"
                value={cmdInput}
                onChange={e => setCmdInput(e.target.value)}
                onKeyDown={handleCmd}
                placeholder="Navigate to module..."
                autoFocus
                spellCheck={false}
              />
            </div>
            <div className="cmd-options">
              {modules.map(mod => (
                <button
                  key={mod.id}
                  className={`cmd-option ${activeModule === mod.id ? 'current' : ''}`}
                  onClick={() => { navigate(mod.shortcut); setCmdOpen(false); }}
                >
                  <span className="cmd-option-label">{mod.label}</span>
                  <span className="cmd-option-shortcut">{mod.shortcut}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Auth Modal ── */}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
