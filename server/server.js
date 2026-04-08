import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db, { initDb } from './database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Database
initDb();

// ── API Endpoints ──

// 1. Stations Data
app.get('/api/stations', (req, res) => {
  const { system } = req.query;
  const stmt = system 
    ? db.prepare('SELECT * FROM refinery_stations WHERE system = ?')
    : db.prepare('SELECT * FROM refinery_stations');
  const data = system ? stmt.all(system) : stmt.all();
  res.json(data);
});

app.post('/api/stations', (req, res) => {
  const { name, system } = req.body;
  const stmt = db.prepare('INSERT OR IGNORE INTO refinery_stations (name, system) VALUES (?, ?)');
  stmt.run(name, system || 'Stanton');
  res.status(201).json({ name, system });
});

app.delete('/api/stations/:name', (req, res) => {
  const { name } = req.params;
  db.prepare('DELETE FROM refinery_data WHERE station = ?').run(name);
  db.prepare('DELETE FROM refinery_stations WHERE name = ?').run(name);
  res.sendStatus(204);
});

app.put('/api/stations/:name', (req, res) => {
  const { name } = req.params;
  const { newName, system } = req.body;
  if (newName && newName !== name) {
    // Update FK references first
    db.prepare('UPDATE refinery_data SET station = ? WHERE station = ?').run(newName, name);
    db.prepare('UPDATE refinery_stations SET name = ?, system = ? WHERE name = ?').run(newName, system || 'Stanton', name);
  } else {
    db.prepare('UPDATE refinery_stations SET system = ? WHERE name = ?').run(system || 'Stanton', name);
  }
  res.json({ name: newName || name, system });
});

// 2. Refinery Data
app.get('/api/refinery', (req, res) => {
  const { system } = req.query;
  const stmt = system 
    ? db.prepare('SELECT * FROM refinery_data WHERE system = ?')
    : db.prepare('SELECT * FROM refinery_data');
  const data = system ? stmt.all(system) : stmt.all();
  res.json(data);
});

app.post('/api/refinery', (req, res) => {
  const { station, ore, modifier, system } = req.body;
  const id = 'ref-' + Date.now().toString(36);
  const stmt = db.prepare('INSERT INTO refinery_data (id, station, ore, modifier, system) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, station, ore, modifier, system || 'Stanton');
  res.status(201).json({ id, station, ore, modifier, system });
});

app.delete('/api/refinery/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM refinery_data WHERE id = ?').run(id);
  res.sendStatus(204);
});

app.put('/api/refinery/:id', (req, res) => {
  const { id } = req.params;
  const { station, ore, modifier, system } = req.body;
  db.prepare('UPDATE refinery_data SET station = ?, ore = ?, modifier = ?, system = ? WHERE id = ?')
    .run(station, ore, modifier, system || 'Stanton', id);
  res.json({ id, station, ore, modifier, system });
});

// 2. Resource Data
app.get('/api/resources', (req, res) => {
  const { system } = req.query;
  const stmt = system 
    ? db.prepare('SELECT * FROM resource_data WHERE system = ?')
    : db.prepare('SELECT * FROM resource_data');
  const data = (system ? stmt.all(system) : stmt.all()).map(d => ({
    ...d,
    methods: JSON.parse(d.methods)
  }));
  res.json(data);
});

app.post('/api/resources', (req, res) => {
  const { name, type, location, parentBody, methods, rarity, yield: y, description, tips, system } = req.body;
  const id = 'res-' + Date.now().toString(36);
  const stmt = db.prepare('INSERT INTO resource_data (id, name, type, location, parentBody, methods, rarity, yield, description, tips, system) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run(id, name, type, location, parentBody, JSON.stringify(methods), rarity, y, description, tips, system || 'Stanton');
  res.status(201).json({ id, name, type, location, parentBody, methods, rarity, yield: y, description, tips, system });
});

app.delete('/api/resources/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM resource_data WHERE id = ?').run(id);
  res.sendStatus(204);
});

app.put('/api/resources/:id', (req, res) => {
  const { id } = req.params;
  const { name, type, location, parentBody, methods, rarity, yield: y, description, tips, system } = req.body;
  db.prepare('UPDATE resource_data SET name=?, type=?, location=?, parentBody=?, methods=?, rarity=?, yield=?, description=?, tips=?, system=? WHERE id=?')
    .run(name, type, location, parentBody, JSON.stringify(methods), rarity, y, description, tips, system || 'Stanton', id);
  res.json({ id, name, type, location, parentBody, methods, rarity, yield: y, description, tips, system });
});

// 3. Personnel Data
app.get('/api/personnel', (req, res) => {
  const data = db.prepare('SELECT * FROM personnel_data').all();
  res.json(data);
});

// 5. Panic Purge
app.delete('/api/purge', (req, res) => {
  db.prepare('DELETE FROM refinery_data').run();
  db.prepare('DELETE FROM refinery_stations').run();
  db.prepare('DELETE FROM resource_data').run();
  db.prepare('DELETE FROM personnel_data').run();
  // Mark DB as 'purged' so seeding never re-triggers on restart
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('seeded', 'purged');
  console.log('🔥 PANIC PURGE — All data cleared. Seed lock engaged.');
  res.sendStatus(204);
});

// 4. Settings (Admin PIN etc)
app.get('/api/settings/:key', (req, res) => {
  const { key } = req.params;
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  res.json({ value: row ? row.value : null });
});

app.post('/api/settings', (req, res) => {
  const { key, value } = req.body;
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  res.sendStatus(201);
});

// 6. Server-side PIN auth
app.post('/api/auth/verify', (req, res) => {
  const { pin } = req.body;
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_pin');
  const serverPin = row?.value || process.env.VITE_ADMIN_PIN || 'SEC-NODATA-7X29';
  res.json({ authorized: pin === serverPin });
});

app.listen(PORT, () => {
  console.log(`🚀 AUXNET Backend Uplink Established on Port ${PORT}`);
});
