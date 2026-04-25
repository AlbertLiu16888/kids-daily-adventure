import { LOCATIONS, findLocation, findTask, LOCATION_EGG } from './scenes.js';
import {
  getCandies, addCandy, getDoneToday, markDone, isDoneToday,
  getSettings, setSetting,
  getFeed, addFeed, spendFeed,
  hasClaimedDailyReward, markDailyRewardClaimed,
  resetTasksForReplay,
} from './state.js';
import { makeDraggable } from './drag.js';
import {
  sfxTap, sfxSuccess, sfxCandy, sfxCuckoo,
  startBgm, stopBgm, speak,
} from './audio.js';
import { hapTap, hapSuccess, hapCandy } from './haptics.js';
import { TASK_DIALOG, PET_DAILY, dialogFor } from './dialogs.js';
import {
  PET_META, HATCH_NEEDS,
  getEggs, getPets, addEgg, interactEgg, interactPet, petDayIndex,
  eggCrackStage,
} from './pets.js';
import { PROFILES, getActiveProfile, setActiveProfile } from './profile.js';
import { pullProfile, flushPush, onSyncChange } from './cloud.js';
import { mountPet3D, unmountPet3D, wigglePet3D, setEggProgress } from './pet3d.js';

// --- Helpers ---
function $(sel, root=document) { return root.querySelector(sel); }
function $$(sel, root=document) { return Array.from(root.querySelectorAll(sel)); }
function show(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#'+id).classList.add('active');
}
// All locations are always open now (per kids' request — no time gating).
// We keep `loc.hours` only as a hint shown next to the chip.
function isOpen(_loc) { return true; }
function fmtHours(loc) {
  const [a,b] = loc.hours;
  const pad = n => String(n).padStart(2,'0');
  return `${pad(a)}:00–${pad(b)}:00`;
}

// --- Splash: profile select ---
let pendingProfile = null;

function syncStatus(state) {
  const el = $('#splash-cloud');
  if (!el) return;
  const map = {
    idle:           '',
    pulling:        '☁️ 正在從雲端讀取…',
    'no-cloud-data':'☁️ 雲端尚未有紀錄，將以本機開始',
    pushing:        '☁️ 同步中…',
    synced:         '☁️ 已同步',
    offline:        '📴 暫時離線（之後會自動同步）',
  };
  el.textContent = map[state] ?? '';
  el.dataset.state = state ?? '';
}

onSyncChange(syncStatus);
syncStatus('idle');

$$('#splash-chars .char-card').forEach(card => {
  card.addEventListener('click', async () => {
    const id = card.dataset.profile;
    if (!id) return;
    sfxTap(); hapTap();
    pendingProfile = id;
    // Selection ring effect
    $$('#splash-chars .char-card').forEach(c => c.classList.toggle('selected', c === card));
    $('#start-btn').disabled = true;
    $('#splash-hint').textContent = `${PROFILES[id].name} 你好！正在讀取雲端紀錄…`;
    setActiveProfile(id);
    // Pull cloud snapshot before letting them in
    await pullProfile(id);
    $('#start-btn').disabled = false;
    $('#splash-hint').textContent = `${PROFILES[id].name} 準備好了！按 🎈 開始`;
    speak(`${PROFILES[id].name}你好！按開始冒險就可以出發了`);
  });
});

// If profile was already chosen before (returning visit), pre-select it.
{
  const a = getActiveProfile();
  if (a) {
    const card = document.querySelector(`#splash-chars .char-card[data-profile="${a.id}"]`);
    if (card) card.classList.add('selected');
    pendingProfile = a.id;
    $('#start-btn').disabled = true;
    $('#splash-hint').textContent = `${a.name}，正在讀取雲端紀錄…`;
    pullProfile(a.id).then(() => {
      $('#start-btn').disabled = false;
      $('#splash-hint').textContent = `${a.name} 準備好了！按 🎈 開始`;
    });
  }
}

$('#start-btn').addEventListener('click', () => {
  if (!getActiveProfile()) {
    $('#splash-hint').textContent = '請先選擇是仙貝還是旺旺龍喔～';
    return;
  }
  sfxTap(); hapTap();
  renderMap();
  show('map');
  startBgm('default');
  const a = getActiveProfile();
  speak(`歡迎${a?.name || '小朋友'}來探險！`);
});

// Push pending state when the page is hidden / closed so other devices see it.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    const a = getActiveProfile();
    if (a) flushPush(a.id);
  }
});
window.addEventListener('beforeunload', () => {
  const a = getActiveProfile();
  if (a) flushPush(a.id);
});

