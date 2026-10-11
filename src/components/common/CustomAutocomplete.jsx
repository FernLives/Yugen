import { useState, useRef, useEffect, useMemo, useId } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search } from 'lucide-react';
import './CustomSelect.css';

export default function CustomAutocomplete({ label, value, onChange, suggestions = [], placeholder = 'Search or type…' }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const wrapRef = useRef(null);
  const id = useId();

  const filtered = useMemo(() => {
    const q = (value || '').toLowerCase();
    return (q ? suggestions.filter((s) => s.toLowerCase().includes(q)) : suggestions).slice(0, 40);
  }, [suggestions, value]);

  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const pick = (opt) => { onChange(opt); setOpen(false); setCursor(-1); };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setCursor((c) => Math.min(filtered.length - 1, c + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
    else if (e.key === 'Enter' && open && cursor >= 0) { e.preventDefault(); pick(filtered[cursor]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="sel autocomplete" ref={wrapRef}>
      <label className="sel-label" htmlFor={id}>{label}</label>
      <div className={`sel-trigger input-mode ${open ? 'open' : ''}`}>
        <Search size={14} className="sel-lead" />
        <input
          id={id}
          type="text"
          className="sel-input"
          value={value || ''}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setCursor(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
        />
      </div>

      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.ul
            className="sel-menu glass" role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            {filtered.map((opt, i) => (
              <li key={opt} role="option" aria-selected={opt === value}>
                <button type="button" className={`sel-opt ${opt === value ? 'on' : ''} ${i === cursor ? 'cur' : ''}`} onMouseEnter={() => setCursor(i)} onClick={() => pick(opt)}>
                  <span>{opt}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
