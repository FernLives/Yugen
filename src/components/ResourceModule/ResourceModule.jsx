import { useState, useMemo, useEffect } from 'react';
import { getResourceData, getBodies } from '../../data/dataStore';
import LoadingState from '../common/LoadingState';
import './ResourceModule.css';

const BODY_META = {
  // Stanton
  Hurston: { desc: 'Industrial planet. Harsh conditions, rich deposits.', color: '#b06630' },
  Crusader: { desc: 'Gas giant. Mining operations on its moons.', color: '#4a90a4' },
  ArcCorp: { desc: 'Fully urbanized. Moon-based mining only.', color: '#7a6ab0' },
  microTech: { desc: 'Cold climate. Sub-zero surface operations.', color: '#5a8aaa' },
  'Asteroid Belt': { desc: 'Aaron Halo. High-value volatile ores.', color: '#aa7a40' },
  // Pyro
  Monadnock: { desc: 'Volcanic activity. High risk, high reward.', color: '#ff4400' },
  Bloom: { desc: 'Post-organic life. Rare minerals in fossil beds.', color: '#44aa44' },
};

function ResourceItem({ res }) {
  return (
    <div className="res-item">
      <div className="res-item-main">
        <span className="res-item-name">{res.name}</span>
        <span className="res-item-type">{res.type}</span>
      </div>
      {res.description && <p className="res-item-desc">{res.description}</p>}
    </div>
  );
}

function ResourceCategory({ title, resources, icon }) {
  if (resources.length === 0) return null;
  return (
    <div className="res-category">
      <div className="res-category-header">
        <span className="res-category-icon">{icon}</span>
        <h4 className="res-category-title">{title}</h4>
      </div>
      <div className="res-category-list">
        {resources.map(res => <ResourceItem key={res.id} res={res} />)}
      </div>
    </div>
  );
}

export default function ResourceModule({ system }) {
  const [data, setData] = useState([]);
  const [bodies, setBodies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBody, setSelectedBody] = useState(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [resData, bodyData] = await Promise.all([
        getResourceData(system),
        getBodies()
      ]);
      setData(resData);
      setBodies(bodyData);
      setIsLoading(false);
    };
    load();
  }, [system]);

  const grouped = useMemo(() => {
    // Filter bodies by system
    const sysBodies = bodies.filter(b => !system || b.system === system);
    return sysBodies.map(body => {
      const bodyResources = data.filter(r => r.parentBody === body.name);
      return {
        ...body,
        resources: bodyResources,
        totalResources: bodyResources.length
      };
    });
  }, [data, bodies, system]);

  const bodyResources = useMemo(() => {
    if (!selectedBody) return null;
    return data.filter(d => d.parentBody === selectedBody);
  }, [data, selectedBody]);

  const categorized = useMemo(() => {
    if (!bodyResources) return null;
    return {
      ship: bodyResources.filter(d => d.methods?.includes('ship')),
      vehicle: bodyResources.filter(d => d.methods?.includes('vehicle')),
      hand: bodyResources.filter(d => d.methods?.includes('hand')),
    };
  }, [bodyResources]);

  if (isLoading) {
    return <LoadingState message="Scanning Regional Intelligence" />;
  }

  if (data.length === 0 && bodies.length === 0) {
    return (
      <div className="resources fade-in-up">
        <div className="empty-system-state">
          <div className="empty-icon">?</div>
          <h2 className="empty-title">Uncharted Space: {system}</h2>
          <p className="empty-desc">No survey data found for this system. Field intelligence required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="resources fade-in-up">
      <div className="resources-header">
        <div>
          <h1 className="page-title">{system} Intelligence</h1>
          <p className="page-desc">Mining and extraction survey for {system} sector</p>
        </div>
        <div className="resources-stats">
          <span className="stat-pill">{data.length} resources</span>
          <span className="stat-pill">{grouped.length} bodies</span>
        </div>
      </div>

      <div className="body-grid">
        {grouped.map((body, bi) => (
          <button
            key={body.name}
            className="body-card"
            onClick={() => setSelectedBody(body.name)}
            style={{ animationDelay: `${bi * 50}ms` }}
          >
            <div className="body-node-header">
              <div className="node-pips">
                <span className="pip"></span>
                <span className="pip"></span>
                <span className="pip"></span>
              </div>
              <span className="node-id">DEPLOYMENT-0{bi + 1}</span>
            </div>
            
            <div className="body-indicator" style={{ background: BODY_META[body.name]?.color || 'var(--accent)' }} />
            <div className="scanner-line" />
            
            <div className="body-info">
              <h2 className="body-name">{body.name}</h2>
              <p className="body-desc">{BODY_META[body.name]?.desc || 'ANALYTICAL SURVEY ACTIVE'}</p>
            </div>
            
            <div className="body-meta">
              <div className="meta-left">
                <span className="res-count">{body.totalResources} MATERIALS</span>
              </div>
              <div className="res-preview">
                {[...new Set(body.resources.map(r => r.name))].slice(0, 3).map(n => (
                  <span key={n} className="res-tag">{n}</span>
                ))}
              </div>
            </div>
            
            <div className="node-corner top-left"></div>
            <div className="node-corner top-right"></div>
            <div className="node-corner bottom-left"></div>
            <div className="node-corner bottom-right"></div>
          </button>
        ))}
      </div>

      {selectedBody && categorized && (
        <div className="loc-overlay" onClick={() => setSelectedBody(null)}>
          <div className="loc-modal industrial" onClick={e => e.stopPropagation()}>
            <div className="loc-modal-header">
              <div className="modal-title-wrap">
                <div className="status-indicator">
                  <div className="pulse"></div>
                  <span>UPLINK ACTIVE</span>
                </div>
                <span className="loc-modal-parent">{system} INTEL // SCANNING: {selectedBody.toUpperCase()}</span>
                <h2 className="loc-modal-name">{selectedBody} DEPLOYMENT</h2>
              </div>
              <button className="loc-modal-close" onClick={() => setSelectedBody(null)}>
                <span className="close-label">ABORT</span> ✕
              </button>
            </div>

            <div className="loc-modal-body">
              <div className="res-modal-content-grid">
                <ResourceCategory title="SHIP EXTRACTION" resources={categorized.ship} icon="⚒" />
                <ResourceCategory title="VEHICLE EXTRACTION" resources={categorized.vehicle} icon="🚜" />
                <ResourceCategory title="HAND EXTRACTION" resources={categorized.hand} icon="✋" />
                {bodyResources.length === 0 && (
                  <div className="noc-empty">NO SURVEY DATA FOUND FOR THIS BODY.</div>
                )}
              </div>
            </div>
            
            <div className="modal-branding">YŪGEN // FIELD INTELLIGENCE TERM-09</div>
          </div>
        </div>
      )}
    </div>
  );
}
