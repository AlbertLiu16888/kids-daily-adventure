// Pet & egg state. Stored in localStorage, profile-namespaced via nsKey().
//
// eggs: { [id]: { type, water:0-5, sun:0-5, createdAt } }
// pets: { [id]: { type, name, hatchedAt, friendship:0-10, lastInteract: 'YYYY-MM-DD' } }
// dailyHatchActions: per-day counter keyed by date+eggId so we don't let a kid
//   tap 100 times in one minute — encourages daily revisits.
//
// Storage keys (after profile namespacing) become e.g. 'kda_eggs__sanbei',
// 'kda_pets__wangwang'. Each write also kicks off a cloud push.

import { nsKey, getActiveProfile } from './profile.js';
import { schedulePush, markLocalDirty } from './cloud.js';

const K_EGGS = 'kda_eggs';
const K_PETS = 'kda_pets';
const K_DAILY = 'kda_pets_daily';

export const PET_META = {
  duck:   { name:'小鴨鴨', egg:'assets/images/pets/egg_duck.png',  pet:'assets/images/pets/pet_duck.png',  emoji:'🦆', tint:'#fff4a3' },
  dino:   { name:'小恐龍', egg:'assets/images/pets/egg_dino.png',  pet:'assets/images/pets/pet_dino.png',  emoji:'🦖', tint:'#c5f0b3' },
  panda:  { name:'小熊貓', egg:'assets/images/pets/egg_panda.png', pet:'assets/images/pets/pet_panda.png', emoji:'🐼', tint:'#f4f4f4' },
  sheep:  { name:'小羊',   egg:'assets/images/pets/egg_sheep.png', pet:'assets/images/pets/pet_sheep.png', emoji:'🐑', tint:'#ffe3ee' },
  bear:   { name:'小熊熊', egg:'assets/images/pets/egg_bear.png',  pet:'assets/images/pets/pet_bear.png',  emoji:'🧸', tint:'#ffe3c4' },
  bunny:  { name:'小兔兔', egg:'assets/images/pets/egg_bunny.png', pet:'assets/images/pets/pet_bunny.png', emoji:'🐰', tint:'#ffd9eb' },
  crab:   { name:'小螃蟹', egg:'assets/images/pets/egg_crab.png',  pet:'assets/images/pets/pet_crab.png',  emoji:'🦀', tint:'#ffd0c4' },
  bird:   { name:'布穀鳥', egg:'assets/images/pets/egg_bird.png',  pet:'assets/images/pets/pet_bird.png',  emoji:'🐦', tint:'#e3d6ff' },
};

export const HATCH_NEEDS = { water: 5, sun: 5 };

function read(baseKey, fallback) {
  try {
    const raw = localStorage.getItem(nsKey(baseKey));
    return raw ? (JSON.parse(raw) || fallback) : fallback;
  } catch { return fallback; }
}
function write(baseKey, value) {
  localStorage.setItem(nsKey(baseKey), JSON.stringify(value));
  const a = getActiveProfile();
  if (a) {
    markLocalDirty(a.id);
    schedulePush(a.id);
  }
}

// 0..1 progress toward hatch — used to draw cracks on the egg shell.
export function eggProgress(egg) {
  if (!egg) return 0;
  const total = HATCH_NEEDS.water + HATCH_NEEDS.sun;
  return Math.min(1, ((egg.water||0) + (egg.sun||0)) / total);
}

