import { useState, useRef, useEffect, useId } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';
import './CustomSelect.css';

/** Accessible, keyboard-navigable listbox. `compact` renders an inline pill (used in toolbars). */
export default function CustomSelect({ label, value, onChange, options = [], compact = false }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const wrapRef = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const toggle = () => { setCursor(Math.max(0, options.indexOf(value))); setOpen((o) => !o); };
  const pick = (opt) => { onChange(opt); setOpen(false); };

  const onKeyDown = (e) => {
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); toggle(); return; }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => (c + 1) % options.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => (c - 1 + options.length) % options.length); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(options[cursor]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
  };

  return (
    <div className={`sel ${compact ? 'compact' : ''}`} ref={wrapRef}>
      {!compact && <span className="sel-label" id={`${id}-l`}>{label}</span>}
      <button
        type="button"
        className={`sel-trigger ${open ? 'open' : ''}`}
        onClick={toggle}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-l`}
      >
        {compact && <span className="sel-inline-label">{label}</span>}
        <span className={`sel-value ${value ? '' : 'ph'}`}>{value || 'Select…'}</span>
        <ChevronDown size={15} className="sel-chev" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            className="sel-menu glass"
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            {options.map((opt, i) => (
              <li key={opt} role="option" aria-selected={opt === value}>
                <button type="button" className={`sel-opt ${opt === value ? 'on' : ''} ${i === cursor ? 'cur' : ''}`} onMouseEnter={() => setCursor(i)} onClick={() => pick(opt)}>
                  <span>{opt}</span>
                  {opt === value && <Check size={14} />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
