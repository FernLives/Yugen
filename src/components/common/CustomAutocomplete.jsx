import { useState, useRef, useEffect, useMemo } from 'react';
import './CustomSelect.css'; // Reusing base dropdown styles

export default function CustomAutocomplete({ label, value, onChange, suggestions = [], placeholder = 'SCAN SIGNATURE...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const filtered = useMemo(() => {
    if (!value) return suggestions;
    const q = value.toLowerCase();
    return suggestions.filter(s => s.toLowerCase().includes(q));
  }, [suggestions, value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (opt) => {
    onChange(opt);
    setIsOpen(false);
  };

  return (
    <div className="custom-sel-field autocomplete" ref={dropdownRef}>
      <label className="sel-label">{label}</label>
      <div className={`sel-trigger input-mode ${isOpen ? 'active' : ''}`}>
        <input 
          type="text"
          className="auto-input"
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          spellCheck={false}
        />
        <span className="sel-chevron" onClick={() => setIsOpen(!isOpen)}>⬢</span>
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="sel-dropdown scroll-industrial fade-in-up">
          {filtered.map((opt) => (
            <div 
              key={opt} 
              className={`sel-option ${opt === value ? 'selected' : ''}`}
              onClick={() => handleSelect(opt)}
            >
              <span className="sel-pip">◇</span>
              <span className="opt-text">{opt.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
