// In-browser ALttP randomizer: settings -> patch + spoiler.
// Port of RandomizerController::prepSeed from alttp_vt_randomizer (MIT).
import { seedRng, getRandomInt, rngCalls } from './core/rng.js';
import { Item } from './core/item.js';
import './core/locations-special.js';
import { Boss } from './core/boss.js';
import { Rom } from './core/rom.js';
import { Randomizer } from './core/randomizer.js';
import { WorldCollection, ItemCollection } from './core/collections.js';
import { Sprite, Droppable } from './core/shop.js';
import { hash_array } from './core/php.js';
import { World } from './worlds/index.js';

export const BUILD = Rom.BUILD;          // base patch build date
export const BASE_HASH = Rom.HASH;       // MD5 of the patched 2MB base ROM

// Settings use the same names/values as the alttpr.com API request body.
export const DEFAULTS = {
  mode: 'open',
  goal: 'ganon',
  crystals: { tower: '7', ganon: '7' },
  dungeon_items: 'standard',
  item_placement: 'advanced',
  accessibility: 'items',
  weapons: 'randomized',
  item: { pool: 'normal', functionality: 'normal' },
  hints: 'on',
};

const get = (o, path, def) => path.split('.').reduce((a, k) => (a != null && k in a ? a[k] : undefined), o) ?? def;

/**
 * @param {object} req   settings (see DEFAULTS)
 * @param {number} seed  32-bit seed; same seed + settings = same game
 * @param {object} opts  { stamp: write file-select hash + seed string (default true) }
 */
export function generate(req = DEFAULTS, seed = 1, opts = {}) {
  const stamp = opts.stamp ?? true;
  Item.clearCache();
  Boss.clearCache();
  World.max_world = 1;
  seedRng(seed);
  const t0 = Date.now();

  const in_ = (k, d) => get(req, k, d);
  let crystals_ganon = in_('crystals.ganon', '7');
  crystals_ganon = crystals_ganon === 'random' ? getRandomInt(0, 7) : crystals_ganon;
  let crystals_tower = in_('crystals.tower', '7');
  crystals_tower = crystals_tower === 'random' ? getRandomInt(0, 7) : crystals_tower;

  const world = World.factory(in_('mode', 'standard'), {
    itemPlacement: in_('item_placement', 'basic'),
    dungeonItems: in_('dungeon_items', 'standard'),
    accessibility: in_('accessibility', 'items'),
    goal: in_('goal', 'ganon'),
    'crystals.ganon': crystals_ganon,
    'crystals.tower': crystals_tower,
    entrances: 'none',
    'mode.weapons': in_('weapons', 'randomized'),
    tournament: false,
    spoilers: 'on',
    allow_quickswap: in_('allow_quickswap', true),
    override_start_screen: false,
    pseudoboots: in_('pseudoboots', false),
    'spoil.Hints': in_('hints', 'on'),
    logic: 'NoGlitches',
    'item.pool': in_('item.pool', 'normal'),
    'item.functionality': in_('item.functionality', 'normal'),
    'enemizer.bossShuffle': 'none',
    'enemizer.enemyShuffle': 'none',
    'enemizer.enemyDamage': 'default',
    'enemizer.enemyHealth': 'default',
    'enemizer.potShuffle': 'off',
  });

  const rom = new Rom();
  const rand = new Randomizer([world]);
  rand.randomize();
  world.writeToRom(rom);
  const winnable = new WorldCollection(rand.getWorlds()).isWinnable();
  const rng_calls = rngCalls();

  const hash = seedHash(seed);
  if (stamp) {
    rom.setSeedString(`VT ${hash}`.padEnd(21, ' '));
    rom.setStartScreenHash(hash_array(seed % 33554431));
  }

  const spoiler = world.getSpoiler({
    entry_crystals_ganon: in_('crystals.ganon', '7'),
    entry_crystals_tower: in_('crystals.tower', '7'),
    worlds: 1,
  });

  return {
    winnable,
    rng_calls,
    ms: Date.now() - t0,
    seed,
    hash,
    patch: rom.getWriteLog(),
    spoiler,
    settings: world.config_,
  };
}

const LOGIC = {
  none: 'NoGlitches', overworld_glitches: 'OverworldGlitches', hybrid_major_glitches: 'HybridMajorGlitches',
  major_glitches: 'MajorGlitches', no_logic: 'NoLogic',
};

/**
 * Customizer seed: port of CustomizerController::prepSeed (alttp_vt_randomizer, MIT).
 * Same request shape as alttpr.com's /api/customizer, except that `l` is keyed by
 * plain location names ("Link's Uncle") instead of base64("Link's Uncle:1").
 *   glitches: 'none' | 'no_logic' | …   l: { location: item }   eq: [item, …]
 *   drops: { pack: [sprite | 'auto_fill', …] }   custom: { 'dotted.key': value, … }
 */
