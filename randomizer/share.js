// Seed links: share a seed so others can play exactly the same game.
//
// The generator is deterministic: the same seed number with the same settings
// makes the same game. So a link only has to carry the seed number and the
// settings. Everyone generates the seed in their own browser from their own
// base ROM (nothing is uploaded), and the five-item code on the file select
// screen proves they have the same game, just as on alttpr.com.
//
// A race link also hides the spoiler download for that seed. That's the honor
// system: the seed number is in the link, so a determined cheat could still
// work the answers out. For a sealed race, generate on alttpr.com with spoilers
// off and share that ROM's link instead.
//
// Cosmetic options (sprite, heart beep, menu speed, quickswap, music) aren't in
// the link: each player keeps their own.

import { hash_array } from './core/php.js';

// Changes whenever a generator change would make the same seed and settings
// give a different game, so a link made with another build can say so.
export const GEN_ID = 'vt20240218-1';

// link parameter -> settings dropdown
export const PARAMS = {
  mode: 'r-mode', goal: 'r-goal', tower: 'r-tower', ganon: 'r-ganon', swords: 'r-weapons',
  items: 'r-placement', dungeons: 'r-dungeon', access: 'r-access', pool: 'r-pool',
  func: 'r-func', hints: 'r-hints',
};

export function buildLink(seed, fields, race) {
  const u = new URL(location.pathname, location.origin);
  u.searchParams.set('seed', String(seed));
  Object.entries(PARAMS).forEach(([k, id]) => { if (fields[id] != null) u.searchParams.set(k, fields[id]); });
  if (race) u.searchParams.set('race', '1');
  u.searchParams.set('v', GEN_ID);
  return u.toString();
}

// From the page's address: null, or { seed, fields: {id: value}, race,
// otherBuild, problems: [what couldn't be applied] }.
export function readLink(search, $) {
  const q = new URLSearchParams(search);
  if (q.get('gen') === 'kara') return null;   // Kara's branch: randomizer/kara
  const seedText = q.get('seed');
  if (seedText === null || !/^\d{1,10}$/.test(seedText)) return null;
  const seed = Number(seedText) % 4294967296;
  const fields = {}, problems = [];
  Object.entries(PARAMS).forEach(([k, id]) => {
    const v = q.get(k);
    if (v === null) return;
    const el = $(id);
    if (el && [...el.options].some((o) => o.value === v)) fields[id] = v;
    else problems.push(`${k}=${v}`);
  });
  const v = q.get('v');
  return { seed, fields, race: q.get('race') === '1', otherBuild: !!v && v !== GEN_ID, problems };
}

// Take the link out of the address bar (the page reloads to start a game, and
// it shouldn't come back as a fresh invitation every time).
export function clearLink() {
  try {
    const u = new URL(location.href);
    ['seed', 'race', 'v', 'gen', 'k', ...Object.keys(PARAMS)].forEach((k) => u.searchParams.delete(k));
    history.replaceState(history.state, '', u.pathname + (u.search === '?' ? '' : u.search) + u.hash);
  } catch (e) {}
}

// ── the five-item code ───────────────────────────────────────────────────────
// What the file select screen shows (ROM 0x180215). Names as alttpr.com and
// pyz3r use them; icons from the tracker where it has a clear one.
const CODE = [
  ['Bow', 'bow10'], ['Boomerang', 'boomerang10'], ['Hookshot', 'hookshot1'], ['Bombs', 'bomb10'],
  ['Mushroom', 'mushroom1'], ['Magic Powder', 'powder10'], ['Ice Rod', 'icerod1'], ['Pendant', 'pendant1'],
  ['Bombos', 'bombos10'], ['Ether', 'ether10'], ['Quake', 'quake10'], ['Lamp', 'lamp1'],
  ['Hammer', 'hammer1'], ['Shovel', 'shovel1'], ['Flute', 'flute10'], ['Bug Net', 'net1'],
  ['Book', 'book1'], ['Empty Bottle', 'bottle1'], ['Green Potion', 'bottle_green'], ['Cane of Somaria', 'caneofsomaria1'],
  ['Cape', 'cape1'], ['Mirror', 'mirror1'], ['Boots', 'boots1'], ['Gloves', 'gloves1'],
  ['Flippers', 'flippers1'], ['Moon Pearl', 'moonpearl1'], ['Shield', 'shield1'], ['Tunic', 'mail1'],
  ['Heart', 'randomizer/icons/heart.svg'], ['Map', 'map1'], ['Compass', 'compass1'], ['Big Key', 'bigkey1'],
];

export function codeForSeed(seed) { return hash_array(seed % 33554431); }

// From a ROM's bytes (any seed file, including ones from alttpr.com).
export function codeFromRom(rom) {
  if (!rom || rom.length < 0x18021A) return null;
  const c = [...rom.subarray(0x180215, 0x18021A)];
  return c.every((x) => x < 32) ? c : null;
}

export function codeNames(code) { return code.map((i) => CODE[i][0]); }

export function renderCode(el, code) {
  el.innerHTML = '';
  if (!code) { el.hidden = true; return; }
  el.hidden = false;
  el.title = 'The code on the file select screen. Everyone in a race should see the same five.';
  const lbl = document.createElement('span');
  lbl.className = 'code-lbl';
  lbl.textContent = 'Code';
  el.appendChild(lbl);
  code.forEach((i) => {
    const [name, icon] = CODE[i];
    const s = document.createElement('span');
    s.className = 'code-item';
    s.title = name;
    if (icon) {
      const img = document.createElement('img');
      img.src = icon.includes('/') ? icon : `tracker/items/${icon}.png`;   // a path, or a tracker item
      img.alt = name;
      s.appendChild(img);
    }
    const t = document.createElement('small');
    t.textContent = name;
    s.appendChild(t);
    el.appendChild(s);
  });
}
