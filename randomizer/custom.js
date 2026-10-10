// alttpr.com's Customizer: its options, defaults and lists, and the request
// generate.js's generateCustom takes. No DOM here (custom-ui.js draws it), so
// the tests can use it in Node too.
import { World } from './worlds/index.js';
import { Item } from './core/item.js';
import { Location } from './core/location.js';
import globalConfig from './data/config.js';

// Settings tab: alttpr.com's own keys, labels, defaults and help text
export const SETTINGS = [
  { key: 'prize.crossWorld', label: 'Swap Pendants and Crystals Cross World', def: true,
    help: 'If No, pendants are restricted to the light world and crystals to the dark world. If Yes, both can be in either world. Either way both are able to be randomized.' },
  { key: 'prize.shufflePendants', label: 'Shuffle Pendants', def: true,
    help: 'If No, pendants are as they are in the vanilla game. If Yes, pendants are shuffled.' },
  { key: 'prize.shuffleCrystals', label: 'Shuffle Crystals', def: true,
    help: 'If No, crystals are as they are in the vanilla game. If Yes, crystals are shuffled.' },
  { key: 'region.bossNormalLocation', label: 'Bosses can drop Dungeon Items', def: true,
    help: 'If No, bosses will not drop Maps/Compasses/Keys. If Yes, bosses may drop any item.' },
  { key: 'spoil.BootsLocation', label: 'Uncle spoils boots location', def: false,
    help: 'Only applies to Standard Mode. If No, Uncle will always say something random. If Yes, Uncle will give a hint as to the location of the boots.' },
  { key: 'rom.mapOnPickup', label: 'Only display Crystals/Pendants on Map Pickup', def: false,
    help: 'If No, the overworld map will show uncollected crystals and pendants over their respective dungeons. If Yes, the overworld map will only display uncollected crystals and pendants if Link has collected their respective maps.' },
  { key: 'item.require.Lamp', label: 'Allow dark room navigation', def: false,
    help: 'If Yes, logic will not check to make sure lamps are available before dark rooms.' },
  { key: 'rom.freeItemText', label: 'Show text box on dungeon item pickup', def: false,
    help: 'If No, keys, maps, and compasses picked up outside of dungeons will not indicate which dungeon they belong to on pickup. If Yes, a text box will be displayed on pickup that states their dungeon.' },
  { key: 'rom.freeItemMenu', label: 'Show dungeon item table in menu', def: false,
    help: 'If No, the menu will behave as it does in the vanilla game. If Yes, key collection information will be displayed at the bottom of the item menu.' },
  { key: 'region.wildCompasses', label: 'Compasses shuffled outside dungeon', def: false,
    help: 'If No, compasses that are randomly placed will be restricted to their respective dungeons. If Yes, they will be able to be randomly placed in any item location. This does not affect manually placed compasses.' },
  { key: 'region.wildMaps', label: 'Maps shuffled outside dungeon', def: false,
    help: 'If No, maps that are randomly placed will be restricted to their respective dungeons. If Yes, they will be able to be randomly placed in any item location. This does not affect manually placed maps.' },
  { key: 'region.wildKeys', label: 'Small Keys shuffled outside dungeon', def: false,
    help: 'If No, small keys that are randomly placed will be restricted to their respective dungeons. If Yes, they will be able to be randomly placed in any item location. This does not affect manually placed small keys.' },
  { key: 'region.wildBigKeys', label: 'Big Keys shuffled outside dungeon', def: false,
    help: 'If No, big keys that are randomly placed will be restricted to their respective dungeons. If Yes, they will be able to be randomly placed in any item location. This does not affect manually placed big keys.' },
  { key: 'rom.rupeeBow', label: 'Rupee Bow', def: false,
    help: 'Zelda 1 style Bow that consumes rupees, will also remove arrows as drops and replace them with blue rupees.' },
  { key: 'rom.genericKeys', label: 'Generic Small Keys', def: false,
    help: 'All Small keys will be converted to Generic keys.' },
];

