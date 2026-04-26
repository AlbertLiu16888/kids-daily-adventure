// Real 3D pet & egg view using three.js — v3 anatomically-redesigned models.
//
// Why procedural three.js (not GLTF or AI assets)?
//   - Grok image API was disabled when we shipped this; every other CDN-hosted
//     "cute pet" GLB pack we tried either had an attribution license that
//     didn't fit a kids' app, or scaled badly on phones.
//   - Procedural keeps the bundle tiny, loads instantly, and lets us morph
//     proportions for the growth-stage system below.
//
// What changed vs v2
//   - Each pet has a real anatomy: separate head + body + neck + 4 limbs +
//     tail + species-specific features (long bunny ears, dino spike row, T-Rex
//     arms, panda eye patches, sheep fluff cloud, crab pincers + 6 legs, etc.)
//     so it actually reads as the species, not "blob with pieces".
//   - Stage system: petStage(pet) → 'baby' | 'young' | 'adult'. The anatomy
//     builder takes a `stage` and tweaks: overall scale, head:body ratio,
//     eye size, limb length, plus per-species extras (horns appear on adult
//     sheep, spikes grow on adult dino, ears straighten on adult bunny).
//   - Subtle ground shadow + breathing pulse so the kid sees a small living
//     creature, not a static toy.
//
// Egg renderer is unchanged — it was already loved.

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// ---- Pet type → palette + builder ----
const PET_LOOK = {
  duck:  { body:0xfff2a0, accent:0xff8c33, dark:0x6b3f12, kind:'duck'  },
  dino:  { body:0x9be08a, accent:0x2f8a4d, dark:0x1d5a2f, kind:'dino'  },
  panda: { body:0xfafafa, accent:0x222222, dark:0x000000, kind:'panda' },
  sheep: { body:0xfff5fa, accent:0xffc8df, dark:0x4a3a3a, kind:'sheep' },
  bear:  { body:0xf2c596, accent:0x8a5a30, dark:0x4a2a14, kind:'bear'  },
  bunny: { body:0xfde6f1, accent:0xffb3d1, dark:0x6a4a55, kind:'bunny' },
  crab:  { body:0xff7c63, accent:0xffd0bb, dark:0x8a2a1a, kind:'crab'  },
  bird:  { body:0xc6b6ff, accent:0xfff0a8, dark:0x4a3a8a, kind:'bird'  },
};

// Stage → anatomy parameters. The builders read from this so growing up
// happens with one number tweak, not eight per-species rewrites.
//
// `bodyRatio` is multiplied into body/torso scale so a baby with a big head
// also gets a small body (preserving cute proportions instead of two
// overlapping spheres). `headLift` adds extra vertical separation between
// body top and head bottom so larger heads visibly sit on top of the body.
const STAGE_PARAMS = {
  baby:  { scale: 0.85, headRatio: 1.15, eyeRatio: 1.25, limbLen: 0.65, bodyRatio: 0.78, headLift: 0.0,  extras: false },
  young: { scale: 1.00, headRatio: 1.00, eyeRatio: 1.00, limbLen: 1.00, bodyRatio: 1.00, headLift: 0.0,  extras: false },
  adult: { scale: 1.20, headRatio: 0.90, eyeRatio: 0.85, limbLen: 1.18, bodyRatio: 1.10, headLift: 0.0,  extras: true  },
};

// ---- internal singleton state ----
let renderer = null;
let scene = null;
let camera = null;
let root = null;
let autoSpinGroup = null;
let dragRotX = 0, dragRotY = 0;
let isDragging = false;
let containerEl = null;
let resizeObserver = null;
let raf = 0;
let mode = null;        // 'egg' | 'pet'
let eggMesh = null;     // for crack texture updates
let pulseT = 0;

// ---- public API ----

