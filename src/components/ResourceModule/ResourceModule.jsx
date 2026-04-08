import { useState, useMemo, useEffect } from 'react';
import { getResourceData } from '../../data/dataStore';
import './ResourceModule.css';

const RISK = {
  safe: { label: 'Safe', cls: 'risk-safe' },
  moderate: { label: 'Moderate', cls: 'risk-moderate' },
  hazardous: { label: 'Hazardous', cls: 'risk-hazardous' },
};

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
        <span className="res-item-rarity">{res.rarity}</span>
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
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    const load = async () => {
      setData(await getResourceData(system));
    };
    load();
  }, [system]);

  const grouped = useMemo(() => {
    const map = {};
    data.forEach(res => {
      const body = res.parentBody;
      if (!map[body]) map[body] = { body, locations: {} };
      const loc = res.location;
      if (!map[body].locations[loc]) {
        map[body].locations[loc] = { name: loc, parentBody: body, resources: [] };
      }
      map[body].locations[loc].resources.push(res);
    });
    return Object.values(map).map(b => ({
      ...b,
      locations: Object.values(b.locations),
      totalResources: Object.values(b.locations).reduce((sum, l) => sum + l.resources.length, 0),
    }));
  }, [data]);

  const locationResources = useMemo(() => {
    if (!selectedLocation) return null;
    return data.filter(d => d.location === selectedLocation);
  }, [data, selectedLocation]);

  const categorized = useMemo(() => {
    if (!locationResources) return null;
    return {
      ship: locationResources.filter(d => d.methods?.includes('ship')),
      vehicle: locationResources.filter(d => d.methods?.includes('vehicle')),
      hand: locationResources.filter(d => d.methods?.includes('hand')),
    };
  }, [locationResources]);

  if (data.length === 0) {
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
          <span className="stat-pill">{grouped.reduce((s, b) => s + b.locations.length, 0)} bodies</span>
        </div>
      </div>

      <div className="body-groups">
        {grouped.map((body, bi) => (
          <section key={body.body} className="body-group" style={{ animationDelay: `${bi * 80}ms` }}>
            <div className="body-header">
              <div className="body-title-area">
                <div className="body-indicator" style={{ background: BODY_META[body.body]?.color || 'var(--accent)' }} />
                <div>
                  <h2 className="body-name">{body.body}</h2>
                  <p className="body-desc">{BODY_META[body.body]?.desc || ''}</p>
                </div>
              </div>
              <span className="body-count">{body.totalResources} entries found</span>
            </div>

            <div className="location-grid">
              {body.locations.map((loc, li) => {
                const riskLevels = [...new Set(loc.resources.map(r => r.riskLevel || 'safe'))];
                const highestRisk = riskLevels.includes('hazardous') ? 'hazardous' : riskLevels.includes('moderate') ? 'moderate' : 'safe';
                return (
                  <button
                    key={loc.name}
                    className="location-card"
                    onClick={() => setSelectedLocation(loc.name)}
                    style={{ animationDelay: `${bi * 80 + li * 50}ms` }}
                  >
                    <div className="lc-top">
                      <h3 className="lc-name">{loc.name}</h3>
                    </div>
                    <div className="lc-resources">
                      {[...new Set(loc.resources.map(r => r.name))].slice(0, 3).map(n => (
                        <span key={n} className="lc-resource-tag">{n}</span>
                      ))}
                    </div>
                    <div className="lc-bottom">
                      <span className={`lc-risk ${RISK[highestRisk]?.cls}`}>{RISK[highestRisk]?.label}</span>
                      <span className="lc-count">{loc.resources.length} materials</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {selectedLocation && categorized && (
        <div className="loc-overlay" onClick={() => setSelectedLocation(null)}>
          <div className="loc-modal" onClick={e => e.stopPropagation()}>
            <div className="loc-modal-header">
              <div>
                <span className="loc-modal-parent">{system} Hub // {selectedLocation}</span>
                <h2 className="loc-modal-name">Intelligence Deployment</h2>
              </div>
              <button className="loc-modal-close" onClick={() => setSelectedLocation(null)}>✕</button>
            </div>

            <div className="loc-modal-body">
              <div className="res-modal-content-grid">
                <ResourceCategory title="Ship Mineables" resources={categorized.ship} icon="󰾁" />
                <ResourceCategory title="Ground Vehicle Mineables" resources={categorized.vehicle} icon="󰙦" />
                <ResourceCategory title="Hand Mineables" resources={categorized.hand} icon="󰇊" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