export const SELECTS = [
  { key: 'rom.timerMode', label: 'Timer', def: 'off',
    options: [['off', 'Off'], ['stopwatch', 'Stopwatch'], ['countdown-ohko', 'Countdown OHKO'],
      ['countdown-continue', 'Countdown Continue'], ['countdown-stop', 'Countdown Stop']],
    help: 'Sets the behavior of the in game timer. Stopwatch will count up, while countdown will count down. When the countdown timer hits 0, what happens depends on the option selected. OHKO will send Link into one hit knockout mode, and taking any damage will cause death. Continue will cause the timer to continue counting down past zero. Stop will cause the timer to stop at zero. Outside of OHKO, the value of the timer has no effect on gameplay.' },
  { key: 'rom.dungeonCount', label: 'Dungeon Counts', def: 'off',
    options: [['off', 'Off'], ['pickup', 'On Compass Pickup'], ['on', 'Always On']],
    help: 'Shows the count of the collected dungeon items. This will be overridden if Timer is enabled.' },
];

export const NUMBERS = [
  { key: 'item.Goal.Required', label: 'Goal Items', unit: 'pieces', max: 216,
    help: 'Only applies to Triforce Hunt. The number of triforce pieces required to complete the game.' },
  { key: 'rom.timerStart', label: 'Timer Start', unit: 'seconds', help: 'The starting value of the timer in seconds.' },
  { key: 'item.value.GreenClock', label: 'Green Clock', unit: 'seconds', neg: true,
    help: 'The amount of time in seconds a Green Clock will add to the timer. This value can be negative.' },
  { key: 'item.value.BlueClock', label: 'Blue Clock', unit: 'seconds', neg: true,
    help: 'The amount of time in seconds a Blue Clock will add to the timer. The value can be negative.' },
  { key: 'item.value.RedClock', label: 'Red Clock', unit: 'seconds', neg: true,
    help: 'The amount of time in seconds a Red Clock will add to the timer. The value can be negative.' },
  { key: 'item.value.Rupoor', label: 'Rupoor Value', unit: 'rupees to take away',
    help: 'The amount of rupees a Rupoor will subtract from Link\'s total when collected.' },
  { key: 'item.overflow.count.PieceOfHeart', label: 'Maximum Heart Pieces', unit: 'pieces',
    help: 'The maximum number of pieces of heart Link can acquire.' },
  { key: 'item.overflow.count.BossHeartContainer', label: 'Maximum Boss Heart Containers', unit: 'containers',
    help: 'The maximum number of Boss Heart Containers Link can acquire.' },
  { key: 'item.overflow.count.Sword', label: 'Maximum Swords', unit: 'swords', help: 'The maximum number of swords Link can acquire.' },
  { key: 'item.overflow.count.Armor', label: 'Maximum Armor Upgrades', unit: 'armors', help: 'The maximum number of armor upgrades Link can acquire.' },
  { key: 'item.overflow.count.Shield', label: 'Maximum Shield Upgrades', unit: 'shields', help: 'The maximum number of shield upgrades Link can acquire.' },
  { key: 'item.overflow.count.Bow', label: 'Maximum Bow Upgrades', unit: 'bows', help: 'The maximum number of bow upgrades Link can acquire.' },
];

// Logic tab
export const LOGIC_MODES = [['NoGlitches', 'None'], ['OverworldGlitches', 'Overworld Glitches'],
  ['MajorGlitches', 'Major Glitches'], ['NoLogic', 'No Logic']];
