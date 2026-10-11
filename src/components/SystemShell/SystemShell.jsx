import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Compass, Newspaper, Flame, Orbit, ShieldCheck, Search, ChevronDown, UserRound, LogOut, Check, Command } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useClock, useClickOutside } from '../../lib/hooks';
import { universeClock } from '../../lib/format';
import AuthModal from '../AuthModal/AuthModal';
import Ambient from '../ui/Ambient';
import Avatar from '../ui/Avatar';
import Logo from '../ui/Logo';
import CommandPalette from '../ui/CommandPalette';
import './SystemShell.css';

const SYSTEMS = ['Stanton', 'Pyro', 'Nyx'];

// Route → ambient tint (RGB 0–1)
const TINTS = {
  info: [0.91, 0.77, 0.48],
  bulletin: [0.57, 0.54, 0.97],
  refinery: [0.94, 0.66, 0.34],
  resources: [0.37, 0.84, 0.76],
  admin: [0.42, 0.71, 1.0],
  profile: [0.93, 0.48, 0.56],
};

const NAV_ICONS = { info: Compass, bulletin: Newspaper, refinery: Flame, resources: Orbit, admin: ShieldCheck };

export default function SystemShell({ activeModule, activeSystem, onSystemChange, children }) {
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const now = useClock(1000);
  const clock = universeClock(now);

  const [cmdOpen, setCmdOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [sysMenu, setSysMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userRef = useRef(null);
  const sysRef = useRef(null);

  useClickOutside(userRef, () => setUserMenu(false), userMenu);
  useClickOutside(sysRef, () => setSysMenu(false), sysMenu);

  const modules = useMemo(() => [
    { id: 'info', label: 'Overview', shortcut: '/info' },
    { id: 'bulletin', label: 'Bulletin', shortcut: '/bulletin' },
    { id: 'refinery', label: 'Refinery', shortcut: '/refinery' },
    { id: 'resources', label: 'Resources', shortcut: '/resources' },
    ...(isAdmin ? [{ id: 'admin', label: 'Console', shortcut: '/admin' }] : []),
  ], [isAdmin]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setCmdOpen((o) => !o); }
      else if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) && !document.activeElement?.isContentEditable) { e.preventDefault(); setCmdOpen(true); }
      else if (e.key === 'Escape') { setUserMenu(false); setSysMenu(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const tint = TINTS[activeModule] || TINTS.info;
  const showSystem = ['refinery', 'resources'].includes(activeModule);

  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <Ambient tint={tint} />
      <div className="grain" aria-hidden="true" />

      <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="topbar-inner">
          <Link to="/info" className="brand" aria-label="Yūgen — home">
            <span className="brand-mark"><Logo size={26} id="nav" /></span>
            <span className="brand-word">Yūgen</span>
          </Link>

          <div className={`sys-switch ${showSystem ? '' : 'idle'}`} ref={sysRef}>
            <button className="sys-trigger" onClick={() => setSysMenu((o) => !o)} aria-haspopup="listbox" aria-expanded={sysMenu} title="Change star system">
              <span className="sys-dot" />
              <span className="sys-name">{activeSystem}</span>
              <ChevronDown size={14} className={sysMenu ? 'flip' : ''} />
            </button>
            <AnimatePresence>
              {sysMenu && (
                <motion.ul
                  className="menu glass"
                  role="listbox"
                  initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                >
                  <li className="menu-label">Star system</li>
                  {SYSTEMS.map((s, i) => (
                    <li key={s}>
                      <button role="option" aria-selected={s === activeSystem} className={`menu-item ${s === activeSystem ? 'on' : ''}`} onClick={() => { onSystemChange(s); setSysMenu(false); }}>
                        <span className="menu-idx">0{i + 1}</span>
                        <span>{s}</span>
                        {s === activeSystem && <Check size={14} className="menu-check" />}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          <nav className="dock glass" aria-label="Primary">
            {modules.map((m) => {
              const Icon = NAV_ICONS[m.id];
              const on = activeModule === m.id;
              return (
                <button key={m.id} className={`dock-item ${on ? 'on' : ''}`} onClick={() => navigate(m.shortcut)} aria-current={on ? 'page' : undefined}>
                  {on && <motion.span layoutId="dock-pill" className="dock-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <Icon size={16} className="dock-ico" />
                  <span className="dock-label">{m.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="topbar-right">
            <div className="clock" title="Standard Earth Time, universe-adjusted" aria-label="Universe clock">
              <span className="clock-date">{clock.date}</span>
              <span className="clock-time num">{clock.time}</span>
            </div>

            <button className="search-pill" onClick={() => setCmdOpen(true)} aria-label="Open command palette">
              <Search size={15} />
              <span className="search-text">Search</span>
              <span className="kbd"><Command size={10} />K</span>
            </button>

            {user ? (
              <div className="user-area" ref={userRef}>
                <button className="user-btn" onClick={() => setUserMenu((o) => !o)} aria-haspopup="menu" aria-expanded={userMenu}>
                  <Avatar seed={user.avatarSeed} size={30} title={user.callsign} />
                  <span className="user-callsign">{user.callsign}</span>
                  <ChevronDown size={13} className={`user-chev ${userMenu ? 'flip' : ''}`} />
                </button>
                <AnimatePresence>
                  {userMenu && (
                    <motion.div
                      className="menu glass right" role="menu"
                      initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                    >
                      <div className="menu-user">
                        <b>{user.callsign}</b>
                        <span>@{user.username}</span>
                      </div>
                      <button role="menuitem" className="menu-item" onClick={() => { navigate(`/profile/${user.username}`); setUserMenu(false); }}><UserRound size={15} /> Profile</button>
                      <button role="menuitem" className="menu-item danger" onClick={() => { logout(); setUserMenu(false); }}><LogOut size={15} /> Sign out</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button className="btn primary sm signin" onClick={() => setAuthOpen(true)}>Sign in</button>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="shell-main">{children}</main>

      <footer className="shell-foot">
        <div className="shell-foot-inner">
          <span className="foot-brand"><Logo size={16} id="ft" /> Yūgen Intelligence</span>
          <span className="foot-mid">A civilian-first suite for the frontier. Built with care by FernLives.</span>
          <span className="foot-end"><span className="live" /> All systems nominal</span>
        </div>
      </footer>

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        modules={modules}
        systems={SYSTEMS}
        activeSystem={activeSystem}
        onSystemChange={onSystemChange}
        navigate={navigate}
        user={user}
        onSignIn={() => setAuthOpen(true)}
        onSignOut={logout}
      />

      <AnimatePresence>{authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}</AnimatePresence>
    </div>
  );
}
