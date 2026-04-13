import { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

export default function CustomSelect({ label, value, onChange, options = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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
    <div className="custom-sel-field" ref={dropdownRef}>
      <label className="sel-label">{label}</label>
      <div 
        className={`sel-trigger ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="current-val">{value || 'SELECT OPTION'}</span>
        <span className="sel-chevron">⌃</span>
      </div>

      {isOpen && (
        <div className="sel-dropdown scroll-industrial fade-in-up">
          {options.map((opt) => (
            <div 
              key={opt} 
              className={`sel-option ${opt === value ? 'selected' : ''}`}
              onClick={() => handleSelect(opt)}
            >
              {opt === value && <span className="sel-pip">✧</span>}
              <span className="opt-text">{opt.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