export const GLITCHES = [
  ['canBootsClip', 'Boots Clip', 'When one has the Boots, they may be required to clip through walls in the overworld.'],
  ['canBunnyRevive', 'Bunny Revive', 'One may be required to go somewhere in bunny form and abuse death/fairy revive to be Link.'],
  ['canBunnySurf', 'Bunny Surf', 'One may be required to water walk in bunny state.'],
  ['canDungeonRevive', 'Dungeon Revive', 'One may be required to revive as a bunny in a dungeon to collect items as Link.'],
  ['canFakeFlipper', 'Fake Flipper', 'One may be required to use the fake flipper glitch to collect items.'],
  ['canMirrorClip', 'Mirror Clip', 'One may be required to abuse Mirror Portal Placements to go out of bounds.'],
  ['canMirrorWrap', 'Mirror Wrap', 'One may be required to use Mirror to auto scroll to a different location.'],
  ['canTransitionWrapped', 'Screenwrap Transition', 'One may be required to hit a transition from outside the current overworld screen to get an auto scroll.'],
  ['canOneFrameClipOW', 'One Frame Clip (overworld)', 'You don\u2019t want this. Trust me.'],
  ['canOneFrameClipUW', 'One Frame Clip (underworld)', 'Use 1 Frame Movement to clip between rooms of the underworld.'],
  ['canOWYBA', 'YBA (overworld)', 'May be required to use bottles in the overworld to teleport to different locations.'],
  ['canSuperBunny', 'Super Bunny', 'One may be required to activate super bunny to access locations.'],
  ['canSuperSpeed', 'Super Speed Clip', 'One may be required to super speed clip through edges in the overworld.'],
  ['canWaterWalk', 'Water walk', 'One may be required to use boots to walk on top of water.'],
];
export const NO_LOGIC_HELP = 'When this is selected all bets are off, and nothing below matters.';
export const LOGIC_FIX_HELP = 'Set the type of ROM fixes applied. Does not change item placement logic.';

// Prize Pack Pool / Prize Packs
export const DROPS = [
  ['ArrowRefill10', 'Arrow Refill (10)'], ['ArrowRefill5', 'Arrow Refill (5)'], ['Bee', 'Bee Swarm'],
  ['BeeGood', 'Good Bee'], ['BombRefill1', 'Bomb Refill (1)'], ['BombRefill4', 'Bomb Refill (4)'],
  ['BombRefill8', 'Bomb Refill (8)'], ['Fairy', 'Fairy'], ['Heart', 'Heart'], ['MagicRefillFull', 'Full Magic Refill'],
  ['MagicRefillSmall', 'Small Magic Refill'], ['RupeeBlue', 'Blue Rupee'], ['RupeeGreen', 'Green Rupee'],
  ['RupeeRed', 'Red Rupee'],
];
export const DROP_TOTAL = 63;
export const PACKS = [['0', 8], ['1', 8], ['2', 8], ['3', 8], ['4', 8], ['5', 8], ['6', 8],
  ['pull', 3], ['crab', 2], ['stun', 1], ['fish', 1]];
export const PACK_LABELS = { pull: 'Pull', crab: 'Crab', stun: 'Stun', fish: 'Fish' };

