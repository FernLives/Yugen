// ═══════════════════════════════════════════════════
// AUXNET — Data Store
// Persistent SQLite Backend Proxy
// ═══════════════════════════════════════════════════

const BASE_URL = '/api';

// ── Legacy Cleanup ──
// Remove any leftover localStorage keys from the pre-SQLite era.
// We do NOT push this data into the DB — if the user purged, it should stay purged.
export function cleanLegacyStorage() {
  localStorage.removeItem('auxnet_refinery_data');
  localStorage.removeItem('auxnet_resource_data');
  localStorage.removeItem('auxnet_stations_data');
  localStorage.removeItem('auxnet_personnel_data');
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  });
  return await res.json();
}

export async function deleteStation(name) {
  await fetch(`${BASE_URL}/stations/${name}`, { method: 'DELETE' });
}

// ── Refinery Data ──
export async function getRefineryData(systemFilter = null) {
  try {
    let url = `${BASE_URL}/refinery`;
    if (systemFilter) url += `?system=${systemFilter}`;
    
    const res = await fetch(url);
    const data = await res.json();
    return data;
  } catch (e) {
    console.error('Data Uplink Error:', e);
    return [];
  }
}

export async function addRefineryEntry(entry) {
  const res = await fetch(`${BASE_URL}/refinery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  });
  return await res.json();
}

export async function deleteRefineryEntry(id) {
  await fetch(`${BASE_URL}/refinery/${id}`, { method: 'DELETE' });
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
    const data = await res.json();
    return data;
  } catch (e) {
    console.error('Data Uplink Error:', e);
    return [];
  }
}

export async function addResourceEntry(entry) {
  const res = await fetch(`${BASE_URL}/resources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  });
  return await res.json();
}

export async function deleteResourceEntry(id) {
  await fetch(`${BASE_URL}/resources/${id}`, { method: 'DELETE' });
}

// ── Update Functions ──
export async function updateStation(name, data) {
  const res = await fetch(`${BASE_URL}/stations/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
}

export async function updateRefineryEntry(id, data) {
  const res = await fetch(`${BASE_URL}/refinery/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
}

export async function updateResourceEntry(id, data) {
  const res = await fetch(`${BASE_URL}/resources/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
}

// ── Admin PIN ──
export async function getAdminPin() {
  try {
    const res = await fetch(`${BASE_URL}/settings/admin_pin`);
    const { value } = await res.json();
    return value || import.meta.env.VITE_ADMIN_PIN || 'SEC-NODATA-7X29';
  } catch (e) {
    return import.meta.env.VITE_ADMIN_PIN || 'SEC-NODATA-7X29';
  }
}

export async function setAdminPin(pin) {
  await fetch(`${BASE_URL}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'admin_pin', value: pin })
  });
}

export async function verifyAdminPin(input) {
  try {
    const res = await fetch(`${BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: input })
    });
    const { authorized } = await res.json();
    return authorized;
  } catch (e) {
    console.error('Auth Uplink Error:', e);
    return false;
  }
}

// ── Quality of Life Data Purge ──
export async function resetAllData() {
  await fetch(`${BASE_URL}/purge`, { method: 'DELETE' });
  // Reloading helps the admin UI reflect the purged state instantly
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
