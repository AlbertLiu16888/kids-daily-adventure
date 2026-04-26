import { getSettings } from './state.js';

let ctx = null;
function getCtx() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { return null; }
  }
  return ctx;
}

// Simple beep with oscillator
function beep(freq = 880, dur = 0.15, type = 'sine', gain = 0.15) {
  if (!getSettings().sfx) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(c.destination);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.start();
  o.stop(c.currentTime + dur);
}

export function sfxTap()      { beep(660, 0.08, 'triangle', 0.12); }
export function sfxSuccess()  {
  beep(660, 0.1, 'sine', 0.15);
  setTimeout(()=> beep(880, 0.1, 'sine', 0.15), 90);
  setTimeout(()=> beep(1320, 0.2, 'sine', 0.18), 180);
}
export function sfxCandy()    {
  // ascending arpeggio
  [523, 659, 784, 1047].forEach((f,i)=> setTimeout(()=> beep(f,0.14,'sine',0.18), i*100));
}
export function sfxFail()     { beep(200, 0.2, 'square', 0.12); }
export function sfxCuckoo()   {
  beep(880, 0.2, 'sine', 0.2);
  setTimeout(()=> beep(660, 0.25, 'sine', 0.2), 220);
}

// Simple BGM: a soft arpeggio loop
let bgmTimer = null;
let bgmNodes = [];
export function startBgm(location = 'default') {
  stopBgm();
  if (!getSettings().bgm) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume();

  const patterns = {
    default:   [523, 659, 784, 659],
    qingtang:  [523, 587, 659, 784, 659, 587],
    kindergarten: [659, 784, 880, 784],
    nursery:   [523, 659, 784, 1047, 784, 659],
    beach:     [392, 523, 659, 523],
    dinomountain: [440, 554, 659, 554, 440, 330],
    office:    [698, 784, 880, 784],
  };
  const notes = patterns[location] || patterns.default;
  let i = 0;
  const playNote = () => {
    if (!getSettings().bgm) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.value = notes[i % notes.length];
    o.connect(g);
    g.connect(c.destination);
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(0.05, c.currentTime + 0.05);
    g.gain.linearRampToValueAtTime(0, c.currentTime + 0.35);
    o.start();
    o.stop(c.currentTime + 0.4);
    bgmNodes.push(o);
    i++;
  };
  bgmTimer = setInterval(playNote, 380);
}
export function stopBgm() {
  if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
  bgmNodes.forEach(n => { try { n.stop(); } catch {} });
  bgmNodes = [];
}

// Speech
export function speak(text, rate = 0.95) {
  if (!getSettings().voice) return;
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-TW';
    u.rate = rate;
    u.pitch = 1.3;
    window.speechSynthesis.speak(u);
  } catch {}
}

// English speak — for letter / word phonics. Uses en-US voice.
export function speakEn(text, rate = 0.85) {
  if (!getSettings().voice) return;
  if (!('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = rate;
    u.pitch = 1.1;
    window.speechSynthesis.speak(u);  // do NOT cancel — we may queue after a zh phrase
  } catch {}
}

// --- Animal sounds: synthesized via Web Audio so we don't need audio assets ---
// Each animal gets a small "voice" pattern with a few oscillator notes that
// caricature the real call. Played on tap / wiggle / feed.
function tone({ freq = 440, dur = 0.18, type = 'sine', gain = 0.18, sweepTo = null, delay = 0 }) {
  if (!getSettings().sfx) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (sweepTo != null) o.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

const ANIMAL_VOICES = {
  // duck: two short low quacks with a downward sweep
  duck:  () => { tone({freq:520, sweepTo:300, dur:0.18, type:'sawtooth', gain:0.20}); tone({freq:520, sweepTo:280, dur:0.20, type:'sawtooth', gain:0.20, delay:0.22}); },
  // dino: deep growl
  dino:  () => { tone({freq:160, sweepTo:90, dur:0.55, type:'sawtooth', gain:0.22}); tone({freq:120, sweepTo:70, dur:0.45, type:'square', gain:0.12, delay:0.10}); },
  // panda: soft chirp pair
  panda: () => { tone({freq:880, sweepTo:660, dur:0.18, type:'sine', gain:0.16}); tone({freq:1040,sweepTo:780,dur:0.18,type:'sine',gain:0.14,delay:0.20}); },
  // sheep: classic baa wobble
  sheep: () => { tone({freq:520, sweepTo:420, dur:0.55, type:'sawtooth', gain:0.18}); for (let i=0;i<6;i++) tone({freq:480 + (i%2)*60, dur:0.06, type:'square', gain:0.10, delay:0.08 + i*0.07}); },
  // bear: low rumble + huff
  bear:  () => { tone({freq:130, sweepTo:80, dur:0.50, type:'sawtooth', gain:0.22}); tone({freq:90, dur:0.18, type:'square', gain:0.14, delay:0.30}); },
  // bunny: rapid high squeaks
  bunny: () => { [0,0.10,0.20].forEach(d => tone({freq:1500, sweepTo:1100, dur:0.08, type:'sine', gain:0.16, delay:d})); },
  // crab: clicky castanet
  crab:  () => { [0,0.08,0.16,0.24].forEach(d => tone({freq:2200, dur:0.04, type:'square', gain:0.14, delay:d})); },
  // bird (cuckoo): two-tone call
  bird:  () => { tone({freq:880, dur:0.18, type:'sine', gain:0.18}); tone({freq:660, dur:0.25, type:'sine', gain:0.18, delay:0.20}); },
};

export function sfxAnimal(type) {
  const fn = ANIMAL_VOICES[type];
  if (fn) fn();
}

// "Pet talks": play the animal's call, then speak the line in zh-TW.
// 200 ms gap so the speech doesn't get drowned by the call's tail.
export function petTalk(type, line) {
  sfxAnimal(type);
  setTimeout(() => speak(line), 250);
}
