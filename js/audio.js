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
