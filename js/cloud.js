// Cross-device cloud sync via a single anonymous JsonBlob document.
//
// Architecture:
//   - One JsonBlob holds an object: { sanbei: {...local snapshot...}, wangwang: {...} }
//   - The blob ID is a constant baked into the source so any device opening
//     this build syncs against the same data. The ID is treated as a shared
//     family secret — anyone who knows the URL pattern *could* read kid
//     candy counts, which is fine for this use case.
//   - On profile select: pull → compare timestamps → either apply cloud to
//     local (cloud is newer) or push local up (local is newer / cloud stale).
//     We also snapshot pre-pull localStorage to a recovery key so an
//     accidental overwrite is reversible.
//   - On state change: debounced push of the active profile slice.
//   - Offline: localStorage continues working. Next online push flushes.
//
// v2.5 (data-preservation hardening):
//   - markLocalDirty() stamps `kda_local_updated_at__{id}` whenever a
//     namespaced state key is written. We compare it to the cloud slice's
//     own `_updatedAt` on pull — if local is strictly newer, we push instead
//     of letting stale cloud data clobber unsynced offline progress.
//   - snapshotLocal() copies all synced keys into `kda_local_snapshot__{id}`
//     before any cloud-overwrite, so the previous local state can be
//     restored from the console (window.kdaRestoreSnapshot) if needed.

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

const localUpdatedKey  = id => `kda_local_updated_at__${id}`;
const localSnapshotKey = id => `kda_local_snapshot__${id}`;

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

// Stamp the local-dirty timestamp for a profile. Called by every namespaced
// state writer (state.js, pets.js, app.js direct writes) so pullProfile can
// decide whether the cloud or local copy is newer.
export function markLocalDirty(profileId) {
  if (!profileId) return;
  try { localStorage.setItem(localUpdatedKey(profileId), new Date().toISOString()); } catch {}
}

// Snapshot every synced key for the profile so a pull-overwrite is
// reversible. Stored as a single JSON object alongside live state.
function snapshotLocal(profileId) {
  try {
    const snap = { _takenAt: new Date().toISOString() };
    for (const key of SYNCED_KEYS) {
      const raw = localStorage.getItem(`${key}__${profileId}`);
      if (raw !== null) snap[key] = raw;
    }
    localStorage.setItem(localSnapshotKey(profileId), JSON.stringify(snap));
  } catch (e) {
    console.warn('[cloud] snapshot failed:', e.message);
  }
}

// Restore the most recent pre-pull snapshot. Exposed via window.kdaRestoreSnapshot
// for manual recovery from the console.
export function restoreSnapshot(profileId) {
  try {
    const raw = localStorage.getItem(localSnapshotKey(profileId));
    if (!raw) return { ok: false, reason: 'no-snapshot' };
    const snap = JSON.parse(raw);
    if (!snap || typeof snap !== 'object') return { ok: false, reason: 'malformed' };
    let restored = 0;
    for (const key of SYNCED_KEYS) {
      if (key in snap && typeof snap[key] === 'string') {
        localStorage.setItem(`${key}__${profileId}`, snap[key]);
        restored++;
      }
    }
    markLocalDirty(profileId);
    return { ok: true, restored, takenAt: snap._takenAt };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

// Pull the latest snapshot and merge into localStorage for the given profile.
// Returns 'ok' | 'no-data' | 'fail'.
export async function pullProfile(profileId) {
  emit('pulling');
  try {
    const all = await fetchAll();
    const slice = all && all[profileId];
    const localUpdated = localStorage.getItem(localUpdatedKey(profileId)) || '';

    if (!slice || typeof slice !== 'object') {
      // Cloud has no record for this profile yet. If we already have local
      // play data, push it up so this device seeds the cloud — otherwise
      // it'd silently lose its head start the moment another device pushes.
      if (localUpdated) {
        await pushNow(profileId);
        return 'ok';
      }
      emit('no-cloud-data');
      return 'no-data';
    }

    const cloudUpdated = slice._updatedAt || '';
    if (localUpdated && localUpdated > cloudUpdated) {
      // Local is strictly newer than cloud — most likely this device played
      // offline since the last successful push. Pushing now preserves that
      // progress instead of letting a stale cloud snapshot overwrite it.
      console.info('[cloud] local newer than cloud (', localUpdated, '>', cloudUpdated, '), pushing instead of pulling');
      await pushNow(profileId);
      return 'ok';
    }

    // Cloud is newer (or tied) — apply to local. Snapshot first so the
    // previous local state stays recoverable.
    snapshotLocal(profileId);
    for (const key of SYNCED_KEYS) {
      if (key in slice) {
        const value = slice[key];
        // Stored as object/array directly, but localStorage wants a string
        localStorage.setItem(`${key}__${profileId}`, JSON.stringify(value));
      }
    }
    // Align local timestamp with cloud so the next pull sees them as in-sync.
    if (cloudUpdated) {
      localStorage.setItem(localUpdatedKey(profileId), cloudUpdated);
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
