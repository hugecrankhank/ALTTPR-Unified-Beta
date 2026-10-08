// Kara's branch (alttpr.gwaa.kiwi): her site's settings -> the generator's
// command line, the same way her server does it (alttpr-backend,
// Model/SeedSettings.cs and Randomizers/BaseRandomizer.cs, "base" generator).
//
// Each setting: the option's name on the command line (null: the value adds
// its own flags instead), and for values whose command-line spelling isn't
// just the value without underscores: { v: spelling, extra: [flags],
// start: [starting items] }.

import { SETTINGS, PRESETS } from './settings-data.js';
export { SETTINGS, PRESETS };

const ARGS = {
  mode: { name: 'mode' },
  weapons: { name: 'swords', vals: { assured_master: { v: 'assured', start: ['Progressive_Sword'] } } },
  goal: {
    name: 'goal',
    vals: { fast_ganon: { v: 'crystals' }, all_dungeons: { v: 'dungeons' }, triforce_hunt: { v: 'triforcehunt' }, boss_hunt: { v: 'bosshunt' } },
  },
  crystals_ganon: { name: 'crystals_ganon' },
  bosses_ganon: { name: 'bosses_ganon', fn: (v) => ({ v: v.split('of')[0], extra: v.endsWith('of12') ? ['--bosshunt_include_agas'] : [] }) },
  triforce_pieces: { name: null, fn: (v) => { const [g, p] = v.split('of'); return { extra: [`--triforce_goal=${g}`, `--triforce_pool=${p}`] }; } },
  crystals_gt: { name: 'crystals_gt' },
  ganon_item: { name: 'ganon_item', vals: { fire_rod: { v: 'fire_rod' }, ice_rod: { v: 'ice_rod' } } },
  require_ganon_item: { name: null, vals: { special_item_required: { extra: ['--require_ganon_item'] } } },
  entrance_shuffle: { name: 'shuffle', vals: { decoupled: { v: 'insanity' } } },
  overworld_map_dungeons: { name: 'overworld_map', vals: { vanilla: { v: 'default' } } },
  links_house: { name: null, vals: { shuffled: { extra: ['--shufflelinks'] } } },
  skull_woods: { name: 'skullwoods', vals: { default: { v: 'original' }, vanilla_drops: { v: 'restricted' }, chaos: { v: 'followlinked' } } },
  linked_drops: { name: 'linked_drops', vals: { default: { v: 'unset' } } },
  boss_shuffle: { name: 'shufflebosses', vals: { vanilla: { v: 'none' }, prize_unique: { v: 'unique' } } },
  enemy_shuffle: { name: 'shuffleenemies', vals: { vanilla: { v: 'none' } } },
  damage_table_shuffle: { name: 'shuffle_damage_table' },
  small_keys: { name: 'keyshuffle', vals: { dungeon: { v: 'none' } } },
  big_keys: { name: 'bigkeyshuffle', vals: { dungeon: { v: 'none' } } },
  maps: { name: 'mapshuffle', vals: { dungeon: { v: 'none' } } },
  compasses: { name: 'compassshuffle', vals: { dungeon: { v: 'none' } } },
  show_loot_map: { name: 'showloot' },
  show_loot_hud: { name: 'loothud', vals: { dungeon_value: { v: 'dungeon_value' }, cave_value: { v: 'cave_value' } } },
  show_map: { name: 'showmap' },
  shop_shuffle: { name: null, vals: { shuffled: { extra: ['--shopsanity'] } } },
  drop_shuffle: { name: 'dropshuffle', vals: { vanilla: { v: 'none' } } },
  pot_shuffle: {
    name: 'pottery',
    vals: {
      vanilla: { v: 'none' }, all: { v: 'lottery' },
      keys: { extra: ['--colorizepots'] }, cave: { extra: ['--colorizepots'] }, cave_keys: { extra: ['--colorizepots'] },
      reduced: { extra: ['--colorizepots'] }, clustered: { extra: ['--colorizepots'] }, non_empty: { extra: ['--colorizepots'] },
      dungeon: { extra: ['--colorizepots'] },
    },
  },
  prize_shuffle: { name: 'prizeshuffle', vals: { vanilla: { v: 'none' } } },
  boots: { name: null, vals: { pseudoboots: { extra: ['--pseudoboots'] }, starting: { start: ['Pegasus_Boots'] } } },
  flute: {
    name: null,
    vals: { pseudoflute: { extra: ['--flute_mode=pseudo'] }, preactivated: { extra: ['--flute_mode=active'] }, starting: { start: ['Ocarina_(Activated)'] } },
  },
  dark_rooms: {
    name: 'dark_rooms',
    vals: {
      require_lamp: { v: 'require_lamp' }, always_light_cone: { v: 'always_light_cone' }, no_dark_rooms: { v: 'no_dark_rooms' },
      starting_lamp: { v: 'require_lamp', start: ['Lamp'] }, dark_in_logic: { v: 'always_in_logic' },
    },
  },
  bombs: { name: null, vals: { bomb_bag_required: { extra: ['--bombbag'] }, starting: { start: ['Bombs_(10)'] } } },
  book: { name: null, vals: { crystal_switches: { extra: ['--crystal_book'] } } },
  mirror: { name: null, vals: { scroll: { extra: ['--mirrorscroll'] }, starting: { start: ['Magic_Mirror'] } } },
  door_shuffle: { name: 'door_shuffle' },
  lobbies: { name: 'intensity', vals: { vanilla: { v: '2' }, shuffled: { v: '3' } } },
  door_type_mode: { name: 'door_type_mode' },
  trap_door_mode: { name: 'trap_door_mode', vals: { some: { v: 'optional' }, remove_all: { v: 'oneway' } } },
  extra_keys: { name: 'extra_keys', vals: { none: { v: '0' }, extra1: { v: '1' }, percent20: { v: '20' }, percent30: { v: '30' }, percent40: { v: '40' } } },
  follower_shuffle: { name: null, vals: { shuffled: { extra: ['--shuffle_followers'] } } },
  flute_shuffle: { name: 'ow_fluteshuffle' },
  overworld_layout: { name: 'ow_layout', vals: { shuffled_grid: { v: 'grid' }, shuffled: { v: 'wild' } } },
  overworld_world_layouts: { name: null, vals: { independent: { extra: ['--ow_unparallel'] } } },
  overworld_layout_terrain: { name: null, vals: { allow_mixed: { extra: ['--ow_terrain'] } } },
  overworld_layout_edges: { name: null, vals: { grouped: { extra: ['--ow_keepsimilar'] } } },
  overworld_map_fog: { name: null, vals: { no_fog: { extra: ['--ow_no_fog'] } } },
  tile_swap: { name: null, vals: { tile_swap: { extra: ['--ow_mixed'] } } },
  damage_challenge: { name: 'damage_challenge' },
  hints: { name: null, vals: { on: { extra: ['--hints'] } } },
};

