import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import db, { initDb, dbPath } from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '../dist');

dotenv.config();

const PORT = Number(process.env.PORT) || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET environment variable is not defined.');
  process.exit(1);
}
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();
app.disable('x-powered-by');
// Only trust X-Forwarded-* when explicitly told we sit behind a proxy (needed for correct per-IP rate limits).
if (process.env.TRUST_PROXY) {
  const n = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isNaN(n) ? process.env.TRUST_PROXY : n);
}

// ── Security headers ──
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (IS_PROD) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
});

const corsOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors(corsOrigins.length ? { origin: corsOrigins } : undefined));
app.use(express.json({ limit: '64kb' }));

// Initialize Database
initDb();

// ── Tiny in-memory fixed-window rate limiter ──
function rateLimit({ windowMs, max, key = (req) => req.ip, message = 'Too many requests. Please slow down.' }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs).unref();
  return (req, res, next) => {
    const k = key(req);
    const now = Date.now();
    let entry = hits.get(k);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(k, entry);
    }
    entry.count++;
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

app.use('/api', rateLimit({ windowMs: 60_000, max: 600 }));
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 15,
  key: (req) => `${req.ip}|${String(req.body?.username || '').toLowerCase()}`,
  message: 'Too many sign-in attempts. Try again in a few minutes.',
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60_000, max: 10,
  message: 'Too many accounts created from this address. Try again later.',
});

// ── Validation helpers ──
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = (msg) => new HttpError(400, msg);

/** Returns a trimmed string within [min, max] or throws a 400. */
function text(value, field, { min = 1, max = 200, optional = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (optional) return '';
    throw bad(`${field} is required`);
  }
  if (typeof value !== 'string') throw bad(`${field} must be text`);
  const v = value.trim();
  if (v.length < min) throw bad(`${field} must be at least ${min} character${min === 1 ? '' : 's'}`);
  if (v.length > max) throw bad(`${field} must be at most ${max} characters`);
  return v;
}
function oneOf(value, field, allowed, fallback) {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback;
    throw bad(`${field} is required`);
  }
  if (!allowed.includes(value)) throw bad(`${field} must be one of: ${allowed.join(', ')}`);
  return value;
}
const SYSTEMS_MAX = 40;
const sys = (v) => text(v, 'System', { max: SYSTEMS_MAX, optional: true }) || 'Stanton';

const ROLES = ['operator', 'admin'];
const CLEARANCES = ['ASSOCIATE', 'DIRECTOR', 'PRINCIPAL'];
const USER_STATUSES = ['ACTIVE', 'AWAY', 'INACTIVE'];
const BULLETIN_TYPES = ['announcement', 'change', 'system'];
const ROADMAP_STATUSES = ['PLANNED', 'IN DEVELOPMENT', 'RELEASED'];
const MODULE_IDS = ['info', 'refinery', 'resources', 'bulletin'];
const MODULE_STATES = ['ACTIVE', 'MAINTENANCE', 'RESTRICTED', 'COLLECTING'];
const MIN_PASSWORD = 8;

function password(value) {
  if (typeof value !== 'string' || value.length < MIN_PASSWORD) throw bad(`Password must be at least ${MIN_PASSWORD} characters`);
  if (Buffer.byteLength(value) > 72) throw bad('Password must be at most 72 bytes');
  return value;
}

// ── Authentication Middleware ──
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired session' });
    // Always trust the database over the token so role changes / removals apply immediately.
    const fresh = db.prepare('SELECT id, username, role, status FROM users WHERE id = ?').get(payload.id);
    if (!fresh) return res.status(403).json({ error: 'Invalid or expired session' });
    req.user = { id: fresh.id, username: fresh.username, role: fresh.role };
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403).json({ error: 'Administrative privileges required' });
}

// ── Profanity filter (extreme only) ──
const BLOCKED_WORDS = [
  'nigger', 'nigga', 'faggot', 'retard', 'tranny', 'kike', 'chink', 'spic', 'wetback', 'coon',
  'dyke', 'gook', 'beaner', 'raghead', 'towelhead',
];
function hasProfanity(value) {
  if (!value) return false;
  const lower = String(value).toLowerCase();
  return BLOCKED_WORDS.some(w => lower.includes(w));
}

