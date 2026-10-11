import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Wrench, Radar, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getNetworkStatus } from '../../data/dataStore';
import './NetworkGuard.css';

const COPY = {
  RESTRICTED: { icon: ShieldAlert, title: 'Access restricted', tone: 'neg', body: 'This module has been suspended by security protocol. Contact network administration for clearance.' },
  MAINTENANCE: { icon: Wrench, title: 'Synchronisation in progress', tone: 'amber', body: 'We are optimising this module to keep the database consistent. It will be back shortly.' },
  COLLECTING: { icon: Radar, title: 'Active data harvest', tone: 'teal', body: 'Passive data collection is running. Interaction is paused to protect ingestion stability.' },
};

export default function NetworkGuard({ moduleId, children }) {
  const { isAdmin } = useAuth();
  const [status, setStatus] = useState(null);
  const [bypass, setBypass] = useState(false);

  useEffect(() => {
    let live = true;
    const check = async () => {
      const net = await getNetworkStatus();
      if (live) setStatus(net[moduleId] || 'ACTIVE');
    };
    check();
    const t = setInterval(check, 30000);
    return () => { live = false; clearInterval(t); };
  }, [moduleId]);

  if (!status || status === 'ACTIVE' || bypass) return <>{children}</>;

  const c = COPY[status] || COPY.RESTRICTED;
  const Icon = c.icon;

  return (
    <div className="ng">
      <div className="ng-ghost" aria-hidden="true" inert>{children}</div>
      <div className="ng-overlay">
        <motion.div
          className={`ng-card glass ${c.tone}`}
          initial={{ opacity: 0, y: 24, scale: 0.97, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          role="alert"
        >
          <div className="ng-icon"><Icon size={26} /></div>
          <span className="eyebrow">Yūgen network · {moduleId} module</span>
          <h1 className="serif">{c.title}</h1>
          <p>{c.body}</p>
          <div className="ng-status"><span className="live warn" /> Node status <b>{status}</b></div>
          {isAdmin ? (
            <button className="btn primary" onClick={() => setBypass(true)}>Admin override <ArrowRight /></button>
          ) : (
            <p className="ng-note">Please stand by — this page refreshes automatically.</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
