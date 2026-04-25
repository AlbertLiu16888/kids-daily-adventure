import { LOCATIONS, findLocation, findTask, LOCATION_EGG } from './scenes.js';
import {
  getCandies, addCandy, getDoneToday, markDone, isDoneToday,
  getSettings, setSetting,
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
} from './pets.js';

// --- Helpers ---
function $(sel, root=document) { return root.querySelector(sel); }
function $$(sel, root=document) { return Array.from(root.querySelectorAll(sel)); }
function show(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#'+id).classList.add('active');
}
function isOpen(loc) {
  const h = new Date().getHours();
  return h >= loc.hours[0] && h < loc.hours[1];
}
function fmtHours(loc) {
  const [a,b] = loc.hours;
  const pad = n => String(n).padStart(2,'0');
  return `${pad(a)}:00–${pad(b)}:00`;
}

// --- Splash ---
$('#start-btn').addEventListener('click', () => {
  sfxTap(); hapTap();
  renderMap();
  show('map');
  startBgm('default');
  speak('歡迎來探險！');
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
// 3-2-3 layout that works on the existing 6-landmark map (zoo + sheepworld
// fill the middle band) and matches the regenerated v2 map's intended grid.
// Coordinates are %, so they scale with the now-full-bleed map.
const MAP_POS = {
  qingtang:     { x: 17, y: 22 },
  kindergarten: { x: 50, y: 22 },
  nursery:      { x: 83, y: 22 },
  zoo:          { x: 30, y: 52 },
  sheepworld:   { x: 70, y: 52 },
  beach:        { x: 17, y: 80 },
  dinomountain: { x: 50, y: 80 },
  office:       { x: 83, y: 80 },
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
    btn.setAttribute('aria-label', loc.name);
    if (!isOpen(loc)) btn.classList.add('closed');
    const allDone = loc.tasks.every(t => done.includes(t.id));
    if (allDone) btn.classList.add('done');
    btn.innerHTML = `
      <span class="hotspot-moon">💤</span>
      <span class="hotspot-label">${loc.name}<span class="hours-small">${fmtHours(loc)}</span></span>
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

  // Settings chips
  const s = getSettings();
  $('#toggle-bgm').classList.toggle('off', !s.bgm);
  $('#toggle-voice').classList.toggle('off', !s.voice);
  $('#toggle-haptic').classList.toggle('off', !s.vibration);
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
  const preview = !isOpen(currentLoc);
  $('#scene').classList.toggle('preview-mode', preview);
  $('#scene-title').textContent = `${currentLoc.emoji} ${currentLoc.name}`;
  let banner = $('#preview-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'preview-banner';
    banner.className = 'preview-banner';
    $('#scene').insertBefore(banner, $('#scene-bg'));
  }
  if (preview) {
    banner.innerHTML = `🌙 這裡現在還在休息 — 請 <b>${fmtHours(currentLoc)}</b> 再來完成任務喔！`;
    banner.style.display = 'block';
    setTimeout(() => speak(`${currentLoc.name}現在還在休息，請${currentLoc.hours[0]}點到${currentLoc.hours[1]}點之間再來完成任務喔`), 400);
  } else {
    banner.style.display = 'none';
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
  const preview = !isOpen(currentLoc);
  if (preview) {
    sfxSuccess();
    speak(`${endLine}  不過這裡要${currentLoc.hours[0]}點到${currentLoc.hours[1]}點才能真正完成任務喔`);
    setTimeout(() => {
      const i = currentLoc.tasks.findIndex(t => t.id === currentTask.id);
      const next = currentLoc.tasks[(i + 1) % currentLoc.tasks.length];
      if (next) selectTask(next.id);
    }, 1600);
    return;
  }
  speak(endLine);
  markDone(currentTask.id);
  renderTaskList();

  const done = getDoneToday();
  const allDone = currentLoc.tasks.every(t => done.includes(t.id));
  if (allDone) {
    setTimeout(() => giveCandy(), 800);
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

function giveCandy() {
  const candies = addCandy(currentLoc.color);
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

// --- Pet detail (3D rotation + actions) ---
let viewMode = null; // 'egg' | 'pet'
let viewId = null;
let rotY = 0, rotX = 0;

function applyRot() {
  $('#pet-3d').style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
}

// Rebuild the pet image node — avoids the stale-ref bug where a 404 onerror
// replaces <img id="pet-img"> with an emoji span, and a later update then
// tries to set .src on a node that no longer exists. Image is mounted into
// the inner wrapper so the auto-spin animation applies.
function setPetImg(src, fallbackEmoji) {
  const inner = $('#pet-3d-inner');
  inner.innerHTML = '';
  const img = document.createElement('img');
  img.id = 'pet-img';
  img.alt = '';
  img.onerror = () => {
    const span = document.createElement('span');
    span.textContent = fallbackEmoji;
    span.style.fontSize = '180px';
    span.style.display = 'flex';
    span.style.alignItems = 'center';
    span.style.justifyContent = 'center';
    span.style.width = '100%';
    span.style.height = '100%';
    span.style.filter = 'drop-shadow(0 6px 8px rgba(255,200,220,.55))';
    img.replaceWith(span);
  };
  img.src = src;
  inner.appendChild(img);
}

function bindPetDrag() {
  const stage = $('#pet-stage');
  let dragging = false, lastX=0, lastY=0, moved=false, downAt=0, resumeT=0;
  stage.onpointerdown = e => {
    dragging = true; moved = false; downAt = Date.now();
    lastX = e.clientX; lastY = e.clientY;
    stage.setPointerCapture(e.pointerId);
    // Pause auto-spin so the kid feels in control while dragging
    stage.classList.add('dragging');
    if (resumeT) { clearTimeout(resumeT); resumeT = 0; }
  };
  stage.onpointermove = e => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    rotY += dx * 0.6;
    rotX = Math.max(-45, Math.min(45, rotX - dy * 0.4));
    lastX = e.clientX; lastY = e.clientY;
    applyRot();
  };
  stage.onpointerup = stage.onpointercancel = () => {
    if (!dragging) return;
    dragging = false;
    // Tap (no drag) on the pet → cute wiggle reaction (but not on the egg)
    if (!moved && (Date.now() - downAt) < 400) {
      petWiggle();
    }
    // Resume auto-spin after a short pause so the kid sees their final angle
    resumeT = setTimeout(() => stage.classList.remove('dragging'), 1500);
  };
}

// Cute reaction when the pet is tapped: wiggle + sparkles + voice
function petWiggle() {
  const wrap = $('#pet-3d');
  wrap.classList.remove('wiggle'); void wrap.offsetWidth; wrap.classList.add('wiggle');
  setTimeout(() => wrap.classList.remove('wiggle'), 800);
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

function openEggView(id) {
  const eggs = getEggs();
  const e = eggs[id];
  if (!e) return;
  viewMode = 'egg';
  viewId = id;
  const meta = PET_META[e.type];
  $('#petview-title').textContent = `🥚 ${meta.name}的蛋`;
  setPetImg(meta.egg, '🥚');
  rotY = 0; rotX = 0; applyRot();
  renderPetInfo();
  renderPetActions();
  bindPetDrag();
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
  setPetImg(meta.pet, meta.emoji);
  rotY = 0; rotX = 0; applyRot();
  const { pet, isNewDay } = interactPet(id);
  const dayIdx = petDayIndex(pet);
  const dailyLine = PET_DAILY[dayIdx % PET_DAILY.length];
  setTimeout(() => speak(dailyLine), 400);
  renderPetInfo();
  renderPetActions();
  bindPetDrag();
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
    const fr = Array.from({length:5}, (_,i) => i < Math.min(5, Math.round(p.friendship/2)) ? '❤' : '🤍').join('');
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
      const tick = document.createElement('span');
      tick.textContent = '💖';
      tick.style.cssText = 'position:absolute;font-size:38px;pointer-events:none;animation:pet-hatch 1s ease-out';
      const stage = $('#pet-stage');
      tick.style.left = '50%'; tick.style.top = '30%'; tick.style.transform = 'translateX(-50%)';
      stage.appendChild(tick);
      setTimeout(()=>tick.remove(), 1000);
      speak(`${meta.name}喵嗚～好舒服`);
    });
    bar.append(pat);
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
    setPetImg(meta.pet, meta.emoji);
    $('#pet-3d').classList.remove('hatch-anim'); void $('#pet-3d').offsetWidth; $('#pet-3d').classList.add('hatch-anim');
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
  renderPetInfo();
  speak(kind === 'water' ? '水滋潤了一下，蛋蛋舒服地晃了晃' : '陽光暖暖的，蛋蛋在發光');
}

$('#back-from-petview').addEventListener('click', () => {
  sfxTap(); hapTap();
  renderNest();
  show('nest');
});

// --- Init: if splash has been skipped last time, still show splash each time (kids love it) ---