function sanitizeUser(user) {
  if (!user) return null;
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}
const signToken = (user) => jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
const safeJson = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };
const DUMMY_HASH = bcrypt.hashSync('yugen-dummy-password', 10);

// ── Bulletins & Automated Reports ──
function logBulletin(type, category, content, author = 'SYSTEM') {
  const id = 'bul-' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex');
  try {
    db.prepare('INSERT INTO bulletins (id, type, category, content, author, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, type, category, String(content).slice(0, 1000), author, new Date().toISOString());
  } catch (err) {
    console.error('Failed to log bulletin:', err);
  }
}

// ═══════════════ API ═══════════════

app.get('/api/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ ok: true, uptime: Math.round(process.uptime()) });
  } catch {
    res.status(503).json({ ok: false });
  }
});

// Admin: Download DB
app.get('/api/admin/download-db', authenticateToken, isAdmin, (req, res) => {
  res.download(dbPath, 'database.sqlite');
});

// ── Stations ──
app.get('/api/stations', (req, res) => {
  const { system } = req.query;
  res.json(typeof system === 'string' && system
    ? db.prepare('SELECT * FROM refinery_stations WHERE system = ?').all(system)
    : db.prepare('SELECT * FROM refinery_stations').all());
});

app.post('/api/stations', authenticateToken, isAdmin, (req, res) => {
  const name = text(req.body.name, 'Station name', { max: 80 });
  const system = sys(req.body.system);
  const result = db.prepare('INSERT OR IGNORE INTO refinery_stations (name, system) VALUES (?, ?)').run(name, system);
  if (result.changes > 0) {
    logBulletin('change', 'refinery', `New refinery hub registered: ${name} (${system})`, req.user.username);
  }
  res.status(201).json({ name, system });
});

app.put('/api/stations/:name', authenticateToken, isAdmin, (req, res) => {
  const { name } = req.params;
  const newName = text(req.body.newName, 'Station name', { max: 80, optional: true }) || name;
  const system = sys(req.body.system);
  const existing = db.prepare('SELECT name FROM refinery_stations WHERE name = ?').get(name);
  if (!existing) throw new HttpError(404, 'Station not found');

  if (newName !== name) {
    if (db.prepare('SELECT 1 FROM refinery_stations WHERE name = ?').get(newName)) throw new HttpError(409, 'A station with that name already exists');
    // refinery_data.station has a foreign key → create the new parent row first, move children, drop the old row.
    db.transaction(() => {
      db.prepare('INSERT INTO refinery_stations (name, system) VALUES (?, ?)').run(newName, system);
      db.prepare('UPDATE refinery_data SET station = ? WHERE station = ?').run(newName, name);
      db.prepare('DELETE FROM refinery_stations WHERE name = ?').run(name);
    })();
    logBulletin('change', 'refinery', `Refinery hub signature updated: ${name} -> ${newName}`, req.user.username);
  } else {
    db.prepare('UPDATE refinery_stations SET system = ? WHERE name = ?').run(system, name);
    db.prepare('UPDATE refinery_data SET system = ? WHERE station = ?').run(system, name);
    logBulletin('change', 'refinery', `Logistics protocol updated for ${name}`, req.user.username);
  }
  res.json({ name: newName, system });
});

app.delete('/api/stations/:name', authenticateToken, isAdmin, (req, res) => {
  const { name } = req.params;
  db.transaction(() => {
    db.prepare('DELETE FROM refinery_data WHERE station = ?').run(name);
    db.prepare('DELETE FROM refinery_stations WHERE name = ?').run(name);
  })();
  logBulletin('change', 'refinery', `Refinery hub decommissioned: ${name}`, req.user.username);
  res.sendStatus(204);
});

// ── Refinery matrix ──
app.get('/api/refinery', (req, res) => {
  const { system } = req.query;
  res.json(typeof system === 'string' && system
    ? db.prepare('SELECT * FROM refinery_data WHERE system = ?').all(system)
    : db.prepare('SELECT * FROM refinery_data').all());
});

function refineryInput(body) {
  const station = text(body.station, 'Station', { max: 80 });
  const ore = text(body.ore, 'Material', { max: 80 });
  const modifier = Number(body.modifier);
  if (body.modifier === '' || body.modifier === null || body.modifier === undefined || !Number.isFinite(modifier) || Math.abs(modifier) > 100) {
    throw bad('Modifier must be a number between -100 and 100');
  }
  const row = db.prepare('SELECT system FROM refinery_stations WHERE name = ?').get(station);
  if (!row) throw bad('Unknown station — register it first');
  return { station, ore, modifier, system: row.system || 'Stanton' };
}