// Starting Equipment: alttpr.com's slots. A number cycles 0..max; true/false toggles.
export const EQUIPMENT = [
  { key: 'ProgressiveSword', label: 'Sword', max: 4, img: (n) => `sword${n}.png`, names: ['None', 'Fighter', 'Master', 'Tempered', 'Golden'] },
  { key: 'ProgressiveShield', label: 'Shield', max: 3, img: (n) => `shield${n}.png`, names: ['None', 'Fighter', 'Fire', 'Mirror'] },
  { key: 'ProgressiveArmor', label: 'Armor', max: 2, img: (n) => `mail${n}.png`, names: ['Green', 'Blue', 'Red'] },
  { key: 'MoonPearl', label: 'Moon Pearl', img: (on) => `moonpearl${on ? 1 : 0}.png` },
  { key: 'ProgressiveBow', label: 'Bow', max: 3, img: (n) => ['bow00.png', 'bow01.png', 'bow10.png', 'bow11.png'][n],
    names: ['None', 'Silvers only', 'Bow', 'Bow + Silvers'] },
  { key: 'Boomerang', label: 'Boomerang', max: 3, img: (n) => ['boomerang00.png', 'boomerang10.png', 'boomerang01.png', 'boomerang11.png'][n],
    names: ['None', 'Blue', 'Red', 'Both'] },
  { key: 'Hookshot', label: 'Hookshot', img: (on) => `hookshot${on ? 1 : 0}.png` },
  { key: 'Mushroom', label: 'Mushroom', img: (on) => `mushroom${on ? 1 : 0}.png` },
  { key: 'Powder', label: 'Powder', img: (on) => `powder${on ? '10' : '00'}.png` },
  { key: 'FireRod', label: 'Fire Rod', img: (on) => `firerod${on ? 1 : 0}.png` },
  { key: 'IceRod', label: 'Ice Rod', img: (on) => `icerod${on ? 1 : 0}.png` },
  { key: 'Bombos', label: 'Bombos', img: (on) => `bombos${on ? '10' : '00'}.png` },
  { key: 'Ether', label: 'Ether', img: (on) => `ether${on ? '10' : '00'}.png` },
  { key: 'Quake', label: 'Quake', img: (on) => `quake${on ? '10' : '00'}.png` },
  { key: 'Lamp', label: 'Lamp', img: (on) => `lamp${on ? 1 : 0}.png` },
  { key: 'Hammer', label: 'Hammer', img: (on) => `hammer${on ? 1 : 0}.png` },
  { key: 'Shovel', label: 'Shovel', img: (on) => `shovel${on ? 1 : 0}.png` },
  { key: 'Ocarina', label: 'Flute', max: 2, img: (n) => ['flute00.png', 'flute10.png', 'flute11.png'][n], names: ['None', 'Flute', 'Active flute'] },
  { key: 'BugCatchingNet', label: 'Bug Net', img: (on) => `net${on ? 1 : 0}.png` },
  { key: 'BookOfMudora', label: 'Book', img: (on) => `book${on ? 1 : 0}.png` },
  { key: 'CaneOfSomaria', label: 'Somaria', img: (on) => `caneofsomaria${on ? 1 : 0}.png` },
  { key: 'CaneOfByrna', label: 'Byrna', img: (on) => `caneofbyrna${on ? 1 : 0}.png` },
  { key: 'Cape', label: 'Cape', img: (on) => `cape${on ? 1 : 0}.png` },
  { key: 'MagicMirror', label: 'Mirror', img: (on) => `mirror${on ? 1 : 0}.png` },
  { key: 'PegasusBoots', label: 'Boots', img: (on) => `boots${on ? 1 : 0}.png` },
  { key: 'ProgressiveGlove', label: 'Gloves', max: 2, img: (n) => `gloves${n}.png`, names: ['None', 'Power Glove', 'Titan\'s Mitt'] },
  { key: 'Flippers', label: 'Flippers', img: (on) => `flippers${on ? 1 : 0}.png` },
  ...[1, 2, 3, 4].map((i) => ({ key: `Bottle${i}`, label: `Bottle ${i}`, max: 7,
    img: (n) => ['bottle0.png', 'bottle_empty.png', 'bottle_red.png', 'bottle_green.png', 'bottle_blue.png', 'bottle_bee.png', 'bottle_goodbee.png', 'bottle_fairy.png'][n],
    names: ['None', 'Empty', 'Red Potion', 'Green Potion', 'Blue Potion', 'Bee', 'Golden Bee', 'Fairy'] })),
];
export const EQUIPMENT_PRIZES = [
  ['PendantOfCourage', 'Green Pendant', 'greenpendant'], ['PendantOfPower', 'Red Pendant', 'pendant'],
  ['PendantOfWisdom', 'Blue Pendant', 'pendant'],
  ...[1, 2, 3, 4, 5, 6, 7].map((i) => [`Crystal${i}`, `Crystal ${i}`, i === 5 || i === 6 ? 'redcrystal' : 'crystal']),
];
const BOTTLES = [null, 'Bottle', 'BottleWithRedPotion', 'BottleWithGreenPotion', 'BottleWithBluePotion',
  'BottleWithBee', 'BottleWithGoldBee', 'BottleWithFairy'];

