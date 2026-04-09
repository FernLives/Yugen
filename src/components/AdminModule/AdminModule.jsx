import { useState, useEffect, useMemo } from 'react';
import {
  getRefineryData, addRefineryEntry, deleteRefineryEntry, updateRefineryEntry,
  getResourceData, addResourceEntry, deleteResourceEntry, updateResourceEntry,
  getStations, addStation, deleteStation, updateStation,
  getLocations, addLocation, deleteLocation, updateLocation,
  getAllUsers, updateUserRole, resetAllData,
} from '../../data/dataStore';
import { useAuth } from '../../context/AuthContext';
import './AdminModule.css';

const SYSTEMS = ['Stanton', 'Pyro', 'Nyx'];

export default function AdminModule() {
  const { user } = useAuth();
  const [tab, setTab] = useState('stations');
  const [refData, setRefData] = useState([]);
  const [resData, setResData] = useState([]);
  const [stationsData, setStationsData] = useState([]);
  const [locationsData, setLocationsData] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [form, setForm] = useState({});
  const [adding, setAdding] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [status, setStatus] = useState('');
  const [expandedStations, setExpandedStations] = useState({});
  const [expandedBodies, setExpandedBodies] = useState({});

  // Purge confirmation
  const [purgeConfirm, setPurgeConfirm] = useState(false);
  const [purgeInput, setPurgeInput] = useState('');

  // Filtering
  const [filterSystem, setFilterSystem] = useState('All');

  useEffect(() => {
    const load = async () => {
      setRefData(await getRefineryData());
      setResData(await getResourceData());
      setStationsData(await getStations());
      setLocationsData(await getLocations());
      setUsersData(await getAllUsers());
    };
    load();
  }, []);

  const flash = (msg) => { setStatus(msg); setTimeout(() => setStatus(''), 3000); };

  const reload = async () => {
    setRefData(await getRefineryData());
    setResData(await getResourceData());
    setStationsData(await getStations());
    setLocationsData(await getLocations());
    setUsersData(await getAllUsers());
  };

  // ── Location CRUD ──
  const saveLocation = async () => {
    if (!form.locationName || !form.parentBody) return flash('Field Error: Location Name & Parent Body required');
    if (editMode) {
      await updateLocation(editMode.name, editMode.parentBody, { newName: form.locationName, newParentBody: form.parentBody, system: form.system || 'Stanton' });
      flash('Location Updated');
    } else {
      await addLocation({ name: form.locationName, parentBody: form.parentBody, system: form.system || 'Stanton' });
      flash('Location Synchronized');
    }
    await reload(); closeForm();
  };

  const delLoc = async (name, parentBody) => {
    await deleteLocation(name, parentBody);
    await reload();
    flash('Location Purged');
  };
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
      setForm({ locationName: '', parentBody: '', system: 'Stanton' });
    } else {
      // 'resource' — sub-item inside an existing location
      setTab('resource');
      setForm({ name: '', type: 'Ship Mineable', location: parentContext?.location || '', parentBody: parentContext?.parentBody || '', system: parentContext?.system || 'Stanton', description: '', methods: ['ship'], tips: '' });
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
    } else if (type === 'location') {
      setTab('location');
      setEditMode({ type: 'location', name: item.name, parentBody: item.parentBody });
      setForm({ locationName: item.name, parentBody: item.parentBody, system: item.system });
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

  const toggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'operator' : 'admin';
    await updateUserRole(userId, newRole);
    await reload();
    flash(`Role updated to ${newRole.toUpperCase()}`);
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

  // Build resource tree from locations table + attach resources
  const filteredResData = useMemo(() =>
    filterSystem === 'All' ? resData : resData.filter(d => d.system === filterSystem)
  , [resData, filterSystem]);

  const filteredLocations = useMemo(() =>
    filterSystem === 'All' ? locationsData : locationsData.filter(l => l.system === filterSystem)
  , [locationsData, filterSystem]);

  const resourceTree = useMemo(() => {
    // Group locations by parentBody
    const bodyMap = {};
    filteredLocations.forEach(loc => {
      const body = loc.parentBody || 'Unknown';
      if (!bodyMap[body]) bodyMap[body] = { body, system: loc.system, locations: [] };
      // Attach resources that belong to this location
      const locResources = filteredResData.filter(r => r.location === loc.name && r.parentBody === loc.parentBody);
      bodyMap[body].locations.push({ name: loc.name, parentBody: loc.parentBody, system: loc.system, resources: locResources });
    });
    return Object.values(bodyMap).map(b => ({
      ...b,
      total: b.locations.reduce((s, l) => s + l.resources.length, 0),
    }));
  }, [filteredLocations, filteredResData]);

  // ── Determine save handler ──
  const currentSaveTab = adding ? (tab === 'stations' ? 'station' : tab === 'material' ? 'material' : tab === 'location' ? 'location' : 'resource') : null;
  const saveFn = currentSaveTab === 'station' ? saveStation : currentSaveTab === 'material' ? saveMaterial : currentSaveTab === 'location' ? saveLocation : saveResource;

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
            <button className={`nav-item ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
              <span className="nav-icon">◉</span> Users
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
                      <Inp label="Location Name" val={form.locationName} set={v => setForm({...form, locationName: v})} />
                      <Sel label="System" val={form.system} set={v => setForm({...form, system: v})} opts={SYSTEMS} />
                    </>
                  ) : (
                    <>
                      <Inp label="Name" val={form.name} set={v => setForm({...form, name: v})} />
                      <Sel label="Type" val={form.type} set={v => setForm({...form, type: v})} opts={['Ship Mineable', 'Ground Vehicle Mineable', 'Hand Mineable']} />
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
                              <div className="res-loc-actions">
                                <button className="act-btn add-sub" onClick={() => startAdd('resource', { location: loc.name, parentBody: body.body, system: body.system })}>+ ADD</button>
                                <button className="act-btn edit" onClick={() => startEdit('location', loc)}>EDIT</button>
                                <button className="act-btn del" onClick={() => delLoc(loc.name, loc.parentBody)}>DEL</button>
                              </div>
                            </div>
                            {loc.resources.length === 0 ? (
                              <div className="materials-empty">No resources registered at this location.</div>
                            ) : (
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
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ══ USERS TAB ══ */}
          {tab === 'users' && (
            <div className="noc-settings fade-in">
              <div className="settings-card">
                <h3>Registered Operators ({usersData.length})</h3>
                <table className="materials-table">
                  <thead>
                    <tr>
                      <th>CALLSIGN</th>
                      <th>USERNAME</th>
                      <th>ROLE</th>
                      <th>STATUS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersData.map(u => (
                      <tr key={u.id}>
                        <td className="bold">{u.callsign}</td>
                        <td>@{u.username}</td>
                        <td>
                          <span className={`role-tag ${u.role}`}>{u.role.toUpperCase()}</span>
                        </td>
                        <td>{u.status}</td>
                        <td className="actions">
                          {u.id !== user?.id && (
                            <button
                              className={`act-btn ${u.role === 'admin' ? 'del' : 'edit'}`}
                              onClick={() => toggleUserRole(u.id, u.role)}
                            >
                              {u.role === 'admin' ? 'DEMOTE' : 'PROMOTE'}
                            </button>
                          )}
                          {u.id === user?.id && <span style={{color: 'var(--text-dim)', fontSize: '10px'}}>YOU</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="settings-card danger">
                <h3>Danger Zone</h3>
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