app.post('/api/refinery', authenticateToken, isAdmin, (req, res) => {
  const { station, ore, modifier, system } = refineryInput(req.body);
  const id = 'ref-' + crypto.randomBytes(5).toString('hex');
  db.prepare('INSERT INTO refinery_data (id, station, ore, modifier, system) VALUES (?, ?, ?, ?, ?)').run(id, station, ore, modifier, system);
  logBulletin('change', 'refinery', `Updated logistics for ${ore} at ${station}`, req.user.username);
  res.status(201).json({ id, station, ore, modifier, system });
});

app.put('/api/refinery/:id', authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const { station, ore, modifier, system } = refineryInput(req.body);
  const result = db.prepare('UPDATE refinery_data SET station = ?, ore = ?, modifier = ?, system = ? WHERE id = ?').run(station, ore, modifier, system, id);
  if (!result.changes) throw new HttpError(404, 'Entry not found');
  logBulletin('change', 'refinery', `Modified material yields for ${ore} at ${station}`, req.user.username);
  res.json({ id, station, ore, modifier, system });
});

app.delete('/api/refinery/:id', authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT station, ore FROM refinery_data WHERE id = ?').get(id);
  if (row) logBulletin('change', 'refinery', `Removed ${row.ore} records from ${row.station}`, req.user.username);
  db.prepare('DELETE FROM refinery_data WHERE id = ?').run(id);
  res.sendStatus(204);
});

// ── Resource bodies ──
app.get('/api/bodies', (req, res) => {
  res.json(db.prepare('SELECT * FROM resource_bodies').all());
});

app.post('/api/bodies', authenticateToken, isAdmin, (req, res) => {
  const name = text(req.body.name, 'Body name', { max: 80 });
  const system = sys(req.body.system);
  const result = db.prepare('INSERT OR IGNORE INTO resource_bodies (name, system) VALUES (?, ?)').run(name, system);
  if (result.changes > 0) {
    logBulletin('change', 'resource', `New planetary body surveyed: ${name} (${system})`, req.user.username);
  }
  res.status(201).json({ name, system });
});

app.put('/api/bodies/:name', authenticateToken, isAdmin, (req, res) => {
  const { name } = req.params;
  const newName = text(req.body.newName, 'Body name', { max: 80, optional: true }) || name;
  const system = sys(req.body.system);
  if (!db.prepare('SELECT 1 FROM resource_bodies WHERE name = ?').get(name)) throw new HttpError(404, 'Body not found');
  if (newName !== name) {
    if (db.prepare('SELECT 1 FROM resource_bodies WHERE name = ?').get(newName)) throw new HttpError(409, 'A body with that name already exists');
    db.transaction(() => {
      db.prepare('UPDATE resource_data SET parentBody = ? WHERE parentBody = ?').run(newName, name);
      db.prepare('UPDATE resource_bodies SET name = ?, system = ? WHERE name = ?').run(newName, system, name);
    })();
    logBulletin('change', 'resource', `Planetary body re-classified: ${name} -> ${newName}`, req.user.username);
  } else {
    db.prepare('UPDATE resource_bodies SET system = ? WHERE name = ?').run(system, name);
    db.prepare('UPDATE resource_data SET system = ? WHERE parentBody = ?').run(system, name);
    logBulletin('change', 'resource', `Updated survey parameters for ${name}`, req.user.username);
  }
  res.json({ name: newName, system });
});

app.delete('/api/bodies/:name', authenticateToken, isAdmin, (req, res) => {
  const { name } = req.params;
  db.transaction(() => {
    db.prepare('DELETE FROM resource_bodies WHERE name = ?').run(name);
    db.prepare('DELETE FROM resource_data WHERE parentBody = ?').run(name);
  })();
  logBulletin('change', 'resource', `Planetary signature removed from archives: ${name}`, req.user.username);
  res.sendStatus(204);
});

