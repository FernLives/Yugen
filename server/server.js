import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { initDb, dbPath } from './database.js';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_not_for_production';

app.use(cors());
app.use(express.json());

// Initialize Database
initDb();

// ── Authentication Middleware ──
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Authentication required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired session' });
    req.user = user;
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Administrative privileges required' });
  }
}

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

// Admin: Download DB
app.get('/api/admin/download-db', authenticateToken, isAdmin, (req, res) => {
  res.download(dbPath, 'database.sqlite');
});

// 1. Stations Data
app.get('/api/stations', (req, res) => {
  const { system } = req.query;
  const stmt = system 
    ? db.prepare('SELECT * FROM refinery_stations WHERE system = ?')
    : db.prepare('SELECT * FROM refinery_stations');
  const data = system ? stmt.all(system) : stmt.all();
  res.json(data);
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

// 3. Resource Bodies
app.get('/api/bodies', (req, res) => {
  const data = db.prepare('SELECT * FROM resource_bodies').all();
  res.json(data);
});

// 4. Resource Data
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

// 5. Personnel Data
app.get('/api/personnel', (req, res) => {
  const data = db.prepare('SELECT * FROM personnel_data').all();
  res.json(data);
});

// 5. Panic Purge
app.delete('/api/purge', authenticateToken, isAdmin, (req, res) => {
  db.prepare('DELETE FROM refinery_data').run();
  db.prepare('DELETE FROM refinery_stations').run();
  db.prepare('DELETE FROM resource_data').run();
  db.prepare('DELETE FROM resource_bodies').run();
  db.prepare('DELETE FROM personnel_data').run();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('seeded', 'purged');
  console.log('🔥 PANIC PURGE — All data cleared. Seed lock engaged.');
  res.sendStatus(204);
});

// 4. Settings
app.get('/api/settings/:key', (req, res) => {
  const { key } = req.params;
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  res.json({ value: row ? row.value : null });
});

app.post('/api/settings', authenticateToken, isAdmin, (req, res) => {
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

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const role = userCount === 0 ? 'admin' : 'operator';

  const id = 'usr-' + crypto.randomBytes(8).toString('hex');
  const passwordHash = bcrypt.hashSync(password, 10);
  const avatarSeed = crypto.randomBytes(16).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`INSERT INTO users (id, username, passwordHash, callsign, role, clearance, avatarSeed, status, bio, createdAt, lastSeen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, username.toLowerCase(), passwordHash, callsign, role, 'ASSOCIATE', avatarSeed, 'ACTIVE', '', now, now);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  
  console.log(`👤 New user registered: ${username} (${role})`);
  res.status(201).json({ ...sanitizeUser(user), token });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!bcrypt.compareSync(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid credentials' });

  db.prepare('UPDATE users SET lastSeen = ? WHERE id = ?').run(new Date().toISOString(), user.id);

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  
  console.log(`🔓 User logged in: ${username}`);
  res.json({ ...sanitizeUser(user), lastSeen: new Date().toISOString(), token });
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

app.put('/api/users/:id', authenticateToken, (req, res) => {
  const { callsign, bio, password, status } = req.body;
  if (req.user.id !== req.params.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to update this profile' });
  }

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

app.put('/api/users/:id/admin', authenticateToken, isAdmin, (req, res) => {
  const { role, clearance } = req.body;
  if (role && !['operator', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.params.id);
  if (role) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
    logBulletin('system', 'general', `Operator @${user.username} role adjusted to ${role.toUpperCase()}`, req.user.username);
  }
  if (clearance) db.prepare('UPDATE users SET clearance = ? WHERE id = ?').run(clearance, req.params.id);
  
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json(sanitizeUser(updated));
});

// ── 7. Bulletins & Automated Reports ──

function logBulletin(type, category, content, author = 'SYSTEM') {
  const id = 'bul-' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex');
  const timestamp = new Date().toISOString();
  try {
    db.prepare('INSERT INTO bulletins (id, type, category, content, author, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, type, category, content, author, timestamp);
  } catch (err) {
    console.error('Failed to log bulletin:', err);
  }
}

app.get('/api/bulletins', (req, res) => {
  const data = db.prepare('SELECT * FROM bulletins ORDER BY timestamp DESC LIMIT 100').all();
  res.json(data);
});

app.post('/api/bulletins', authenticateToken, isAdmin, (req, res) => {
  const { type, category, content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  logBulletin(type || 'announcement', category || 'general', content, req.user.username);
  res.sendStatus(201);
});

app.delete('/api/bulletins/:id', authenticateToken, isAdmin, (req, res) => {
  db.prepare('DELETE FROM bulletins WHERE id = ?').run(req.params.id);
  res.sendStatus(204);
});

// Update previous endpoints to include automated logging
app.post('/api/stations', authenticateToken, isAdmin, (req, res) => {
  const { name, system } = req.body;
  const stmt = db.prepare('INSERT OR IGNORE INTO refinery_stations (name, system) VALUES (?, ?)');
  const result = stmt.run(name, system || 'Stanton');
  if (result.changes > 0) {
    logBulletin('change', 'refinery', `New refinery hub registered: ${name} (${system || 'Stanton'})`, req.user.username);
  }
  res.status(201).json({ name, system });
});

app.delete('/api/stations/:name', authenticateToken, isAdmin, (req, res) => {
  const { name } = req.params;
  db.prepare('DELETE FROM refinery_data WHERE station = ?').run(name);
  db.prepare('DELETE FROM refinery_stations WHERE name = ?').run(name);
  logBulletin('change', 'refinery', `Refinery hub decommissioned: ${name}`, req.user.username);
  res.sendStatus(204);
});

app.post('/api/refinery', authenticateToken, isAdmin, (req, res) => {
  const { station, ore, modifier, system } = req.body;
  const id = 'ref-' + Date.now().toString(36);
  const stmt = db.prepare('INSERT INTO refinery_data (id, station, ore, modifier, system) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, station, ore, modifier, system || 'Stanton');
  logBulletin('change', 'refinery', `Updated logistics for ${ore} at ${station}`, req.user.username);
  res.status(201).json({ id, station, ore, modifier, system });
});

app.delete('/api/refinery/:id', authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT station, ore FROM refinery_data WHERE id = ?').get(id);
  if (row) {
    logBulletin('change', 'refinery', `Removed ${row.ore} records from ${row.station}`, req.user.username);
  }
  db.prepare('DELETE FROM refinery_data WHERE id = ?').run(id);
  res.sendStatus(204);
});

app.put('/api/refinery/:id', authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const { station, ore, modifier, system } = req.body;
  db.prepare('UPDATE refinery_data SET station = ?, ore = ?, modifier = ?, system = ? WHERE id = ?')
    .run(station, ore, modifier, system || 'Stanton', id);
  logBulletin('change', 'refinery', `Modified material yields for ${ore} at ${station}`, req.user.username);
  res.json({ id, station, ore, modifier, system });
});

app.post('/api/bodies', authenticateToken, isAdmin, (req, res) => {
  const { name, system } = req.body;
  const result = db.prepare('INSERT OR IGNORE INTO resource_bodies (name, system) VALUES (?, ?)').run(name, system || 'Stanton');
  if (result.changes > 0) {
    logBulletin('change', 'resource', `New planetary body surveyed: ${name} (${system || 'Stanton'})`, req.user.username);
  }
  res.status(201).json({ name, system });
});

app.delete('/api/bodies/:name', authenticateToken, isAdmin, (req, res) => {
  const { name } = req.params;
  db.prepare('DELETE FROM resource_bodies WHERE name = ?').run(name);
  db.prepare('DELETE FROM resource_data WHERE parentBody = ?').run(name);
  logBulletin('change', 'resource', `Planetary signature removed from archives: ${name}`, req.user.username);
  res.sendStatus(204);
});

app.post('/api/resources', authenticateToken, isAdmin, (req, res) => {
  const { name, type, parentBody, methods, rarity, yield: y, description, tips, system } = req.body;
  const id = 'res-' + Date.now().toString(36);
  const stmt = db.prepare('INSERT INTO resource_data (id, name, type, parentBody, methods, rarity, yield, description, tips, system) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run(id, name, type, parentBody, JSON.stringify(methods), rarity, y, description, tips, system || 'Stanton');
  logBulletin('change', 'resource', `New survey data published for ${name} at ${parentBody}`, req.user.username);
  res.status(201).json({ id, name, type, parentBody, methods, rarity, yield: y, description, tips, system });
});

app.delete('/api/resources/:id', authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT name, parentBody FROM resource_data WHERE id = ?').get(id);
  if (row) {
    logBulletin('change', 'resource', `Retracted survey findings for ${row.name} at ${row.parentBody}`, req.user.username);
  }
  db.prepare('DELETE FROM resource_data WHERE id = ?').run(id);
  res.sendStatus(204);
});

app.put('/api/resources/:id', authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const { name, type, parentBody, methods, rarity, yield: y, description, tips, system } = req.body;
  db.prepare('UPDATE resource_data SET name=?, type=?, parentBody=?, methods=?, rarity=?, yield=?, description=?, tips=?, system=? WHERE id=?')
    .run(name, type, parentBody, JSON.stringify(methods), rarity, y, description, tips, system || 'Stanton', id);
  logBulletin('change', 'resource', `Updated intelligence report for ${name} at ${parentBody}`, req.user.username);
  res.json({ id, name, type, parentBody, methods, rarity, yield: y, description, tips, system });
});

app.put('/api/stations/:name', authenticateToken, isAdmin, (req, res) => {
  const { name } = req.params;
  const { newName, system } = req.body;
  if (newName && newName !== name) {
    db.prepare('UPDATE refinery_data SET station = ? WHERE station = ?').run(newName, name);
    db.prepare('UPDATE refinery_stations SET name = ?, system = ? WHERE name = ?').run(newName, system || 'Stanton', name);
    logBulletin('change', 'refinery', `Refinery hub signature updated: ${name} -> ${newName}`, req.user.username);
  } else {
    db.prepare('UPDATE refinery_stations SET system = ? WHERE name = ?').run(system || 'Stanton', name);
    logBulletin('change', 'refinery', `Logistics protocol updated for ${name}`, req.user.username);
  }
  res.json({ name: newName || name, system });
});

app.put('/api/bodies/:name', authenticateToken, isAdmin, (req, res) => {
  const { name } = req.params;
  const { newName, system } = req.body;
  if (newName && newName !== name) {
    db.prepare('UPDATE resource_data SET parentBody=? WHERE parentBody=?').run(newName, name);
    db.prepare('UPDATE resource_bodies SET name=?, system=? WHERE name=?').run(newName, system || 'Stanton', name);
    logBulletin('change', 'resource', `Planetary body re-classified: ${name} -> ${newName}`, req.user.username);
  } else {
    db.prepare('UPDATE resource_bodies SET system=? WHERE name=?').run(system || 'Stanton', name);
    logBulletin('change', 'resource', `Updated survey parameters for ${name}`, req.user.username);
  }
  res.json({ name: newName || name, system });
});

// ── 8. Roadmap Endpoints ──

app.get('/api/roadmap', (req, res) => {
  const data = db.prepare('SELECT * FROM roadmap ORDER BY timestamp DESC').all();
  res.json(data);
});

app.post('/api/roadmap', authenticateToken, isAdmin, (req, res) => {
  const { title, description, status, category } = req.body;
  const id = 'rdm-' + Date.now().toString(36);
  db.prepare('INSERT INTO roadmap (id, title, description, status, category, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, title, description, status || 'PLANNED', category || 'general', new Date().toISOString());
  logBulletin('change', 'system', `New studio milestone registered: ${title}`, req.user.username);
  res.status(201).json({ id, title, description, status, category });
});

app.put('/api/roadmap/:id', authenticateToken, isAdmin, (req, res) => {
  const { title, description, status, category } = req.body;
  db.prepare('UPDATE roadmap SET title=?, description=?, status=?, category=? WHERE id=?')
    .run(title, description, status, category, req.params.id);
  logBulletin('change', 'system', `Milestone updated: ${title} (${status})`, req.user.username);
  res.json({ id: req.params.id, title, description, status, category });
});

app.delete('/api/roadmap/:id', authenticateToken, isAdmin, (req, res) => {
  const row = db.prepare('SELECT title FROM roadmap WHERE id = ?').get(req.params.id);
  if (row) {
    logBulletin('change', 'system', `Milestone retracted: ${row.title}`, req.user.username);
  }
  db.prepare('DELETE FROM roadmap WHERE id = ?').run(req.params.id);
  res.sendStatus(204);
});

app.use(express.static(path.join(__dirname, '../dist')));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 YŪGEN Backend Uplink Established on Port ${PORT}`);
});
