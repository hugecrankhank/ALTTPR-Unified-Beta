// In-browser ALttP randomizer: settings -> patch + spoiler.
// Port of RandomizerController::prepSeed from alttp_vt_randomizer (MIT).
import { seedRng, getRandomInt, rngCalls } from './core/rng.js';
import { Item } from './core/item.js';
import './core/locations-special.js';
import { Boss } from './core/boss.js';
import { Rom } from './core/rom.js';
import { Randomizer } from './core/randomizer.js';
import { WorldCollection } from './core/collections.js';
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

// 10-character seed code shown in the spoiler and the ROM header
export function seedHash(seed) {
  const abc = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let n = seed >>> 0, s = '';
  for (let i = 0; i < 10; i++) { s += abc[n % abc.length]; n = Math.floor(n / abc.length) ^ ((n * 2654435761) >>> 0) & 0xFFFF; }
  return s;
}
