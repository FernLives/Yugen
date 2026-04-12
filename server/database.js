import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, 'auxnet.db');

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// ── Schema Initialization ──
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS refinery_stations (
      name TEXT PRIMARY KEY,
      system TEXT DEFAULT 'Stanton'
    );

    CREATE TABLE IF NOT EXISTS refinery_data (
      id TEXT PRIMARY KEY,
      station TEXT REFERENCES refinery_stations(name) ON DELETE CASCADE,
      ore TEXT,
      modifier REAL,
      system TEXT DEFAULT 'Stanton'
    );

    CREATE TABLE IF NOT EXISTS resource_locations (
      name TEXT,
      parentBody TEXT,
      system TEXT DEFAULT 'Stanton',
      PRIMARY KEY (name, parentBody)
    );

    CREATE TABLE IF NOT EXISTS resource_data (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      location TEXT,
      parentBody TEXT,
      methods TEXT, -- JSON string
      rarity TEXT,
      yield TEXT,
      description TEXT,
      tips TEXT,
      system TEXT DEFAULT 'Stanton'
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS personnel_data (
      id TEXT PRIMARY KEY,
      name TEXT,
      realName TEXT,
      title TEXT,
      clearance TEXT,
      status TEXT,
      location TEXT,
      signal TEXT,
      ping TEXT,
      relay TEXT,
      signatureSeed TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      callsign TEXT NOT NULL,
      role TEXT DEFAULT 'operator',
      clearance TEXT DEFAULT 'DELTA',
      avatarSeed TEXT,
      status TEXT DEFAULT 'ACTIVE',
      bio TEXT DEFAULT '',
      createdAt TEXT,
      lastSeen TEXT
    );
  `);

  // Migrate existing distinct stations to the new table if not present
  db.exec(`
    INSERT OR IGNORE INTO refinery_stations (name, system)
    SELECT DISTINCT station, system FROM refinery_data WHERE station IS NOT NULL;
  `);

  // Migrate existing distinct locations to the new table if not present
  db.exec(`
    INSERT OR IGNORE INTO resource_locations (name, parentBody, system)
    SELECT DISTINCT location, parentBody, system FROM resource_data WHERE location IS NOT NULL;
  `);

  // ── Seeding logic ──
  // Only seed if the 'seeded' flag has NEVER been set.
  // Once the DB has been seeded or purged, this flag exists and we never auto-populate again.
  const seedSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('seeded');
  if (!seedSetting) {
    console.log('🌱 First-time initialization — seeding database with default data...');
    seedData();
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('seeded', 'true');
  } else {
    console.log('📦 Database already initialized (seeded=' + seedSetting.value + '). Skipping seed.');
  }
}

async function seedData() {
  // We'll read the files directly since they are just exports
  // Given we are in the server, we might need to be careful with paths
  try {
    const refineryFile = path.join(__dirname, '../src/data/refineryData.js');
    const resourceFile = path.join(__dirname, '../src/data/resourceData.js');

    // Simple parser for the static data files to avoid complex imports in this environment
    // OR we can just hardcode the initial seeding since we have the data
    
    // For this migration, I'll use the data I read earlier
    const defaultRefinery = [
      { station: 'ARC-L1', ore: 'Quantanium', modifier: -3.0 },
      { station: 'ARC-L1', ore: 'Agricium', modifier: 2.0 },
      { station: 'ARC-L1', ore: 'Laranite', modifier: 3.0 },
      { station: 'ARC-L2', ore: 'Borase', modifier: 4.5 },
      { station: 'CRU-L1', ore: 'Quantanium', modifier: 4.0 },
      { station: 'HUR-L1', ore: 'Agricium', modifier: 5.0 },
      { station: 'MIC-L1', ore: 'Taranite', modifier: 5.0 },
    ];

    const insertStation = db.prepare('INSERT OR IGNORE INTO refinery_stations (name, system) VALUES (?, ?)');
    const insertRefinery = db.prepare('INSERT OR IGNORE INTO refinery_data (id, station, ore, modifier, system) VALUES (?, ?, ?, ?, ?)');
    defaultRefinery.forEach((d, i) => {
      insertStation.run(d.station, 'Stanton');
      insertRefinery.run(`ref-seed-${i}`, d.station, d.ore, d.modifier, 'Stanton');
    });

    const defaultResources = [
      { id: 'res-001', name: 'Quantanium', type: 'Mineral', location: 'Arial', parentBody: 'Hurston', methods: ['ship'], rarity: 'Rare', yield: 'High', description: 'Extremely volatile.', tips: 'Use Prospector.' },
    ];

    const insertResource = db.prepare('INSERT OR IGNORE INTO resource_data (id, name, type, location, parentBody, methods, rarity, yield, description, tips, system) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    defaultResources.forEach(d => {
      insertResource.run(d.id, d.name, d.type, d.location, d.parentBody, JSON.stringify(d.methods), d.rarity, d.yield, d.description, d.tips, 'Stanton');
    });

    const defaultPersonnel = [
      {
        id: 'per-001', name: '█████████', realName: 'FernLives', title: 'Founder / Apex Architect',
        clearance: 'OMEGA', status: 'ACTIVE - ENCRYPTED', location: '██████, Stanton',
        signal: '98.2%', ping: '12ms', relay: 'RSA-4096-A', signatureSeed: '0x884',
        notes: 'Primary architect of the YŪGEN intelligence matrix.'
      }
    ];

    const insertPersonnel = db.prepare('INSERT OR IGNORE INTO personnel_data (id, name, realName, title, clearance, status, location, signal, ping, relay, signatureSeed, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    defaultPersonnel.forEach(d => {
      insertPersonnel.run(d.id, d.name, d.realName, d.title, d.clearance, d.status, d.location, d.signal, d.ping, d.relay, d.signatureSeed, d.notes);
    });

    console.log('✅ Seeding complete.');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  }
}

export default db;
