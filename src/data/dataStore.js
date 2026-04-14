// ═══════════════════════════════════════════════════
// YŪGEN — Data Store
// Persistent SQLite Backend Proxy
// ═══════════════════════════════════════════════════

const BASE_URL = '/api';

// ── Session & Auth Helpers ──
export function getSession() {
  try {
    const raw = localStorage.getItem('yugen_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setSession(user) {
  const current = getSession();
  // Ensure we don't lose the token if the server response doesn't include it (e.g. on profile update)
  const sessionData = { ...user };
  if (!sessionData.token && current?.token) {
    sessionData.token = current.token;
  }
  localStorage.setItem('yugen_session', JSON.stringify(sessionData));
}

export function clearSession() {
  localStorage.removeItem('yugen_session');
}

function getAuthHeaders() {
  const session = getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session?.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }
  return headers;
}

// ── Legacy Cleanup ──
export function cleanLegacyStorage() {
  localStorage.removeItem('yugen_refinery_data');
  localStorage.removeItem('yugen_resource_data');
  localStorage.removeItem('yugen_stations_data');
  localStorage.removeItem('yugen_personnel_data');
}

// ── Stations Data ──
export async function getStations(systemFilter = null) {
  try {
    let url = `${BASE_URL}/stations`;
    if (systemFilter) url += `?system=${systemFilter}`;
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    console.error('Data Uplink Error:', e);
    return [];
  }
}

export async function addStation(entry) {
  const res = await fetch(`${BASE_URL}/stations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(entry)
  });
  return await res.json();
}

export async function deleteStation(name) {
  await fetch(`${BASE_URL}/stations/${name}`, { 
    method: 'DELETE',
    headers: getAuthHeaders()
  });
}

// ── Refinery Data ──
export async function getRefineryData(systemFilter = null) {
  try {
    let url = `${BASE_URL}/refinery`;
    if (systemFilter) url += `?system=${systemFilter}`;
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    console.error('Data Uplink Error:', e);
    return [];
  }
}

export async function addRefineryEntry(entry) {
  const res = await fetch(`${BASE_URL}/refinery`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(entry)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Server rejected synchronization');
  return data;
}

export async function deleteRefineryEntry(id) {
  await fetch(`${BASE_URL}/refinery/${id}`, { 
    method: 'DELETE',
    headers: getAuthHeaders()
  });
}

// ── Personnel Data ──
export async function getPersonnelData() {
  try {
    const res = await fetch(`${BASE_URL}/personnel`);
    return await res.json();
  } catch (e) {
    console.error('Data Uplink Error:', e);
    return [];
  }
}

// ── Resource Data ──
export async function getResourceData(systemFilter = null) {
  try {
    let url = `${BASE_URL}/resources`;
    if (systemFilter) url += `?system=${systemFilter}`;
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    console.error('Data Uplink Error:', e);
    return [];
  }
}

// ── Resource Bodies ──
export async function getBodies() {
  try {
    const res = await fetch(`${BASE_URL}/bodies`);
    return await res.json();
  } catch (e) { console.error('Bodies fetch error:', e); return []; }
}

export async function addBody(data) {
  const res = await fetch(`${BASE_URL}/bodies`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  return await res.json();
}

export async function updateBody(name, data) {
  const res = await fetch(`${BASE_URL}/bodies/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  return await res.json();
}

export async function deleteBody(name) {
  await fetch(`${BASE_URL}/bodies/${encodeURIComponent(name)}`, { 
    method: 'DELETE',
    headers: getAuthHeaders()
  });
}

export async function addResourceEntry(entry) {
  const res = await fetch(`${BASE_URL}/resources`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(entry)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Server rejected synchronization');
  return data;
}

export async function deleteResourceEntry(id) {
  await fetch(`${BASE_URL}/resources/${id}`, { 
    method: 'DELETE',
    headers: getAuthHeaders()
  });
}

// ── Update Functions ──
export async function updateStation(name, data) {
  const res = await fetch(`${BASE_URL}/stations/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  return await res.json();
}

export async function updateRefineryEntry(id, data) {
  const res = await fetch(`${BASE_URL}/refinery/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  return await res.json();
}

export async function updateResourceEntry(id, data) {
  const res = await fetch(`${BASE_URL}/resources/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  return await res.json();
}

// ── Network Status (NAC) ──
export async function getNetworkStatus() {
  const res = await fetch(`${BASE_URL}/settings/network_status`);
  const data = await res.json();
  try {
    return data.value ? JSON.parse(data.value) : { info: 'ACTIVE', refinery: 'ACTIVE', resources: 'ACTIVE' };
  } catch {
    return { info: 'ACTIVE', refinery: 'ACTIVE', resources: 'ACTIVE' };
  }
}

export async function updateNetworkStatus(statusObj) {
  await fetch(`${BASE_URL}/settings`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ key: 'network_status', value: JSON.stringify(statusObj) })
  });
}

// ── User Authentication ──
export async function registerUser(username, password, callsign) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, callsign })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  return data;
}

export async function loginUser(username, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export async function getUserProfile(username) {
  const res = await fetch(`${BASE_URL}/users/${encodeURIComponent(username)}`);
  if (res.status === 204) return true;
  return res.json();
}

// ── 8. Roadmap ──
export async function getRoadmap() {
  return fetchApi('/api/roadmap');
}

export async function addRoadmapItem(item) {
  return fetchApi('/api/roadmap', {
    method: 'POST',
    body: JSON.stringify(item)
  });
}

export async function updateRoadmapItem(id, item) {
  return fetchApi(`/api/roadmap/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function deleteRoadmapItem(id) {
  return fetchApi(`/api/roadmap/${id}`, {
    method: 'DELETE'
  });
}

export async function getAllUsers() {
  const res = await fetch(`${BASE_URL}/users`);
  return await res.json();
}

export async function updateUserProfile(id, data) {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Update failed');
  return result;
}

export async function updateUserAdmin(id, data) {
  const res = await fetch(`${BASE_URL}/users/${id}/admin`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  return await res.json();
}

// ── Bulletins & System Updates ──
export async function getBulletins() {
  try {
    const res = await fetch(`${BASE_URL}/bulletins`);
    return await res.json();
  } catch (e) { console.error('Bulletin fetch error:', e); return []; }
}

export async function addBulletin(data) {
  const res = await fetch(`${BASE_URL}/bulletins`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to post bulletin');
  }
}

export async function deleteBulletin(id) {
  await fetch(`${BASE_URL}/bulletins/${id}`, { 
    method: 'DELETE',
    headers: getAuthHeaders()
  });
}

// ── Quality of Life Data Purge ──
export async function resetAllData() {
  await fetch(`${BASE_URL}/purge`, { 
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  window.location.reload();
}

// ── Utility: Generate system ID ──
export function generateSystemId() {
  const chars = '0123456789ABCDEF';
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * 16)];
    if (i === 3 || i === 7) id += '-';
  }
  return id;
}

// ── Utility: In-universe timestamp ──
export function getUniverseTime() {
  const now = new Date();
  const year = now.getFullYear() + 930;
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${year}.${month}.${day} // ${h}:${m}:${s} SET`;
}
