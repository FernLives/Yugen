import { useState, useEffect, useMemo } from 'react';
import {
  getRefineryData, addRefineryEntry, deleteRefineryEntry,
  getResourceData, addResourceEntry, deleteResourceEntry,
  getStations, addStation, deleteStation,
  verifyAdminPin, setAdminPin, resetAllData,
} from '../../data/dataStore';
import './AdminModule.css';

const SYSTEMS = ['Stanton', 'Pyro', 'Nyx'];

const EMPTY_STATION = {
  name: '', system: 'Stanton',
};

const EMPTY_REFINERY = {
  ore: '', type: 'Mineral', station: '', modifier: 0,
};

const EMPTY_RESOURCE = {
  name: '', type: 'Mineral', location: '', system: 'Stanton', parentBody: '',
  riskLevel: 'safe', rarity: 'Common', yield: 'Medium', methods: ['ship'],
};

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
  const [editId, setEditId] = useState(null);
  const [status, setStatus] = useState('');
  const [newPin, setNewPin] = useState('');

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

  const login = async () => {
    if (await verifyAdminPin(pin)) { setAuthed(true); setPinErr(''); }
    else { setPinErr('UNAUTHORIZED ACCESS DETECTED'); setPin(''); }
  };

  // Stations CRUD
  const addStat = async () => {
    if (!form.name) return flash('Field Error: Name required');
    await addStation({ ...EMPTY_STATION, ...form });
    setStationsData(await getStations()); setForm({}); setAdding(false); flash('Network Hub Synchronized');
  };
  const delStat = async (name) => {
    await deleteStation(name);
    setStationsData(await getStations());
    // Also refresh refinery data since deleting a station cascades deleting its materials
    setRefData(await getRefineryData());
    flash('Hub Purged');
  };

  // Refinery CRUD
  const addRef = async () => {
    if (!form.ore || !form.station) return flash('Field Error: Ore & Station required');
    // We get the system from the selected station to stay consistent backing, or let the backend do it.
    // The backend refinery_data table expects `system`. Let's grab it from stationsData.
    const parentStation = stationsData.find(s => s.name === form.station);
    await addRefineryEntry({ ...EMPTY_REFINERY, ...form, system: parentStation?.system || 'Stanton', modifier: Number(form.modifier) || 0 });
    setRefData(await getRefineryData()); setForm({}); setAdding(false); flash('Matrix Entry Synchronized');
  };
  const delRef = async (id) => { 
    await deleteRefineryEntry(id); 
    setRefData(await getRefineryData()); 
    flash('Entry Purged'); 
  };

  // Resource CRUD
  const addRes = async () => {
    if (!form.name || !form.location) return flash('Field Error: Name & Location required');
    await addResourceEntry({ ...EMPTY_RESOURCE, ...form });
    setResData(await getResourceData()); setForm({}); setAdding(false); flash('Intelligence Entry Synchronized');
  };
  const delRes = async (id) => { 
    await deleteResourceEntry(id); 
    setResData(await getResourceData()); 
    flash('Entry Purged'); 
  };

  const startAdd = () => {
    setAdding(true); setEditId(null);
    if (tab === 'stations') setForm({ ...EMPTY_STATION });
    else if (tab === 'refinery') {
      setForm({ ...EMPTY_REFINERY, station: stationsData[0]?.name || '' });
    }
    else setForm({ ...EMPTY_RESOURCE });
  };
  const cancel = () => { setAdding(false); setEditId(null); setForm({}); };

  const changePin = async () => {
    if (newPin.length >= 3) { 
      await setAdminPin(newPin); 
      setNewPin(''); 
      flash('Security Code Updated'); 
    }
  };

  const filteredRefData = useMemo(() => 
    filterSystem === 'All' ? refData : refData.filter(d => d.system === filterSystem)
  , [refData, filterSystem]);

  const filteredResData = useMemo(() => 
    filterSystem === 'All' ? resData : resData.filter(d => d.system === filterSystem)
  , [resData, filterSystem]);

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
              <span className="icon">󰒓</span> Network Hubs
            </button>
            <button className={`nav-item ${tab === 'refinery' ? 'active' : ''}`} onClick={() => setTab('refinery')}>
              <span className="icon">󰾁</span> Hub Materials
            </button>
            <button className={`nav-item ${tab === 'resources' ? 'active' : ''}`} onClick={() => setTab('resources')}>
              <span className="icon">󰙦</span> Resource Survey
            </button>
          </div>
          <div className="nav-group">
            <div className="group-label">System</div>
            <button className={`nav-item ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
              <span className="icon">󰒓</span> Configuration
            </button>
          </div>
        </aside>

        <section className="noc-content">
          <div className="content-tools">
            <div className="tool-left">
              <button className="noc-btn add" onClick={startAdd}>+ ADD RECORD</button>
              <select className="noc-select system-filter" value={filterSystem} onChange={e => setFilterSystem(e.target.value)}>
                <option value="All">ALL SYSTEMS</option>
                {SYSTEMS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="tool-right">
              <span className="entry-count">{tab === 'stations' ? stationsData.length : tab === 'refinery' ? filteredRefData.length : filteredResData.length} RECORDS FOUND</span>
            </div>
          </div>

          {adding && (
            <div className="noc-form-overlay">
              <div className="noc-form fade-in">
                <div className="form-header">
                  <h3>New {tab === 'stations' ? 'Network Hub' : tab === 'refinery' ? 'Hub Material' : 'Resource'} Entry</h3>
                  <button className="close-btn" onClick={cancel}>✕</button>
                </div>
                <div className="form-grid">
                  {tab === 'stations' ? (
                    <>
                      <Inp label="Hub Name (Station)" val={form.name} set={v => setForm({...form, name: v})} />
                      <Sel label="Target System" val={form.system} set={v => setForm({...form, system: v})} opts={SYSTEMS} />
                    </>
                  ) : tab === 'refinery' ? (
                    <>
                      {stationsData.length === 0 ? (
                        <div className="noc-field"><p style={{color:'var(--danger)'}}>No Hubs registered. Please add a Network Hub first.</p></div>
                      ) : (
                        <Sel label="Parent Hub (Station)" val={form.station} set={v => setForm({...form, station: v})} opts={stationsData.map(s => s.name)} />
                      )}
                      <Inp label="Material" val={form.ore} set={v => setForm({...form, ore: v})} />
                      <Inp label="Yield Modifier" val={form.modifier} set={v => setForm({...form, modifier: v})} type="number" />
                    </>
                  ) : (
                    <>
                      <Inp label="Object Name" val={form.name} set={v => setForm({...form, name: v})} />
                      <Inp label="Location" val={form.location} set={v => setForm({...form, location: v})} />
                      <Inp label="Parent Body" val={form.parentBody} set={v => setForm({...form, parentBody: v})} />
                      <Sel label="Target System" val={form.system} set={v => setForm({...form, system: v})} opts={SYSTEMS} />
                      <Sel label="Risk Level" val={form.riskLevel} set={v => setForm({...form, riskLevel: v})} opts={['safe','moderate','hazardous']} />
                    </>
                  )}
                </div>
                <div className="form-actions">
                  <button 
                    className="noc-btn primary" 
                    onClick={tab === 'stations' ? addStat : tab === 'refinery' ? addRef : addRes}
                    disabled={tab === 'refinery' && stationsData.length === 0}
                  >
                    SYNCHRONIZE
                  </button>
                  <button className="noc-btn" onClick={cancel}>CANCEL</button>
                </div>
              </div>
            </div>
          )}

          <div className="noc-table-container">
            <table className="noc-table">
              <thead>
                {tab === 'stations' ? (
                  <tr>
                    <th>HUB NAME</th>
                    <th>SYSTEM</th>
                    <th>ACTIONS</th>
                  </tr>
                ) : tab === 'refinery' ? (
                  <tr>
                    <th>MATERIAL</th>
                    <th>PARENT HUB</th>
                    <th>SYSTEM</th>
                    <th>MODIFIER</th>
                    <th>ACTIONS</th>
                  </tr>
                ) : (
                  <tr>
                    <th>NAME</th>
                    <th>LOCATION</th>
                    <th>BODY</th>
                    <th>SYSTEM</th>
                    <th>ACTIONS</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {(tab === 'stations' ? stationsData : tab === 'refinery' ? filteredRefData : filteredResData).map(row => (
                  <tr key={tab === 'stations' ? row.name : row.id}>
                    {tab === 'stations' ? (
                      <>
                        <td className="bold">{row.name}</td>
                        <td><span className="sys-tag">{row.system}</span></td>
                      </>
                    ) : tab === 'refinery' ? (
                      <>
                        <td className="bold">{row.ore}</td>
                        <td>{row.station}</td>
                        <td><span className="sys-tag">{row.system}</span></td>
                        <td className={row.modifier > 0 ? 'pos' : 'neg'}>{row.modifier > 0 ? '+' : ''}{row.modifier}</td>
                      </>
                    ) : (
                      <>
                        <td className="bold">{row.name}</td>
                        <td>{row.location}</td>
                        <td>{row.parentBody}</td>
                        <td><span className="sys-tag">{row.system}</span></td>
                      </>
                    )}
                    <td className="actions">
                      <button className="act-btn del" onClick={() => tab === 'stations' ? delStat(row.name) : tab === 'refinery' ? delRef(row.id) : delRes(row.id)}>PURGE</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

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
            <button className="noc-btn danger" onClick={resetAllData}>PURGE ALL DATA</button>
          </div>
        </div>
      )}
    </div>
  );
}

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
        {opts.map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
      </select>
    </div>
  );
}
