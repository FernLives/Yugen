import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const internalDbPath = path.join(__dirname, 'auxnet.db');
export const dbPath = process.env.DB_PATH || internalDbPath;

// 🚀 ROBUST MIGRATION: Ensure rich local data is moved to the persistent volume
if (process.env.DB_PATH && !process.env.SKIP_DB_MIGRATION && fs.existsSync(internalDbPath)) {
  console.log('🔍 Checking database sync status...');
  
  try {
    let shouldMigrate = false;
    
    if (!fs.existsSync(dbPath)) {
      console.log('📂 Volume database missing. Initializing migration...');
      shouldMigrate = true;
    } else {
      // Both exist. Compare them to see if the volume is a "empty/default" one.
      const internalSize = fs.statSync(internalDbPath).size;
      const volumeSize = fs.statSync(dbPath).size;
      
      console.log(`📊 DB Sizes — Image: ${internalSize} bytes, Volume: ${volumeSize} bytes`);
      
      // If the pushed database is significantly larger (has more data) than the volume one,
      // it means the volume was likely initialized with defaults and we should overwrite it.
      if (internalSize > volumeSize + 1024) { // 1KB buffer
        console.log('⚠️  Detected rich data in deployment image not present in Volume. Forcing Migration...');
        shouldMigrate = true;
      }
    }

    if (shouldMigrate) {
      console.log('🚚 Migrating data to persistent volume...');
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      fs.copyFileSync(internalDbPath, dbPath);
      console.log('✅ Database successfully moved to Volume.');
    } else {
      console.log('⏭️  Volume already contains up-to-date or existing data. Skipping migration.');
    }
  } catch (err) {
    console.error('❌ Migration logic error:', err);
  }
}

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('busy_timeout = 5000');
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

    CREATE TABLE IF NOT EXISTS resource_bodies (
      name TEXT PRIMARY KEY,
      system TEXT DEFAULT 'Stanton'
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

    CREATE TABLE IF NOT EXISTS bulletins (
      id TEXT PRIMARY KEY,
      type TEXT, -- 'announcement', 'change'
      category TEXT, -- 'refinery', 'resource', 'system', 'general'
      content TEXT,
      author TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS roadmap (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      status TEXT, -- 'PLANNED', 'IN DEVELOPMENT', 'RELEASED'
      category TEXT,
      timestamp TEXT
    );
  `);

  // Migrate existing distinct stations to the new table if not present
  db.exec(`
    INSERT OR IGNORE INTO refinery_stations (name, system)
    SELECT DISTINCT station, system FROM refinery_data WHERE station IS NOT NULL;
  `);

  // Migrate existing distinct bodies to the new table if not present
  db.exec(`
    INSERT OR IGNORE INTO resource_bodies (name, system)
    SELECT DISTINCT parentBody, system FROM resource_data WHERE parentBody IS NOT NULL;
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

function seedData() {
  try {
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
    const insertResource = db.prepare('INSERT OR IGNORE INTO resource_data (id, name, type, location, parentBody, methods, rarity, yield, description, tips, system) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertBody = db.prepare('INSERT OR IGNORE INTO resource_bodies (name, system) VALUES (?, ?)');

    db.transaction(() => {
      defaultRefinery.forEach((d, i) => {
        insertStation.run(d.station, 'Stanton');
        insertRefinery.run(`ref-seed-${i}`, d.station, d.ore, d.modifier, 'Stanton');
      });
      insertBody.run('Hurston', 'Stanton');
      insertResource.run('res-001', 'Quantanium', 'Ship Mineable', 'Arial', 'Hurston', JSON.stringify(['ship']), 'Rare', 'High', 'Extremely volatile.', 'Use Prospector.', 'Stanton');
    })();

    console.log('✅ Seeding complete.');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  }
}

export default db;
