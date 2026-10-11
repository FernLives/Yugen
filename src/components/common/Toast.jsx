import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import './Toast.css';

export default function Toast({ message, onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            key={message}
            className="toast glass"
            initial={{ opacity: 0, y: 24, scale: 0.94, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 12, scale: 0.97, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          >
            <span className="toast-ico"><Sparkles size={14} /></span>
            <span className="toast-msg">{message}</span>
            <motion.span className="toast-timer" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: duration / 1000, ease: 'linear' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
