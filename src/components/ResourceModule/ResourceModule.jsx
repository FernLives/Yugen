import { useState, useMemo, useEffect } from 'react';
import { getResourceData, getBodies } from '../../data/dataStore';
import LoadingState from '../common/LoadingState';
import './ResourceModule.css';

// ── Technical SVG Icons ──
const ShipIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="diag-icon ship">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

const VehicleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="diag-icon vehicle">
    <rect x="2" y="14" width="20" height="8" rx="2" />
    <path d="M7 14V8l5-5 5 5v6" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="18" r="2" />
  </svg>
);

const HandIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="diag-icon hand">
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M10 10.5V3a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
);

export default function ResourceModule({ system }) {
  const [resData, setResData] = useState([]);
  const [bodies, setBodies] = useState([]);
  const [selectedBody, setSelectedBody] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [res, bods] = await Promise.all([
        getResourceData(system),
        getBodies()
      ]);
      const currentBodies = bods.filter(b => b.system === system);
      setResData(res);
      setBodies(currentBodies);
      if (currentBodies.length > 0) setSelectedBody(currentBodies[0].name);
      setIsLoading(false);
    };
    load();
  }, [system]);

  const bodyIntelligence = useMemo(() => {
    if (!selectedBody) return null;
    const items = resData.filter(r => r.parentBody === selectedBody);
    
    // Categorize for the Hub display
    return {
      name: selectedBody,
      total: items.length,
      ship: items.filter(i => i.type.toLowerCase().includes('ship')),
      vehicle: items.filter(i => i.type.toLowerCase().includes('vehicle') || i.type.toLowerCase().includes('ground')),
      hand: items.filter(i => i.type.toLowerCase().includes('hand')),
      all: items
    };
  }, [resData, selectedBody]);

  if (isLoading) {
    return <LoadingState message="Establishing Planetary Link" />;
  }

  if (bodies.length === 0) {
    return (
      <div className="survey-terminal fade-in">
        <div className="empty-system-state">
          <div className="empty-icon">!</div>
          <h2 className="empty-title">Deep Space Sector: {system}</h2>
          <p className="empty-desc">No planetary survey data detected. Deploy tactical units via Admin NOC.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="survey-terminal fade-in">
      {/* ── SIDEBAR SECTOR LIST ── */}
      <div className="survey-sidebar">
        <div className="sidebar-header">
          <span className="sidebar-id">TERM-09 // SECTORS</span>
        </div>
        <div className="body-list">
          {bodies.map(body => (
            <button 
              key={body.name} 
              className={`body-slot ${selectedBody === body.name ? 'active' : ''}`}
              onClick={() => setSelectedBody(body.name)}
            >
              <div className="slot-indicator" />
              <div className="slot-info">
                <span className="slot-name">{body.name}</span>
                <span className="slot-status">LINK ESTABLISHED</span>
              </div>
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="uptime-pips">
            <span className="p active"></span><span className="p active"></span><span className="p"></span>
          </div>
          <span className="sys-id">{system.toUpperCase()} DATA HUB</span>
        </div>
      </div>

      {/* ── INTELLIGENCE READOUT ── */}
      <div className="survey-main">
        {bodyIntelligence ? (
          <div className="intelligence-feed">
            <header className="feed-header">
              <div className="feed-title-wrap">
                <span className="feed-meta">YŪGEN // FIELD INTEL // {system.toUpperCase()}</span>
                <h1 className="feed-body-name">{bodyIntelligence.name}</h1>
              </div>
              <div className="feed-status">
                <div className="pulse-success"></div>
                <span className="status-label">DIAGNOSTICS CLEAR</span>
              </div>
            </header>

            <div className="feed-content">
              {/* Extraction Vectors Row */}
              <div className="vector-diagnostic-row">
                <VectorStat 
                  icon={<ShipIcon />} 
                  label="SHIP EXTRACTION" 
                  count={bodyIntelligence.ship.length} 
                  active={bodyIntelligence.ship.length > 0} 
                />
                <VectorStat 
                  icon={<VehicleIcon />} 
                  label="VEHICLE EXTRACTION" 
                  count={bodyIntelligence.vehicle.length} 
                  active={bodyIntelligence.vehicle.length > 0} 
                />
                <VectorStat 
                  icon={<HandIcon />} 
                  label="HAND EXTRACTION" 
                  count={bodyIntelligence.hand.length} 
                  active={bodyIntelligence.hand.length > 0} 
                />
              </div>

              {/* Data Matrix List */}
              <div className="intel-list-wrap scroll-industrial">
                <table className="intel-table">
                  <thead>
                    <tr>
                      <th>DATA-ID</th>
                      <th>RESOURCE PROFILE</th>
                      <th>EXT-VECTOR</th>
                      <th>SURVEY NOTES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bodyIntelligence.all.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="empty-row">NO REGISTERED MATERIALS DETECTED IN THIS SECTOR.</td>
                      </tr>
                    ) : (
                      bodyIntelligence.all.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="data-id">SRV-0{idx + 1}</td>
                          <td className="resource-name">{item.name}</td>
                          <td className="vector-type">
                            <span className="vector-chip">{item.type.toUpperCase()}</span>
                          </td>
                          <td className="survey-desc">{item.description || 'Biological/Mineral signature confirmed.'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <footer className="feed-footer">
              <div className="footer-hardware">
                <span className="h-pip"></span>
                <span>YŪGEN INDUSTRIAL SCANNER v2.04</span>
              </div>
            </footer>
          </div>
        ) : (
          <div className="terminal-standby">
            <span className="standby-flicker">SELECT SECTOR FOR DATA UPLINK...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function VectorStat({ icon, label, count, active }) {
  return (
    <div className={`vector-stat ${active ? 'active' : 'dim'}`}>
      <div className="v-icon-wrap">{icon}</div>
      <div className="v-info">
        <span className="v-label">{label}</span>
        <span className="v-value">{count} SIGNATURES</span>
      </div>
      <div className="v-bar">
        <div className="v-fill" style={{ width: active ? '100%' : '0%' }}></div>
      </div>
    </div>
  );
}
