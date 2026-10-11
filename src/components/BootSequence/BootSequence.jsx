import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import Ambient from '../ui/Ambient';
import Logo from '../ui/Logo';
import './BootSequence.css';

const WORD = 'Yūgen'.split('');
const STEPS = [
  'Calibrating survey archive',
  'Syncing refinery matrix',
  'Verifying signal integrity',
  'Uplink established',
];
const TOTAL_MS = 3200;

export default function BootSequence({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  }, [onComplete]);

  // Eased progress ticker
  useEffect(() => {
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / TOTAL_MS);
      const eased = 1 - Math.pow(1 - t, 2.2);
      setProgress(eased);
      setStep(Math.min(STEPS.length - 1, Math.floor(eased * STEPS.length * 0.999)));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(finish, 350);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [finish]);

  // Any key / click skips
  useEffect(() => {
    const skip = () => finish();
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    return () => { window.removeEventListener('keydown', skip); window.removeEventListener('pointerdown', skip); };
  }, [finish]);

  return (
    <motion.div
      className="boot"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.06, filter: 'blur(14px)' }}
      transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
      role="status"
      aria-live="polite"
    >
      <Ambient tint={[0.91, 0.77, 0.48]} />
      <div className="boot-rings" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="boot-ring"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1 + i * 0.55, opacity: [0, 0.5 - i * 0.12, 0] }}
            transition={{ duration: 3.4, delay: 0.5 + i * 0.5, ease: 'easeOut', repeat: Infinity }}
          />
        ))}
      </div>

      <div className="boot-center">
        <div className="boot-logo"><Logo size={92} draw id="boot" /></div>

        <h1 className="boot-word" aria-label="Yūgen">
          {WORD.map((ch, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              initial={{ opacity: 0, y: 24, filter: 'blur(14px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.9 + i * 0.09, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              {ch}
            </motion.span>
          ))}
        </h1>

        <motion.p className="boot-tag" initial={{ opacity: 0, letterSpacing: '0.1em' }} animate={{ opacity: 1, letterSpacing: '0.34em' }} transition={{ delay: 1.5, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}>
          Unified intelligence · civilian frontier
        </motion.p>

        <motion.div className="boot-meter" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
          <div className="boot-bar"><span style={{ transform: `scaleX(${progress})` }} /></div>
          <div className="boot-status">
            <span>{STEPS[step]}</span>
            <span className="num">{String(Math.round(progress * 100)).padStart(3, '0')}%</span>
          </div>
        </motion.div>
      </div>

      <motion.div className="boot-skip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>
        Press any key to skip
      </motion.div>
    </motion.div>
  );
}
