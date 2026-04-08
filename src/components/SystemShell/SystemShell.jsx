import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUniverseTime, generateSystemId } from '../../data/dataStore';
import './SystemShell.css';

const modules = [
  { id: 'refinery', label: 'Refinery', shortcut: '/refinery' },
  { id: 'resources', label: 'Resources', shortcut: '/resources' },
  { id: 'org', label: 'Dossier', shortcut: '/org' },
  { id: 'admin', label: 'Admin', shortcut: '/admin' },
];

const systems = ['Stanton', 'Pyro', 'Nyx'];

export default function SystemShell({ 
  activeModule, 
  activeSystem, onSystemChange,
  children 
}) {
  const navigate = useNavigate();
  const [time, setTime] = useState(getUniverseTime());
  const [nodeId] = useState(() => generateSystemId());
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdInput, setCmdInput] = useState('');

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
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
            <span className="wordmark-text">AUXNET</span>
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
          <span className="nav-node">{nodeId}</span>
          <button className="nav-cmd-trigger" onClick={() => setCmdOpen(!cmdOpen)}>
            <span className="cmd-key">⌘K</span>
          </button>
          <span className="nav-time">{time}</span>
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
    </div>
  );
}
