import { useState, useMemo, useEffect } from 'react';
import { getPersonnelData } from '../../data/dataStore';
import './RegistryModule.css';

// ── Cipher Scramble Component ──
function CipherField({ label, realValue }) {
  const [displayText, setDisplayText] = useState('█████████');
  const [isHovered, setIsHovered] = useState(false);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';

  useEffect(() => {
    let interval;
    if (isHovered) {
      let cycles = 0;
      interval = setInterval(() => {
        const scrambled = realValue
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' ';
            if (cycles > 10 + i * 2) return realValue[i]; // Gradually "solve" from left to right
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('');
        
        setDisplayText(scrambled);
        cycles++;
        if (cycles > 30 + realValue.length * 2) clearInterval(interval);
      }, 30);
    } else {
      setDisplayText('█████████');
    }
    return () => clearInterval(interval);
  }, [isHovered, realValue]);

  return (
    <div 
      className={`cipher-field ${isHovered ? 'active' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="cf-label">{label}</span>
      <div className="cf-value">{displayText}</div>
    </div>
  );
}

// ── Geometric Bio-Signature ──
function GeometricSignature({ seed }) {
  // Simple deterministic "shape" generation based on seed string
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rotation = hash % 360;
  const points = (hash % 5) + 3; // 3 to 7 points
  
  return (
    <div className="bio-sig" style={{ transform: `rotate(${rotation}deg)` }}>
      <svg viewBox="0 0 100 100" className="sig-svg">
        <polygon 
          points={Array.from({ length: points }, (_, i) => {
            const angle = (i * 2 * Math.PI) / points;
            const r = 35 + (hash % (i + 1) * 2);
            return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
          }).join(' ')}
          className="sig-polygon"
        />
        <circle cx="50" cy="50" r="10" className="sig-core" />
      </svg>
    </div>
  );
}

function DossierCard({ person, index }) {
  return (
    <div className="premium-dossier animate-slide-in" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="glass-overlay" />
      <div className="scan-line" />
      
      <div className="dossier-top">
        <div className="dossier-meta">
          <span className="dm-clearance" data-level={person.clearance.toLowerCase()}>
            {person.clearance} CLASSIFIED
          </span>
          <span className="dm-id">REF // {person.id}</span>
        </div>
        <GeometricSignature seed={person.signatureSeed} />
      </div>

      <div className="dossier-body">
        <div className="subject-profile">
          <span className="profile-label">SUBJECT TITLE //</span>
          <h3 className="profile-title">{person.title}</h3>
        </div>

        <div className="intelligence-grid">
          <CipherField label="IDENTIFIER" realValue={person.realName} />
          <CipherField label="DEPLOYMENT" realValue={person.location} />
        </div>

        <div className="telemetry-bar">
          <div className="tele-item">
            <span className="ti-label">SIGNAL</span>
            <span className="ti-val">{person.signal}</span>
          </div>
          <div className="tele-item">
            <span className="ti-label">PING</span>
            <span className="ti-val">{person.ping}</span>
          </div>
          <div className="tele-item">
            <span className="ti-label">RELAY</span>
            <span className="ti-val">{person.relay}</span>
          </div>
        </div>
      </div>

      <div className="dossier-notes">
        <span className="dn-label">ANALYSIS / NOTES</span>
        <p className="dn-text">{person.notes}</p>
      </div>

      <div className="dossier-status">
        <div className="pulse-container">
          <div className={`status-pulse ${person.status.includes('ACTIVE') ? 'pulse-green' : 'pulse-red'}`} />
          <span className="status-text">{person.status}</span>
        </div>
        <div className="stamps">
          <span className="security-stamp">YŪGEN-INTERNAL-SIG</span>
        </div>
      </div>
    </div>
  );
}

export default function RegistryModule() {
  const [personnel, setPersonnel] = useState([]);

  useEffect(() => {
    const load = async () => {
      setPersonnel(await getPersonnelData());
    };
    load();
  }, []);

  return (
    <div className="registry-premium fade-in">
      <div className="reg-header">
        <div>
          <h1 className="page-title">Network Registry</h1>
          <p className="page-desc">High-frequency biometric signal intelligence</p>
        </div>
        <div className="reg-stats">
          <div className="reg-stat">
            <span className="rs-val">Ω</span>
            <span className="rs-label">ALIGNED</span>
          </div>
        </div>
      </div>

      <div className="dossier-grid">
        {personnel.map((p, i) => (
          <DossierCard key={p.id} person={p} index={i} />
        ))}
      </div>

      <div className="terminal-footer">
        <span className="terminal-log">ACCESS LOG: AUTHORIZED BY [FERNLIVES] // SESSION ENCRYPTED</span>
      </div>
    </div>
  );
}
