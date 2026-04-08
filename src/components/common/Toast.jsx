import { useState, useEffect } from 'react';
import './Toast.css';

export default function Toast({ message, onClose, duration = 3000 }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`terminal-toast ${isVisible ? 'toast-visible' : 'toast-hidden'}`}>
      <span className="toast-icon">»</span>
      <span className="toast-message">{message}</span>
    </div>
  );
}