// Buckets the progress into one of 5 visual stages so the egg looks
// progressively more cracked: 0 = pristine, 4 = about to hatch.
export function eggCrackStage(egg) {
  const p = eggProgress(egg);
  if (p <= 0) return 0;
  if (p < 0.25) return 1;
  if (p < 0.55) return 2;
  if (p < 0.85) return 3;
  return 4;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function getEggs() { return read(K_EGGS, {}); }
export function getPets() { return read(K_PETS, {}); }

export function addEgg(type) {
  const eggs = getEggs();
  const id = `e${Date.now().toString(36)}${Math.floor(Math.random()*1000)}`;
  eggs[id] = { type, water:0, sun:0, createdAt: today() };
  write(K_EGGS, eggs);
  return { id, egg: eggs[id] };
}

// Returns { ok, reason, egg, hatched:{petId} }
export function interactEgg(eggId, kind /* 'water' | 'sun' */) {
  const eggs = getEggs();
  const egg = eggs[eggId];
  if (!egg) return { ok:false, reason:'not-found' };

  // daily limit: 2 per kind per egg per day
  const daily = read(K_DAILY, {});
  const dayKey = today();
  const key = `${dayKey}:${eggId}:${kind}`;
  const used = daily[key] || 0;
  if (used >= 2) return { ok:false, reason:'daily-limit' };

  if (egg[kind] < HATCH_NEEDS[kind]) egg[kind]++;
  daily[key] = used + 1;
  write(K_DAILY, daily);

  // hatch?
  if (egg.water >= HATCH_NEEDS.water && egg.sun >= HATCH_NEEDS.sun) {
    delete eggs[eggId];
    write(K_EGGS, eggs);
    const pets = getPets();
    const petId = `p${Date.now().toString(36)}${Math.floor(Math.random()*1000)}`;
    pets[petId] = { type: egg.type, hatchedAt: dayKey, friendship: 1, lastInteract: dayKey };
    write(K_PETS, pets);
    return { ok:true, egg, hatched:{ petId } };
  }
  write(K_EGGS, eggs);
  return { ok:true, egg };
}

export function interactPet(petId) {
  const pets = getPets();
  const p = pets[petId];
  if (!p) return { ok:false };
  const dayKey = today();
  const isNewDay = p.lastInteract !== dayKey;
  if (isNewDay) {
    p.friendship = Math.min(10, (p.friendship||1) + 1);
    p.lastInteract = dayKey;
    write(K_PETS, pets);
  }
  return { ok:true, pet:p, isNewDay };
}

// One-shot seeder: if this profile has zero pets AND has never been seeded,
// drop in the starter pet (仙貝 → 兔子, 旺旺龍 → 恐龍). The "seeded" flag is
// stored *namespaced* so each profile gets its own starter exactly once, even
// if the kid later releases the pet manually.
//
// Returns the new pet id when a pet is seeded, otherwise null.
export function seedStarterPetOnce(petType) {
  if (!petType) return null;
  const SEED_KEY = 'kda_starter_seeded';
  const flagKey = nsKey(SEED_KEY);
  if (localStorage.getItem(flagKey)) return null;
  // Mark BEFORE writing the pet so a crash mid-write doesn't double-seed.
  localStorage.setItem(flagKey, '1');
  const pets = getPets();
  const dayKey = today();
  const petId = `p${Date.now().toString(36)}${Math.floor(Math.random()*1000)}`;
  pets[petId] = { type: petType, hatchedAt: dayKey, friendship: 3, lastInteract: dayKey };
  write(K_PETS, pets);
  return petId;
}

// How many days since hatching (for dialog index).
export function petDayIndex(pet) {
  if (!pet?.hatchedAt) return 0;
  const a = new Date(pet.hatchedAt + 'T00:00:00');
  const b = new Date(today() + 'T00:00:00');
  return Math.max(0, Math.round((b - a) / 86400000));
}

// Growth stage based on days-since-hatch + friendship. Used by pet3d.js to
// pick anatomy parameters (size, head:body ratio, leg length, etc.) and by
// app.js to label the stage in the UI.
//
// 'baby'   — chubby kawaii proportions, oversized head & eyes, small limbs
// 'young'  — balanced proportions
// 'adult'  — full-grown with mature features (horns / longer ears / spikes)
//
// Returns one of those three strings.
export function petStage(pet) {
  if (!pet) return 'baby';
  const days = petDayIndex(pet);
  const fr = pet.friendship || 1;
  if (days >= 10 || fr >= 8) return 'adult';
  if (days >= 3  || fr >= 4) return 'young';
  return 'baby';
}

// User-facing zh label for the stage.
export const STAGE_LABEL = { baby:'幼兒', young:'少年', adult:'成體' };