// Mount the 3D view. `kind` = 'egg' | 'pet'; `petType` = species; `progress` =
// egg crack progress 0..1; `stage` = 'baby' | 'young' | 'adult' (pet only).
export function mountPet3D(container, { kind, petType, progress = 0, stage = 'young' }) {
  unmountPet3D();
  containerEl = container;
  mode = kind;

  const w = container.clientWidth || 320;
  const h = container.clientHeight || 320;

  scene = new THREE.Scene();
  // Lights: warm fill + cool key + tinted rim → reads as soft daylight.
  scene.add(new THREE.AmbientLight(0xfff0f6, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(2.5, 3.2, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd0e8, 0.5);
  rim.position.set(-3, 2, -2);
  scene.add(rim);
  const bottom = new THREE.HemisphereLight(0xfff5fb, 0x8a6a8a, 0.35);
  scene.add(bottom);

  camera = new THREE.PerspectiveCamera(38, w/h, 0.1, 100);
  // Pull back a touch + look at the body's center-of-mass (slightly above
  // floor) so the whole creature — head + body + legs + shadow — fits in
  // frame for every species and every growth stage.
  camera.position.set(0, 0.5, 7.0);
  camera.lookAt(0, -0.15, 0);

  // preserveDrawingBuffer:true so screenshots / debug tools that snapshot the
  // page DOM see the rendered frame (default-false back buffer is wiped after
  // each present and would screenshot transparent). Tiny perf cost, fine here.
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x000000, 0);
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
    autoSpinGroup.add(buildPet(petType, stage));
    // Soft contact shadow on the floor so the pet feels grounded.
    autoSpinGroup.add(buildShadowDisc());
  }

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

export function setEggProgress(progress) {
  if (mode !== 'egg' || !eggMesh) return;
  const tex = makeEggTexture(progress);
  if (eggMesh.material.map) eggMesh.material.map.dispose();
  eggMesh.material.map = tex;
  eggMesh.material.needsUpdate = true;
}

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
      autoSpinGroup.rotation.y += 0.008;
    }
    pulseT += 0.04;
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
    autoSpinGroup.rotation.x = 0;
    lastX = e.clientX; lastY = e.clientY;
  });
  const stop = () => {
    if (!isDragging) return;
    isDragging = false;
    resumeT = setTimeout(() => { isDragging = false; }, 1200);
  };
  dom.addEventListener('pointerup', stop);
  dom.addEventListener('pointercancel', stop);
  dom.addEventListener('pointerleave', stop);
}

// ---- egg geometry / texture (unchanged from v2) ----

function buildEgg(petType, progress) {
  const look = PET_LOOK[petType] || PET_LOOK.duck;
  const geo = new THREE.SphereGeometry(1.05, 64, 64);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setY(i, y * 1.32);
    const taper = 1 - Math.max(0, y) * 0.18;
    pos.setX(i, pos.getX(i) * taper);
    pos.setZ(i, pos.getZ(i) * taper);
  }
  geo.computeVertexNormals();
  const tex = makeEggTexture(progress, look.body, look.accent);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.05, color: 0xffffff });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = 0.06;
  eggMesh = mesh;
  return mesh;
}

function makeEggTexture(progress, body = 0xfff2a0, accent = 0xff9bbb) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, hexLighten(body, 0.18));
  g.addColorStop(0.5, hexToCss(body));
  g.addColorStop(1, hexLighten(body, -0.12));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
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
  const stage = Math.max(0, Math.min(4, Math.round(progress * 4)));
  const crackCount = stage * 2;
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

// ---- pet anatomy ----

function buildPet(petType, stageName) {
  const look = PET_LOOK[petType] || PET_LOOK.duck;
  const stage = STAGE_PARAMS[stageName] || STAGE_PARAMS.young;
  const root = new THREE.Group();

  switch (look.kind) {
    case 'duck':  buildDuck(root, look, stage);  break;
    case 'dino':  buildDino(root, look, stage);  break;
    case 'panda': buildPanda(root, look, stage); break;
    case 'sheep': buildSheep(root, look, stage); break;
    case 'bear':  buildBear(root, look, stage);  break;
    case 'bunny': buildBunny(root, look, stage); break;
    case 'crab':  buildCrab(root, look, stage);  break;
    case 'bird':  buildBird(root, look, stage);  break;
    default:      buildBunny(root, look, stage);
  }

  // Apply overall stage scale (anatomy details already used per-stage params).
  root.scale.set(stage.scale, stage.scale, stage.scale);
  // Lift the whole creature so it sits above the shadow disc at y = -1.05.
  root.position.y = 0;
  return root;
}

// ---------- per-species builders ----------

