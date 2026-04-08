import { useState, useEffect, useCallback } from 'react';
import './BootSequence.css';

const bootLines = [
  { text: '╔══════════════════════════════════════════════════╗', delay: 0 },
  { text: '║                                                  ║', delay: 50 },
  { text: '║     A U X N E T   v3.7.2                        ║', delay: 100 },
  { text: '║     CIVILIAN DATA NETWORK                        ║', delay: 150 },
  { text: '║                                                  ║', delay: 200 },
  { text: '╚══════════════════════════════════════════════════╝', delay: 250 },
  { text: '', delay: 400 },
  { text: '[SYS] Initializing secure handshake...', delay: 500 },
  { text: '[SYS] Verifying node integrity............... OK', delay: 900 },
  { text: '[SYS] Decrypting relay map................... OK', delay: 1300 },
  { text: '[NET] Establishing mesh connection........... OK', delay: 1700 },
  { text: '[DAT] Loading refinery analysis module....... ONLINE', delay: 2100 },
  { text: '[DAT] Loading resource intelligence.......... ONLINE', delay: 2500 },
  { text: '[SEC] Org dossier access..................... RESTRICTED', delay: 2800 },
  { text: '[ADM] Admin subsystem........................ STANDBY', delay: 3000 },
  { text: '', delay: 3200 },
  { text: '> SYSTEM READY', delay: 3400 },
  { text: '> WELCOME, OPERATOR.', delay: 3700 },
  { text: '', delay: 3900 },
  { text: '[ PRESS ANY KEY OR CLICK TO CONTINUE ]', delay: 4100, blink: true },
];

export default function BootSequence({ onComplete }) {
  const [visibleLines, setVisibleLines] = useState([]);
  const [ready, setReady] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timers = bootLines.map((line, i) =>
      setTimeout(() => {
        setVisibleLines(prev => [...prev, line]);
        if (i === bootLines.length - 1) setReady(true);
      }, line.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleSkip = useCallback(() => {
    if (fading) return;
    setFading(true);
    setTimeout(() => onComplete(), 600);
  }, [fading, onComplete]);

  useEffect(() => {
    const handler = () => handleSkip();
    window.addEventListener('keydown', handler);
    window.addEventListener('click', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('click', handler);
    };
  }, [handleSkip]);

  return (
    <div className={`boot-screen ${fading ? 'boot-fade-out' : ''}`}>
      <div className="boot-scanline" />
      <div className="boot-content">
        {visibleLines.map((line, i) => (
          <div
            key={i}
            className={`boot-line ${line.blink ? 'boot-blink' : ''} ${
              line.text.includes('OK') ? 'boot-ok' : ''
            } ${line.text.includes('ONLINE') ? 'boot-online' : ''} ${
              line.text.includes('RESTRICTED') ? 'boot-restricted' : ''
            } ${line.text.includes('WELCOME') ? 'boot-welcome' : ''}`}
          >
            {line.text}
          </div>
        ))}
        {ready && <div className="boot-cursor">█</div>}
      </div>
      <div className="boot-corner boot-corner-tl" />
      <div className="boot-corner boot-corner-tr" />
      <div className="boot-corner boot-corner-bl" />
      <div className="boot-corner boot-corner-br" />
    </div>
  );
}