// ── Resources ──
app.get('/api/resources', (req, res) => {
  const { system } = req.query;
  const rows = typeof system === 'string' && system
    ? db.prepare('SELECT * FROM resource_data WHERE system = ?').all(system)
    : db.prepare('SELECT * FROM resource_data').all();
  res.json(rows.map(d => ({ ...d, methods: safeJson(d.methods, []) })));
});

function resourceInput(body) {
  const name = text(body.name, 'Name', { max: 80 });
  const parentBody = text(body.parentBody, 'Parent body', { max: 80 });
  const row = db.prepare('SELECT system FROM resource_bodies WHERE name = ?').get(parentBody);
  if (!row) throw bad('Unknown parent body — register it first');
  const methods = Array.isArray(body.methods) ? body.methods.filter(m => typeof m === 'string').slice(0, 10) : [];
  return {
    name, parentBody, methods,
    type: text(body.type, 'Type', { max: 60, optional: true }),
    location: text(body.location, 'Location', { max: 120, optional: true }),
    rarity: text(body.rarity, 'Rarity', { max: 40, optional: true }),
    yield: text(body.yield, 'Yield', { max: 40, optional: true }),
    description: text(body.description, 'Description', { max: 1000, optional: true }),
    tips: text(body.tips, 'Tips', { max: 1000, optional: true }),
    system: row.system || 'Stanton',
  };
}

app.post('/api/resources', authenticateToken, isAdmin, (req, res) => {
  const r = resourceInput(req.body);
  const id = 'res-' + crypto.randomBytes(5).toString('hex');
  db.prepare(`INSERT INTO resource_data (id, name, type, location, parentBody, methods, rarity, yield, description, tips, system)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, r.name, r.type, r.location, r.parentBody, JSON.stringify(r.methods), r.rarity, r.yield, r.description, r.tips, r.system);
  logBulletin('change', 'resource', `New survey data published for ${r.name} at ${r.parentBody}`, req.user.username);
  res.status(201).json({ id, ...r });
});

app.put('/api/resources/:id', authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const r = resourceInput(req.body);
  const result = db.prepare(`UPDATE resource_data SET name=?, type=?, location=?, parentBody=?, methods=?, rarity=?, yield=?, description=?, tips=?, system=? WHERE id=?`)
    .run(r.name, r.type, r.location, r.parentBody, JSON.stringify(r.methods), r.rarity, r.yield, r.description, r.tips, r.system, id);
  if (!result.changes) throw new HttpError(404, 'Resource not found');
  logBulletin('change', 'resource', `Updated intelligence report for ${r.name} at ${r.parentBody}`, req.user.username);
  res.json({ id, ...r });
});

app.delete('/api/resources/:id', authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT name, parentBody FROM resource_data WHERE id = ?').get(id);
  if (row) logBulletin('change', 'resource', `Retracted survey findings for ${row.name} at ${row.parentBody}`, req.user.username);
  db.prepare('DELETE FROM resource_data WHERE id = ?').run(id);
  res.sendStatus(204);
});

// ── Personnel (legacy read-only) ──
app.get('/api/personnel', (req, res) => {
  res.json(db.prepare('SELECT * FROM personnel_data').all());
});

// ── Panic Purge ──
app.delete('/api/purge', authenticateToken, isAdmin, (req, res) => {
  db.transaction(() => {
    db.prepare('DELETE FROM refinery_data').run();
    db.prepare('DELETE FROM refinery_stations').run();
    db.prepare('DELETE FROM resource_data').run();
    db.prepare('DELETE FROM resource_bodies').run();
    db.prepare('DELETE FROM personnel_data').run();
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('seeded', 'purged');
  })();
  console.log(`🔥 PANIC PURGE by @${req.user.username} — all data cleared. Seed lock engaged.`);
  res.sendStatus(204);
});

// ── Settings (public read-only allow-list) ──
const PUBLIC_SETTINGS = ['network_status'];
app.get('/api/settings/:key', (req, res) => {
  const { key } = req.params;
  if (!PUBLIC_SETTINGS.includes(key)) return res.json({ value: null });
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  res.json({ value: row ? row.value : null });
});

app.post('/api/settings', authenticateToken, isAdmin, (req, res) => {
  const key = oneOf(req.body.key, 'Key', PUBLIC_SETTINGS);
  if (typeof req.body.value !== 'string') throw bad('Value must be text');
  if (key === 'network_status') {
    const parsed = safeJson(req.body.value, null);
    if (!parsed || typeof parsed !== 'object') throw bad('Invalid network status');
    for (const [id, state] of Object.entries(parsed)) {
      if (!MODULE_IDS.includes(id) || !MODULE_STATES.includes(state)) throw bad('Invalid network status');
    }
  }
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, req.body.value);
  res.sendStatus(201);
});

// ── Users & authentication ──
app.post('/api/auth/register', registerLimiter, (req, res) => {
  const username = text(req.body.username, 'Username', { min: 3, max: 24 }).toLowerCase();
  if (!/^[a-z0-9_]+$/.test(username)) throw bad('Username may only contain letters, numbers and underscores');
  const callsign = text(req.body.callsign, 'Callsign', { min: 2, max: 32 });
  const pw = password(req.body.password);
  if (hasProfanity(username) || hasProfanity(callsign)) throw bad('Username or callsign contains prohibited content');

  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) throw new HttpError(409, 'Username already taken');

  const id = 'usr-' + crypto.randomBytes(8).toString('hex');
  const passwordHash = bcrypt.hashSync(pw, 10);
  const avatarSeed = crypto.randomBytes(16).toString('hex');
  const now = new Date().toISOString();

  // The very first account becomes the administrator — done atomically so two simultaneous sign-ups can't both win.
  const role = db.transaction(() => {
    const count = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const r = count === 0 ? 'admin' : 'operator';
    db.prepare(`INSERT INTO users (id, username, passwordHash, callsign, role, clearance, avatarSeed, status, bio, createdAt, lastSeen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, username, passwordHash, callsign, r, 'ASSOCIATE', avatarSeed, 'ACTIVE', '', now, now);
    return r;
  })();

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  console.log(`👤 New user registered: ${username} (${role})`);
  res.status(201).json({ ...sanitizeUser(user), token: signToken(user) });
});

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { username, password: pw } = req.body || {};
  if (typeof username !== 'string' || typeof pw !== 'string' || !username || !pw) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());
  // Always run a hash comparison so response time doesn't reveal whether the account exists.
  const ok = bcrypt.compareSync(pw, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ error: 'Invalid credentials' });

  const lastSeen = new Date().toISOString();
  db.prepare('UPDATE users SET lastSeen = ? WHERE id = ?').run(lastSeen, user.id);
  console.log(`🔓 User logged in: ${user.username}`);
  res.json({ ...sanitizeUser(user), lastSeen, token: signToken(user) });
});

