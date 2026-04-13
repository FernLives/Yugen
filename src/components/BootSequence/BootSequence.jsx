import { useState, useEffect, useCallback } from 'react';
import './BootSequence.css';

const SUBTITLE = 'ESTABLISHING CONNECTION...';

export default function BootSequence({ onComplete }) {
  const [phase, setPhase] = useState(0); // 0=hidden, 1=symbol, 2=wordmark, 3=line, 4=typing, 5=ready
  const [typed, setTyped] = useState('');
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),   // Symbol fades in
      setTimeout(() => setPhase(2), 700),   // Wordmark appears
      setTimeout(() => setPhase(3), 1200),  // Line expands
      setTimeout(() => setPhase(4), 1600),  // Start typing subtitle
      setTimeout(() => setPhase(5), 1600 + SUBTITLE.length * 40 + 400), // Ready
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Typewriter effect for subtitle
  useEffect(() => {
    if (phase !== 4) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTyped(SUBTITLE.slice(0, i));
      if (i >= SUBTITLE.length) {
        clearInterval(interval);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [phase === 4]);

  const dismiss = useCallback(() => {
    if (fading) return;
    setFading(true);
    setTimeout(() => onComplete(), 500);
  }, [fading, onComplete]);

  // Auto-dismiss after ready
  useEffect(() => {
    if (phase === 5) {
      const t = setTimeout(dismiss, 1200);
      return () => clearTimeout(t);
    }
  }, [phase, dismiss]);

  // Click / key to skip
  useEffect(() => {
    const handler = () => dismiss();
    window.addEventListener('keydown', handler);
    window.addEventListener('click', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('click', handler);
    };
  }, [dismiss]);

  return (
    <div className={`boot-intro ${fading ? 'boot-out' : ''}`}>
      {/* Ambient glow */}
      <div className="boot-glow" />

      <div className="boot-center">
        {/* Diamond symbol */}
        <div className={`boot-symbol ${phase >= 1 ? 'visible' : ''}`}>
          <svg viewBox="0 0 40 40" className="boot-diamond">
            <circle cx="20" cy="20" r="16" />
            <circle cx="20" cy="20" r="8" opacity="0.5" />
          </svg>
        </div>

        {/* Wordmark */}
        <div className={`boot-wordmark ${phase >= 2 ? 'visible' : ''}`}>
          YŪGEN
        </div>

        {/* Expanding line */}
        <div className={`boot-line-expand ${phase >= 3 ? 'visible' : ''}`} />

        {/* Typed subtitle */}
        <div className={`boot-subtitle ${phase >= 4 ? 'visible' : ''}`}>
          {typed}
          <span className="boot-caret">|</span>
        </div>
      </div>

      {/* Skip hint */}
      <div className={`boot-skip ${phase >= 5 ? 'visible' : ''}`}>
        CLICK TO ENTER
      </div>
    </div>
  );
}
