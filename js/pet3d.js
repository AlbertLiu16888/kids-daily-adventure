// Real 3D pet & egg view using three.js (procedural meshes, no GLTF assets).
//
// Why three.js procedural meshes?
//   - User explicitly rejected the previous approach of rotating a 2D image
//     ("我的3d動畫要求必須是實際3d，目前是二維圖片反轉，請優化").
//   - We don't have ready-made 3D models, and the kids' hardware is a phone /
//     iPad — small procedural meshes with simple lighting render fast and
//     stay charming.
//
// Each pet type maps to a small composite mesh (body + ears/spikes/wings)
// with a tinted material, so it reads as "the same character" as the 2D
// asset but is genuinely 3D — you can rotate it on every axis and it
// projects correctly.
//
// The egg is a stretched sphere with a dynamic crack overlay drawn into a
// canvas texture. As `setEggProgress(p)` is called the texture redraws with
// progressively more cracks, so the kid sees real progress on the shell.

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// ---- Pet type → look ----
// Colors in HEX. Each entry can opt into accessories (ears / spikes / wings).
const PET_LOOK = {
  duck:  { body:0xfff2a0, accent:0xff8c33, kind:'duck' },
  dino:  { body:0x9be08a, accent:0x2f8a4d, kind:'dino' },
  panda: { body:0xfafafa, accent:0x222222, kind:'panda' },
  sheep: { body:0xfff5fa, accent:0xffc8df, kind:'sheep' },
  bear:  { body:0xf2c596, accent:0x6a4a30, kind:'bear' },
  bunny: { body:0xfde6f1, accent:0xffb3d1, kind:'bunny' },
  crab:  { body:0xff7c63, accent:0xffd0bb, kind:'crab' },
  bird:  { body:0xc6b6ff, accent:0xfff0a8, kind:'bird' },
};

// ---- internal singleton state ----
let renderer = null;
let scene = null;
let camera = null;
let root = null;          // group that we apply user rotation to
let autoSpinGroup = null; // child group that auto-rotates (so user drag
                          // resets nicely)
let dragRotX = 0, dragRotY = 0;
let isDragging = false;
let containerEl = null;
let resizeObserver = null;
let raf = 0;
let mode = null;          // 'egg' | 'pet'
let eggMesh = null;       // for crack texture updates
let pulseT = 0;           // for cute breathing animation

// ---- public API ----

// Mount the 3D view into the given container element. `kind` drives whether
// we build an egg or a hatched pet, `petType` selects which species.
// Caller may pass `progress` (0..1) for eggs to render the crack stage.
export function mountPet3D(container, { kind, petType, progress = 0 }) {
  unmountPet3D();
  containerEl = container;
  mode = kind;

  const w = container.clientWidth || 320;
  const h = container.clientHeight || 320;

  scene = new THREE.Scene();
  // Soft pink ambient + a key light for shape readability.
  scene.add(new THREE.AmbientLight(0xfff0f6, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd0e8, 0.6);
  rim.position.set(-3, 2, -2);
  scene.add(rim);

  camera = new THREE.PerspectiveCamera(35, w/h, 0.1, 100);
  camera.position.set(0, 0.2, 5.6);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x000000, 0); // transparent — let CSS gradient show
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);

  root = new THREE.Group();
  scene.add(root);
  autoSpinGroup = new THREE.Group();
  root.add(autoSpinGroup);

  if (kind === 'egg') {
    autoSpinGroup.add(buildEgg(petType, progress));
  } else {
    autoSpinGroup.add(buildPet(petType));
  }

  // Resize handling — the pet stage can shrink/grow on rotation.
  resizeObserver = new ResizeObserver(() => {
    if (!renderer || !camera || !containerEl) return;
    const w = containerEl.clientWidth, h = containerEl.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  resizeObserver.observe(container);

  bindDrag(renderer.domElement);
  startRaf();
}

export function unmountPet3D() {
  cancelAnimationFrame(raf); raf = 0;
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  if (renderer) {
    renderer.domElement.remove();
    renderer.dispose();
    renderer = null;
  }
  if (scene) {
    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const m = obj.material;
        (Array.isArray(m) ? m : [m]).forEach(mm => {
          if (mm.map) mm.map.dispose();
          mm.dispose();
        });
      }
    });
    scene = null;
  }
  camera = null; root = null; autoSpinGroup = null; eggMesh = null;
  mode = null; isDragging = false; dragRotX = 0; dragRotY = 0;
  containerEl = null;
}

// Bump the egg's crack stage live (called as kid waters/suns).
export function setEggProgress(progress) {
  if (mode !== 'egg' || !eggMesh) return;
  const tex = makeEggTexture(progress);
  if (eggMesh.material.map) eggMesh.material.map.dispose();
  eggMesh.material.map = tex;
  eggMesh.material.needsUpdate = true;
}

