// Cross-device cloud sync via a single anonymous JsonBlob document.
//
// Architecture:
//   - One JsonBlob holds an object: { sanbei: {...local snapshot...}, wangwang: {...} }
//   - The blob ID is a constant baked into the source so any device opening
//     this build syncs against the same data. The ID is treated as a shared
//     family secret — anyone who knows the URL pattern *could* read kid
//     candy counts, which is fine for this use case.
//   - On profile select: pull → merge into localStorage (cloud wins on key
//     conflicts because it's the most recent across all devices).
//   - On state change: debounced push of the active profile slice.
//   - Offline: localStorage continues working. Next online push flushes.

const BLOB_ID = '019dc382-9692-792c-804d-63d8f36635d0';
const BLOB_URL = `https://jsonblob.com/api/jsonBlob/${BLOB_ID}`;

// Keys that get synced. Anything not in this list stays local-only.
const SYNCED_KEYS = [
  'kda_candies',
  'kda_eggs',
  'kda_pets',
  'kda_pets_daily',
  'kda_feed',           // pet-feed inventory (added in v2.2)
  'kda_daily_rewards',  // record of which daily rewards were claimed
];

// Settings are device-local on purpose — different devices may have different
// audio/haptic/voice preferences.

let lastPushed = '';
let pushTimer = 0;
let listeners = new Set();

export function onSyncChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(state) { for (const fn of listeners) try { fn(state); } catch {} }

async function fetchAll() {
  const r = await fetch(BLOB_URL, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}

async function putAll(all) {
  const r = await fetch(BLOB_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(all),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

// Pull the latest snapshot and merge into localStorage for the given profile.
// Returns 'ok' | 'no-data' | 'fail'.
export async function pullProfile(profileId) {
  emit('pulling');
  try {
    const all = await fetchAll();
    const slice = all && all[profileId];
    if (!slice || typeof slice !== 'object') {
      emit('no-cloud-data');
      return 'no-data';
    }
    for (const key of SYNCED_KEYS) {
      if (key in slice) {
        const value = slice[key];
        // Stored as object/array directly, but localStorage wants a string
        localStorage.setItem(`${key}__${profileId}`, JSON.stringify(value));
      }
    }
    emit('synced');
    return 'ok';
  } catch (e) {
    console.warn('[cloud] pull failed:', e.message);
    emit('offline');
    return 'fail';
  }
}

// Build the current profile slice from localStorage and write it to the cloud.
async function pushNow(profileId) {
  emit('pushing');
  const slice = {};
  for (const key of SYNCED_KEYS) {
    const raw = localStorage.getItem(`${key}__${profileId}`);
    if (raw === null) continue;
    try { slice[key] = JSON.parse(raw); } catch { /* skip malformed */ }
  }
  slice._updatedAt = new Date().toISOString();
  // Read-modify-write to preserve other profiles' slices.
  let all = {};
  try { all = await fetchAll(); } catch {}
  if (typeof all !== 'object' || all === null) all = {};
  all[profileId] = slice;
  const serialized = JSON.stringify(all);
  if (serialized === lastPushed) {
    emit('synced');
    return;
  }
  try {
    await putAll(all);
    lastPushed = serialized;
    emit('synced');
  } catch (e) {
    console.warn('[cloud] push failed:', e.message);
    emit('offline');
  }
}

// Debounced push so flurries of state writes (e.g. completing a task chain)
// only result in a single network request.
export function schedulePush(profileId, ms = 1500) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushTimer = 0; pushNow(profileId); }, ms);
}

// Force-push immediately (e.g. on screen change or before unload).
export async function flushPush(profileId) {
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = 0; }
  await pushNow(profileId);
}
