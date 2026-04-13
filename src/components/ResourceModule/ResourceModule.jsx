import { useState, useMemo, useEffect } from 'react';
import { getResourceData, getBodies } from '../../data/dataStore';
import LoadingState from '../common/LoadingState';
import './ResourceModule.css';

// ── Technical SVG Icons ──
const ShipIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="vector-icon ship">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

const VehicleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="vector-icon vehicle">
    <rect x="2" y="14" width="20" height="8" rx="2" />
    <path d="M7 14V8l5-5 5 5v6" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="18" r="2" />
  </svg>
);

const HandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="vector-icon hand">
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M10 10.5V3a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
);

export default function ResourceModule({ system }) {
  const [resData, setResData] = useState([]);
  const [bodies, setBodies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [res, bods] = await Promise.all([
        getResourceData(system),
        getBodies()
      ]);
      setResData(res);
      setBodies(bods.filter(b => b.system === system));
      setIsLoading(false);
    };
    load();
  }, [system]);

  // Calculate unique materials across all bodies in this system
  const materials = useMemo(() => {
    const unique = [...new Set(resData.map(r => r.name))].sort();
    return unique;
  }, [resData]);

  // Build matrix: matrix[bodyName][materialName] = { ship, vehicle, hand }
  const matrix = useMemo(() => {
    const m = {};
    resData.forEach(r => {
      if (!m[r.parentBody]) m[r.parentBody] = {};
      if (!m[r.parentBody][r.name]) m[r.parentBody][r.name] = { ship: false, vehicle: false, hand: false };
      
      const type = r.type?.toLowerCase() || '';
      if (type.includes('ship')) m[r.parentBody][r.name].ship = true;
      if (type.includes('vehicle') || type.includes('ground')) m[r.parentBody][r.name].vehicle = true;
      if (type.includes('hand')) m[r.parentBody][r.name].hand = true;
    });
    return m;
  }, [resData]);

  if (isLoading) {
    return <LoadingState message="Synchronizing Survey Network" />;
  }

  if (resData.length === 0) {
    return (
      <div className="resource-matrix fade-in">
        <div className="empty-system-state">
          <div className="empty-icon">!</div>
          <h2 className="empty-title">Deep Space Survey: {system}</h2>
          <p className="empty-desc">No planetary survey data detected in this sector. Deploy survey teams via Admin Console.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="resource-matrix fade-in">
      <div className="res-header">
        <div>
          <h1 className="page-title">{system} Survey Intelligence</h1>
          <p className="page-desc">Extraction vector analysis across {bodies.length} bodies · {materials.length} unique resources identified</p>
        </div>
      </div>

      <div className="matrix-scroll scroll-industrial">
        <div className="matrix-grid" style={{ gridTemplateColumns: `180px repeat(${materials.length}, minmax(100px, 1fr))` }}>
          {/* Header Row */}
          <div className="grid-corner">PLANETARY BODY</div>
          {materials.map(mat => (
            <div key={mat} className="grid-ore-header" title={mat}>
              <span className="ore-label">{mat}</span>
            </div>
          ))}

          {/* Data Rows */}
          {bodies.map(body => (
            <div key={body.name} className="matrix-row-wrap">
              <div className="grid-station">
                <span className="station-name">{body.name}</span>
                <span className="station-id">BOD-0{body.id || 'X'}</span>
              </div>
              {materials.map(mat => {
                const data = matrix[body.name]?.[mat];
                return (
                  <div key={`${body.name}-${mat}`} className={`grid-cell ${data ? 'active' : 'empty'}`}>
                    {data ? (
                      <div className="vector-group">
                        {data.ship && <ShipIcon />}
                        {data.vehicle && <VehicleIcon />}
                        {data.hand && <HandIcon />}
                      </div>
                    ) : (
                      <span className="cell-dash">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="matrix-footer">
        <div className="legend">
          <div className="legend-item"><ShipIcon /> Ship Mineable</div>
          <div className="legend-item"><VehicleIcon /> Ground Mineable</div>
          <div className="legend-item"><HandIcon /> Hand Mineable</div>
        </div>
        <p className="matrix-note">Vectors indicate confirmed extraction feasibility based on recent planetary survey data.</p>
      </div>
    </div>
  );
}