// --- Clock tick ---
function tickClock() {
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  const t = `🕐 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const el = $('#clock');
  if (el) el.textContent = t;
}
setInterval(tickClock, 30000);
tickClock();

// --- Map ---
// Coordinates are % of the .map-frame, which preserves the source image's
// 1408×768 aspect ratio (see CSS). The 6 painted landmarks below are pinned
// to the centers of their illustrations in the current map_main.png; zoo and
// sheepworld have `signpost: true` because the map has no painted landmark
// for them — we render an emoji signpost over the empty path zone.
//
// If you regenerate the map image with new landmark positions, re-measure
// these from the new file (open the image, find each landmark's pixel
// center, divide by 1408 / 768).
const MAP_POS = {
  qingtang:     { x: 15, y: 23 },                      // pond + ducks (top-left)
  kindergarten: { x: 40, y: 22 },                      // yellow school (top-center)
  nursery:      { x: 78, y: 23 },                      // pink toddler school (top-right)
  zoo:          { x: 25, y: 50, signpost: '🦁' },      // empty left path (no landmark)
  sheepworld:   { x: 75, y: 50, signpost: '🐑' },      // empty right path (no landmark)
  beach:        { x: 13, y: 65 },                      // beach + waves (bottom-left)
  dinomountain: { x: 45, y: 75 },                      // dino on dirt mound (bottom-center)
  office:       { x: 84, y: 65 },                      // purple office (bottom-right)
};

function renderMap() {
  const hotspots = $('#map-hotspots');
  hotspots.innerHTML = '';
  const candies = getCandies();
  const done = getDoneToday();
  LOCATIONS.forEach(loc => {
    const pos = MAP_POS[loc.id];
    if (!pos) return;
    const btn = document.createElement('button');
    btn.className = 'hotspot';
    btn.dataset.color = loc.color;
    btn.style.left = pos.x + '%';
    btn.style.top = pos.y + '%';
    if (pos.y > 50) btn.classList.add('bottom-row');
    if (pos.signpost) btn.classList.add('signpost');
    btn.setAttribute('aria-label', loc.name);
    const allDone = loc.tasks.every(t => done.includes(t.id));
    const claimed = hasClaimedDailyReward(loc.id);
    if (allDone) btn.classList.add('done');
    if (claimed) btn.classList.add('claimed');
    const stateBadge = claimed
      ? '<span class="hotspot-stamp">✅ 今日已領</span>'
      : '<span class="hotspot-stamp">🎁 可領獎</span>';
    // For locations with no painted landmark, render an emoji signpost so
    // the kid sees *something* to tap. For painted landmarks the oval is
    // intentionally empty — the tap target sits invisibly over the art.
    const signpost = pos.signpost
      ? `<span class="hotspot-signpost" aria-hidden="true">${pos.signpost}</span>`
      : '';
    btn.innerHTML = `
      ${stateBadge}
      ${signpost}
      <span class="hotspot-label">${loc.name}</span>
    `;
    btn.addEventListener('click', () => {
      sfxTap(); hapTap();
      enterLocation(loc.id);
    });
    hotspots.appendChild(btn);
  });

  // candy count chip
  const totalCandies = Object.values(candies).reduce((a,b)=>a+b,0);
  const bp = $('#open-backpack');
  if (totalCandies > 0) bp.setAttribute('data-count', totalCandies);
  else bp.removeAttribute('data-count');
  renderNestBadge();
  renderProfileChip();
  renderFeedChip();

  // Settings chips
  const s = getSettings();
  $('#toggle-bgm').classList.toggle('off', !s.bgm);
  $('#toggle-voice').classList.toggle('off', !s.voice);
  $('#toggle-haptic').classList.toggle('off', !s.vibration);
}

// Top-bar chips: profile avatar + feed count
function renderProfileChip() {
  const a = getActiveProfile();
  if (!a) return;
  let chip = $('#profile-chip');
  if (!chip) {
    chip = document.createElement('button');
    chip.id = 'profile-chip';
    chip.className = 'profile-chip';
    chip.title = '切換玩家';
    chip.addEventListener('click', () => {
      sfxTap(); hapTap();
      // Back to splash to switch profile
      const a = getActiveProfile();
      if (a) flushPush(a.id);
      show('splash');
    });
    const topbar = $('#map .topbar-actions');
    if (topbar) topbar.prepend(chip);
  }
  chip.innerHTML = `<img src="${a.avatar}" alt="${a.name}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${a.emoji}',style:'font-size:24px'}))" /><span>${a.name}</span>`;
}

function renderFeedChip() {
  const n = getFeed();
  let chip = $('#feed-chip');
  if (!chip) {
    chip = document.createElement('div');
    chip.id = 'feed-chip';
    chip.className = 'feed-chip';
    const topbar = $('#map .topbar-actions');
    if (topbar) topbar.prepend(chip);
  }
  chip.innerHTML = `<span aria-hidden="true">🍖</span><span>飼料 × ${n}</span>`;
  chip.style.display = n > 0 ? '' : 'none';
}

$('#toggle-bgm').addEventListener('click', () => {
  const s = setSetting('bgm', !getSettings().bgm);
  if (s.bgm) startBgm('default'); else stopBgm();
  renderMap();
});
$('#toggle-voice').addEventListener('click', () => {
  setSetting('voice', !getSettings().voice);
  renderMap();
});
$('#toggle-haptic').addEventListener('click', () => {
  setSetting('vibration', !getSettings().vibration);
  renderMap();
});

$('#open-backpack').addEventListener('click', () => {
  sfxTap(); hapTap();
  renderBackpack();
  show('backpack');
});
$('#back-from-bp').addEventListener('click', () => {
  sfxTap(); hapTap();
  renderMap();
  show('map');
});

// --- Scene ---
let currentLoc = null;
let currentTask = null;
let progress = 0;

function enterLocation(locId) {
  currentLoc = findLocation(locId);
  currentTask = null;
  progress = 0;
  $('#scene').classList.remove('preview-mode');
  $('#scene-title').textContent = `${currentLoc.emoji} ${currentLoc.name}`;
  // Banner now shows daily-claim status instead of time-of-day gating.
  let banner = $('#preview-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'preview-banner';
    banner.className = 'preview-banner';
    $('#scene').insertBefore(banner, $('#scene-bg'));
  }
  if (hasClaimedDailyReward(currentLoc.id)) {
    banner.innerHTML = `✅ 今天已領過糖果獎勵！再玩一次可以拿到 🍖 <b>飼料</b>，回去餵小寵物吧～`;
    banner.style.display = 'block';
  } else {
    banner.innerHTML = `🎁 完成所有任務即可領取今日 <b>${currentLoc.name}</b> 獎勵糖果！`;
    banner.style.display = 'block';
  }
  const bg = $('#scene-bg');
  bg.style.background = currentLoc.bgFallback;
  bg.style.backgroundSize = 'cover';
  bg.style.backgroundPosition = 'center';
  // Try background image
  const img = new Image();
  img.onload = () => {
    bg.style.backgroundImage = `url('${currentLoc.bg}')`;
  };
  img.onerror = () => {
    bg.style.backgroundImage = '';
    // Add a big emoji overlay so there's something visible
    bg.style.position = 'relative';
  };
  img.src = currentLoc.bg;

  // Replay mode: if every task here is already done today AND the daily reward
  // has been claimed, reset the location's tasks so the kid can replay and
  // earn 飼料.
  {
    const done0 = getDoneToday();
    const allDone = currentLoc.tasks.every(t => done0.includes(t.id));
    if (allDone && hasClaimedDailyReward(currentLoc.id)) {
      resetTasksForReplay(currentLoc.tasks.map(t => t.id));
    }
  }

  renderTaskList();
  // Auto-pick first undone task
  const done = getDoneToday();
  const next = currentLoc.tasks.find(t => !done.includes(t.id));
  if (next) selectTask(next.id);
  else {
    $('#prop-tray').innerHTML = '<div style="margin:auto;font-weight:800;color:#8a7a98">今天全部任務都完成囉！🎉</div>';
    $('#scene-stage').innerHTML = '';
  }

  startBgm(currentLoc.id);
  show('scene');
}

function renderTaskList() {
  const list = $('#task-list');
  list.innerHTML = '';
  const done = getDoneToday();
  let doneCount = 0;
  currentLoc.tasks.forEach(t => {
    const card = document.createElement('button');
    card.className = 'task-card';
    if (done.includes(t.id)) { card.classList.add('done'); doneCount++; }
    if (currentTask && currentTask.id === t.id) card.classList.add('active');
    card.innerHTML = `<div class="task-emoji">${t.emoji}</div><div>${t.label}</div>`;
    card.addEventListener('click', () => {
      sfxTap(); hapTap();
      if (done.includes(t.id)) {
        $('#done-overlay').classList.remove('hidden');
        return;
      }
      selectTask(t.id);
    });
    list.appendChild(card);
  });
  $('#scene-progress').textContent = `${doneCount} / ${currentLoc.tasks.length}`;
}

function selectTask(taskId) {
  currentTask = findTask(currentLoc.id, taskId);
  progress = 0;
  renderTaskList();
  renderStage();
  renderPropTray();
  const opener = dialogFor(currentTask.id, 0, currentTask.needs) || currentTask.prompt;
  speak(opener);
}

function renderStage() {
  const stage = $('#scene-stage');
  stage.innerHTML = '';

  currentTask.targets.forEach(t => {
    const el = document.createElement('div');
    el.className = 'drop-target';
    el.dataset.accepts = t.accepts;
    el.dataset.targetId = t.id;
    el.style.left = `calc(${t.x}% - 60px)`;
    el.style.top = `calc(${t.y}% - 60px)`;
    el.innerHTML = t.img
      ? `<img src="${t.img}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{style:'font-size:72px',textContent:'${t.emoji}'}))" />`
      : `<span style="font-size:72px">${t.emoji}</span>`;

    // For touch-tap tasks (no drag), allow clicks too
    if (['foot', 'step', 'clocktap'].includes(currentTask.prop.type)) {
      el.addEventListener('click', () => {
        handleHit(el);
      });
      el.style.cursor = 'pointer';
    }
    stage.appendChild(el);
  });
}

function renderPropTray() {
  const tray = $('#prop-tray');
  tray.innerHTML = '';
  // For tap-only tasks, show hint instead of draggable prop
  if (['foot', 'step', 'clocktap'].includes(currentTask.prop.type)) {
    const hint = document.createElement('div');
    hint.style.cssText = 'margin:auto;font-weight:800;color:#8a7a98;font-size:16px;text-align:center;padding:0 20px';
    hint.innerHTML = `👆 點擊畫面上的 ${currentTask.targets[0].emoji}<br/>需要 ${currentTask.needs} 次`;
    tray.appendChild(hint);
    return;
  }
  // Spawn multiple props for multi-needs tasks so kid can drag repeatedly
  for (let i = 0; i < Math.max(1, currentTask.needs); i++) {
    spawnProp();
  }
}

function spawnProp() {
  const tray = $('#prop-tray');
  const p = currentTask.prop;
  const prop = document.createElement('div');
  prop.className = 'prop';
  prop.dataset.type = p.type;
  prop.innerHTML = p.img
    ? `<img src="${p.img}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${p.emoji}'}))" />`
    : `<span>${p.emoji}</span>`;

  makeDraggable(prop, {
    onDrop: (target) => {
      handleHit(target);
      prop.remove();
    },
  });
  tray.appendChild(prop);
}

function handleHit(targetEl) {
  sfxSuccess(); hapSuccess();
  targetEl.classList.remove('happy');
  void targetEl.offsetWidth;
  targetEl.classList.add('happy');
  // Sparkles
  for (let i=0;i<3;i++) {
    const s = document.createElement('div');
    s.className = 'sparkle';
    s.textContent = ['✨','⭐','💖','🎵'][Math.floor(Math.random()*4)];
    const rect = targetEl.getBoundingClientRect();
    s.style.position = 'fixed';
    s.style.left = (rect.left + rect.width/2 + (Math.random()*40-20)) + 'px';
    s.style.top = (rect.top + rect.height/2) + 'px';
    s.style.zIndex = 9998;
    document.body.appendChild(s);
    setTimeout(()=> s.remove(), 1000);
  }
  // Cuckoo sound for clock
  if (currentTask.prop.type === 'clocktap') sfxCuckoo();

  progress++;
  if (progress >= currentTask.needs) {
    completeTask();
  } else {
    const line = dialogFor(currentTask.id, progress, currentTask.needs);
    if (line) speak(line);
  }
}

function completeTask() {
  const endLine = dialogFor(currentTask.id, currentTask.needs, currentTask.needs) || currentTask.success;
  speak(endLine);
  markDone(currentTask.id);
  renderTaskList();

  const done = getDoneToday();
  const allDone = currentLoc.tasks.every(t => done.includes(t.id));
  if (allDone) {
    setTimeout(() => giveReward(), 800);
  } else {
    setTimeout(() => {
      const next = currentLoc.tasks.find(t => !done.includes(t.id));
      if (next) selectTask(next.id);
    }, 1200);
  }
}

const CANDY_MAP = {
  green:  { emoji:'🟢', img:'assets/images/candies/candy_green.png',  name:'綠糖果' },
  yellow: { emoji:'🟡', img:'assets/images/candies/candy_yellow.png', name:'黃糖果' },
  orange: { emoji:'🟠', img:'assets/images/candies/candy_orange.png', name:'橘糖果' },
  blue:   { emoji:'🔵', img:'assets/images/candies/candy_blue.png',   name:'藍糖果' },
  red:    { emoji:'🔴', img:'assets/images/candies/candy_red.png',    name:'紅糖果' },
  purple: { emoji:'🟣', img:'assets/images/candies/candy_purple.png', name:'紫糖果' },
  pink:   { emoji:'🩷', img:'assets/images/candies/candy_pink.png',   name:'粉紅糖' },
  teal:   { emoji:'🟢', img:'assets/images/candies/candy_teal.png',   name:'薄荷糖' },
};

// Branch the reward based on whether the daily-reward for this location has
// already been claimed today:
//   - First completion of the day → candy + chance of egg drop (the original
//     reward flow), and we mark it claimed.
//   - Subsequent completions → 飼料 (pet feed) so the kid is incentivized to
//     keep replaying the locations to interact with their pets.
function giveReward() {
  const claimed = hasClaimedDailyReward(currentLoc.id);
  if (!claimed) giveCandy();
  else giveFeed();
}

function giveCandy() {
  const candies = addCandy(currentLoc.color);
  markDailyRewardClaimed(currentLoc.id);
  sfxCandy(); hapCandy();
  const c = CANDY_MAP[currentLoc.color] || { emoji:'🍬', img:'', name:'糖果' };
  const box = $('#reward-candy');
  box.innerHTML = `<img src="${c.img}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${c.emoji}',style:'font-size:120px'}))" />`;
  $('#reward-text').innerHTML = `你完成所有任務了！<br/>獲得一顆 <b>${c.name}</b>！`;
  $('#reward-overlay').classList.remove('hidden');
  speak('恭喜你拿到糖果了！');

  // Chance to also drop an egg (40%)
  const eggType = LOCATION_EGG[currentLoc.id];
  if (eggType && Math.random() < 0.4) {
    setTimeout(() => openEggReward(eggType), 1400);
  }

  // Rainbow celebration when all 8 collected
  const allColors = Object.keys(CANDY_MAP).every(k => (candies[k]||0) > 0);
  if (allColors) {
    setTimeout(() => {
      $('#reward-text').innerHTML = '🌈 八色糖果大滿貫！你是最棒的小探險家！';
      speak('八色糖果大滿貫！你是最棒的小探險家！');
    }, 1800);
  }
}

// Free-play reward path: 1 piece of pet feed per replay, optional small chance
// of extra (so the kid still gets surprises). No daily cap.
function giveFeed() {
  const bonus = Math.random() < 0.2 ? 2 : 1;
  const total = addFeed(bonus);
  sfxCandy(); hapCandy();
  const box = $('#reward-candy');
  box.innerHTML = `<span style="font-size:130px">🍖</span>`;
  $('#reward-text').innerHTML = `太棒了！再次完成所有任務 <br/>獲得 <b>${bonus} 份飼料</b>！<br/><small>目前共 ${total} 份 — 帶到 🪺 餵小寵物會更親密喔</small>`;
  $('#reward-overlay').classList.remove('hidden');
  speak(`你拿到${bonus}份飼料，可以拿去餵寵物了`);
}

function openEggReward(type) {
  const { egg } = addEgg(type);
  const meta = PET_META[type];
  const box = $('#egg-img');
  box.innerHTML = `<img src="${meta.egg}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'🥚',style:'font-size:120px'}))" />`;
  $('#egg-text').innerHTML = `撿到一顆<b>${meta.name}</b>的蛋！<br/>帶去 🪺 小窩，每天噴水、曬太陽幫它孵化！`;
  $('#egg-overlay').classList.remove('hidden');
  speak(`哇！你撿到一顆${meta.name}的蛋，帶去小窩照顧它吧`);
}

$('#reward-close').addEventListener('click', () => {
  sfxTap(); hapTap();
  $('#reward-overlay').classList.add('hidden');
});
$('#sleep-close').addEventListener('click', () => {
  sfxTap(); hapTap();
  $('#sleep-overlay').classList.add('hidden');
});
$('#done-close').addEventListener('click', () => {
  sfxTap(); hapTap();
  $('#done-overlay').classList.add('hidden');
});

$('#back-to-map').addEventListener('click', () => {
  sfxTap(); hapTap();
  renderMap();
  show('map');
  startBgm('default');
});

// --- Backpack ---
function renderBackpack() {
  const grid = $('#candy-grid');
  grid.innerHTML = '';
  const candies = getCandies();
  const candyMap = {
    green:  { img:'assets/images/candies/candy_green.png',  emoji:'🟢', name:'青塘綠糖', source:'青塘園' },
    yellow: { img:'assets/images/candies/candy_yellow.png', emoji:'🟡', name:'幼稚黃糖', source:'田園幼稚園' },
    orange: { img:'assets/images/candies/candy_orange.png', emoji:'🟠', name:'托兒橘糖', source:'金培恩' },
    blue:   { img:'assets/images/candies/candy_blue.png',   emoji:'🔵', name:'海邊藍糖', source:'海邊' },
    red:    { img:'assets/images/candies/candy_red.png',    emoji:'🔴', name:'恐龍紅糖', source:'恐龍山' },
    purple: { img:'assets/images/candies/candy_purple.png', emoji:'🟣', name:'辦公紫糖', source:'辦公室' },
    pink:   { img:'assets/images/candies/candy_pink.png',   emoji:'🩷', name:'動物粉糖', source:'動物園' },
    teal:   { img:'assets/images/candies/candy_teal.png',   emoji:'🟢', name:'羊羊薄荷', source:'羊世界' },
  };
  let total = 0;
  Object.entries(candyMap).forEach(([k, v]) => {
    const cnt = candies[k] || 0;
    total += cnt;
    const cell = document.createElement('div');
    cell.className = 'candy-cell' + (cnt === 0 ? ' empty' : '');
    cell.innerHTML = `
      <div class="candy-visual">
        <img src="${v.img}" alt=""
          onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${v.emoji}',style:'font-size:64px'}))" />
      </div>
      <div class="cnt">× ${cnt}</div>
      <div class="label">${v.name}</div>
    `;
    grid.appendChild(cell);
  });
  $('#total-line').textContent = `總共收集 ${total} 顆糖果 🎉`;
}

// --- Nest (eggs & pets) ---
let nestTab = 'eggs';
function renderNestBadge() {
  const eggs = Object.keys(getEggs()).length;
  const pets = Object.keys(getPets()).length;
  const total = eggs + pets;
  const btn = $('#open-nest');
  if (total > 0) btn.setAttribute('data-count', total);
  else btn.removeAttribute('data-count');
}

function renderNest() {
  const body = $('#nest-body');
  body.innerHTML = '';
  if (nestTab === 'eggs') {
    const eggs = getEggs();
    const ids = Object.keys(eggs);
    if (!ids.length) {
      body.innerHTML = '<div class="nest-empty">還沒有撿到蛋～完成任務有機會獲得！</div>';
      return;
    }
    ids.forEach(id => {
      const e = eggs[id];
      const meta = PET_META[e.type];
      const cell = document.createElement('button');
      cell.className = 'nest-cell';
      cell.innerHTML = `
        <img src="${meta.egg}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'🥚',style:'font-size:64px'}))" />
        <div class="name">${meta.name}的蛋</div>
        <div class="progress-row"><span>💧 ${e.water}/${HATCH_NEEDS.water}</span><span>☀️ ${e.sun}/${HATCH_NEEDS.sun}</span></div>
      `;
      cell.addEventListener('click', () => { sfxTap(); hapTap(); openEggView(id); });
      body.appendChild(cell);
    });
  } else {
    const pets = getPets();
    const ids = Object.keys(pets);
    if (!ids.length) {
      body.innerHTML = '<div class="nest-empty">還沒有小寵物～先去孵蛋吧！</div>';
      return;
    }
    ids.forEach(id => {
      const p = pets[id];
      const meta = PET_META[p.type];
      const dayIdx = petDayIndex(p);
      const fr = Array.from({length: 5}, (_,i) => i < Math.min(5, Math.round(p.friendship/2)) ? '❤️' : '🩶').join('');
      const cell = document.createElement('button');
      cell.className = 'nest-cell';
      cell.innerHTML = `
        <img src="${meta.pet}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${meta.emoji}',style:'font-size:64px'}))" />
        <div class="name">${meta.name}</div>
        <div class="pet-fr">${fr.split('').map(e=>`<span>${e}</span>`).join('')}</div>
        <div class="progress-row"><span>第 ${dayIdx+1} 天</span></div>
      `;
      cell.addEventListener('click', () => { sfxTap(); hapTap(); openPetView(id); });
      body.appendChild(cell);
    });
  }
}

$$('.nest-tab').forEach(t => {
  t.addEventListener('click', () => {
    sfxTap(); hapTap();
    nestTab = t.dataset.tab;
    $$('.nest-tab').forEach(x => x.classList.toggle('active', x === t));
    renderNest();
  });
});
$('#open-nest').addEventListener('click', () => {
  sfxTap(); hapTap();
  nestTab = 'eggs';
  $$('.nest-tab').forEach(x => x.classList.toggle('active', x.dataset.tab === 'eggs'));
  renderNest();
  show('nest');
});
$('#back-from-nest').addEventListener('click', () => {
  sfxTap(); hapTap();
  renderMap();
  show('map');
});
$('#egg-close').addEventListener('click', () => {
  sfxTap(); hapTap();
  $('#egg-overlay').classList.add('hidden');
  renderMap();
});
$('#hatch-close').addEventListener('click', () => {
  sfxTap(); hapTap();
  $('#hatch-overlay').classList.add('hidden');
  nestTab = 'pets';
  $$('.nest-tab').forEach(x => x.classList.toggle('active', x.dataset.tab === 'pets'));
  renderNest();
  show('nest');
});

// --- Pet detail (REAL 3D via three.js) ---
// We render the egg / pet as a procedural three.js mesh inside #pet-3d.
// Drag to spin, tap to wiggle. The auto-spin lives inside pet3d.js so the
// kid sees the model from every angle without lifting a finger.
let viewMode = null; // 'egg' | 'pet'
let viewId = null;

// Tap-vs-drag detection on the pet stage container — we still need this in
// app.js because the canvas inside pet3d handles its own drag, and a tap
// (no drag) should trigger a cute reaction at the app level (sparkles + voice).
function bindStageTap() {
  const stage = $('#pet-stage');
  let down = false, moved = false, downAt = 0, sx = 0, sy = 0;
  stage.onpointerdown = e => {
    down = true; moved = false; downAt = Date.now();
    sx = e.clientX; sy = e.clientY;
  };
  stage.onpointermove = e => {
    if (!down) return;
    if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 6) moved = true;
  };
  const finish = () => {
    if (!down) return;
    if (!moved && (Date.now() - downAt) < 400) petWiggle();
    down = false;
  };
  stage.onpointerup = finish;
  stage.onpointercancel = finish;
}

// Cute reaction when the pet is tapped: 3D wiggle + sparkles + voice.
function petWiggle() {
  wigglePet3D();
  if (viewMode === 'pet') {
    const p = getPets()[viewId];
    if (p) {
      const meta = PET_META[p.type];
      sfxTap(); hapTap();
      const stage = $('#pet-stage');
      ['💖','✨','💕'].forEach((s, i) => {
        const sp = document.createElement('span');
        sp.textContent = s;
        sp.style.cssText = `position:absolute;left:${48 + (i-1)*8}%;top:${30 + i*2}%;font-size:34px;pointer-events:none;animation:pet-hatch 1s ease-out;z-index:5`;
        stage.appendChild(sp);
        setTimeout(() => sp.remove(), 1000);
      });
      speak(`${meta.name}咕咕～好開心`);
    }
  } else {
    sfxTap(); hapTap();
  }
}

function eggProgressFraction(e) {
  if (!e) return 0;
  return Math.min(1, ((e.water||0) + (e.sun||0)) / (HATCH_NEEDS.water + HATCH_NEEDS.sun));
}

function openEggView(id) {
  const eggs = getEggs();
  const e = eggs[id];
  if (!e) return;
  viewMode = 'egg';
  viewId = id;
  const meta = PET_META[e.type];
  $('#petview-title').textContent = `🥚 ${meta.name}的蛋`;
  // Mount real 3D egg with current crack progress
  const stage3d = $('#pet-3d');
  stage3d.innerHTML = ''; // clear the legacy inner wrapper
  mountPet3D(stage3d, { kind: 'egg', petType: e.type, progress: eggProgressFraction(e) });
  renderPetInfo();
  renderPetActions();
  bindStageTap();
  show('petview');
  speak('拖動蛋可以 360 度觀察喔，每天幫它噴水和曬太陽會慢慢孵化');
}

function openPetView(id) {
  const pets = getPets();
  const p = pets[id];
  if (!p) return;
  viewMode = 'pet';
  viewId = id;
  const meta = PET_META[p.type];
  $('#petview-title').textContent = `${meta.emoji} ${meta.name}`;
  const stage3d = $('#pet-3d');
  stage3d.innerHTML = '';
  mountPet3D(stage3d, { kind: 'pet', petType: p.type });
  const { pet, isNewDay } = interactPet(id);
  const dayIdx = petDayIndex(pet);
  const dailyLine = PET_DAILY[dayIdx % PET_DAILY.length];
  setTimeout(() => speak(dailyLine), 400);
  renderPetInfo();
  renderPetActions();
  bindStageTap();
  show('petview');
}

function renderPetInfo() {
  const info = $('#pet-info');
  if (viewMode === 'egg') {
    const e = getEggs()[viewId];
    if (!e) return;
    info.innerHTML = `孵化進度：💧 ${e.water}/${HATCH_NEEDS.water} ・ ☀️ ${e.sun}/${HATCH_NEEDS.sun}<br/><small>一天每樣最多 2 次，隔天再來就能繼續喔</small>`;
  } else {
    const p = getPets()[viewId];
    if (!p) return;
    const meta = PET_META[p.type];
    const dayIdx = petDayIndex(p);
    const fr = Array.from({length:5}, (_,i) => i < Math.min(5, Math.round(p.friendship/2)) ? '❤️' : '🤎').join('');
    info.innerHTML = `${meta.name} ・ 第 ${dayIdx+1} 天 <span class="fr-bar">${fr.split('').map(e=>`<span>${e}</span>`).join('')}</span>`;
  }
}

function renderPetActions() {
  const bar = $('#pet-actions');
  bar.innerHTML = '';
  if (viewMode === 'egg') {
    const waterBtn = document.createElement('button');
    waterBtn.className = 'act-water';
    waterBtn.innerHTML = '💧 噴水';
    waterBtn.addEventListener('click', () => doInteract('water'));
    const sunBtn = document.createElement('button');
    sunBtn.className = 'act-sun';
    sunBtn.innerHTML = '☀️ 照光';
    sunBtn.addEventListener('click', () => doInteract('sun'));
    bar.append(waterBtn, sunBtn);
  } else {
    const pat = document.createElement('button');
    pat.className = 'act-pat';
    pat.innerHTML = '🫶 摸摸';
    pat.addEventListener('click', () => {
      sfxTap(); hapTap();
      const p = getPets()[viewId];
      const meta = PET_META[p.type];
      wigglePet3D();
      const tick = document.createElement('span');
      tick.textContent = '💖';
      tick.style.cssText = 'position:absolute;font-size:38px;pointer-events:none;animation:pet-hatch 1s ease-out;left:50%;top:30%;transform:translateX(-50%);z-index:5';
      const stage = $('#pet-stage');
      stage.appendChild(tick);
      setTimeout(()=>tick.remove(), 1000);
      speak(`${meta.name}喵嗚～好舒服`);
    });

    // Feed button — only enabled if the kid has feed in inventory.
    const feed = document.createElement('button');
    feed.className = 'act-feed';
    const feedCount = getFeed();
    feed.innerHTML = `🍖 餵食 <small>(剩 ${feedCount})</small>`;
    feed.disabled = feedCount <= 0;
    feed.addEventListener('click', () => {
      if (!spendFeed(1)) {
        speak('飼料不夠了，再去地點完成任務可以拿到飼料喔');
        return;
      }
      sfxCandy(); hapCandy();
      const p = getPets()[viewId];
      const meta = PET_META[p.type];
      // Bump friendship like a "new day" interaction
      const pets = getPets();
      pets[viewId].friendship = Math.min(10, (pets[viewId].friendship || 1) + 1);
      // We can't directly write through pets.js helpers, but interactPet will
      // re-save on next call. For now, persist via a manual write.
      try {
        const stored = JSON.parse(localStorage.getItem(`kda_pets__${getActiveProfile().id}`)) || {};
        stored[viewId] = pets[viewId];
        localStorage.setItem(`kda_pets__${getActiveProfile().id}`, JSON.stringify(stored));
      } catch {}
      wigglePet3D();
      // Floating food particles
      const stage = $('#pet-stage');
      ['🍖','🍗','🥩','💕'].forEach((emo, i) => {
        const sp = document.createElement('span');
        sp.textContent = emo;
        sp.style.cssText = `position:absolute;left:${44 + i*4}%;top:${28 + i*2}%;font-size:30px;pointer-events:none;animation:pet-hatch 1s ease-out;z-index:5`;
        stage.appendChild(sp);
        setTimeout(() => sp.remove(), 1000);
      });
      speak(`${meta.name}吃得好開心，我們更親密了`);
      renderPetInfo();
      renderPetActions();
      renderFeedChip();
    });
    bar.append(pat, feed);
  }
}

function doInteract(kind) {
  sfxTap(); hapTap();
  const r = interactEgg(viewId, kind);
  if (!r.ok) {
    if (r.reason === 'daily-limit') {
      speak(kind === 'water' ? '今天水已經夠囉，明天再來噴' : '今天太陽也曬夠啦，明天再一起');
    }
    return;
  }
  sfxSuccess(); hapSuccess();
  if (r.hatched) {
    const petId = r.hatched.petId;
    const pet = getPets()[petId];
    const meta = PET_META[pet.type];
    viewMode = 'pet';
    viewId = petId;
    // Swap egg → real-3D pet mesh
    const stage3d = $('#pet-3d');
    stage3d.innerHTML = '';
    mountPet3D(stage3d, { kind: 'pet', petType: pet.type });
    stage3d.classList.remove('hatch-anim'); void stage3d.offsetWidth; stage3d.classList.add('hatch-anim');
    $('#petview-title').textContent = `${meta.emoji} ${meta.name}`;
    $('#hatch-img').innerHTML = `<img src="${meta.pet}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${meta.emoji}',style:'font-size:140px'}))" />`;
    $('#hatch-text').innerHTML = `歡迎 <b>${meta.name}</b> 加入你的小窩！`;
    $('#hatch-overlay').classList.remove('hidden');
    sfxCandy(); hapCandy();
    speak(`叮咚！${meta.name}孵出來了，歡迎新朋友`);
    renderPetInfo();
    renderPetActions();
    renderNestBadge();
    return;
  }
  // Live update the crack texture so the kid sees real progress on the shell.
  const e = getEggs()[viewId];
  setEggProgress(eggProgressFraction(e));
  renderPetInfo();
  speak(kind === 'water' ? '水滋潤了一下，蛋蛋舒服地晃了晃' : '陽光暖暖的，蛋蛋在發光');
}

$('#back-from-petview').addEventListener('click', () => {
  sfxTap(); hapTap();
  unmountPet3D();
  renderNest();
  show('nest');
});

// Also unmount when the hatch overlay closes (it goes to nest screen)
$('#hatch-close').addEventListener('click', () => {
  unmountPet3D();
});

// --- Init: if splash has been skipped last time, still show splash each time (kids love it) ---