// ── lists from the generator itself (same filters as alttpr.com's settings endpoint) ──
const HIDDEN_ITEMS = new Set(['BigKey', 'Compass', 'Key', 'KeyGK', 'L2Sword', 'Map', 'MapLW', 'MapDW', 'BigKeyH1',
  'KeyH1', 'CompassH1', 'MapH1', 'multiRNG', 'PowerStar', 'singleRNG', 'TwentyRupees2', 'HeartContainerNoAnimation',
  'UncleSword', 'ShopKey', 'ShopArrow', 'ProgressiveBowAlternate', 'BombUpgrade50', 'ArrowUpgrade70']);

let cached = null;
export function catalog() {
  if (cached) return cached;
  const world = World.factory('standard', {});
  World.max_world = 1;
  const all = Item.all(world).values();
  const cfg = globalConfig.item;
  const defaults = {};
  for (const g of ['advancement', 'nice', 'junk', 'dungeon']) {
    for (const [k, v] of Object.entries(cfg[g] || {})) defaults[k] = (defaults[k] || 0) + v;
  }
  const nameOf = (i) => i.getNiceName() || i.getRawName();
  const items = [{ value: 'BottleWithRandom', name: 'Bottle (Random)', count: 4 }];
  for (const i of all) {
    const raw = i.getRawName();
    if (raw === 'Triforce' || !(i instanceof Item.Pendant || i instanceof Item.Crystal || i instanceof Item.Event
      || i instanceof Item.Programmable || i instanceof Item.BottleContents || HIDDEN_ITEMS.has(raw))) {
      items.push({ value: raw, name: nameOf(i), count: defaults[raw] || 0 });
    }
  }
  items.sort((a, b) => (a.value < b.value ? -1 : a.value > b.value ? 1 : 0));
  const pick = (cls) => all.filter((i) => i instanceof cls).map((i) => ({ value: i.getRawName(), name: nameOf(i) }));
  const locations = [];
  for (const l of world.getLocations().values()) {
    if (l instanceof Location.Prize.Event || l instanceof Location.Trade) continue;
    locations.push({
      name: l.getName().replace(/:\d+$/, ''),
      region: l.getRegion().getName(),
      kind: l instanceof Location.Fountain ? 'bottles' : l instanceof Location.Medallion ? 'medallions'
        : l instanceof Location.Prize ? 'prizes' : 'items',
    });
  }
  const dropDefaults = cfg.drop || {};
  cached = {
    items,
    prizes: [...pick(Item.Pendant), ...pick(Item.Crystal)].filter((p) => p.value !== 'Crystal'),
    bottles: pick(Item.Bottle),
    medallions: pick(Item.Medallion),
    locations,
    regions: [...new Set(locations.map((l) => l.region))],
    itemSlots: locations.filter((l) => l.kind === 'items').length,
    drops: DROPS.map(([value, name]) => ({ value, name, count: dropDefaults[value] || 0 })),
  };
  return cached;
}

// ── state: what a preset holds ────────────────────────────────────────────────
export function defaultState() {
  const c = catalog();
  const settings = {};
  SETTINGS.forEach((s) => { settings[s.key] = s.def; });
  SELECTS.forEach((s) => { settings[s.key] = s.def; });
  NUMBERS.forEach((s) => { settings[s.key] = ''; });
  settings['rom.logicMode'] = 'NoGlitches';
  const glitches = {};
  GLITCHES.forEach(([k]) => { glitches[k] = false; });
  const equipment = {};
  EQUIPMENT.forEach((e) => { equipment[e.key] = e.max ? 0 : false; });
  EQUIPMENT_PRIZES.forEach(([k]) => { equipment[k] = false; });
  equipment.BossHeartContainer = 3;
  equipment.Rupees = 0;
  const packs = {};
  PACKS.forEach(([p, n]) => { packs[p] = Array(n).fill('auto_fill'); });
  return {
    settings, glitches, noLogic: false, equipment, packs,
    items: Object.fromEntries(c.items.map((i) => [i.value, i.count])),
    drops: Object.fromEntries(c.drops.map((d) => [d.value, d.count])),
    locations: {},   // location name -> item value (missing = random)
    name: '', notes: '', neg: {}, dropNeg: {},
  };
}

