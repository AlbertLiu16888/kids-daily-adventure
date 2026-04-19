import { LOCATIONS, findLocation, findTask } from './scenes.js';
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
function renderMap() {
  const grid = $('#map-grid');
  grid.innerHTML = '';
  const candies = getCandies();
  const done = getDoneToday();
  LOCATIONS.forEach(loc => {
    const card = document.createElement('button');
    card.className = 'place-card';
    card.dataset.color = loc.color;
    if (!isOpen(loc)) card.classList.add('closed');
    const allDone = loc.tasks.every(t => done.includes(t.id));
    card.innerHTML = `
      <div class="emoji">${loc.emoji}</div>
      <div class="name">${loc.name}</div>
      <div class="hours">${fmtHours(loc)}</div>
      ${allDone ? '<div class="done-badge">✓ 完成</div>' : ''}
    `;
    card.addEventListener('click', () => {
      sfxTap(); hapTap();
      if (!isOpen(loc)) {
        $('#sleep-text').textContent = `這裡要 ${fmtHours(loc)} 才開放唷！`;
        $('#sleep-overlay').classList.remove('hidden');
        speak(`這裡在 ${loc.hours[0]} 點到 ${loc.hours[1]} 點才開放唷`);
        return;
      }
      enterLocation(loc.id);
    });
    grid.appendChild(card);
  });

  // candy count chip
  const totalCandies = Object.values(candies).reduce((a,b)=>a+b,0);
  const bp = $('#open-backpack');
  if (totalCandies > 0) bp.setAttribute('data-count', totalCandies);

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
  $('#scene-title').textContent = `${currentLoc.emoji} ${currentLoc.name}`;
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
  speak(currentTask.prompt);
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
  }
}

function completeTask() {
  speak(currentTask.success);
  markDone(currentTask.id);
  renderTaskList();

  // Check if all tasks done in location -> candy reward
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

function giveCandy() {
  const candies = addCandy(currentLoc.color);
  sfxCandy(); hapCandy();
  speak('恭喜你拿到糖果了！');
  const candyMap = {
    green:  { emoji:'🟢', img:'assets/images/candies/candy_green.png',  name:'綠糖果' },
    yellow: { emoji:'🟡', img:'assets/images/candies/candy_yellow.png', name:'黃糖果' },
    orange: { emoji:'🟠', img:'assets/images/candies/candy_orange.png', name:'橘糖果' },
    blue:   { emoji:'🔵', img:'assets/images/candies/candy_blue.png',   name:'藍糖果' },
    red:    { emoji:'🔴', img:'assets/images/candies/candy_red.png',    name:'紅糖果' },
    purple: { emoji:'🟣', img:'assets/images/candies/candy_purple.png', name:'紫糖果' },
  };
  const c = candyMap[currentLoc.color];
  const box = $('#reward-candy');
  box.innerHTML = `<img src="${c.img}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${c.emoji}',style:'font-size:120px'}))" />`;
  $('#reward-text').innerHTML = `你完成所有任務了！<br/>獲得一顆 <b>${c.name}</b>！`;
  $('#reward-overlay').classList.remove('hidden');

  // If all 6 colors collected today, show rainbow
  const allColors = Object.values(candies).every(v => v>0);
  if (allColors) {
    setTimeout(() => {
      $('#reward-text').innerHTML = '🌈 彩虹糖果大滿貫！你是最棒的小探險家！';
      speak('彩虹糖果大滿貫！你是最棒的小探險家！');
    }, 1500);
  }
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

// --- Init: if splash has been skipped last time, still show splash each time (kids love it) ---
