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

// ── Internal Fetch Wrapper ──
async function fetchApi(endpoint, options = {}) {
  // Ensure we don't double-prefix /api
  const cleanPath = endpoint.startsWith(BASE_URL) ? endpoint.slice(BASE_URL.length) : endpoint;
  const url = cleanPath.startsWith('http') ? cleanPath : `${BASE_URL}${cleanPath}`;
  
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  });
  if (res.status === 204) return true;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Uplink synchronization failed');
  return data;
}

// ── Stations Data ──
export async function getStations(systemFilter = null) {
  let url = '/stations';
  if (systemFilter) url += `?system=${systemFilter}`;
  return fetchApi(url).catch(e => {
    console.error('Stations fetch error:', e);
    return [];
  });
}

export async function addStation(entry) {
  return fetchApi('/stations', {
    method: 'POST',
    body: JSON.stringify(entry)
  });
}

export async function deleteStation(name) {
  return fetchApi(`/stations/${encodeURIComponent(name)}`, { 
    method: 'DELETE'
  });
}

// ── Refinery Data ──
export async function getRefineryData(systemFilter = null) {
  let url = '/refinery';
  if (systemFilter) url += `?system=${systemFilter}`;
  return fetchApi(url).catch(e => {
    console.error('Refinery fetch error:', e);
    return [];
  });
}

export async function addRefineryEntry(entry) {
  return fetchApi('/refinery', {
    method: 'POST',
    body: JSON.stringify(entry)
  });
}

export async function deleteRefineryEntry(id) {
  return fetchApi(`/refinery/${id}`, { 
    method: 'DELETE'
  });
}

// ── Personnel Data ──
export async function getPersonnelData() {
  return fetchApi('/personnel').catch(e => {
    console.error('Personnel fetch error:', e);
    return [];
  });
}

// ── Resource Data ──
export async function getResourceData(systemFilter = null) {
  let url = '/resources';
  if (systemFilter) url += `?system=${systemFilter}`;
  return fetchApi(url).catch(e => {
    console.error('Resources fetch error:', e);
    return [];
  });
}

// ── Resource Bodies ──
export async function getBodies() {
  return fetchApi('/bodies').catch(e => {
    console.error('Bodies fetch error:', e);
    return [];
  });
}

export async function addBody(data) {
  return fetchApi('/bodies', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateBody(name, data) {
  return fetchApi(`/bodies/${encodeURIComponent(name)}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteBody(name) {
  return fetchApi(`/bodies/${encodeURIComponent(name)}`, { 
    method: 'DELETE'
  });
}

export async function addResourceEntry(entry) {
  return fetchApi('/resources', {
    method: 'POST',
    body: JSON.stringify(entry)
  });
}

export async function deleteResourceEntry(id) {
  return fetchApi(`/resources/${id}`, { 
    method: 'DELETE'
  });
}

// ── Update Functions ──
export async function updateStation(name, data) {
  return fetchApi(`/stations/${encodeURIComponent(name)}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function updateRefineryEntry(id, data) {
  return fetchApi(`/refinery/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function updateResourceEntry(id, data) {
  return fetchApi(`/resources/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

// ── Network Status (NAC) ──
export async function getNetworkStatus() {
  return fetchApi('/settings/network_status').then(data => {
    try {
      return data.value ? JSON.parse(data.value) : { info: 'ACTIVE', refinery: 'ACTIVE', resources: 'ACTIVE' };
    } catch {
      return { info: 'ACTIVE', refinery: 'ACTIVE', resources: 'ACTIVE' };
    }
  }).catch(() => ({ info: 'ACTIVE', refinery: 'ACTIVE', resources: 'ACTIVE' }));
}

export async function updateNetworkStatus(statusObj) {
  return fetchApi('/settings', {
    method: 'POST',
    body: JSON.stringify({ key: 'network_status', value: JSON.stringify(statusObj) })
  });
}

// ── User Authentication ──
export async function registerUser(username, password, callsign) {
  return fetchApi('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, callsign })
  });
}

export async function loginUser(username, password) {
  return fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function getUserProfile(username) {
  return fetchApi(`/users/${encodeURIComponent(username)}`).catch(e => {
    console.error('Profile fetch error:', e);
    return null;
  });
}

// ── 8. Roadmap ──
export async function getRoadmap() {
  return fetchApi('/roadmap').catch(e => {
    console.error('Roadmap fetch error:', e);
    return [];
  });
}

export async function addRoadmapItem(item) {
  return fetchApi('/roadmap', {
    method: 'POST',
    body: JSON.stringify(item)
  });
}

export async function updateRoadmapItem(id, item) {
  return fetchApi(`/roadmap/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function deleteRoadmapItem(id) {
  return fetchApi(`/roadmap/${id}`, {
    method: 'DELETE'
  });
}

export async function getAllUsers() {
  return fetchApi('/users').catch(e => {
    console.error('Users fetch error:', e);
    return [];
  });
}

export async function updateUserProfile(id, data) {
  return fetchApi(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function updateUserAdmin(id, data) {
  return fetchApi(`/users/${id}/admin`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

// ── Bulletins & System Updates ──
export async function getBulletins() {
  return fetchApi('/bulletins').catch(e => {
    console.error('Bulletin fetch error:', e);
    return [];
  });
}

export async function addBulletin(data) {
  return fetchApi('/bulletins', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function deleteBulletin(id) {
  return fetchApi(`/bulletins/${id}`, { 
    method: 'DELETE'
  });
}

// ── Quality of Life Data Purge ──
export async function resetAllData() {
  await fetchApi('/purge', { 
    method: 'DELETE'
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
