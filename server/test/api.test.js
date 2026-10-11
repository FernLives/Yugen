// End-to-end API tests. Boots the real server against a throw-away database.
// Run with: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
let child, base, tmp;

const freePort = () => new Promise((resolve) => {
  const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

async function api(method, url, { token, body } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await res.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  return { status: res.status, data };
}

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'yugen-test-'));
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['server/server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), JWT_SECRET: 'test-secret', DB_PATH: path.join(tmp, 'test.db'), NODE_ENV: 'test', SKIP_DB_MIGRATION: '1' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(base + '/api/health')).ok) return; } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 150));
  }
  throw new Error('Server did not start');
});

after(() => {
  child?.kill('SIGTERM');
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

let admin, operator;

test('health check', async () => {
  const r = await api('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
});

test('unknown API routes return JSON 404', async () => {
  const r = await api('GET', '/api/nope');
  assert.equal(r.status, 404);
  assert.equal(r.data.error, 'Not found');
});

test('registration validates input', async () => {
  assert.equal((await api('POST', '/api/auth/register', { body: { username: 'ab', password: 'longenough1', callsign: 'Ace' } })).status, 400);
  assert.equal((await api('POST', '/api/auth/register', { body: { username: 'bad name!', password: 'longenough1', callsign: 'Ace' } })).status, 400);
  assert.equal((await api('POST', '/api/auth/register', { body: { username: 'someone', password: 'short', callsign: 'Ace' } })).status, 400);
  assert.equal((await api('POST', '/api/auth/register', { body: { username: 'someone', password: 'longenough1' } })).status, 400);
});

test('first registered user is admin, second is operator; passwords never leak', async () => {
  const a = await api('POST', '/api/auth/register', { body: { username: 'Boss', password: 'password123', callsign: 'The Boss' } });
  assert.equal(a.status, 201);
  assert.equal(a.data.role, 'admin');
  assert.equal(a.data.username, 'boss');
  assert.ok(a.data.token);
  assert.equal(a.data.passwordHash, undefined);
  admin = a.data;

  const o = await api('POST', '/api/auth/register', { body: { username: 'pilot', password: 'password123', callsign: 'Pilot' } });
  assert.equal(o.status, 201);
  assert.equal(o.data.role, 'operator');
  operator = o.data;

  assert.equal((await api('POST', '/api/auth/register', { body: { username: 'PILOT', password: 'password123', callsign: 'Dup' } })).status, 409);

  const users = await api('GET', '/api/users');
  assert.ok(users.data.every(u => u.passwordHash === undefined));
});

test('login accepts good credentials and rejects bad ones', async () => {
  const ok = await api('POST', '/api/auth/login', { body: { username: 'BOSS', password: 'password123' } });
  assert.equal(ok.status, 200);
  assert.ok(ok.data.token);
  assert.equal((await api('POST', '/api/auth/login', { body: { username: 'boss', password: 'wrong-password' } })).status, 401);
  assert.equal((await api('POST', '/api/auth/login', { body: { username: 'ghost', password: 'whatever123' } })).status, 401);
  assert.equal((await api('POST', '/api/auth/login', { body: { username: { $ne: 1 }, password: 'x' } })).status, 400);
});

test('malformed JSON is a clean 400', async () => {
  const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'Malformed JSON body');
});

test('write endpoints require an admin', async () => {
  const body = { name: 'Test Station', system: 'Stanton' };
  assert.equal((await api('POST', '/api/stations', { body })).status, 401);
  assert.equal((await api('POST', '/api/stations', { token: 'garbage', body })).status, 403);
  assert.equal((await api('POST', '/api/stations', { token: operator.token, body })).status, 403);
  assert.equal((await api('DELETE', '/api/purge', { token: operator.token })).status, 403);
});

test('station + refinery lifecycle, including renames', async () => {
  const t = admin.token;
  assert.equal((await api('POST', '/api/stations', { token: t, body: { name: 'ARC-L9 Test', system: 'Stanton' } })).status, 201);
  assert.equal((await api('POST', '/api/stations', { token: t, body: {} })).status, 400);

  const bad = await api('POST', '/api/refinery', { token: t, body: { station: 'Nowhere', ore: 'Iron', modifier: 1 } });
  assert.equal(bad.status, 400);
  assert.equal((await api('POST', '/api/refinery', { token: t, body: { station: 'ARC-L9 Test', ore: 'Iron', modifier: 'abc' } })).status, 400);
  assert.equal((await api('POST', '/api/refinery', { token: t, body: { station: 'ARC-L9 Test', ore: 'Iron', modifier: 500 } })).status, 400);

  const created = await api('POST', '/api/refinery', { token: t, body: { station: 'ARC-L9 Test', ore: 'Iron', modifier: 4.5 } });
  assert.equal(created.status, 201);

  // Renaming a station must carry its refinery rows along (regression: FK violation)
  const renamed = await api('PUT', '/api/stations/' + encodeURIComponent('ARC-L9 Test'), { token: t, body: { newName: 'ARC-L9 Renamed', system: 'Stanton' } });
  assert.equal(renamed.status, 200);
  const rows = (await api('GET', '/api/refinery')).data;
  assert.ok(rows.some(r => r.id === created.data.id && r.station === 'ARC-L9 Renamed'));
  assert.equal((await api('PUT', '/api/stations/Missing', { token: t, body: { system: 'Stanton' } })).status, 404);

  const upd = await api('PUT', '/api/refinery/' + created.data.id, { token: t, body: { station: 'ARC-L9 Renamed', ore: 'Iron', modifier: -2 } });
  assert.equal(upd.status, 200);

  assert.equal((await api('DELETE', '/api/stations/' + encodeURIComponent('ARC-L9 Renamed'), { token: t })).status, 204);
  assert.ok(!(await api('GET', '/api/refinery')).data.some(r => r.id === created.data.id));
});

test('resources keep their location and survive body renames', async () => {
  const t = admin.token;
  await api('POST', '/api/bodies', { token: t, body: { name: 'Testoon', system: 'Stanton' } });
  assert.equal((await api('POST', '/api/resources', { token: t, body: { name: 'X', parentBody: 'Nope' } })).status, 400);
  const r = await api('POST', '/api/resources', { token: t, body: {
    name: 'Testium', type: 'Hand Mineable', location: 'Cave 7', parentBody: 'Testoon', methods: ['hand'], rarity: 'Rare', yield: 'High', description: 'd', tips: 't',
  } });
  assert.equal(r.status, 201);
  let list = (await api('GET', '/api/resources')).data;
  const found = list.find(x => x.id === r.data.id);
  assert.equal(found.location, 'Cave 7');
  assert.deepEqual(found.methods, ['hand']);

  assert.equal((await api('PUT', '/api/bodies/Testoon', { token: t, body: { newName: 'Testoon II', system: 'Stanton' } })).status, 200);
  list = (await api('GET', '/api/resources')).data;
  assert.equal(list.find(x => x.id === r.data.id).parentBody, 'Testoon II');
  assert.equal((await api('DELETE', '/api/bodies/' + encodeURIComponent('Testoon II'), { token: t })).status, 204);
  assert.ok(!(await api('GET', '/api/resources')).data.some(x => x.id === r.data.id));
});

test('profile updates: owner only, validated, role changes take effect immediately', async () => {
  const own = await api('PUT', '/api/users/' + operator.id, { token: operator.token, body: { callsign: 'Ace Pilot', bio: 'hello' } });
  assert.equal(own.status, 200);
  assert.equal(own.data.callsign, 'Ace Pilot');
  assert.equal((await api('PUT', '/api/users/' + admin.id, { token: operator.token, body: { bio: 'hax' } })).status, 403);
  assert.equal((await api('PUT', '/api/users/' + operator.id, { token: operator.token, body: { bio: 'x'.repeat(500) } })).status, 400);
  assert.equal((await api('PUT', '/api/users/' + operator.id, { token: operator.token, body: { password: 'tiny' } })).status, 400);
  assert.equal((await api('PUT', '/api/users/usr-missing', { token: admin.token, body: { bio: 'x' } })).status, 404);

  // An operator cannot promote themselves…
  assert.equal((await api('PUT', `/api/users/${operator.id}/admin`, { token: operator.token, body: { role: 'admin' } })).status, 403);
  // …but an admin can, and the operator's *existing* token then works as admin straight away.
  assert.equal((await api('PUT', `/api/users/${operator.id}/admin`, { token: admin.token, body: { role: 'admin', clearance: 'DIRECTOR' } })).status, 200);
  assert.equal((await api('GET', '/api/admin/download-db', { token: operator.token })).status, 200);
  // Demote again; the old token must lose its powers immediately.
  assert.equal((await api('PUT', `/api/users/${operator.id}/admin`, { token: admin.token, body: { role: 'operator' } })).status, 200);
  assert.equal((await api('POST', '/api/stations', { token: operator.token, body: { name: 'Nope' } })).status, 403);
  assert.equal((await api('PUT', `/api/users/${operator.id}/admin`, { token: admin.token, body: { clearance: 'GOD' } })).status, 400);
  assert.equal((await api('PUT', `/api/users/usr-missing/admin`, { token: admin.token, body: { role: 'admin' } })).status, 404);
});

test('the last administrator cannot be demoted', async () => {
  const r = await api('PUT', `/api/users/${admin.id}/admin`, { token: admin.token, body: { role: 'operator' } });
  assert.equal(r.status, 400);
});

test('network status is validated and the settings API is allow-listed', async () => {
  const t = admin.token;
  assert.equal((await api('POST', '/api/settings', { token: t, body: { key: 'seeded', value: 'x' } })).status, 400);
  assert.equal((await api('POST', '/api/settings', { token: t, body: { key: 'network_status', value: '{"info":"EXPLODED"}' } })).status, 400);
  assert.equal((await api('POST', '/api/settings', { token: t, body: { key: 'network_status', value: JSON.stringify({ info: 'MAINTENANCE', refinery: 'ACTIVE' }) } })).status, 201);
  assert.equal(JSON.parse((await api('GET', '/api/settings/network_status')).data.value).info, 'MAINTENANCE');
  assert.equal((await api('GET', '/api/settings/seeded')).data.value, null);
});

test('bulletins and roadmap validate input and log automated reports', async () => {
  const t = admin.token;
  assert.equal((await api('POST', '/api/bulletins', { token: t, body: { content: '' } })).status, 400);
  assert.equal((await api('POST', '/api/bulletins', { token: t, body: { content: 'Hi', type: 'weird' } })).status, 400);
  assert.equal((await api('POST', '/api/bulletins', { token: t, body: { content: 'Hello fleet', type: 'announcement' } })).status, 201);
  assert.ok((await api('GET', '/api/bulletins')).data.some(b => b.content === 'Hello fleet'));

  assert.equal((await api('POST', '/api/roadmap', { token: t, body: { description: 'no title' } })).status, 400);
  assert.equal((await api('POST', '/api/roadmap', { token: t, body: { title: 'T', status: 'DONE' } })).status, 400);
  const m = await api('POST', '/api/roadmap', { token: t, body: { title: 'Ship it', status: 'IN DEVELOPMENT' } });
  assert.equal(m.status, 201);
  assert.equal((await api('PUT', '/api/roadmap/' + m.data.id, { token: t, body: { title: 'Ship it', status: 'RELEASED' } })).status, 200);
  assert.equal((await api('PUT', '/api/roadmap/missing', { token: t, body: { title: 'x' } })).status, 404);
  assert.equal((await api('DELETE', '/api/roadmap/' + m.data.id, { token: t })).status, 204);
});

test('login is rate limited per account', async () => {
  let last;
  for (let i = 0; i < 17; i++) last = await api('POST', '/api/auth/login', { body: { username: 'ratelimited', password: 'nope-nope' } });
  assert.equal(last.status, 429);
});

test('purge clears intelligence data but keeps accounts', async () => {
  assert.equal((await api('DELETE', '/api/purge', { token: admin.token })).status, 204);
  assert.equal((await api('GET', '/api/refinery')).data.length, 0);
  assert.equal((await api('GET', '/api/stations')).data.length, 0);
  assert.ok((await api('GET', '/api/users')).data.length >= 2);
});