function buildDuck(g, look, st) {
  const br = st.bodyRatio;
  const bodyRX = 0.85*br, bodyRY = 0.7*br, bodyRZ = 1.0*br;
  const bodyCY = -0.05;
  const body = ellipsoid(bodyRX, bodyRY, bodyRZ, look.body);
  body.position.y = bodyCY;
  g.add(body);
  const belly = ellipsoid(0.6*br, 0.4*br, 0.7*br, hexLighten(look.body, 0.22));
  belly.position.set(0, bodyCY - 0.3*br, 0.35*br);
  g.add(belly);

  // Head with neck — sit clearly on top of body
  const headR = 0.42 * st.headRatio;
  const headY = bodyCY + bodyRY + headR * 0.5 + st.headLift;
  const headZ = 0.35 * br;
  const head = sphere(headR, look.body);
  head.position.set(0, headY, headZ);
  g.add(head);

  // Beak: flat orange wedge protruding from head front
  const beak = box(0.32, 0.12, 0.28, look.accent);
  beak.position.set(0, headY - headR*0.1, headZ + headR + 0.1);
  g.add(beak);
  const beakLip = box(0.28, 0.05, 0.18, hexLighten(look.accent, -0.12));
  beakLip.position.set(0, headY - headR*0.18, headZ + headR + 0.1);
  g.add(beakLip);

  addEyes(g, [headR*0.6, headY + headR*0.1, headZ + headR*0.6], st.eyeRatio, 0.16);

  // Wings tucked along sides
  const wL = ellipsoid(0.4*br, 0.55*br, 0.18*br, hexLighten(look.body, -0.08));
  wL.position.set(-bodyRX*0.85, 0.05, 0.0);
  g.add(wL);
  const wR = wL.clone(); wR.position.x = bodyRX*0.85; g.add(wR);

  // Webbed feet
  const footL = box(0.22, 0.06, 0.32, look.accent);
  footL.position.set(-0.25, bodyCY - bodyRY - 0.05, 0.25);
  g.add(footL);
  const footR = footL.clone(); footR.position.x = 0.25; g.add(footR);

  // Tail tuft
  g.add(sphereAt(0.18, look.body, [0, bodyCY + 0.05, -bodyRZ - 0.05]));

  // Adult: head crest
  if (st.extras) {
    const crest = cone(0.07, 0.18, look.accent);
    crest.position.set(0, headY + headR + 0.1, headZ - 0.05);
    g.add(crest);
  }
}

function buildDino(g, look, st) {
  // T-Rex-ish: pear body, long tail, thick legs, big head on stubby neck,
  // tiny arms, dorsal spike row.
  const br = st.bodyRatio;
  const bodyRX = 0.7*br, bodyRY = 0.85*br, bodyRZ = 0.95*br;
  const bodyCY = -0.05;
  const body = ellipsoid(bodyRX, bodyRY, bodyRZ, look.body);
  body.position.y = bodyCY;
  g.add(body);
  const belly = ellipsoid(0.45*br, 0.5*br, 0.55*br, hexLighten(look.body, 0.18));
  belly.position.set(0, bodyCY - 0.2*br, 0.45*br);
  g.add(belly);

  // Neck + head — head sits clearly above body
  const headR = 0.5 * st.headRatio;
  const headY = bodyCY + bodyRY + headR * 0.55 + st.headLift;
  const headZ = 0.6 * br;
  const neck = ellipsoid(0.32*st.limbLen, 0.45*st.limbLen, 0.32*st.limbLen, look.body);
  neck.position.set(0, bodyCY + bodyRY + 0.1, 0.35*br);
  g.add(neck);
  const head = sphere(headR, look.body);
  head.position.set(0, headY, headZ);
  g.add(head);
  // Snout protruding forward
  const snout = ellipsoid(0.32, 0.22, 0.4, hexLighten(look.body, -0.08));
  snout.position.set(0, headY - headR*0.2, headZ + headR*0.7);
  g.add(snout);
  // Teeth row
  const teeth = box(0.4, 0.06, 0.05, 0xffffff);
  teeth.position.set(0, headY - headR*0.45, headZ + headR*0.95);
  g.add(teeth);

  // Eyes
  addEyes(g, [headR*0.5, headY + headR*0.15, headZ + headR*0.7], st.eyeRatio, 0.18);

  // Tiny T-Rex arms
  const armL = ellipsoid(0.1, 0.2, 0.1, look.body);
  armL.position.set(-bodyRX - 0.05, 0.0, 0.5*br);
  g.add(armL);
  const armR = armL.clone(); armR.position.x = bodyRX + 0.05; g.add(armR);

  // Thick legs
  const legR = 0.22 * st.limbLen;
  const legH = 0.5 * st.limbLen;
  const legGeo = new THREE.CylinderGeometry(legR, legR*1.2, legH, 16);
  const legMat = new THREE.MeshStandardMaterial({ color: look.body, roughness:0.6 });
  const legY = bodyCY - bodyRY * 0.85;
  const legL = new THREE.Mesh(legGeo, legMat); legL.position.set(-0.4, legY, 0.15); g.add(legL);
  const legRm = new THREE.Mesh(legGeo, legMat); legRm.position.set(0.4, legY, 0.15); g.add(legRm);
  // Feet
  const footY = legY - legH*0.5 - 0.05;
  const footL = ellipsoid(0.28, 0.12, 0.36, look.accent);
  footL.position.set(-0.4, footY, 0.22);
  g.add(footL);
  const footR = footL.clone(); footR.position.x = 0.4; g.add(footR);

  // Long tapering tail
  const tailSegs = 4;
  for (let i = 1; i <= tailSegs; i++) {
    const r = 0.32 - i*0.06;
    const seg = sphere(Math.max(0.1, r), look.body);
    seg.position.set(0, bodyCY - 0.05 + i*0.04, -bodyRZ - i*0.4);
    g.add(seg);
  }

  // Dorsal spike row
  const spikeBase = st.extras ? 0.22 : 0.12;
  const spikeH = st.extras ? 0.5 : 0.25;
  for (let i = -2; i <= 2; i++) {
    const sp = cone(spikeBase, spikeH, look.accent);
    sp.position.set(0, bodyCY + bodyRY * 0.8, i * 0.3);
    g.add(sp);
  }
}