// fill in anything an older or partial preset is missing
export function normalizeState(s) {
  const d = defaultState();
  if (!s || typeof s !== 'object') return d;
  const merge = (a, b) => ({ ...a, ...(b && typeof b === 'object' ? b : {}) });
  const out = {
    settings: merge(d.settings, s.settings), glitches: merge(d.glitches, s.glitches), noLogic: !!s.noLogic,
    equipment: merge(d.equipment, s.equipment), items: merge(d.items, s.items), drops: merge(d.drops, s.drops),
    locations: merge({}, s.locations), packs: d.packs, name: String(s.name || ''), notes: String(s.notes || ''),
    // placed items the random pool had none of left to give (so clearing them doesn't add one)
    neg: merge({}, s.neg), dropNeg: merge({}, s.dropNeg),
  };
  for (const [p, slots] of Object.entries(s.packs || {})) {
    if (out.packs[p] && Array.isArray(slots)) out.packs[p] = out.packs[p].map((v, i) => slots[i] || v);
  }
  return out;
}

// item counts as the pool shows them, when placing an item takes one out
const poolKey = (v) => (/Bottle/.test(v) ? 'BottleWithRandom' : /Shield/.test(v) ? 'ProgressiveShield'
  : /Sword/.test(v) ? 'ProgressiveSword' : /Mail/.test(v) ? 'ProgressiveArmor' : v);
export { poolKey };

export function placedCount(state) {
  const c = catalog();
  let n = 0;
  for (const l of c.locations) if (l.kind === 'items' && state.locations[l.name]) n++;
  return n;
}
export function poolTotal(state) {
  return Object.values(state.items).reduce((a, b) => a + (Number(b) || 0), 0) + placedCount(state);
}
export function dropTotal(state) {
  let placed = 0;
  Object.values(state.packs).forEach((slots) => slots.forEach((v) => { if (v && v !== 'auto_fill') placed++; }));
  return Object.values(state.drops).reduce((a, b) => a + (Number(b) || 0), 0) + placed;
}

function rupeeItems(amount) {
  let v = Math.min(Math.floor(Number(amount) || 0), 9999);
  const out = [];
  for (const [n, item] of [[300, 'ThreeHundredRupees'], [100, 'OneHundredRupees'], [50, 'FiftyRupees'],
    [20, 'TwentyRupees'], [5, 'FiveRupees'], [1, 'OneRupee']]) {
    while (v >= n) { out.push(item); v -= n; }
  }
  return out;
}

// alttpr.com's EquipmentSelect -> the list of starting items
export function equipmentList(eq) {
  const out = [];
  for (const [k, v] of Object.entries(eq)) {
    if (!v) continue;
    if (typeof v === 'boolean') out.push(k);
    else if (k === 'ProgressiveBow') out.push([null, 'SilverArrowUpgrade', 'Bow', 'BowAndSilverArrows'][v]);
    else if (k === 'Boomerang') out.push(...[[], ['Boomerang'], ['RedBoomerang'], ['RedBoomerang', 'Boomerang']][v]);
    else if (k === 'Ocarina') out.push([null, 'OcarinaInactive', 'OcarinaActive'][v]);
    else if (k === 'Rupees') out.push(...rupeeItems(v));
    else if (/^Bottle\d$/.test(k)) out.push(BOTTLES[v]);
    else for (let i = 0; i < v; i++) out.push(k);
  }
  return out.filter(Boolean);
}

const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? '' : Number(v));

/**
 * The generateCustom request: `main` is the bar's settings (readSettings()),
 * `state` the customizer's.
 */