// Her server's order (the settings class), which also orders starting items.
const ORDER = ['mode', 'weapons', 'goal', 'crystals_ganon', 'bosses_ganon', 'triforce_pieces', 'crystals_gt', 'ganon_item',
  'require_ganon_item', 'entrance_shuffle', 'overworld_map_dungeons', 'links_house', 'skull_woods', 'linked_drops',
  'boss_shuffle', 'enemy_shuffle', 'damage_table_shuffle', 'small_keys', 'big_keys', 'maps', 'compasses', 'show_loot_map',
  'show_loot_hud', 'show_map', 'shop_shuffle', 'drop_shuffle', 'pot_shuffle', 'prize_shuffle', 'boots', 'flute',
  'dark_rooms', 'bombs', 'book', 'mirror', 'door_shuffle', 'lobbies', 'door_type_mode', 'trap_door_mode', 'extra_keys',
  'follower_shuffle', 'flute_shuffle', 'overworld_layout', 'overworld_world_layouts', 'overworld_layout_terrain',
  'overworld_layout_edges', 'overworld_map_fog', 'tile_swap', 'damage_challenge', 'hints'];

const BY_KEY = Object.fromEntries(SETTINGS.map((s) => [s.key, s]));

export function defaults() {
  return Object.fromEntries(SETTINGS.map((s) => [s.key, s.def]));
}

/** A complete, valid settings object: anything missing or unknown -> default. */
export function normalize(o) {
  const out = defaults();
  for (const [k, v] of Object.entries(o || {})) {
    const s = BY_KEY[k];
    if (s && s.values.some((x) => x[0] === String(v))) out[k] = String(v);
  }
  return out;
}