function buildPanda(g, look, st) {
  const br = st.bodyRatio;
  const bodyRX = 0.95*br, bodyRY = 0.85*br, bodyRZ = 0.85*br;
  const bodyCY = -0.1;
  const body = ellipsoid(bodyRX, bodyRY, bodyRZ, look.body);
  body.position.y = bodyCY;
  g.add(body);
  const saddle = ellipsoid(bodyRX*1.02, 0.25*br, bodyRZ*1.02, look.accent);
  saddle.position.y = bodyCY + 0.15*br;
  g.add(saddle);

  const headR = 0.65 * st.headRatio;
  const headY = bodyCY + bodyRY + headR * 0.4 + st.headLift;
  const headZ = 0.3 * br;
  const head = sphere(headR, look.body);
  head.position.set(0, headY, headZ);
  g.add(head);

  const earL = ellipsoid(0.18, 0.22, 0.14, look.accent);
  earL.position.set(-headR*0.75, headY + headR*0.85, headZ);
  g.add(earL);
  const earR = earL.clone(); earR.position.x = headR*0.75; g.add(earR);

  const patchL = ellipsoid(0.18, 0.22, 0.06, look.accent);
  patchL.position.set(-headR*0.35, headY + headR*0.15, headZ + headR*0.85);
  patchL.rotation.z = 0.25;
  g.add(patchL);
  const patchR = patchL.clone(); patchR.position.x = headR*0.35; patchR.rotation.z = -0.25; g.add(patchR);
  addEyes(g, [headR*0.35, headY + headR*0.18, headZ + headR*1.0], st.eyeRatio*0.7, 0.1);
  g.add(sphereAt(0.08, look.accent, [0, headY - headR*0.2, headZ + headR + 0.05]));

  const limbR = 0.22;
  const limbH = 0.36 * st.limbLen;
  const armGeo = new THREE.CylinderGeometry(limbR, limbR, limbH, 16);
  const limbMat = new THREE.MeshStandardMaterial({ color: look.accent, roughness:0.6 });
  const armL = new THREE.Mesh(armGeo, limbMat); armL.position.set(-bodyRX-0.05, 0.0, 0.4*br); armL.rotation.z = 0.4; g.add(armL);
  const armR = new THREE.Mesh(armGeo, limbMat); armR.position.set(bodyRX+0.05, 0.0, 0.4*br); armR.rotation.z = -0.4; g.add(armR);
  const legY = bodyCY - bodyRY * 0.7;
  const legL = new THREE.Mesh(armGeo, limbMat); legL.position.set(-0.45*br, legY, -0.1*br); g.add(legL);
  const legR = new THREE.Mesh(armGeo, limbMat); legR.position.set(0.45*br, legY, -0.1*br); g.add(legR);
}