app.get('/api/users', (req, res) => {
  res.json(db.prepare('SELECT * FROM users ORDER BY createdAt ASC').all().map(sanitizeUser));
});

app.get('/api/users/:username', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(sanitizeUser(user));
});

app.put('/api/users/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  if (req.user.id !== id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to update this profile' });
  }
  if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(id)) throw new HttpError(404, 'User not found');

  const body = req.body || {};
  const callsign = body.callsign !== undefined ? text(body.callsign, 'Callsign', { min: 2, max: 32 }) : undefined;
  const bio = body.bio !== undefined ? text(body.bio, 'Bio', { max: 280, optional: true }) : undefined;
  const status = body.status !== undefined ? oneOf(body.status, 'Status', USER_STATUSES) : undefined;
  const pw = body.password ? password(body.password) : undefined;
  if (hasProfanity(callsign)) throw bad('Callsign contains prohibited content');
  if (hasProfanity(bio)) throw bad('Bio contains prohibited content');

  db.transaction(() => {
    if (callsign !== undefined) db.prepare('UPDATE users SET callsign = ? WHERE id = ?').run(callsign, id);
    if (bio !== undefined) db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio, id);
    if (status !== undefined) db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
    if (pw !== undefined) db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(bcrypt.hashSync(pw, 10), id);
  })();

  res.json(sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)));
});

app.put('/api/users/:id/admin', authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const role = req.body.role !== undefined ? oneOf(req.body.role, 'Role', ROLES) : undefined;
  const clearance = req.body.clearance !== undefined ? oneOf(req.body.clearance, 'Clearance', CLEARANCES) : undefined;

  const user = db.prepare('SELECT username, role FROM users WHERE id = ?').get(id);
  if (!user) throw new HttpError(404, 'User not found');

  if (role && role !== user.role) {
    if (user.role === 'admin') {
      const admins = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
      if (admins <= 1) throw bad('At least one administrator must remain');
    }
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    logBulletin('system', 'general', `Operator @${user.username} role adjusted to ${role.toUpperCase()}`, req.user.username);
  }
  if (clearance) db.prepare('UPDATE users SET clearance = ? WHERE id = ?').run(clearance, id);

  res.json(sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)));
});

