import { useState, useMemo, useEffect, Fragment } from 'react';
import { getRefineryData } from '../../data/dataStore';
import LoadingState from '../common/LoadingState';
import './RefineryModule.css';

export default function RefineryModule({ system }) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [focusedOre, setFocusedOre] = useState(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const result = await getRefineryData(system);
      setData(result);
      setIsLoading(false);
    };
    load();
  }, [system]);

  const ores = useMemo(() => [...new Set(data.map(d => d.ore))].sort(), [data]);
  const stations = useMemo(() => [...new Set(data.map(d => d.station))].sort(), [data]);

  const matrix = useMemo(() => {
    const m = {};
    data.forEach(d => {
      if (!m[d.station]) m[d.station] = {};
      m[d.station][d.ore] = d.modifier;
    });
    return m;
  }, [data]);

  // Find the best modifier per ore (for highlighting)
  const bestPerOre = useMemo(() => {
    const best = {};
    ores.forEach(ore => {
      let max = -Infinity;
      stations.forEach(station => {
        const val = matrix[station]?.[ore];
        if (val !== undefined && val > max) max = val;
      });
      best[ore] = max;
    });
    return best;
  }, [ores, stations, matrix]);

  if (isLoading) {
    return <LoadingState message="Connecting to Refinery Network" />;
  }

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
          <p className="page-desc">Yield modifier analysis across {stations.length} terminal{stations.length !== 1 ? 's' : ''} · {ores.length} material{ores.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="matrix-scroll scroll-industrial">
        <div className="matrix-grid" style={{ gridTemplateColumns: `180px repeat(${ores.length}, 60px)` }}>
          {/* Header row */}
          <div className="grid-corner" onClick={() => setFocusedOre(null)}>STATION</div>
          {ores.map(ore => (
            <div 
              key={ore} 
              className={`grid-ore-header ${focusedOre === ore ? 'focused' : ''}`}
              title={ore}
              onClick={() => setFocusedOre(focusedOre === ore ? null : ore)}
            >
              <div className="ore-header-content">
                <span className="ore-num">{(ores.indexOf(ore) + 1).toString().padStart(2, '0')}</span>
                <span className="ore-label">{ore}</span>
              </div>
            </div>
          ))}

          {/* Data rows */}
          {stations.map(station => (
            <Fragment key={station}>
              <div key={station} className="grid-station">{station}</div>
              {ores.map(ore => {
                const mod = matrix[station]?.[ore];
                const isBest = mod !== undefined && mod === bestPerOre[ore] && mod > 0;
                const type = mod > 0 ? 'pos' : mod < 0 ? 'neg' : 'neu';
                const isDimmed = focusedOre && focusedOre !== ore;

                return (
                  <div 
                    key={`${station}-${ore}`} 
                    className={`grid-cell ${mod !== undefined ? type : 'empty'} ${isBest ? 'best' : ''} ${focusedOre === ore ? 'focused' : ''} ${isDimmed ? 'dimmed' : ''}`}
                  >
                    {mod !== undefined ? (
                      <div className="cell-content">
                        <span className="cell-val">{mod > 0 ? '+' : ''}{mod}</span>
                        {focusedOre === ore && isBest && <span className="best-tag">RECOMMENDED</span>}
                      </div>
                    ) : (
                      <span className="cell-dash">—</span>
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="matrix-footer">
        <div className="legend">
          <div className="legend-item"><span className="dot pos" /> Yield Bonus</div>
          <div className="legend-item"><span className="dot neg" /> Yield Penalty</div>
          <div className="legend-item"><span className="dot best" /> Best in Class</div>
        </div>
        <p className="matrix-note">Values represent static location modifiers. Final yield depends on the refining method.</p>
      </div>
    </div>
  );
}