function buildSheep(g, look, st) {
  // Cloud body — many small spheres
  const br = st.bodyRatio;
  const cloudCount = st.extras ? 36 : 26;
  const cloudR = 0.95 * br;
  const rng = mulberry32(7);
  for (let i = 0; i < cloudCount; i++) {
    const u = rng() * Math.PI * 2;
    const v = (rng() - 0.5) * Math.PI * 0.95;
    const x = Math.cos(u) * Math.cos(v) * cloudR;
    const y = Math.sin(v) * cloudR * 0.95 - 0.05;
    const z = Math.sin(u) * Math.cos(v) * cloudR;
    if (z < -0.25*br) continue;
    g.add(sphereAt(0.18 + rng() * 0.06, hexLighten(look.body, 0.05), [x, y, z]));
  }

  // Face on front
  const headR = 0.4 * st.headRatio;
  const faceY = 0.15 + st.headLift * 0.5;
  const faceZ = cloudR + 0.05;
  const face = sphere(headR, look.accent);
  face.position.set(0, faceY, faceZ);
  g.add(face);
  // Dark muzzle (forward of face)
  const muzzle = ellipsoid(0.18, 0.12, 0.18, look.dark);
  muzzle.position.set(0, faceY - headR*0.3, faceZ + headR*0.6);
  g.add(muzzle);
  addEyes(g, [headR*0.55, faceY + headR*0.15, faceZ + headR*0.5], st.eyeRatio*0.7, 0.12);
  // Floppy ears
  const earL = ellipsoid(0.18, 0.08, 0.08, look.accent);
  earL.position.set(-headR - 0.1, faceY + headR*0.35, faceZ - 0.1); earL.rotation.z = 0.4; g.add(earL);
  const earR = earL.clone(); earR.position.x = headR + 0.1; earR.rotation.z = -0.4; g.add(earR);

  // Thin black legs (4 short)
  const legR = 0.08;
  const legH = 0.4 * st.limbLen;
  const legMat = new THREE.MeshStandardMaterial({ color: look.dark, roughness:0.6 });
  const legGeo = new THREE.CylinderGeometry(legR, legR, legH, 12);
  const legY = -cloudR + 0.1;
  [[-0.4*br,legY,0.45*br],[0.4*br,legY,0.45*br],[-0.4*br,legY,-0.4*br],[0.4*br,legY,-0.4*br]].forEach(p => {
    const l = new THREE.Mesh(legGeo, legMat); l.position.set(p[0], p[1], p[2]); g.add(l);
  });

  // Adult sheep: small curly horns
  if (st.extras) {
    const hornGeo = new THREE.TorusGeometry(0.13, 0.05, 8, 14, Math.PI*1.4);
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xddc28a, roughness:0.6 });
    const hL = new THREE.Mesh(hornGeo, hornMat);
    hL.position.set(-headR*0.6, faceY + headR*0.85, faceZ - 0.05); hL.rotation.set(0.3, 0, 0.6); g.add(hL);
    const hR = new THREE.Mesh(hornGeo, hornMat);
    hR.position.set(headR*0.6, faceY + headR*0.85, faceZ - 0.05); hR.rotation.set(0.3, 0, -0.6); g.add(hR);
  }
}

function buildBear(g, look, st) {
  const br = st.bodyRatio;
  const bodyRX = 0.9*br, bodyRY = 0.95*br, bodyRZ = 0.85*br;
  const bodyCY = -0.1;
  const body = ellipsoid(bodyRX, bodyRY, bodyRZ, look.body);
  body.position.y = bodyCY;
  g.add(body);
  const belly = ellipsoid(0.55*br, 0.55*br, 0.5*br, hexLighten(look.body, 0.18));
  belly.position.set(0, bodyCY - 0.1*br, 0.55*br);
  g.add(belly);

  const headR = 0.62 * st.headRatio;
  const headY = bodyCY + bodyRY + headR * 0.45 + st.headLift;
  const headZ = 0.3 * br;
  const head = sphere(headR, look.body);
  head.position.set(0, headY, headZ);
  g.add(head);

  const earL = sphere(0.22, look.body); earL.position.set(-headR*0.7, headY + headR*0.85, headZ-0.05); g.add(earL);
  const earR = earL.clone(); earR.position.x = headR*0.7; g.add(earR);
  const innerL = sphere(0.13, hexLighten(look.body, -0.18)); innerL.position.set(-headR*0.7, headY + headR*0.85, headZ + 0.1); g.add(innerL);
  const innerR = innerL.clone(); innerR.position.x = headR*0.7; g.add(innerR);

  const muzzle = ellipsoid(0.34, 0.26, 0.32, hexLighten(look.body, 0.15));
  muzzle.position.set(0, headY - headR*0.3, headZ + headR*0.85);
  g.add(muzzle);
  g.add(sphereAt(0.08, 0x222222, [0, headY - headR*0.2, headZ + headR + 0.15]));
  addEyes(g, [headR*0.4, headY + headR*0.2, headZ + headR*0.7], st.eyeRatio*0.85, 0.16);

  const limbR = 0.22;
  const limbH = 0.42 * st.limbLen;
  const limbMat = new THREE.MeshStandardMaterial({ color: hexLighten(look.body, -0.08), roughness:0.6 });
  const limbGeo = new THREE.CylinderGeometry(limbR, limbR*0.9, limbH, 16);
  const aL = new THREE.Mesh(limbGeo, limbMat); aL.position.set(-bodyRX-0.05, -0.05, 0.45*br); aL.rotation.z = 0.5; g.add(aL);
  const aR = new THREE.Mesh(limbGeo, limbMat); aR.position.set(bodyRX+0.05, -0.05, 0.45*br); aR.rotation.z = -0.5; g.add(aR);
  const legY = bodyCY - bodyRY * 0.85;
  const lL = new THREE.Mesh(limbGeo, limbMat); lL.position.set(-0.4, legY, 0.0); g.add(lL);
  const lR = new THREE.Mesh(limbGeo, limbMat); lR.position.set(0.4, legY, 0.0); g.add(lR);
  const padY = legY - limbH*0.5 - 0.05;
  [[-0.4,padY,0],[0.4,padY,0]].forEach(p => g.add(sphereAt(0.16, hexLighten(look.body, -0.18), p)));
}

