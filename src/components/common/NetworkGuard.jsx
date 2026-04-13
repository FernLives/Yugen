import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getNetworkStatus } from '../../data/dataStore';
import './NetworkGuard.css';

export default function NetworkGuard({ moduleId, children }) {
  const { user, isAdmin } = useAuth();
  const [status, setStatus] = useState(null);
  const [showBypass, setShowBypass] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);

  useEffect(() => {
    const check = async () => {
      const netStatus = await getNetworkStatus();
      setStatus(netStatus[moduleId] || 'ACTIVE');
    };
    check();
    // Poll every 30s for status updates
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [moduleId]);

  if (!status || status === 'ACTIVE' || isBypassed) {
    return <>{children}</>;
  }

  // If we are here, the page is not ACTIVE
  const isRestricted = status === 'RESTRICTED';
  const isMaintenance = status === 'MAINTENANCE';
  const isCollecting = status === 'COLLECTING';

  return (
    <div className={`network-guard-container ${status.toLowerCase()}`}>
      <div className="guard-overlay">
        <div className="guard-scanlines"></div>
        
        <div className="guard-content">
          <div className="guard-header">
            <div className="guard-icon">
              {isRestricted && <span className="icon-alert">🔒</span>}
              {isMaintenance && <span className="icon-alert">⚙️</span>}
              {isCollecting && <span className="icon-alert">📡</span>}
            </div>
            <div className="guard-title-group">
              <h1 className="guard-title">
                {isRestricted && 'ACCESS RESTRICTED'}
                {isMaintenance && 'MAINTENANCE IN PROGRESS'}
                {isCollecting && 'DATA INGESTION MODE'}
              </h1>
              <div className="guard-subtitle">YŪGEN NETWORK ACCESS CONTROL // MODULE: {moduleId.toUpperCase()}</div>
            </div>
          </div>

          <div className="guard-terminal">
            <div className="terminal-header">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
              <span className="terminal-tag">NAC_LOG_ENTRY</span>
            </div>
            <div className="terminal-body">
              <p className="log-line">&gt; CHECKING PERMISSIONS... DONE</p>
              <p className="log-line">&gt; STATUS: <span className="status-val">{status}</span></p>
              <p className="log-line">&gt; LOCATION: Stanton // Sector 4 // Node {Math.floor(Math.random() * 888)}</p>
              <p className="log-line">&gt; REASON: {
                isRestricted ? 'Uplink synchronization suspended due to security protocol Alpha.' :
                isMaintenance ? 'Core system optimization in progress. Peripheral modules offline.' :
                'Passive data collection active. Direct interaction disabled for system stability.'
              }</p>
              <p className="log-line blinking">&gt; STANDBY FOR FURTHER INSTRUCTIONS...</p>
            </div>
          </div>

          <div className="guard-actions">
            {isAdmin && (
              <button 
                className="btn-bypass" 
                onClick={() => setIsBypassed(true)}
              >
                TACTICAL BYPASS
              </button>
            )}
            <p className="guard-note">
              {isAdmin 
                ? 'ADMIN PRIVILEGES DETECTED. BYPASS AUTHORIZED.' 
                : 'UPLINK SUSPENDED. CONTACT NETWORK ADMINISTRATION IF THIS IS AN ERROR.'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Dimmed background of the actual content for cool look */}
      <div className="guard-background-dim">
        <div className="dimmed-content-mask">{children}</div>
      </div>
    </div>
  );
}
