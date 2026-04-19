// Simple localStorage-based state
const K_CANDIES = 'kda_candies';
const K_SETTINGS = 'kda_settings';

export function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `kda_daily_${y}-${m}-${day}`;
}

export function getCandies() {
  try { return JSON.parse(localStorage.getItem(K_CANDIES)) || defaultCandies(); }
  catch { return defaultCandies(); }
}
function defaultCandies() {
  return { green:0, yellow:0, orange:0, blue:0, red:0, purple:0 };
}
export function addCandy(color) {
  const c = getCandies();
  c[color] = (c[color]||0)+1;
  localStorage.setItem(K_CANDIES, JSON.stringify(c));
  return c;
}

export function getDoneToday() {
  try { return JSON.parse(localStorage.getItem(todayKey())) || []; }
  catch { return []; }
}
export function markDone(taskId) {
  const done = getDoneToday();
  if (!done.includes(taskId)) done.push(taskId);
  localStorage.setItem(todayKey(), JSON.stringify(done));
  return done;
}
export function isDoneToday(taskId) {
  return getDoneToday().includes(taskId);
}

export function getSettings() {
  try {
    return Object.assign(defaultSettings(), JSON.parse(localStorage.getItem(K_SETTINGS)) || {});
  } catch { return defaultSettings(); }
}
function defaultSettings() {
  return { bgm: true, sfx: true, voice: true, vibration: true };
}
export function setSetting(k, v) {
  const s = getSettings();
  s[k] = v;
  localStorage.setItem(K_SETTINGS, JSON.stringify(s));
  return s;
}