function buildBunny(g, look, st) {
  // Body: small round (bodyRatio shrinks for chubby-baby look).
  const br = st.bodyRatio;
  const bodyRX = 0.7 * br, bodyRY = 0.75 * br, bodyRZ = 0.75 * br;
  const bodyCY = -0.05 * br;
  const body = ellipsoid(bodyRX, bodyRY, bodyRZ, look.body);
  body.position.y = bodyCY;
  g.add(body);
  const belly = ellipsoid(0.42*br, 0.45*br, 0.4*br, hexLighten(look.body, 0.18));
  belly.position.set(0, bodyCY - 0.17*br, 0.5*br);
  g.add(belly);

  // Head — sits on top of body. Y is computed so head bottom always clears
  // body top by `headLift`, regardless of headRatio.
  const headR = 0.55 * st.headRatio;
  const headY = bodyCY + bodyRY + headR * 0.55 + st.headLift;
  const head = sphere(headR, look.body);
  head.position.set(0, headY, 0.3 * br);
  g.add(head);

  // LONG ears — capsules. Baby = short stubs, Young = medium, Adult = long upright.
  const earLen = 0.55 * (st.extras ? 1.3 : st.scale < 0.95 ? 0.55 : 1.0);
  const earR = 0.12;
  const earY = headY + headR * 0.95 + earLen * 0.4;
  const earGeo = new THREE.CapsuleGeometry(earR, earLen, 6, 14);
  const earMat = new THREE.MeshStandardMaterial({ color: look.body, roughness: 0.7 });
  const eL = new THREE.Mesh(earGeo, earMat);
  eL.position.set(-0.25, earY, 0.18);
  eL.rotation.z = st.extras ? 0.05 : 0.18;
  g.add(eL);
  const eR = eL.clone(); eR.position.x = 0.25; eR.rotation.z = -eL.rotation.z; g.add(eR);
  const innerGeo = new THREE.CapsuleGeometry(earR*0.55, earLen*0.85, 4, 10);
  const innerMat = new THREE.MeshStandardMaterial({ color: look.accent, roughness: 0.7 });
  const iL = new THREE.Mesh(innerGeo, innerMat); iL.position.set(-0.25, earY, 0.27); iL.rotation.z = eL.rotation.z; g.add(iL);
  const iR = iL.clone(); iR.position.x = 0.25; iR.rotation.z = -iL.rotation.z; g.add(iR);

  // Eyes (big & shiny for baby) — positioned on the head front
  addEyes(g, [headR*0.4, headY + headR*0.1, headR*0.85], st.eyeRatio*0.95, 0.22);
  // Pink nose triangle (tiny inverted cone)
  const nose = cone(0.08, 0.08, look.accent);
  nose.position.set(0, headY - headR*0.25, headR*0.95);
  nose.rotation.x = Math.PI;
  g.add(nose);
  // Mouth dot
  g.add(sphereAt(0.04, look.dark, [0, headY - headR*0.45, headR*0.95]));

  // Legs: short front + bigger back legs (limbLen scales with stage)
  const frontGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.28*st.limbLen, 12);
  const backGeo  = new THREE.CapsuleGeometry(0.18, 0.16*st.limbLen, 4, 10);
  const limbMat = new THREE.MeshStandardMaterial({ color: look.body, roughness:0.7 });
  const legY = bodyCY - bodyRY * 0.7;
  const fL = new THREE.Mesh(frontGeo, limbMat); fL.position.set(-0.35*br, legY, 0.45*br); g.add(fL);
  const fR = new THREE.Mesh(frontGeo, limbMat); fR.position.set(0.35*br, legY, 0.45*br); g.add(fR);
  const bL = new THREE.Mesh(backGeo, limbMat);  bL.position.set(-0.4*br, legY, -0.2*br); bL.rotation.z = 1.4; g.add(bL);
  const bR = new THREE.Mesh(backGeo, limbMat);  bR.position.set(0.4*br, legY, -0.2*br);  bR.rotation.z = 1.4; g.add(bR);

  // Cotton-ball tail
  g.add(sphereAt(0.24, hexLighten(look.body, 0.15), [0, bodyCY - 0.05, -bodyRZ - 0.1]));
}

