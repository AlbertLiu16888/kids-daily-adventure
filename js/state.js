// Profile-aware localStorage state.
//
// All gameplay keys are suffixed by the active profile id (sanbei/wangwang)
// so 仙貝 and 旺旺龍 keep separate progress on the same device.
// After every write we kick off a debounced cloud push so other devices
// pull the latest snapshot when they open the same profile.
//
// Settings (bgm / sfx / voice / vibration) intentionally stay device-local
// — different devices may have different audio/haptic preferences.

import { nsKey, getActiveProfile } from './profile.js';
import { schedulePush } from './cloud.js';

const K_CANDIES        = 'kda_candies';
const K_SETTINGS       = 'kda_settings';   // device-local, not namespaced
const K_FEED           = 'kda_feed';        // pet-feed inventory (count)
const K_DAILY_REWARDS  = 'kda_daily_rewards'; // record of which locations claimed daily reward

function syncAfterWrite() {
  const a = getActiveProfile();
  if (a) schedulePush(a.id);
}

function read(baseKey, fallback) {
  try {
    const raw = localStorage.getItem(nsKey(baseKey));
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function write(baseKey, value) {
  localStorage.setItem(nsKey(baseKey), JSON.stringify(value));
  syncAfterWrite();
}

// --- date helpers ---
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function todayKey() {
  // Per-day done-task list — namespaced by profile via the read/write helpers.
  return `kda_daily_${todayStr()}`;
}

// --- candies ---
function defaultCandies() {
  return { green:0, yellow:0, orange:0, blue:0, red:0, purple:0, pink:0, teal:0 };
}
export function getCandies() {
  const c = read(K_CANDIES, null);
  return c && typeof c === 'object' ? Object.assign(defaultCandies(), c) : defaultCandies();
}
export function addCandy(color) {
  const c = getCandies();
  c[color] = (c[color]||0) + 1;
  write(K_CANDIES, c);
  return c;
}

// --- daily done-tasks ---
export function getDoneToday() {
  const v = read(todayKey(), []);
  return Array.isArray(v) ? v : [];
}
export function markDone(taskId) {
  const done = getDoneToday();
  if (!done.includes(taskId)) done.push(taskId);
  write(todayKey(), done);
  return done;
}
export function isDoneToday(taskId) {
  return getDoneToday().includes(taskId);
}

// Wipe a set of task IDs from today's done-list — used when the kid re-enters
// a location after the daily reward is already claimed, so the tasks become
// playable again for the feed-reward path.
export function resetTasksForReplay(taskIds) {
  const done = getDoneToday();
  const set = new Set(taskIds);
  const next = done.filter(id => !set.has(id));
  if (next.length !== done.length) write(todayKey(), next);
  return next;
}

// --- settings (device-local, NOT namespaced) ---
function defaultSettings() {
  return { bgm: true, sfx: true, voice: true, vibration: true };
}
export function getSettings() {
  try {
    return Object.assign(defaultSettings(), JSON.parse(localStorage.getItem(K_SETTINGS)) || {});
  } catch { return defaultSettings(); }
}
export function setSetting(k, v) {
  const s = getSettings();
  s[k] = v;
  localStorage.setItem(K_SETTINGS, JSON.stringify(s));
  return s;
}

// --- pet feed inventory ---
// Earned by replaying a location after the daily reward has already been claimed.
// Spent in the pet view to bump friendship + trigger cute reactions.
export function getFeed() {
  const v = read(K_FEED, 0);
  return typeof v === 'number' ? v : 0;
}
export function addFeed(n = 1) {
  const next = Math.max(0, getFeed() + n);
  write(K_FEED, next);
  return next;
}
export function spendFeed(n = 1) {
  const cur = getFeed();
  if (cur < n) return false;
  write(K_FEED, cur - n);
  return true;
}

// --- daily-reward gating per location ---
// Stored as { 'YYYY-MM-DD': { [locId]: true } } so it self-prunes when the
// date changes (we only ever look at today's bucket).
export function hasClaimedDailyReward(locId) {
  const all = read(K_DAILY_REWARDS, {});
  const day = all[todayStr()];
  return !!(day && day[locId]);
}
export function markDailyRewardClaimed(locId) {
  const all = read(K_DAILY_REWARDS, {});
  const day = all[todayStr()] || {};
  day[locId] = true;
  // Drop any older days to keep the blob lean.
  const next = { [todayStr()]: day };
  write(K_DAILY_REWARDS, next);
}
