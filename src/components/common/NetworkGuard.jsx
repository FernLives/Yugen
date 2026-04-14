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
          <div className="nac-header">
            <div className="nac-icon-box">
              {isRestricted && <span className="nac-sig">✧</span>}
              {isMaintenance && <span className="nac-sig">⎔</span>}
              {isCollecting && <span className="nac-sig">◈</span>}
            </div>
            <div className="nac-title-area">
              <h1 className="nac-title">
                {isRestricted && 'SYSTEM ADVISORY'}
                {isMaintenance && 'SYNCHRONIZATION IN PROGRESS'}
                {isCollecting && 'ACTIVE DATA HARVEST'}
              </h1>
              <div className="nac-subtitle">YŪGEN NETWORK // {moduleId.toUpperCase()} MODULE</div>
            </div>
          </div>

          <div className="nac-body">
            <div className="nac-status-block">
              <div className="nac-indicator-track"><div className="nac-indicator-fill"></div></div>
              <div className="nac-status-pair">
                <span className="nac-label">NODE STATUS:</span>
                <span className="nac-value">{status}</span>
              </div>
            </div>
            <div className="nac-message-wrap">
              <p className="nac-text">
                {isRestricted ? 'Uplink synchronization for this module has been suspended by localized security protocols. Please contact network administration for clearance inquiries.' :
                 isMaintenance ? 'System optimization is currently in progress. Access to peripheral modules is temporarily restricted to ensure database integrity.' :
                 'Passive data collection is currently active for this node. Direct interaction has been disabled to prioritize ingestion stability.'}
              </p>
            </div>
          </div>

          <div className="nac-actions">
            {isAdmin && (
              <button 
                className="noc-btn primary" 
                onClick={() => setIsBypassed(true)}
              >
                ADMIN OVERRIDE
              </button>
            )}
            <p className="nac-note">
              {isAdmin 
                ? 'Administrative privileges detected. Override protocol available.' 
                : 'Connection suspended. Please standby for synchronization.'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="guard-background-shield">
        <div className="shield-content-mask">{children}</div>
      </div>
    </div>
  );
}