function buildCrab(g, look, st) {
  // Flat oval body
  const body = ellipsoid(1.05, 0.45, 0.85, look.body);
  body.position.y = -0.15;
  g.add(body);
  // Belly underside
  const belly = ellipsoid(0.85, 0.18, 0.65, hexLighten(look.body, 0.18));
  belly.position.set(0, -0.4, 0);
  g.add(belly);

  // Eye-stalks: short cylinders going up + black eyeballs
  const stalkGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.32, 10);
  const stalkMat = new THREE.MeshStandardMaterial({ color: look.body, roughness:0.6 });
  const sL = new THREE.Mesh(stalkGeo, stalkMat); sL.position.set(-0.2, 0.35, 0.55); g.add(sL);
  const sR = new THREE.Mesh(stalkGeo, stalkMat); sR.position.set(0.2, 0.35, 0.55); g.add(sR);
  // Eyeballs
  g.add(sphereAt(0.13, 0xffffff, [-0.2, 0.55, 0.55]));
  g.add(sphereAt(0.13, 0xffffff, [0.2, 0.55, 0.55]));
  g.add(sphereAt(0.07, 0x222233, [-0.2, 0.58, 0.65]));
  g.add(sphereAt(0.07, 0x222233, [0.2, 0.58, 0.65]));
  // Smile
  for (let i = -1; i <= 1; i++) g.add(sphereAt(0.04, look.dark, [i*0.08, 0.05, 0.78]));

  // Pincers: spheres + claws (open if adult)
  const pincerR = st.extras ? 0.36 : 0.28;
  const pinL = sphere(pincerR, look.body); pinL.position.set(-1.1, -0.05, 0.3); g.add(pinL);
  const pinR = sphere(pincerR, look.body); pinR.position.set(1.1, -0.05, 0.3); g.add(pinR);
  // Claw tips (cones pointing forward)
  g.add(orientCone(pincerR*0.6, 0.4, look.body, [-1.3, 0.05, 0.5], [Math.PI/2, 0, Math.PI/4]));
  g.add(orientCone(pincerR*0.6, 0.4, look.body, [1.3, 0.05, 0.5], [Math.PI/2, 0, -Math.PI/4]));
  // Claw arms (short cylinders)
  const armGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 12);
  const armMat = new THREE.MeshStandardMaterial({ color: look.body, roughness:0.6 });
  const armL = new THREE.Mesh(armGeo, armMat); armL.position.set(-0.7, -0.1, 0.3); armL.rotation.z = Math.PI/2; g.add(armL);
  const armR = new THREE.Mesh(armGeo, armMat); armR.position.set(0.7, -0.1, 0.3); armR.rotation.z = Math.PI/2; g.add(armR);

  // 6 walking legs (3 each side, segmented)
  const legGeo = new THREE.CapsuleGeometry(0.07, 0.32 * st.limbLen, 4, 8);
  const legMat = new THREE.MeshStandardMaterial({ color: look.dark, roughness:0.6 });
  for (let i = 0; i < 3; i++) {
    const z = 0.1 - i * 0.4;
    const lL = new THREE.Mesh(legGeo, legMat); lL.position.set(-0.95, -0.4, z); lL.rotation.z = Math.PI/2 + 0.3; g.add(lL);
    const lR = new THREE.Mesh(legGeo, legMat); lR.position.set(0.95, -0.4, z);  lR.rotation.z = -Math.PI/2 - 0.3; g.add(lR);
  }
}

