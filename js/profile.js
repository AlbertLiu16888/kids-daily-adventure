// Profile system: 仙貝 / 旺旺龍 — namespaces every piece of localStorage so the
// two kids' progress never collide on the same device. Each profile also has
// a stable id used as a key in the cloud blob.

export const PROFILES = {
  sanbei:   { id: 'sanbei',   name: '仙貝',   gender: 'girl', age: 3.5, avatar: 'assets/images/animals/char_sanbei.png',   emoji: '👧', color: '#ff8ec0' },
  wangwang: { id: 'wangwang', name: '旺旺龍', gender: 'boy',  age: 2,   avatar: 'assets/images/animals/char_wangwang.png', emoji: '👦', color: '#9dd6ff' },
};

const K_ACTIVE = 'kda_active_profile';

let active = null;

export function getActiveProfile() {
  if (active) return active;
  const id = localStorage.getItem(K_ACTIVE);
  if (id && PROFILES[id]) {
    active = PROFILES[id];
    return active;
  }
  return null;
}

export function setActiveProfile(id) {
  if (!PROFILES[id]) throw new Error(`unknown profile: ${id}`);
  active = PROFILES[id];
  localStorage.setItem(K_ACTIVE, id);
  return active;
}

// Wraps any base storage key into a profile-namespaced one. Falls back to the
// bare key when there's no active profile yet (e.g. before splash select).
export function nsKey(baseKey) {
  const a = getActiveProfile();
  return a ? `${baseKey}__${a.id}` : baseKey;
}
