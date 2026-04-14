import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getNetworkStatus } from '../../data/dataStore';
import './NetworkGuard.css';

export default function NetworkGuard({ moduleId, children }) {
  const { user, isAdmin } = useAuth();
  const [status, setStatus] = useState(null);
  const [isBypassed, setIsBypassed] = useState(false);

  useEffect(() => {
    const check = async () => {
      const netStatus = await getNetworkStatus();
      setStatus(netStatus[moduleId] || 'ACTIVE');
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [moduleId]);

  if (!status || status === 'ACTIVE' || isBypassed) {
    return <>{children}</>;
  }

  const isRestricted = status === 'RESTRICTED';
  const isMaintenance = status === 'MAINTENANCE';
  const isCollecting = status === 'COLLECTING';

  return (
    <div className={`network-guard-container ${status.toLowerCase()}`}>
      <div className="guard-overlay">
        <div className="guard-advisory-card">
          <div className="advisory-header">
            <div className="advisory-icon">
              {isRestricted && <span className="icon-sig">✧</span>}
              {isMaintenance && <span className="icon-sig">⎔</span>}
              {isCollecting && <span className="icon-sig">◈</span>}
            </div>
            <div className="advisory-title-group">
              <h1 className="advisory-title">
                {isRestricted && 'SYSTEM ADVISORY'}
                {isMaintenance && 'SYNCHRONIZATION IN PROGRESS'}
                {isCollecting && 'ACTIVE DATA HARVEST'}
              </h1>
              <div className="advisory-subtitle">YŪGEN NETWORK // {moduleId.toUpperCase()} MODULE</div>
            </div>
          </div>

          <div className="advisory-body">
            <div className="status-indicator">
              <div className="indicator-bar"><div className="indicator-progress"></div></div>
              <span className="status-label">STATUS: {status}</span>
            </div>
            <div className="advisory-message">
              <p className="message-text">
                {isRestricted ? 'Uplink synchronization for this module has been suspended by localized security protocols. Please contact network administration for clearance inquiries.' :
                 isMaintenance ? 'System optimization is currently in progress. Access to peripheral modules is temporarily restricted to ensure database integrity.' :
                 'Passive data collection is currently active for this node. Direct interaction has been disabled to prioritize ingestion stability.'}
              </p>
            </div>
          </div>

          <div className="advisory-actions">
            {isAdmin && (
              <button 
                className="noc-btn primary" 
                onClick={() => setIsBypassed(true)}
              >
                ADMIN OVERRIDE
              </button>
            )}
            <p className="advisory-note">
              {isAdmin 
                ? 'Administrative privileges detected. Override protocol available.' 
                : 'Connection suspended. Please standby for synchronization.'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="guard-background-dim">
        <div className="dimmed-content-mask">{children}</div>
      </div>
    </div>
  );
}