function buildBird(g, look, st) {
  const br = st.bodyRatio;
  const bodyRX = 0.7*br, bodyRY = 0.78*br, bodyRZ = 0.78*br;
  const bodyCY = -0.08;
  const body = ellipsoid(bodyRX, bodyRY, bodyRZ, look.body);
  body.position.y = bodyCY;
  g.add(body);
  const belly = ellipsoid(0.45*br, 0.5*br, 0.45*br, hexLighten(look.body, 0.22));
  belly.position.set(0, bodyCY - 0.1*br, 0.45*br);
  g.add(belly);

  const headR = 0.45 * st.headRatio;
  const headY = bodyCY + bodyRY + headR * 0.45 + st.headLift;
  const headZ = 0.25 * br;
  const head = sphere(headR, look.body);
  head.position.set(0, headY, headZ);
  g.add(head);
  const beak = cone(0.13, 0.28, look.accent);
  beak.position.set(0, headY - headR*0.15, headZ + headR + 0.05);
  beak.rotation.x = Math.PI/2;
  g.add(beak);
  addEyes(g, [headR*0.5, headY + headR*0.2, headZ + headR*0.65], st.eyeRatio*0.85, 0.13);

  const wingGeo = new THREE.SphereGeometry(0.45, 24, 16);
  const wingMat = new THREE.MeshStandardMaterial({ color: hexLighten(look.body, -0.1), roughness:0.7 });
  const wL = new THREE.Mesh(wingGeo, wingMat); wL.position.set(-bodyRX-0.05, 0.0, -0.05); wL.scale.set(0.45, 0.95, 0.6); g.add(wL);
  const wR = wL.clone(); wR.position.x = bodyRX+0.05; g.add(wR);

  for (let i = -1; i <= 1; i++) {
    const f = box(0.18, 0.06, 0.4, hexLighten(look.body, -0.12));
    f.position.set(i*0.18, bodyCY - 0.05, -bodyRZ - 0.1);
    f.rotation.z = i*0.3;
    g.add(f);
  }

  const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.22*st.limbLen, 10);
  const legMat = new THREE.MeshStandardMaterial({ color: look.accent, roughness:0.6 });
  const legY = bodyCY - bodyRY * 0.7;
  const lL = new THREE.Mesh(legGeo, legMat); lL.position.set(-0.18, legY, 0.15); g.add(lL);
  const lR = new THREE.Mesh(legGeo, legMat); lR.position.set(0.18, legY, 0.15); g.add(lR);
  const footY = legY - 0.13;
  g.add(ellipsoidAt(0.12, 0.04, 0.15, look.accent, [-0.18, footY, 0.22]));
  g.add(ellipsoidAt(0.12, 0.04, 0.15, look.accent, [0.18, footY, 0.22]));

  if (st.extras) {
    const crest = cone(0.1, 0.32, look.accent);
    crest.position.set(0, headY + headR + 0.18, headZ - 0.07);
    g.add(crest);
  }
}

// ---- shared helpers (eyes, ground, geom factories) ----

// Adds a symmetrical pair of cute white-eye + black-pupil at +/- offsetX of the
// same y/z. Eye size uses base * eyeRatio so baby pets get the big-eye treatment.
function addEyes(g, posOffsets, eyeRatio, baseR) {
  const [ox, y, z] = posOffsets;
  const eyeR = baseR * eyeRatio;
  const pupR = eyeR * 0.5;
  g.add(sphereAt(eyeR, 0xffffff, [-ox, y, z]));
  g.add(sphereAt(eyeR, 0xffffff, [ ox, y, z]));
  g.add(sphereAt(pupR, 0x222233, [-ox, y, z + eyeR*0.55]));
  g.add(sphereAt(pupR, 0x222233, [ ox, y, z + eyeR*0.55]));
  // Cheek blush
  g.add(ellipsoidAt(eyeR*0.7, eyeR*0.45, eyeR*0.3, 0xffaac4, [-ox - eyeR*0.6, y - eyeR*0.6, z - eyeR*0.1]));
  g.add(ellipsoidAt(eyeR*0.7, eyeR*0.45, eyeR*0.3, 0xffaac4, [ ox + eyeR*0.6, y - eyeR*0.6, z - eyeR*0.1]));
}

// Soft contact shadow under the pet. A flat dark disc with a radial gradient
// alpha texture, parallel to the floor at y = -1.05.
function buildShadowDisc() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
  grad.addColorStop(0, 'rgba(60,40,80,0.55)');
  grad.addColorStop(1, 'rgba(60,40,80,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(128, 128, 120, 0, Math.PI*2); ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const geo = new THREE.PlaneGeometry(2.6, 2.6);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI/2;
  mesh.position.y = -1.05;
  return mesh;
}

// ---- mesh / geometry factories ----

function sphere(r, color) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(r, 32, 24),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.04 }),
  );
}
function sphereAt(r, color, pos) {
  const m = sphere(r, color); m.position.set(pos[0], pos[1], pos[2]); return m;
}
function ellipsoid(rx, ry, rz, color) {
  const m = sphere(1, color);
  m.scale.set(rx, ry, rz);
  return m;
}
function ellipsoidAt(rx, ry, rz, color, pos) {
  const m = ellipsoid(rx, ry, rz, color);
  m.position.set(pos[0], pos[1], pos[2]);
  return m;
}
function cone(r, h, color) {
  return new THREE.Mesh(
    new THREE.ConeGeometry(r, h, 24),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55 }),
  );
}
function orientCone(r, h, color, pos, rot) {
  const m = cone(r, h, color);
  m.position.set(pos[0], pos[1], pos[2]);
  m.rotation.set(rot[0], rot[1], rot[2]);
  return m;
}
function box(w, h, d, color) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55 }),
  );
}

// ---- color utils ----

function hexToCss(h) {
  return '#' + h.toString(16).padStart(6, '0');
}
function hexLighten(h, amt) {
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
