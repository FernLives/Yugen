import { useState, useMemo, useEffect } from 'react';
import { getRefineryData } from '../../data/dataStore';
import './RefineryModule.css';

export default function RefineryModule({ system }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const load = async () => {
      setData(await getRefineryData(system));
    };
    load();
  }, [system]);

  // Get unique ores and stations for the matrix
  const ores = useMemo(() => [...new Set(data.map(d => d.ore))].sort(), [data]);
  const stations = useMemo(() => [...new Set(data.map(d => d.station))].sort(), [data]);

  // Map data into a lookup table [station][ore] = modifier
  const matrix = useMemo(() => {
    const m = {};
    data.forEach(d => {
      if (!m[d.station]) m[d.station] = {};
      m[d.station][d.ore] = d.modifier;
    });
    return m;
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="refinery-matrix fade-in">
        <div className="empty-system-state">
          <div className="empty-icon">!</div>
          <h2 className="empty-title">Unknown Network: {system}</h2>
          <p className="empty-desc">No refinery terminals detected in this sector. Data entry required via Admin Console.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="refinery-matrix fade-in">
      <div className="ref-header">
        <div>
          <h1 className="page-title">{system} Refinery Matrix</h1>
          <p className="page-desc">System-specific location modifiers for {system} sector</p>
        </div>
      </div>

      <div className="matrix-container">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="sticky-col header-corner">Station</th>
              {ores.map(ore => (
                <th key={ore} className="ore-header">
                  <span className="ore-header-text">{ore.substring(0, 4).toUpperCase()}</span>
                  <span className="ore-header-full">{ore}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stations.map(station => (
              <tr key={station}>
                <td className="sticky-col station-cell">{station}</td>
                {ores.map(ore => {
                  const mod = matrix[station]?.[ore];
                  const type = mod > 0 ? 'pos' : mod < 0 ? 'neg' : 'neu';
                  return (
                    <td key={ore} className={`mod-cell ${type}`}>
                      {mod !== undefined ? (
                        <div className="mod-badge">
                          <span className="mod-sym">{mod > 0 ? '+' : ''}</span>
                          <span className="mod-val">{mod}</span>
                        </div>
                      ) : (
                        <span className="mod-empty">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="matrix-footer">
        <div className="legend">
          <div className="legend-item"><span className="dot pos" /> Yield Bonus</div>
          <div className="legend-item"><span className="dot neg" /> Yield Penalty</div>
        </div>
        <p className="matrix-note">Values represent static location modifiers. Final yield depends on the refining method used at the terminal.</p>
      </div>
    </div>
  );
}