export function generateCustom(req = {}, seed = 1, opts = {}) {
  const stamp = opts.stamp ?? true;
  Item.clearCache();
  Boss.clearCache();
  World.max_world = 1;
  seedRng(seed);
  const t0 = Date.now();

  const in_ = (k, d) => get(req, k, d);
  let crystals_ganon = in_('crystals.ganon', '7');
  crystals_ganon = crystals_ganon === 'random' ? getRandomInt(0, 7) : crystals_ganon;
  let crystals_tower = in_('crystals.tower', '7');
  crystals_tower = crystals_tower === 'random' ? getRandomInt(0, 7) : crystals_tower;
  const logic = LOGIC[in_('glitches', 'none')] || 'NoGlitches';

  const custom = { ...(req.custom || {}) };
  const placed = req.l || {};
  const placedCount = {};
  for (const v of Object.values(placed)) placedCount[v] = (placedCount[v] || 0) + 1;
  if (['triforce-hunt', 'ganonhunt'].includes(in_('goal', 'ganon'))
    && Number(custom['item.Goal.Required'] || 0) > Number(custom['item.count.TriforcePiece'] || 0) + (placedCount.TriforcePiece || 0)) {
    throw new Error('Not enough Triforce Pieces for the hunt');
  }
  const b = (k) => (custom[k] ? 1 : 0);
  custom['spoil.Hints'] = in_('hints', 'on');
  custom['item.require.Lamp'] = custom['item.require.Lamp'] ? 0 : 1;
  if (custom['rom.freeItemMenu']) {
    custom['rom.freeItemMenu'] = (b('region.wildCompasses') << 3) | (b('region.wildMaps') << 2)
      | (b('region.wildBigKeys') << 1) | b('region.wildKeys');
  }
  if (custom['rom.freeItemText']) {
    custom['rom.freeItemText'] = 0x10 | (b('region.wildBigKeys') << 3) | (b('region.wildMaps') << 2)
      | (b('region.wildCompasses') << 1) | b('region.wildKeys');
  }

  const world = World.factory(in_('mode', 'standard'), {
    difficulty: 'custom',
    itemPlacement: in_('item_placement', 'basic'),
    dungeonItems: in_('dungeon_items', 'standard'),
    accessibility: in_('accessibility', 'items'),
    goal: in_('goal', 'ganon'),
    'crystals.ganon': crystals_ganon,
    'crystals.tower': crystals_tower,
    entrances: 'none',
    'mode.weapons': in_('weapons', 'randomized'),
    tournament: false,
    spoilers: 'on',
    allow_quickswap: in_('allow_quickswap', true),
    override_start_screen: false,
    pseudoboots: in_('pseudoboots', false),
    logic,
    'item.pool': in_('item.pool', 'normal'),
    'item.functionality': in_('item.functionality', 'normal'),
    'enemizer.bossShuffle': 'none',
    'enemizer.enemyShuffle': 'none',
    'enemizer.enemyDamage': 'default',
    'enemizer.enemyHealth': 'default',
    'enemizer.potShuffle': 'off',
    ignoreCanKillEscapeThings: Object.prototype.hasOwnProperty.call(placed, "Link's Uncle"),
    customPrizePacks: true,
    ...custom,
  });

  const swordless = world.config('mode.weapons') === 'swordless';
  const locations = world.getLocations();
  for (const [name, value] of Object.entries(placed)) {
    const location = locations.get(name);
    if (!location) continue;
    let item = value === 'BottleWithRandom' ? world.getBottle() : Item.get(String(value).replace(/:\d+$/, ''), world);
    if (swordless && item instanceof Item.Sword) item = Item.get('TwentyRupees2', world);
    location.setItem(item);
  }
  // starting bomb and quiver capacities, then the chosen equipment
  world.setPreCollectedItems(new ItemCollection([
    Item.get('BombUpgrade10', world), Item.get('ArrowUpgrade10', world),
    Item.get('ArrowUpgrade10', world), Item.get('ArrowUpgrade10', world),
  ]));
  for (const name of req.eq || []) {
    try {
      let item = Item.get(name, world);
      if (swordless && item instanceof Item.Sword) item = Item.get('TwentyRupees2', world);
      world.addPreCollectedItem(item);
    } catch (e) { /* alttpr.com skips unknown items too */ }
  }
  for (const [pack, slots] of Object.entries(req.drops || {})) {
    (slots || []).forEach((name, slot) => {
      if (!name || name === 'auto_fill') return;
      let drop;
      try { drop = Sprite.get(name); } catch (e) { return; }
      if (drop instanceof Droppable) world.setDrop(pack, slot, drop);
    });
  }

  const rom = new Rom();
  const rand = new Randomizer([world]);
  rand.randomize();
  world.writeToRom(rom);
  const winnable = new WorldCollection(rand.getWorlds()).isWinnable();
  const rng_calls = rngCalls();

  const hash = seedHash(seed);
  if (stamp) {
    rom.setSeedString(`VT ${hash}`.padEnd(21, ' '));
    rom.setStartScreenHash(hash_array(seed % 33554431));
  }
  const meta = {};
  if (req.name) meta.name = String(req.name).slice(0, 100);
  if (req.notes) meta.notes = String(req.notes).slice(0, 300);
  const spoiler = world.getSpoiler({
    ...meta,
    entry_crystals_ganon: in_('crystals.ganon', '7'),
    entry_crystals_tower: in_('crystals.tower', '7'),
    worlds: 1,
    difficulty: 'custom',
  });

  return {
    winnable, rng_calls, ms: Date.now() - t0, seed, hash,
    patch: rom.getWriteLog(), spoiler, settings: world.config_,
  };
}

// 10-character seed code shown in the spoiler and the ROM header
export function seedHash(seed) {
  const abc = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let n = seed >>> 0, s = '';
  for (let i = 0; i < 10; i++) { s += abc[n % abc.length]; n = Math.floor(n / abc.length) ^ ((n * 2654435761) >>> 0) & 0xFFFF; }
  return s;
}