export function buildRequest(main, state) {
  const s = state.settings;
  const custom = {};
  for (const [k, v] of Object.entries(s)) {
    if (NUMBERS.some((n) => n.key === k)) {
      const n = num(v);
      if (k.startsWith('item.overflow.count.')) { if (n !== '') custom[k] = n; } else custom[k] = n;
    } else custom[k] = v;
  }
  Object.assign(custom, state.glitches);
  for (const [k, v] of Object.entries(state.items)) custom[`item.count.${k}`] = Math.max(0, Number(v) || 0);
  for (const [k, v] of Object.entries(state.drops)) custom[`drop.count.${k}`] = Math.max(0, Number(v) || 0);
  const l = {};
  for (const [k, v] of Object.entries(state.locations)) if (v && v !== 'auto_fill') l[k] = v;
  return {
    ...main,
    glitches: state.noLogic ? 'no_logic' : 'none',
    name: state.name, notes: state.notes,
    l, eq: equipmentList(state.equipment), drops: state.packs, custom,
  };
}

// The tracker's dungeon-item mode for what this customizer shuffles
export function trackerDungeonItems(state, fallback) {
  const s = state.settings;
  if (s['region.wildKeys'] && s['region.wildBigKeys']) return 'keysanity';
  if (s['region.wildKeys']) return 'mapcompasskeys';
  if (s['region.wildMaps'] || s['region.wildCompasses']) return 'mapcompass';
  return fallback;
}

// ── an alttpr.com Customizer "Save" file (Save/Restore tab) -> state + bar fields ──
const B64 = (s) => { try { return decodeURIComponent(escape(atob(s))); } catch (e) { return null; } };
export function fromAlttprSave(json) {
  if (!json || typeof json !== 'object' || !Object.keys(json).some((k) => k.startsWith('vt.custom.') || k.startsWith('randomizer.'))) return null;
  const st = defaultState();
  const c = catalog();
  if (json['vt.custom.settings']) Object.assign(st.settings, json['vt.custom.settings']);
  if (json['vt.custom.glitches']) Object.assign(st.glitches, json['vt.custom.glitches']);
  if (json['vt.custom.items']) {
    for (const [k, v] of Object.entries(json['vt.custom.items'])) if (k in st.items) st.items[k] = Number(v) || 0;
  }
  if (json['vt.custom.drops']) {
    for (const [k, v] of Object.entries(json['vt.custom.drops'])) if (k in st.drops) st.drops[k] = Number(v) || 0;
  }
  if (json['vt.custom.prizepacks']) {
    for (const [p, slots] of Object.entries(json['vt.custom.prizepacks'])) {
      if (st.packs[p] && Array.isArray(slots)) st.packs[p] = st.packs[p].map((v, i) => slots[i] || v);
    }
  }
  if (json['vt.custom.locations']) {
    const known = new Set(c.locations.map((l) => l.name));
    for (const [hash, item] of Object.entries(json['vt.custom.locations'])) {
      const name = (B64(hash) || '').replace(/:\d+$/, '');
      if (known.has(name) && item) st.locations[name] = String(item).replace(/:\d+$/, '');
    }
  }
  if (json['vt.custom.equipment']) Object.assign(st.equipment, json['vt.custom.equipment']);
  delete st.equipment.empty;
  if (json['vt.custom.name']) st.name = String(json['vt.custom.name']);
  if (json['vt.custom.notes']) st.notes = String(json['vt.custom.notes']);
  if (json['randomizer.glitches_required'] === 'no_logic') st.noLogic = true;
  // the Generate tab's choices -> this app's bar
  const fields = {};
  const map = { 'randomizer.world_state': 'r-mode', 'randomizer.goal': 'r-goal', 'randomizer.tower_open': 'r-tower',
    'randomizer.ganon_open': 'r-ganon', 'randomizer.weapons': 'r-weapons', 'randomizer.dungeon_items': 'r-dungeon',
    'randomizer.item_placement': 'r-placement', 'randomizer.accessibility': 'r-access', 'randomizer.item_pool': 'r-pool',
    'randomizer.item_functionality': 'r-func', 'randomizer.hints': 'r-hints' };
  for (const [k, id] of Object.entries(map)) {
    const v = json[k] && typeof json[k] === 'object' ? json[k].value : json[k];
    if (v != null) fields[id] = String(v);
  }
  return { state: normalizeState(st), fields };
}
