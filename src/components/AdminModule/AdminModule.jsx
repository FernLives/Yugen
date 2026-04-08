import { useState, useEffect, useMemo } from 'react';
import {
  getRefineryData, addRefineryEntry, deleteRefineryEntry, updateRefineryEntry,
  getResourceData, addResourceEntry, deleteResourceEntry, updateResourceEntry,
  getStations, addStation, deleteStation, updateStation,
  verifyAdminPin, setAdminPin, resetAllData,
} from '../../data/dataStore';
import './AdminModule.css';

const SYSTEMS = ['Stanton', 'Pyro', 'Nyx'];

export default function AdminModule() {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState('');
  const [pinErr, setPinErr] = useState('');
  const [tab, setTab] = useState('stations');
  const [refData, setRefData] = useState([]);
  const [resData, setResData] = useState([]);
  const [stationsData, setStationsData] = useState([]);
  const [form, setForm] = useState({});
  const [adding, setAdding] = useState(false);
  const [editMode, setEditMode] = useState(null); // { type: 'station'|'material'|'resource', id, parentStation? }
  const [status, setStatus] = useState('');
  const [newPin, setNewPin] = useState('');
  const [expandedStations, setExpandedStations] = useState({});
  const [expandedBodies, setExpandedBodies] = useState({});

  // Purge confirmation
  const [purgeConfirm, setPurgeConfirm] = useState(false);
  const [purgeInput, setPurgeInput] = useState('');

  // Filtering
  const [filterSystem, setFilterSystem] = useState('All');

  useEffect(() => {
    const load = async () => {
      if (authed) {
        setRefData(await getRefineryData());
        setResData(await getResourceData());
        setStationsData(await getStations());
      }
    };
    load();
  }, [authed]);

  const flash = (msg) => { setStatus(msg); setTimeout(() => setStatus(''), 3000); };

  const reload = async () => {
    setRefData(await getRefineryData());
    setResData(await getResourceData());
    setStationsData(await getStations());
  };

  const login = async () => {
    if (await verifyAdminPin(pin)) { setAuthed(true); setPinErr(''); }
    else { setPinErr('UNAUTHORIZED ACCESS DETECTED'); setPin(''); }
  };

  // ── Station CRUD ──
  const saveStation = async () => {
    if (!form.name) return flash('Field Error: Name required');
    if (editMode) {
      await updateStation(editMode.id, { newName: form.name, system: form.system || 'Stanton' });
      flash('Hub Updated');
    } else {
      await addStation({ name: form.name, system: form.system || 'Stanton' });
      flash('Hub Synchronized');
    }
    await reload(); closeForm();
  };

  const delStat = async (name) => {
    await deleteStation(name);
    await reload();
    flash('Hub Purged');
  };

  // ── Refinery/Material CRUD ──
  const saveMaterial = async () => {
    if (!form.ore || !form.station) return flash('Field Error: Ore & Station required');
    const parentStation = stationsData.find(s => s.name === form.station);
    const entry = { ...form, system: parentStation?.system || 'Stanton', modifier: Number(form.modifier) || 0 };
    if (editMode) {
      await updateRefineryEntry(editMode.id, entry);
      flash('Material Updated');
    } else {
      await addRefineryEntry(entry);
      flash('Material Synchronized');
    }
    await reload(); closeForm();
  };

  const delRef = async (id) => {
    await deleteRefineryEntry(id);
    await reload();
    flash('Entry Purged');
  };

  // ── Resource CRUD ──
  const saveResource = async () => {
    if (!form.name || !form.location) return flash('Field Error: Name & Location required');
    if (editMode) {
      await updateResourceEntry(editMode.id, form);
      flash('Resource Updated');
    } else {
      await addResourceEntry(form);
      flash('Resource Synchronized');
    }
    await reload(); closeForm();
  };

  const delRes = async (id) => {
    await deleteResourceEntry(id);
    await reload();
    flash('Entry Purged');
  };

  const startAdd = (type, parentContext) => {
    setEditMode(null);
    setAdding(true);
    if (type === 'station') {
      setTab('stations');
      setForm({ name: '', system: 'Stanton' });
    } else if (type === 'material') {
      setTab('material');
      setForm({ ore: '', modifier: 0, station: parentContext || stationsData[0]?.name || '' });
    } else if (type === 'location') {
      setTab('location');
      setForm({ name: '', type: 'Mineral', location: '', parentBody: '', system: 'Stanton', description: '', methods: ['ship'], tips: '' });
    } else {
      // 'resource' — sub-item inside an existing location
      setTab('resource');
      setForm({ name: '', type: 'Mineral', location: parentContext?.location || '', parentBody: parentContext?.parentBody || '', system: parentContext?.system || 'Stanton', description: '', methods: ['ship'], tips: '' });
    }
  };

  const startEdit = (type, item) => {
    setEditMode({ type, id: type === 'station' ? item.name : item.id });
    setAdding(true);
    if (type === 'station') {
      setTab('stations');
      setForm({ name: item.name, system: item.system });
    } else if (type === 'material') {
      setTab('material');
      setForm({ ore: item.ore, modifier: item.modifier, station: item.station });
    } else {
      setTab('resource');
      setForm({ ...item });
    }
  };

  const closeForm = () => { setAdding(false); setEditMode(null); setForm({}); };

  const toggleStation = (name) => {
    setExpandedStations(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleBody = (body) => {
    setExpandedBodies(prev => ({ ...prev, [body]: !prev[body] }));
  };

  const changePin = async () => {
    if (newPin.length >= 3) {
      await setAdminPin(newPin);
      setNewPin('');
      flash('Security Code Updated');
    }
  };

  const handlePurge = async () => {
    await resetAllData();
  };

  // ── Derived data ──
  const stationMaterials = useMemo(() => {
    const map = {};
    refData.forEach(m => {
      if (!map[m.station]) map[m.station] = [];
      map[m.station].push(m);
    });
    return map;
  }, [refData]);

  const filteredStations = useMemo(() =>
    filterSystem === 'All' ? stationsData : stationsData.filter(s => s.system === filterSystem)
  , [stationsData, filterSystem]);

  const filteredResData = useMemo(() =>
    filterSystem === 'All' ? resData : resData.filter(d => d.system === filterSystem)
  , [resData, filterSystem]);

  // Group resources by parentBody -> location
  const resourceTree = useMemo(() => {
    const map = {};
    filteredResData.forEach(r => {
      const body = r.parentBody || 'Unknown';
      if (!map[body]) map[body] = { body, system: r.system, locations: {} };
      const loc = r.location || 'Unknown';
      if (!map[body].locations[loc]) map[body].locations[loc] = [];
      map[body].locations[loc].push(r);
    });
    return Object.values(map).map(b => ({
      ...b,
      locations: Object.entries(b.locations).map(([name, resources]) => ({ name, resources })),
      total: Object.values(b.locations).reduce((s, arr) => s + arr.length, 0),
    }));
  }, [filteredResData]);

  // ── LOGIN ──
  if (!authed) {
    return (
      <div className="admin-noc login-mode fade-in">
        <div className="noc-login-terminal">
          <div className="terminal-header">NETWORK ACCESS HUB</div>
          <div className="terminal-body">
            <div className="auth-status">{pinErr || 'PLEASE ENTER AUTHENTICATION CODE'}</div>
            <input
              type="password"
              className="noc-input auth-code"
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="••••••"
              autoFocus
            />
            <button className="noc-btn primary" onClick={login}>AUTHORIZE</button>
          </div>
          <div className="terminal-footer">ENCRYPTION: AES-4096 // STATUS: STANDBY</div>
        </div>
      </div>
    );
  }

  // ── Determine save handler ──
  const currentSaveTab = adding ? (tab === 'stations' ? 'station' : tab === 'material' ? 'material' : tab === 'location' || tab === 'resource' ? 'resource' : 'resource') : null;
  const saveFn = currentSaveTab === 'station' ? saveStation : currentSaveTab === 'material' ? saveMaterial : saveResource;

  return (
    <div className="admin-noc fade-in">
      <header className="noc-header">
        <div className="noc-title-area">
          <h1 className="noc-title">Network Operations Center</h1>
          <span className="noc-tag">SECURE CHANNEL</span>
        </div>
        {status && <div className="noc-toast">{status}</div>}
      </header>

      <div className="noc-main">
        <aside className="noc-sidebar">
          <div className="nav-group">
            <div className="group-label">Intelligence</div>
            <button className={`nav-item ${tab === 'stations' ? 'active' : ''}`} onClick={() => setTab('stations')}>
              <span className="nav-icon">⬡</span> Stations
            </button>
            <button className={`nav-item ${['resources', 'location', 'resource'].includes(tab) ? 'active' : ''}`} onClick={() => setTab('resources')}>
              <span className="nav-icon">◈</span> Resources
            </button>
          </div>
          <div className="nav-group">
            <div className="group-label">System</div>
            <button className={`nav-item ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
              <span className="nav-icon">⚙</span> Configuration
            </button>
          </div>
        </aside>

        <section className="noc-content">
          {/* ── Top toolbar ── */}
          <div className="content-tools">
            <div className="tool-left">
              {tab === 'stations' && (
                <button className="noc-btn add" onClick={() => startAdd('station')}>+ ADD STATION</button>
              )}
              {['resources', 'location', 'resource'].includes(tab) && (
                <button className="noc-btn add" onClick={() => startAdd('location')}>+ ADD LOCATION</button>
              )}
              <select className="noc-select system-filter" value={filterSystem} onChange={e => setFilterSystem(e.target.value)}>
                <option value="All">ALL SYSTEMS</option>
                {SYSTEMS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="tool-right">
              <span className="entry-count">
                {tab === 'stations'
                  ? `${filteredStations.length} STATIONS · ${refData.length} MATERIALS`
                  : ['resources', 'location', 'resource'].includes(tab)
                  ? `${resourceTree.length} BODIES · ${filteredResData.length} RESOURCES`
                  : ''
                }
              </span>
            </div>
          </div>

          {/* ── Add/Edit Form Overlay ── */}
          {adding && (
            <div className="noc-form-overlay" onClick={closeForm}>
              <div className="noc-form fade-in" onClick={e => e.stopPropagation()}>
                <div className="form-header">
                  <h3>{editMode ? 'Edit' : 'New'} {currentSaveTab === 'station' ? 'Station' : currentSaveTab === 'material' ? 'Material' : tab === 'location' ? 'Location' : 'Resource'}</h3>
                  <button className="close-btn" onClick={closeForm}>✕</button>
                </div>
                <div className="form-grid">
                  {currentSaveTab === 'station' ? (
                    <>
                      <Inp label="Station Name" val={form.name} set={v => setForm({...form, name: v})} />
                      <Sel label="System" val={form.system} set={v => setForm({...form, system: v})} opts={SYSTEMS} />
                    </>
                  ) : currentSaveTab === 'material' ? (
                    <>
                      <Sel label="Parent Station" val={form.station} set={v => setForm({...form, station: v})} opts={stationsData.map(s => s.name)} />
                      <Inp label="Material (Ore)" val={form.ore} set={v => setForm({...form, ore: v})} />
                      <Inp label="Yield Modifier" val={form.modifier} set={v => setForm({...form, modifier: v})} type="number" />
                    </>
                  ) : tab === 'location' ? (
                    <>
                      <Inp label="Parent Body" val={form.parentBody} set={v => setForm({...form, parentBody: v})} />
                      <Inp label="Location Name" val={form.location} set={v => setForm({...form, location: v})} />
                      <Sel label="System" val={form.system} set={v => setForm({...form, system: v})} opts={SYSTEMS} />
                      <Inp label="First Resource" val={form.name} set={v => setForm({...form, name: v})} />
                      <Sel label="Type" val={form.type} set={v => setForm({...form, type: v})} opts={['Mineral', 'Gas', 'Organic', 'Metal']} />
                      <Inp label="Description" val={form.description} set={v => setForm({...form, description: v})} />
                    </>
                  ) : (
                    <>
                      <Inp label="Name" val={form.name} set={v => setForm({...form, name: v})} />
                      <Sel label="Type" val={form.type} set={v => setForm({...form, type: v})} opts={['Mineral', 'Gas', 'Organic', 'Metal']} />
                      <Inp label="Description" val={form.description} set={v => setForm({...form, description: v})} />
                    </>
                  )}
                </div>
                <div className="form-actions">
                  <button className="noc-btn primary" onClick={saveFn}>
                    {editMode ? 'UPDATE' : 'SYNCHRONIZE'}
                  </button>
                  <button className="noc-btn" onClick={closeForm}>CANCEL</button>
                </div>
              </div>
            </div>
          )}

          {/* ══ STATIONS TAB — Expandable with nested materials ══ */}
          {tab === 'stations' && (
            <div className="stations-tree">
              {filteredStations.length === 0 && (
                <div className="noc-empty">No stations found. Add one to get started.</div>
              )}
              {filteredStations.map(station => {
                const materials = stationMaterials[station.name] || [];
                const isOpen = expandedStations[station.name];
                return (
                  <div key={station.name} className={`station-node ${isOpen ? 'open' : ''}`}>
                    {/* Station row */}
                    <div className="station-row" onClick={() => toggleStation(station.name)}>
                      <div className="station-row-left">
                        <span className={`expand-chevron ${isOpen ? 'rotated' : ''}`}>›</span>
                        <span className="station-name">{station.name}</span>
                        <span className="sys-tag">{station.system}</span>
                      </div>
                      <div className="station-row-right">
                        <span className="material-count">{materials.length} material{materials.length !== 1 ? 's' : ''}</span>
                        <button className="act-btn edit" onClick={e => { e.stopPropagation(); startEdit('station', station); }}>EDIT</button>
                        <button className="act-btn del" onClick={e => { e.stopPropagation(); delStat(station.name); }}>PURGE</button>
                      </div>
                    </div>

                    {/* Expanded materials */}
                    {isOpen && (
                      <div className="materials-nest">
                        <div className="materials-header">
                          <span className="materials-label">MATERIALS</span>
                          <button className="act-btn add-sub" onClick={() => startAdd('material', station.name)}>+ ADD</button>
                        </div>
                        {materials.length === 0 ? (
                          <div className="materials-empty">No materials registered for this hub.</div>
                        ) : (
                          <table className="materials-table">
                            <thead>
                              <tr>
                                <th>ORE</th>
                                <th>MODIFIER</th>
                                <th>ACTIONS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {materials.map(m => (
                                <tr key={m.id}>
                                  <td className="bold">{m.ore}</td>
                                  <td className={m.modifier > 0 ? 'pos' : m.modifier < 0 ? 'neg' : ''}>{m.modifier > 0 ? '+' : ''}{m.modifier}</td>
                                  <td className="actions">
                                    <button className="act-btn edit" onClick={() => startEdit('material', m)}>EDIT</button>
                                    <button className="act-btn del" onClick={() => delRef(m.id)}>DEL</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ══ RESOURCES TAB — Expandable tree by parent body ══ */}
          {['resources', 'location', 'resource'].includes(tab) && (
            <div className="stations-tree">
              {resourceTree.length === 0 && (
                <div className="noc-empty">No resources found. Add one to get started.</div>
              )}
              {resourceTree.map(body => {
                const isOpen = expandedBodies[body.body];
                return (
                  <div key={body.body} className={`station-node ${isOpen ? 'open' : ''}`}>
                    {/* Body row */}
                    <div className="station-row" onClick={() => toggleBody(body.body)}>
                      <div className="station-row-left">
                        <span className={`expand-chevron ${isOpen ? 'rotated' : ''}`}>›</span>
                        <span className="station-name">{body.body}</span>
                        <span className="sys-tag">{body.system}</span>
                      </div>
                      <div className="station-row-right">
                        <span className="material-count">{body.total} resource{body.total !== 1 ? 's' : ''} · {body.locations.length} location{body.locations.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {/* Expanded locations + resources */}
                    {isOpen && (
                      <div className="materials-nest">
                        {body.locations.map(loc => (
                          <div key={loc.name} className="res-loc-group">
                            <div className="res-loc-header">
                              <span className="res-loc-name">{loc.name}</span>
                              <button className="act-btn add-sub" onClick={() => startAdd('resource', { location: loc.name, parentBody: body.body, system: body.system })}>+ ADD</button>
                            </div>
                            <table className="materials-table">
                              <thead>
                                <tr>
                                  <th>NAME</th>
                                  <th>TYPE</th>
                                  <th>ACTIONS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {loc.resources.map(r => (
                                  <tr key={r.id}>
                                    <td className="bold">{r.name}</td>
                                    <td>{r.type}</td>
                                    <td className="actions">
                                      <button className="act-btn edit" onClick={() => startEdit('resource', r)}>EDIT</button>
                                      <button className="act-btn del" onClick={() => delRes(r.id)}>DEL</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ══ SETTINGS TAB ══ */}
          {tab === 'settings' && (
            <div className="noc-settings fade-in">
              <div className="settings-card">
                <h3>Authorization Management</h3>
                <div className="setting-row">
                  <input type="password" className="noc-input" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="NEW ACCESS CODE" />
                  <button className="noc-btn primary" onClick={changePin}>UPDATE</button>
                </div>
              </div>
              <div className="settings-card danger">
                <h3>Panic Mode</h3>
                <p>Immediate purge of all localized intelligence data.</p>
                <button className="noc-btn danger" onClick={() => { setPurgeConfirm(true); setPurgeInput(''); }}>PURGE ALL DATA</button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ══ PURGE CONFIRMATION OVERLAY ══ */}
      {purgeConfirm && (
        <div className="purge-overlay" onClick={() => setPurgeConfirm(false)}>
          <div className="purge-modal fade-in" onClick={e => e.stopPropagation()}>
            <div className="purge-warning-icon">⚠</div>
            <h2 className="purge-title">CONFIRM DATA PURGE</h2>
            <p className="purge-desc">
              This will <strong>permanently destroy</strong> all stations, materials, resources, and personnel data. This action cannot be undone.
            </p>
            <div className="purge-confirm-field">
              <label>Type <strong>PURGE</strong> to confirm:</label>
              <input
                type="text"
                className="noc-input purge-input"
                value={purgeInput}
                onChange={e => setPurgeInput(e.target.value.toUpperCase())}
                placeholder="PURGE"
                autoFocus
                spellCheck={false}
              />
            </div>
            <div className="purge-actions">
              <button
                className="noc-btn danger"
                disabled={purgeInput !== 'PURGE'}
                onClick={handlePurge}
              >
                EXECUTE PURGE
              </button>
              <button className="noc-btn" onClick={() => setPurgeConfirm(false)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable form components ──
function Inp({ label, val, set, type = 'text' }) {
  return (
    <div className="noc-field">
      <label>{label}</label>
      <input type={type} className="noc-input" value={val || ''} onChange={e => set(e.target.value)} spellCheck={false} />
    </div>
  );
}

function Sel({ label, val, set, opts }) {
  return (
    <div className="noc-field">
      <label>{label}</label>
      <select className="noc-select" value={val} onChange={e => set(e.target.value)}>
        {opts.map(o => <option key={o} value={o}>{o.toUpperCase ? o.toUpperCase() : o}</option>)}
      </select>
    </div>
  );
}