export function presetSettings(id) {
  const p = PRESETS.find((x) => x.id === id);
  return p ? normalize(p.settings) : null;
}

/** settings -> the generator's command-line arguments (as her server builds them). */
export function toArgs(settings) {
  const s = normalize(settings);
  // adjustments her server makes before converting
  if (s.door_shuffle === 'vanilla') s.door_type_mode = 'original';
  if (s.ganon_item === 'none') s.require_ganon_item = 'silverless_allowed';
  const args = ['--shuffletavern'], start = [];
  for (const key of ORDER) {
    const a = ARGS[key], v = s[key];
    const spec = a.fn ? a.fn(v) : ((a.vals && a.vals[v]) || {});
    if (a.name) args.push(`--${a.name}=${spec.v ?? v.replace(/_/g, '')}`);
    (spec.extra || []).forEach((x) => args.push(x));
    (spec.start || []).forEach((x) => start.push(x));
  }
  if (start.length) args.push('--usestartinventory=true', `--startinventory=${start.join(',')}`);
  if (s.door_shuffle !== 'vanilla' || s.drop_shuffle !== 'vanilla' || (s.pot_shuffle !== 'vanilla' && s.pot_shuffle !== 'cave')) {
    args.push('--dungeon_counters=on');
  }
  return args;
}

/** What Hutch's tracker should be told about a seed with these settings. */
export function trackerFor(settings) {
  const s = normalize(settings);
  const shuffled = (v) => v !== 'dungeon';
  const f = { m: shuffled(s.maps), c: shuffled(s.compasses), b: shuffled(s.big_keys), k: shuffled(s.small_keys) };
  const flags = Object.keys(f).filter((x) => f[x]).join('');
  const di = f.b && f.k ? 'keysanity' : f.k ? 'mapcompasskeys' : (f.m || f.c) ? 'mapcompass' : 'standard';
  const pottery = (ARGS.pot_shuffle.vals[s.pot_shuffle] || {}).v || s.pot_shuffle.replace(/_/g, '');
  const yes = (b) => (b ? 'yes' : 'no');
  return {
    gamemode: s.mode,
    dungeonitems: di,
    swordless: yes(s.weapons === 'swordless'),
    gtcrystals: /^\d$/.test(s.crystals_gt) ? s.crystals_gt : '7',
    bossshuffle: yes(s.boss_shuffle !== 'vanilla'),
    enemizer: yes(s.enemy_shuffle !== 'vanilla'),
    // further map settings Hutch's tracker understands
    more: {
      dungeonshuffle: flags,
      universalkeys: yes(s.small_keys === 'universal'),
      entranceshuffle: yes(s.entrance_shuffle !== 'vanilla'),
      shopsanity: yes(s.shop_shuffle === 'shuffled'),
      pottery,
      enemykeydrop: yes(s.drop_shuffle !== 'vanilla'),
      enemydrops: yes(s.drop_shuffle === 'underworld'),
      pseudoboots: yes(s.boots === 'pseudoboots'),
      mirrorscroll: yes(s.mirror === 'scroll'),
    },
  };
}

/** Parts of a seed the tracker can't follow (shown as a note). */
export function trackerGaps(settings) {
  const s = normalize(settings), out = [];
  if (s.door_shuffle !== 'vanilla') out.push('door shuffle');
  if (s.overworld_layout !== 'vanilla' || s.tile_swap !== 'vanilla') out.push('overworld shuffle');
  if (s.flute_shuffle !== 'vanilla') out.push('flute spots');
  if (s.prize_shuffle !== 'vanilla') out.push('prize shuffle');
  return out;
}

// ── links ────────────────────────────────────────────────────────────────────
// A Kara-branch seed link carries gen=kara, the seed, the settings that differ
// from her defaults (k=key:value,key:value), and which build made it.
export function encodeSettings(settings) {
  const s = normalize(settings), d = defaults();
  return ORDER.filter((k) => s[k] !== d[k]).map((k) => `${k}:${s[k]}`).join(',');
}
export function decodeSettings(text) {
  const o = {}, unknown = [];
  String(text || '').split(',').filter(Boolean).forEach((pair) => {
    const [k, v] = pair.split(':');
    const s = BY_KEY[k];
    if (s && s.values.some((x) => x[0] === v)) o[k] = v; else unknown.push(pair);
  });
  return { settings: normalize(o), unknown };
}