// ── Bulletins ──
app.get('/api/bulletins', (req, res) => {
  res.json(db.prepare('SELECT * FROM bulletins ORDER BY timestamp DESC LIMIT 100').all());
});

app.post('/api/bulletins', authenticateToken, isAdmin, (req, res) => {
  const content = text(req.body.content, 'Content', { max: 1000 });
  const type = oneOf(req.body.type, 'Type', BULLETIN_TYPES, 'announcement');
  const category = text(req.body.category, 'Category', { max: 24, optional: true }) || 'general';
  logBulletin(type, category, content, req.user.username);
  res.sendStatus(201);
});

app.delete('/api/bulletins/:id', authenticateToken, isAdmin, (req, res) => {
  db.prepare('DELETE FROM bulletins WHERE id = ?').run(req.params.id);
  res.sendStatus(204);
});

// ── Roadmap ──
app.get('/api/roadmap', (req, res) => {
  res.json(db.prepare('SELECT * FROM roadmap ORDER BY timestamp DESC').all());
});

function roadmapInput(body) {
  return {
    title: text(body.title, 'Title', { max: 120 }),
    description: text(body.description, 'Description', { max: 600, optional: true }),
    status: oneOf(body.status, 'Status', ROADMAP_STATUSES, 'PLANNED'),
    category: text(body.category, 'Category', { max: 24, optional: true }) || 'general',
  };
}

app.post('/api/roadmap', authenticateToken, isAdmin, (req, res) => {
  const r = roadmapInput(req.body);
  const id = 'rdm-' + crypto.randomBytes(5).toString('hex');
  db.prepare('INSERT INTO roadmap (id, title, description, status, category, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, r.title, r.description, r.status, r.category, new Date().toISOString());
  logBulletin('change', 'system', `New studio milestone registered: ${r.title}`, req.user.username);
  res.status(201).json({ id, ...r });
});

app.put('/api/roadmap/:id', authenticateToken, isAdmin, (req, res) => {
  const r = roadmapInput(req.body);
  const result = db.prepare('UPDATE roadmap SET title=?, description=?, status=?, category=? WHERE id=?')
    .run(r.title, r.description, r.status, r.category, req.params.id);
  if (!result.changes) throw new HttpError(404, 'Milestone not found');
  logBulletin('change', 'system', `Milestone updated: ${r.title} (${r.status})`, req.user.username);
  res.json({ id: req.params.id, ...r });
});

app.delete('/api/roadmap/:id', authenticateToken, isAdmin, (req, res) => {
  const row = db.prepare('SELECT title FROM roadmap WHERE id = ?').get(req.params.id);
  if (row) logBulletin('change', 'system', `Milestone retracted: ${row.title}`, req.user.username);
  db.prepare('DELETE FROM roadmap WHERE id = ?').run(req.params.id);
  res.sendStatus(204);
});

// Unknown API routes → JSON 404 (never fall through to the SPA)
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// ── Static frontend ──
app.use(express.static(DIST_DIR, {
  index: false,
  setHeaders(res, filePath) {
    if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    else res.setHeader('Cache-Control', 'public, max-age=3600');
  },
}));
app.get(/^(?!\/api).*/, (req, res) => {
  // Missing static files (e.g. a stale hashed asset) must 404, not return the app shell.
  if (path.extname(req.path)) return res.status(404).type('text').send('Not found');
  const index = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(index)) return res.status(404).type('text').send('Frontend not built. Run `npm run build`.');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(index);
});

// ── Error handling ──
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
  if (typeof err.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')) {
    return res.status(409).json({ error: 'That change conflicts with existing data' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: IS_PROD ? 'Internal server error' : String(err.message || err) });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 YŪGEN Backend Uplink Established on Port ${PORT}`);
});

function shutdown(signal) {
  console.log(`\n${signal} received — closing uplink…`);
  server.close(() => {
    try { db.close(); } catch { /* already closed */ }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 8000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
