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

// ── Uplink status (lets the shell show an offline banner) ──
let uplinkOnline = true;
const uplinkListeners = new Set();
function setUplink(online) {
  if (online === uplinkOnline) return;
  uplinkOnline = online;
  uplinkListeners.forEach((fn) => fn(online));
}
export function subscribeUplink(fn) {
  uplinkListeners.add(fn);
  return () => uplinkListeners.delete(fn);
}
export const getUplinkStatus = () => uplinkOnline;

export const SESSION_EXPIRED_EVENT = 'yugen:session-expired';

// ── Internal Fetch Wrapper ──
async function fetchApi(endpoint, options = {}) {
  // Ensure we don't double-prefix /api
  const cleanPath = endpoint.startsWith(BASE_URL) ? endpoint.slice(BASE_URL.length) : endpoint;
  const url = cleanPath.startsWith('http') ? cleanPath : `${BASE_URL}${cleanPath}`;

  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {})
      }
    });
  } catch {
    setUplink(false);
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }
  setUplink(true);

  if (res.status === 204) return true;
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON body (proxy error page, etc.) */ }

  if (!res.ok) {
    // A rejected token on an authenticated request means the session is stale → sign the user out.
    if (res.status === 403 && getSession()?.token && /session/i.test(data?.error || '')) {
      clearSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new Error(data?.error || (res.status >= 500 ? 'The server hit a problem. Please try again.' : 'Request failed'));
  }
  return data;
}

const withSystem = (path, system) => (system ? `${path}?system=${encodeURIComponent(system)}` : path);

// ── Stations Data ──
export async function getStations(systemFilter = null) {
  return fetchApi(withSystem('/stations', systemFilter)).catch(e => {
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
  return fetchApi(withSystem('/refinery', systemFilter)).catch(e => {
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

// ── Resource Data ──
export async function getResourceData(systemFilter = null) {
  return fetchApi(withSystem('/resources', systemFilter)).catch(e => {
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

/** Like getUserProfile but throws, so callers can tell "deleted" (404) from "offline". */
export async function fetchUserProfileStrict(username) {
  return fetchApi(`/users/${encodeURIComponent(username)}`);
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
  await fetchApi('/purge', { method: 'DELETE' });
  window.location.reload();
}
