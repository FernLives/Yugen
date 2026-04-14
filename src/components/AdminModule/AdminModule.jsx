import { useState, useEffect, useMemo } from 'react';
import {
  getRefineryData, addRefineryEntry, deleteRefineryEntry, updateRefineryEntry,
  getResourceData, addResourceEntry, deleteResourceEntry, updateResourceEntry,
  getStations, addStation, deleteStation, updateStation,
  getBodies, addBody, deleteBody, updateBody,
  getAllUsers, updateUserAdmin, resetAllData,
  getNetworkStatus, updateNetworkStatus,
  getBulletins, addBulletin, deleteBulletin,
  getRoadmap, addRoadmapItem, updateRoadmapItem, deleteRoadmapItem
} from '../../data/dataStore';
import { useAuth } from '../../context/AuthContext';
import LoadingState from '../common/LoadingState';
import CustomSelect from '../common/CustomSelect';
import CustomAutocomplete from '../common/CustomAutocomplete';
import './AdminModule.css';

const SYSTEMS = ['Stanton', 'Pyro', 'Nyx'];

export default function AdminModule() {
  const { user } = useAuth();
  const [tab, setTab] = useState('stations');
  const [refData, setRefData] = useState([]);
  const [resData, setResData] = useState([]);
  const [stationsData, setStationsData] = useState([]);
  const [bodiesData, setBodiesData] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [bulletinsData, setBulletinsData] = useState([]);
  const [roadmapData, setRoadmapData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({});
  const [addingType, setAddingType] = useState(null); // 'station', 'material', 'body', 'resource'
  const [adding, setAdding] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [status, setStatus] = useState('');
  const [expandedStations, setExpandedStations] = useState({});
  const [expandedBodies, setExpandedBodies] = useState({});

  // Purge confirmation
  const [purgeConfirm, setPurgeConfirm] = useState(false);
  const [purgeInput, setPurgeInput] = useState('');

  // NAC
  const [networkStatus, setNetworkStatus] = useState({ info: 'ACTIVE', refinery: 'ACTIVE', resources: 'ACTIVE' });
  const [statusSaving, setStatusSaving] = useState(false);

  // Filtering
  const [filterSystem, setFilterSystem] = useState('All');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await reload();
      setIsLoading(false);
    };
    load();
  }, []);

  const flash = (msg) => { setStatus(msg); setTimeout(() => setStatus(''), 3000); };

  const reload = async () => {
    const [refs, res, stats, bodies, users, net, bul, rdm] = await Promise.all([
      getRefineryData(),
      getResourceData(),
      getStations(),
      getBodies(),
      getAllUsers(),
      getNetworkStatus(),
      getBulletins(),
      getRoadmap()
    ]);
    setRefData(refs);
    setResData(res);
    setStationsData(stats);
    setBodiesData(bodies);
    setUsersData(users);
    setNetworkStatus(net);
    setBulletinsData(bul);
    setRoadmapData(rdm);
  };

  // ── Body CRUD ──
  const saveBody = async () => {
    if (!form.name) return flash('Field Error: Body Name required');
    try {
      if (editMode) {
        await updateBody(editMode.name, { newName: form.name, system: form.system || 'Stanton' });
        flash('Body Updated');
      } else {
        await addBody({ name: form.name, system: form.system || 'Stanton' });
        flash('Body Synchronized');
      }
      await reload(); closeForm();
    } catch (err) {
      flash('Sync Error: ' + err.message);
    }
  };

  const delBody = async (name) => {
    await deleteBody(name);
    await reload();
    flash('Body Purged');
  };
  const saveStation = async () => {
    if (!form.name) return flash('Field Error: Name required');
    try {
      if (editMode) {
        await updateStation(editMode.id, { newName: form.name, system: form.system || 'Stanton' });
        flash('Hub Updated');
      } else {
        await addStation({ name: form.name, system: form.system || 'Stanton' });
        flash('Hub Synchronized');
      }
      await reload(); closeForm();
    } catch (err) {
      flash('Sync Error: ' + err.message);
    }
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
    try {
      if (editMode) {
        await updateRefineryEntry(editMode.id, entry);
        flash('Material Updated');
      } else {
        await addRefineryEntry(entry);
        flash('Material Synchronized');
      }
      await reload(); closeForm();
    } catch (err) {
      flash('Sync Error: ' + err.message);
    }
  };

  const delRef = async (id) => {
    await deleteRefineryEntry(id);
    await reload();
    flash('Entry Purged');
  };

  // ── Resource CRUD ──
  const saveResource = async () => {
    if (!form.name || !form.parentBody) return flash('Field Error: Name & Body required');
    try {
      if (editMode) {
        await updateResourceEntry(editMode.id, form);
        flash('Resource Updated');
      } else {
        await addResourceEntry(form);
        flash('Resource Synchronized');
      }
      await reload(); closeForm();
    } catch (err) {
      flash('Sync Error: ' + err.message);
    }
  };

  const delRes = async (id) => {
    await deleteResourceEntry(id);
    await reload();
    flash('Entry Purged');
  };

  const saveBulletin = async () => {
    if (!form.content) return flash('Field Error: Content required');
    try {
      await addBulletin({ 
        type: 'announcement', 
        category: form.category || 'general', 
        content: form.content 
      });
      flash('Bulletin Published');
      await reload(); closeForm();
    } catch (err) {
      flash('Sync Error: ' + err.message);
    }
  };

  const delBul = async (id) => {
    await deleteBulletin(id);
    await reload();
    flash('Bulletin Removed');
  };

  const saveRoadmap = async () => {
    if (!form.title || !form.description) return flash('Field Error: Title & Description required');
    try {
      if (editMode) {
        await updateRoadmapItem(editMode.id, form);
        flash('Milestone Updated');
      } else {
        await addRoadmapItem(form);
        flash('Milestone Registered');
      }
      await reload(); closeForm();
    } catch (err) {
      flash('Sync Error: ' + err.message);
    }
  };

  const delRdm = async (id) => {
    await deleteRoadmapItem(id);
    await reload();
    flash('Milestone Purged');
  };

  const startAdd = (type, parentContext) => {
    setEditMode(null);
    setAddingType(type);
    setAdding(true);

    if (type === 'station') {
      setForm({ name: '', system: 'Stanton' });
    } else if (type === 'material') {
      setForm({ ore: '', modifier: 0, station: parentContext || stationsData[0]?.name || '' });
    } else if (type === 'body') {
      setForm({ name: '', system: 'Stanton' });
    } else if (type === 'resource') {
      setForm({ name: '', type: 'Ship Mineable', parentBody: parentContext || (bodiesData.length > 0 ? bodiesData[0].name : ''), system: 'Stanton', methods: ['ship'] });
    } else if (type === 'bulletin') {
      setForm({ content: '', category: 'general' });
    } else if (type === 'roadmap') {
      setForm({ title: '', description: '', status: 'PLANNED', category: 'general' });
    }
  };

  const startEdit = (type, item) => {
    setAddingType(type);
    setEditMode({ type, id: type === 'station' ? item.name : type === 'body' ? item.name : item.id });
    setAdding(true);
    
    if (type === 'station') {
      setForm({ name: item.name, system: item.system });
    } else if (type === 'material') {
      setForm({ ore: item.ore, modifier: item.modifier, station: item.station });
    } else if (type === 'body') {
      setForm({ name: item.name, system: item.system });
    } else {
      setForm({ ...item });
    }
  };

  const closeForm = () => { setAdding(false); setAddingType(null); setEditMode(null); setForm({}); };

  const toggleStation = (name) => {
    setExpandedStations(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleBody = (body) => {
    setExpandedBodies(prev => ({ ...prev, [body]: !prev[body] }));
  };

  const toggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'operator' : 'admin';
    await updateUserAdmin(userId, { role: newRole });
    await reload();
    flash(`Role updated to ${newRole.toUpperCase()}`);
  };

  const changeUserClearance = async (userId, clearance) => {
    await updateUserAdmin(userId, { clearance });
    await reload();
    flash(`Tier updated to ${clearance}`);
  };

  const handlePurge = async () => {
    await resetAllData();
  };

  const handleUpdateNAC = async () => {
    setStatusSaving(true);
    await updateNetworkStatus(networkStatus);
    setStatusSaving(false);
    flash('Network Access Controls Synchronized');
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

  const filteredBodies = useMemo(() =>
    filterSystem === 'All' ? bodiesData : bodiesData.filter(b => b.system === filterSystem)
  , [bodiesData, filterSystem]);

  const resourceTree = useMemo(() => {
    return filteredBodies.map(body => {
      const bodyResources = filteredResData.filter(r => r.parentBody === body.name);
      return {
        ...body,
        resources: bodyResources
      };
    });
  }, [filteredBodies, filteredResData]);

  const knownMaterials = useMemo(() => {
    const ores = refData.map(m => m.ore || m.name);
    const resources = resData.map(r => r.name);
    return [...new Set([...ores, ...resources])].sort();
  }, [refData, resData]);

  // ── Determine save handler ──
  const saveFn = addingType === 'station' ? saveStation : 
                 addingType === 'material' ? saveMaterial : 
                 addingType === 'body' ? saveBody : 
                 addingType === 'bulletin' ? saveBulletin :
                 addingType === 'roadmap' ? saveRoadmap : saveResource;

  if (isLoading) {
    return (
      <div className="admin-noc">
        <header className="noc-header">
          <div className="noc-title-area">
            <h1 className="noc-title">Network Operations Center</h1>
            <span className="noc-tag">ESTABLISHING CONNECTION</span>
          </div>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingState message="Synchronizing NOC Databases" />
        </div>
      </div>
    );
  }

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
            <button className={`nav-item ${tab === 'materials_bank' ? 'active' : ''}`} onClick={() => setTab('materials_bank')}>
              <span className="nav-icon">✧</span> Materials
            </button>
          </div>
          <div className="nav-group">
            <div className="group-label">System</div>
            <button className={`nav-item ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
              <span className="nav-icon">◉</span> Users
            </button>
            <button className={`nav-item ${tab === 'network' ? 'active' : ''}`} onClick={() => setTab('network')}>
              <span className="nav-icon">⎔</span> Network
            </button>
            <button className={`nav-item ${tab === 'bulletin' ? 'active' : ''}`} onClick={() => setTab('bulletin')}>
              <span className="nav-icon">⚯</span> Bulletin
            </button>
            <button className={`nav-item ${tab === 'roadmap' ? 'active' : ''}`} onClick={() => setTab('roadmap')}>
              <span className="nav-icon">⎿</span> Roadmap
            </button>
          </div>
        </aside>

        <section className="noc-content">
          {/* ── Top toolbar ── */}
          <div className="content-tools">
            <div className="tool-left">
              <button 
                className="noc-btn diagnostic" 
                onClick={() => window.open('/api/admin/download-db', '_blank')}
                title="Download the live database file (SQLite)"
              >
                DATABASE BACKUP
              </button>
              {tab === 'stations' && (
                <button className="noc-btn add" onClick={() => startAdd('station')}>+ ADD STATION</button>
              )}
              {tab === 'resources' && (
                <button className="noc-btn add" onClick={() => startAdd('body')}>+ ADD BODY</button>
              )}
              {tab === 'bulletin' && (
                <button className="noc-btn add" onClick={() => startAdd('bulletin')}>+ NEW ANNOUNCEMENT</button>
              )}
              {tab === 'roadmap' && (
                <button className="noc-btn add" onClick={() => startAdd('roadmap')}>+ NEW MILESTONE</button>
              )}
              <CustomSelect 
                label="System Filter" 
                value={filterSystem} 
                onChange={setFilterSystem} 
                options={['All', ...SYSTEMS]} 
                compact={true}
              />
            </div>
            <div className="tool-right">
              <span className="entry-count">
                {tab === 'stations'
                  ? `${filteredStations.length} STATIONS · ${refData.length} MATERIALS`
                  : tab === 'resources'
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
                  <h3>{editMode ? 'Edit' : 'New'} {addingType === 'station' ? 'Station' : addingType === 'material' ? 'Material' : addingType === 'body' ? 'Body' : 'Resource'}</h3>
                  <button className="close-btn" onClick={closeForm}>✕</button>
                </div>
                <div className="form-grid">
                  {addingType === 'station' && (
                    <>
                      <Inp label="Station Name" val={form.name} set={v => setForm({...form, name: v})} />
                      <Sel label="System" val={form.system} set={v => setForm({...form, system: v})} opts={SYSTEMS} />
                    </>
                  )}
                  {addingType === 'material' && (
                    <>
                      <Sel label="Parent Station" val={form.station} set={v => setForm({...form, station: v})} opts={stationsData.map(s => s.name)} />
                      <Inp label="Material (Ore)" val={form.ore} set={v => setForm({...form, ore: v})} suggestions={knownMaterials} />
                      <Inp label="Yield Modifier" val={form.modifier} set={v => setForm({...form, modifier: v})} type="number" />
                    </>
                  )}
                  {addingType === 'body' && (
                    <>
                      <Inp label="Body Name" val={form.name} set={v => setForm({...form, name: v})} />
                      <Sel label="System" val={form.system} set={v => setForm({...form, system: v})} opts={SYSTEMS} />
                    </>
                  )}
                  {addingType === 'resource' && (
                    <>
                      <Sel label="Parent Body" val={form.parentBody} set={v => setForm({...form, parentBody: v})} opts={bodiesData.map(b => b.name)} />
                      <Inp label="Resource Name" val={form.name} set={v => setForm({...form, name: v})} suggestions={knownMaterials} />
                      <Sel label="Type" val={form.type} set={v => setForm({...form, type: v})} opts={['Ship Mineable', 'Ground Vehicle Mineable', 'Hand Mineable']} />
                    </>
                  )}
                  {addingType === 'bulletin' && (
                    <>
                      <Sel label="Category" val={form.category} set={v => setForm({...form, category: v})} opts={['general', 'refinery', 'resource', 'system']} />
                      <div className="noc-field" style={{ gridColumn: 'span 2' }}>
                        <label>Content</label>
                        <textarea 
                          className="noc-input" 
                          rows="4"
                          value={form.content || ''} 
                          onChange={e => setForm({...form, content: e.target.value})}
                          style={{ resize: 'vertical' }}
                        />
                      </div>
                    </>
                  )}
                  {addingType === 'roadmap' && (
                    <>
                      <Inp label="Goal Title" val={form.title} set={v => setForm({...form, title: v})} />
                      <Sel label="Category" val={form.category} set={v => setForm({...form, category: v})} opts={['general', 'refinery', 'resource', 'system', 'ui']} />
                      <Sel label="Current Status" val={form.status} set={v => setForm({...form, status: v})} opts={['PLANNED', 'IN DEVELOPMENT', 'RELEASED']} />
                      <div className="noc-field" style={{ gridColumn: 'span 2' }}>
                        <label>Description</label>
                        <textarea 
                          className="noc-input" 
                          rows="3"
                          value={form.description || ''} 
                          onChange={e => setForm({...form, description: e.target.value})}
                          style={{ resize: 'vertical' }}
                        />
                      </div>
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
          {tab === 'resources' && (
            <div className="stations-tree">
              {resourceTree.length === 0 && (
                <div className="noc-empty">No bodies registered. Add one to get started.</div>
              )}
              {resourceTree.map(body => {
                const isOpen = expandedBodies[body.name];
                return (
                  <div key={body.name} className={`station-node ${isOpen ? 'open' : ''}`}>
                    {/* Body row */}
                    <div className="station-row" onClick={() => toggleBody(body.name)}>
                      <div className="station-row-left">
                        <span className={`expand-chevron ${isOpen ? 'rotated' : ''}`}>›</span>
                        <span className="station-name">{body.name}</span>
                        <span className="sys-tag">{body.system}</span>
                      </div>
                      <div className="station-row-right">
                        <span className="material-count">{body.resources.length} material{body.resources.length !== 1 ? 's' : ''}</span>
                        <button className="act-btn edit" onClick={e => { e.stopPropagation(); startEdit('body', body); }}>EDIT</button>
                        <button className="act-btn del" onClick={e => { e.stopPropagation(); delBody(body.name); }}>PURGE</button>
                      </div>
                    </div>

                    {/* Expanded resources */}
                    {isOpen && (
                      <div className="materials-nest">
                        <div className="materials-header">
                          <span className="materials-label">SURVEY DATA</span>
                          <button className="act-btn add-sub" onClick={() => startAdd('resource', body.name)}>+ ADD</button>
                        </div>
                        {body.resources.length === 0 ? (
                          <div className="materials-empty">No survey data registered for this body.</div>
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
                              {body.resources.map(r => (
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
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ══ MATERIALS BANK TAB ══ */}
          {tab === 'materials_bank' && (
            <div className="bank-grid fade-in">
              <div className="bank-card full-width">
                <div className="card-header">
                  <h3>Central Intelligence: Materials Bank</h3>
                  <span className="entry-tag">{knownMaterials.length} UNIQUE SIGNATURES</span>
                </div>
                <div className="materials-dictionary">
                  {knownMaterials.length === 0 ? (
                    <div className="noc-empty">No materials registered in the system library.</div>
                  ) : (
                    knownMaterials.map(m => (
                      <div key={m} className="dict-item">
                        <span className="dict-pip">◇</span>
                        <span className="dict-name">{m}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="card-hint">
                  Materials are automatically harvested from Refinery and Survey logs to ensure data integrity across all modules.
                </div>
              </div>
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
                      <th>TIER</th>
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
                        <td>
                          <select 
                            className="noc-input compact" 
                            value={u.clearance || 'ASSOCIATE'} 
                            onChange={(e) => changeUserClearance(u.id, e.target.value)}
                            style={{ width: '120px', padding: '4px', fontSize: '12px' }}
                          >
                            <option value="ASSOCIATE">ASSOCIATE</option>
                            <option value="DIRECTOR">DIRECTOR</option>
                            <option value="PRINCIPAL">PRINCIPAL</option>
                          </select>
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

          {/* ══ NETWORK TAB ══ */}
          {tab === 'network' && (
            <div className="noc-settings fade-in">
              <div className="settings-card">
                <h3>Network Access Control (NAC)</h3>
                <p className="card-desc">Centrally manage the availability and access protocols for each core module.</p>
                
                <div className="nac-grid">
                  {[
                    { id: 'info', label: 'INFO HUB' },
                    { id: 'refinery', label: 'REFINERY MATRIX' },
                    { id: 'resources', label: 'RESOURCE DATABASE' }
                  ].map(m => (
                    <div key={m.id} className="nac-module-row">
                      <div className="nac-label-side">
                        <span className="nac-module-name">{m.label}</span>
                        <span className="nac-status-current">{networkStatus[m.id]}</span>
                      </div>
                      <div className="nac-control-side">
                        <Sel 
                          label="Target Protocol" 
                          val={networkStatus[m.id]} 
                          set={v => setNetworkStatus({...networkStatus, [m.id]: v})} 
                          opts={['ACTIVE', 'MAINTENANCE', 'RESTRICTED', 'COLLECTING']} 
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="nac-footer">
                  <button className="noc-btn primary" onClick={handleUpdateNAC} disabled={statusSaving}>
                    {statusSaving ? 'SYNCHRONIZING...' : 'UPDATE ACCESS CONTROLS'}
                  </button>
                </div>
              </div>

              <div className="settings-card stats">
                <h3>Global Traffic Isolation</h3>
                <p>When a module is not 'ACTIVE', all non-admin traffic will be intercepted by the YŪGEN Security Layer. Admins maintain bypass capabilities via a Secure Terminal Override.</p>
              </div>
            </div>
          )}

          {/* ══ BULLETIN TAB ══ */}
          {tab === 'bulletin' && (
            <div className="noc-settings fade-in">
              <div className="settings-card">
                <h3>Studio Bulletin Management</h3>
                <p className="card-desc">Review and manage announcements and automated system reports.</p>
                <table className="materials-table">
                  <thead>
                    <tr>
                      <th>TIMESTAMP</th>
                      <th>TYPE</th>
                      <th>CONTENT</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulletinsData.map(bul => (
                      <tr key={bul.id}>
                        <td className="bold" style={{ whiteSpace: 'nowrap' }}>{new Date(bul.timestamp).toLocaleString()}</td>
                        <td>
                          <span className={`role-tag ${bul.type === 'change' ? 'operator' : 'admin'}`}>
                            {bul.type.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>{bul.content}</td>
                        <td className="actions">
                          <button className="act-btn del" onClick={() => delBul(bul.id)}>REMOVE</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ ROADMAP TAB ══ */}
          {tab === 'roadmap' && (
            <div className="noc-settings fade-in">
              <div className="settings-card">
                <h3>Studio Development Roadmap</h3>
                <p className="card-desc">Define and track the progress of studio-wide milestones.</p>
                <table className="materials-table">
                  <thead>
                    <tr>
                      <th>GOAL</th>
                      <th>CATEGORY</th>
                      <th>STATUS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roadmapData.map(rdm => (
                      <tr key={rdm.id}>
                        <td className="bold">{rdm.title}</td>
                        <td className="sys-tag">{rdm.category?.toUpperCase()}</td>
                        <td>
                          <span className={`role-tag ${rdm.status === 'RELEASED' ? 'admin' : rdm.status === 'IN DEVELOPMENT' ? 'operator' : 'inactive'}`}>
                            {rdm.status}
                          </span>
                        </td>
                        <td className="actions">
                          <button className="act-btn edit" onClick={() => startEdit('roadmap', rdm)}>EDIT</button>
                          <button className="act-btn del" onClick={() => delRdm(rdm.id)}>REMOVE</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
function Inp({ label, val, set, type = 'text', suggestions = [] }) {
  if (suggestions.length > 0) {
    return (
      <CustomAutocomplete 
        label={label} 
        value={val} 
        onChange={set} 
        suggestions={suggestions} 
      />
    );
  }
  return (
    <div className="noc-field">
      <label>{label}</label>
      <input 
        type={type} 
        className="noc-input" 
        value={val || ''} 
        onChange={e => set(e.target.value)} 
        spellCheck={false} 
      />
    </div>
  );
}

function Sel({ label, val, set, opts }) {
  return (
    <CustomSelect 
      label={label} 
      value={val} 
      onChange={set} 
      options={opts} 
    />
  );
}
