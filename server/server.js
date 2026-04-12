import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { initDb } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Database
initDb();

// ── Profanity filter (extreme only) ──
const BLOCKED_WORDS = [
  'nigger', 'nigga', 'faggot', 'retard', 'tranny', 'kike', 'chink', 'spic', 'wetback', 'coon',
  'dyke', 'gook', 'beaner', 'raghead', 'towelhead',
];

function hasProfanity(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some(w => lower.includes(w));
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

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

// 2a. Resource Locations
app.get('/api/locations', (req, res) => {
  const data = db.prepare('SELECT * FROM resource_locations').all();
  res.json(data);
});

app.post('/api/locations', (req, res) => {
  const { name, parentBody, system } = req.body;
  db.prepare('INSERT OR IGNORE INTO resource_locations (name, parentBody, system) VALUES (?, ?, ?)').run(name, parentBody, system || 'Stanton');
  res.status(201).json({ name, parentBody, system });
});

app.put('/api/locations/:name/:parentBody', (req, res) => {
  const { name, parentBody } = req.params;
  const { newName, newParentBody, system } = req.body;
  db.prepare('UPDATE resource_locations SET name=?, parentBody=?, system=? WHERE name=? AND parentBody=?')
    .run(newName || name, newParentBody || parentBody, system || 'Stanton', name, parentBody);
  // Cascade update to resource_data
  if (newName || newParentBody) {
    db.prepare('UPDATE resource_data SET location=?, parentBody=? WHERE location=? AND parentBody=?')
      .run(newName || name, newParentBody || parentBody, name, parentBody);
  }
  res.json({ name: newName || name, parentBody: newParentBody || parentBody, system });
});

app.delete('/api/locations/:name/:parentBody', (req, res) => {
  const { name, parentBody } = req.params;
  db.prepare('DELETE FROM resource_locations WHERE name = ? AND parentBody = ?').run(name, parentBody);
  // Also delete resources at this location
  db.prepare('DELETE FROM resource_data WHERE location = ? AND parentBody = ?').run(name, parentBody);
  res.sendStatus(204);
});

// 2b. Resource Data
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
  db.prepare('DELETE FROM resource_locations').run();
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

// 6. User Authentication & Profiles
app.post('/api/auth/register', (req, res) => {
  const { username, password, callsign } = req.body;
  if (!username || !password || !callsign) return res.status(400).json({ error: 'All fields required' });
  if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
  if (hasProfanity(username) || hasProfanity(callsign)) return res.status(400).json({ error: 'Username or callsign contains prohibited content' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  // First user automatically becomes admin
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const role = userCount === 0 ? 'admin' : 'operator';

  const id = 'usr-' + crypto.randomBytes(8).toString('hex');
  const passwordHash = bcrypt.hashSync(password, 10);
  const avatarSeed = crypto.randomBytes(16).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`INSERT INTO users (id, username, passwordHash, callsign, role, clearance, avatarSeed, status, bio, createdAt, lastSeen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, username.toLowerCase(), passwordHash, callsign, role, 'DELTA', avatarSeed, 'ACTIVE', '', now, now);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  console.log(`👤 New user registered: ${username} (${role})`);
  res.status(201).json(sanitizeUser(user));
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!bcrypt.compareSync(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid credentials' });

  // Update last seen
  db.prepare('UPDATE users SET lastSeen = ? WHERE id = ?').run(new Date().toISOString(), user.id);

  console.log(`🔓 User logged in: ${username}`);
  res.json(sanitizeUser({ ...user, lastSeen: new Date().toISOString() }));
});

app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY createdAt ASC').all();
  res.json(users.map(sanitizeUser));
});

app.get('/api/users/:username', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(sanitizeUser(user));
});

app.put('/api/users/:id', (req, res) => {
  const { callsign, bio, password, status } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (callsign && hasProfanity(callsign)) return res.status(400).json({ error: 'Callsign contains prohibited content' });
  if (bio && hasProfanity(bio)) return res.status(400).json({ error: 'Bio contains prohibited content' });

  if (callsign) db.prepare('UPDATE users SET callsign = ? WHERE id = ?').run(callsign, req.params.id);
  if (bio !== undefined) db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio, req.params.id);
  if (status) db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(hash, req.params.id);
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json(sanitizeUser(updated));
});

app.put('/api/users/:id/role', (req, res) => {
  const { role } = req.body;
  if (!['operator', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json(sanitizeUser(updated));
});

// Serve static files from the React app dist folder
app.use(express.static(path.join(__dirname, '../dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 YŪGEN Backend Uplink Established on Port ${PORT}`);
});