// Cute "wiggle" reaction when the pet is tapped — short scale-bounce.
export function wigglePet3D() {
  if (!autoSpinGroup) return;
  const start = performance.now();
  const dur = 600;
  const baseY = autoSpinGroup.rotation.y;
  function step(now) {
    const t = (now - start) / dur;
    if (t >= 1) {
      autoSpinGroup.scale.set(1, 1, 1);
      return;
    }
    // Bouncy scale + cheeky head-shake
    const s = 1 + 0.18 * Math.sin(t * Math.PI * 2) * (1 - t);
    autoSpinGroup.scale.set(s, s, s);
    autoSpinGroup.rotation.y = baseY + Math.sin(t * Math.PI * 4) * 0.25 * (1 - t);
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ---- internals ----

function startRaf() {
  const tick = () => {
    if (!renderer) return;
    raf = requestAnimationFrame(tick);
    if (autoSpinGroup && !isDragging) {
      autoSpinGroup.rotation.y += 0.01;
    }
    pulseT += 0.04;
    // Subtle breathing for the pet body so it feels alive.
    if (autoSpinGroup && mode === 'pet') {
      const s = 1 + Math.sin(pulseT) * 0.02;
      autoSpinGroup.scale.set(s, s, s);
    }
    renderer.render(scene, camera);
  };
  tick();
}

function bindDrag(dom) {
  let lastX = 0, lastY = 0;
  let resumeT = 0;
  dom.addEventListener('pointerdown', e => {
    isDragging = true;
    lastX = e.clientX; lastY = e.clientY;
    dom.setPointerCapture(e.pointerId);
    if (resumeT) { clearTimeout(resumeT); resumeT = 0; }
  });
  dom.addEventListener('pointermove', e => {
    if (!isDragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    dragRotY += dx * 0.01;
    dragRotX = Math.max(-1.0, Math.min(1.0, dragRotX + dy * 0.01));
    root.rotation.set(dragRotX, dragRotY, 0);
    // Apply to the spin group's parent so auto-spin keeps adding on top.
    autoSpinGroup.rotation.x = 0; // we drive X via root
    lastX = e.clientX; lastY = e.clientY;
  });
  const stop = () => {
    if (!isDragging) return;
    isDragging = false;
    // Resume auto-spin shortly so the kid sees their final pose first.
    resumeT = setTimeout(() => { isDragging = false; }, 1200);
  };
  dom.addEventListener('pointerup', stop);
  dom.addEventListener('pointercancel', stop);
  dom.addEventListener('pointerleave', stop);
}

// ---- egg geometry / texture ----

function buildEgg(petType, progress) {
  const look = PET_LOOK[petType] || PET_LOOK.duck;
  const geo = new THREE.SphereGeometry(1.05, 64, 64);
  // Squash into egg shape: stretch Y, taper top.
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setY(i, y * 1.32);
    // Slight top taper
    const taper = 1 - Math.max(0, y) * 0.18;
    pos.setX(i, pos.getX(i) * taper);
    pos.setZ(i, pos.getZ(i) * taper);
  }
  geo.computeVertexNormals();

  const tex = makeEggTexture(progress, look.body, look.accent);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.55,
    metalness: 0.05,
    color: 0xffffff,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = 0.06;
  eggMesh = mesh;
  return mesh;
}

// Draws the egg shell as a 2D canvas texture: base shell color, a few cute
// dots, and procedural cracks whose count + length depend on `progress`.
function makeEggTexture(progress, body = 0xfff2a0, accent = 0xff9bbb) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512; // 2:1 for sphere wrap
  const ctx = c.getContext('2d');
  // Base vertical gradient for shading
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, hexLighten(body, 0.18));
  g.addColorStop(0.5, hexToCss(body));
  g.addColorStop(1, hexLighten(body, -0.12));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  // Cute polka dots
  ctx.fillStyle = hexToCss(accent);
  const rng = mulberry32(42);
  for (let i = 0; i < 26; i++) {
    const x = rng() * c.width;
    const y = 60 + rng() * (c.height - 120);
    const r = 8 + rng() * 14;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cracks — count and length scale with progress (0..1)
  const stage = Math.max(0, Math.min(4, Math.round(progress * 4)));
  const crackCount = stage * 2; // 0,2,4,6,8 cracks
  if (crackCount > 0) {
    const rng2 = mulberry32(99);
    ctx.strokeStyle = '#3a2a3a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < crackCount; i++) {
      const cx = rng2() * c.width;
      const cy = 100 + rng2() * (c.height - 200);
      const branches = 2 + Math.floor(rng2() * 3);
      const baseLen = 30 + stage * 18 + rng2() * 30;
      for (let b = 0; b < branches; b++) {
        const ang = rng2() * Math.PI * 2;
        let x = cx, y = cy;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const segs = 4 + Math.floor(rng2() * 3);
        for (let s = 0; s < segs; s++) {
          const len = baseLen / segs;
          x += Math.cos(ang + (rng2() - 0.5) * 1.2) * len;
          y += Math.sin(ang + (rng2() - 0.5) * 1.2) * len;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    if (stage >= 4) {
      // Final stage: a glowing "about to hatch" highlight
      const grad = ctx.createRadialGradient(c.width/2, c.height/2, 20, c.width/2, c.height/2, 220);
      grad.addColorStop(0, 'rgba(255,255,180,0.9)');
      grad.addColorStop(1, 'rgba(255,255,180,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, c.width, c.height);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ---- pet meshes ----

function buildPet(petType) {
  const look = PET_LOOK[petType] || PET_LOOK.duck;
  const group = new THREE.Group();

  const body = sphere(1.0, look.body);
  body.scale.set(1, 0.95, 1);
  group.add(body);

  // Belly / accent patch (front)
  const belly = sphere(0.7, hexLighten(look.body, 0.18));
  belly.scale.set(1, 0.85, 0.6);
  belly.position.set(0, -0.05, 0.55);
  group.add(belly);

  // Eyes — two small white spheres with darker pupils
  const eyeL = sphere(0.16, 0xffffff); eyeL.position.set(-0.32, 0.28, 0.85);
  const eyeR = sphere(0.16, 0xffffff); eyeR.position.set( 0.32, 0.28, 0.85);
  const pupL = sphere(0.07, 0x222233); pupL.position.set(-0.30, 0.27, 0.97);
  const pupR = sphere(0.07, 0x222233); pupR.position.set( 0.30, 0.27, 0.97);
  group.add(eyeL, eyeR, pupL, pupR);

  // Cheek blush
  const blushL = sphere(0.10, 0xffaac4); blushL.position.set(-0.55, 0.05, 0.7); blushL.scale.set(1, 0.6, 0.4);
  const blushR = sphere(0.10, 0xffaac4); blushR.position.set( 0.55, 0.05, 0.7); blushR.scale.set(1, 0.6, 0.4);
  group.add(blushL, blushR);

  // Per-species accessories
  switch (look.kind) {
    case 'duck':
      // beak (cone) + tail
      group.add(orientCone(0.18, 0.35, look.accent, [0, -0.05, 0.95], [Math.PI/2, 0, 0]));
      group.add(sphereAt(0.2, look.body, [0, 0, -0.95]));
      break;
    case 'dino': {
      // back spikes
      for (let i = -1; i <= 1; i++) {
        group.add(orientCone(0.15, 0.32, look.accent, [0, 0.85, i * 0.45], [0, 0, 0]));
      }
      // little arms
      group.add(sphereAt(0.18, look.body, [-0.85, -0.1, 0.25]));
      group.add(sphereAt(0.18, look.body, [ 0.85, -0.1, 0.25]));
      break;
    }
    case 'panda': {
      group.add(sphereAt(0.28, look.accent, [-0.6, 0.7, 0.3])); // ear L
      group.add(sphereAt(0.28, look.accent, [ 0.6, 0.7, 0.3])); // ear R
      // panda eye patches
      const patchL = sphere(0.22, look.accent); patchL.position.set(-0.32, 0.3, 0.75); patchL.scale.set(1,1.1,0.6);
      const patchR = sphere(0.22, look.accent); patchR.position.set( 0.32, 0.3, 0.75); patchR.scale.set(1,1.1,0.6);
      group.add(patchL, patchR);
      break;
    }
    case 'sheep': {
      // fluff balls all over
      const rng = mulberry32(7);
      for (let i = 0; i < 24; i++) {
        const u = rng() * Math.PI * 2;
        const v = (rng() - 0.5) * Math.PI * 0.9;
        const r = 1.02;
        const x = Math.cos(u) * Math.cos(v) * r;
        const y = Math.sin(v) * r * 0.95;
        const z = Math.sin(u) * Math.cos(v) * r;
        if (z < -0.1) continue; // skip hidden side
        group.add(sphereAt(0.18 + rng() * 0.06, hexLighten(look.body, 0.1), [x, y, z]));
      }
      // ears
      group.add(sphereAt(0.14, look.accent, [-0.5, 0.7, 0.3]));
      group.add(sphereAt(0.14, look.accent, [ 0.5, 0.7, 0.3]));
      break;
    }
    case 'bear': {
      group.add(sphereAt(0.24, look.body, [-0.6, 0.7, 0.25])); // ears
      group.add(sphereAt(0.24, look.body, [ 0.6, 0.7, 0.25]));
      group.add(sphereAt(0.16, hexLighten(look.body, -0.15), [-0.6, 0.7, 0.35]));
      group.add(sphereAt(0.16, hexLighten(look.body, -0.15), [ 0.6, 0.7, 0.35]));
      // muzzle
      const muzzle = sphere(0.32, hexLighten(look.body, 0.15)); muzzle.position.set(0, 0, 0.85); muzzle.scale.set(1, 0.7, 0.6);
      group.add(muzzle);
      group.add(sphereAt(0.07, 0x222222, [0, 0.05, 1.05])); // nose
      break;
    }
    case 'bunny': {
      // long ears
      const earGeo = new THREE.CapsuleGeometry(0.13, 0.8, 4, 12);
      const earMat = new THREE.MeshStandardMaterial({ color: look.body, roughness: 0.7 });
      const earL = new THREE.Mesh(earGeo, earMat);
      earL.position.set(-0.32, 1.2, 0.1); earL.rotation.z = 0.18;
      const earR = earL.clone(); earR.position.x = 0.32; earR.rotation.z = -0.18;
      group.add(earL, earR);
      // Inner pink ear strips
      const innerGeo = new THREE.CapsuleGeometry(0.07, 0.6, 4, 8);
      const innerMat = new THREE.MeshStandardMaterial({ color: look.accent, roughness: 0.7 });
      const innerL = new THREE.Mesh(innerGeo, innerMat); innerL.position.set(-0.30, 1.18, 0.18); innerL.rotation.z = 0.18;
      const innerR = innerL.clone(); innerR.position.x = 0.30; innerR.rotation.z = -0.18;
      group.add(innerL, innerR);
      group.add(sphereAt(0.18, hexLighten(look.body, 0.12), [0, -0.7, -0.95])); // tail puff
      break;
    }
    case 'crab': {
      // claws
      group.add(sphereAt(0.32, look.body, [-1.05, -0.2, 0.4]));
      group.add(sphereAt(0.32, look.body, [ 1.05, -0.2, 0.4]));
      // eye-stalks
      group.add(orientCone(0.06, 0.45, look.body, [-0.18, 0.85, 0.7], [0, 0, 0]));
      group.add(orientCone(0.06, 0.45, look.body, [ 0.18, 0.85, 0.7], [0, 0, 0]));
      group.add(sphereAt(0.14, 0x222222, [-0.18, 1.12, 0.7]));
      group.add(sphereAt(0.14, 0x222222, [ 0.18, 1.12, 0.7]));
      break;
    }
    case 'bird': {
      // wings
      const wingGeo = new THREE.SphereGeometry(0.5, 24, 16);
      const wingMat = new THREE.MeshStandardMaterial({ color: hexLighten(look.body, -0.1), roughness: 0.7 });
      const wL = new THREE.Mesh(wingGeo, wingMat); wL.position.set(-0.85, 0, 0); wL.scale.set(0.5, 0.9, 0.5);
      const wR = wL.clone(); wR.position.x = 0.85;
      group.add(wL, wR);
      group.add(orientCone(0.16, 0.32, look.accent, [0, 0, 0.95], [Math.PI/2, 0, 0]));
      // head crest
      group.add(orientCone(0.08, 0.25, look.accent, [0, 0.95, 0.2], [0, 0, 0]));
      break;
    }
  }

  return group;
}

// ---- mesh helpers ----

function sphere(r, color) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(r, 32, 24),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.04 }),
  );
}
function sphereAt(r, color, pos) {
  const m = sphere(r, color); m.position.set(pos[0], pos[1], pos[2]); return m;
}
function orientCone(r, h, color, pos, rot) {
  const m = new THREE.Mesh(
    new THREE.ConeGeometry(r, h, 24),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55 }),
  );
  m.position.set(pos[0], pos[1], pos[2]);
  m.rotation.set(rot[0], rot[1], rot[2]);
  return m;
}

// ---- color utils ----

function hexToCss(h) {
  return '#' + h.toString(16).padStart(6, '0');
}
function hexLighten(h, amt) {
  // amt: -1..1
  const r = (h >> 16) & 0xff, g = (h >> 8) & 0xff, b = h & 0xff;
  const f = amt >= 0 ? (v) => Math.round(v + (255 - v) * amt) : (v) => Math.round(v * (1 + amt));
  const rr = Math.max(0, Math.min(255, f(r)));
  const gg = Math.max(0, Math.min(255, f(g)));
  const bb = Math.max(0, Math.min(255, f(b)));
  return `rgb(${rr},${gg},${bb})`;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
