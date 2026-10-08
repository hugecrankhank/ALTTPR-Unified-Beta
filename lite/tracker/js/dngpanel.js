/**
 * dngpanel.js — the dungeon hover panel, shared by map.html and itemtracker.html.
 *
 * One copy of the location tables and one renderer: the map hovers a dungeon
 * marker, the item tracker hovers a dungeon slot, and both get the same card.
 * (js/maplogic.js is the cautionary tale for keeping a second copy around.)
 *
 * A host page customises the panel through window.DngPanelHost:
 *   status(key)      → { word, cls } for the Status row, or null to omit it.
 *                      The map supplies its logic color; the item tracker has
 *                      no logic, so it omits the row.
 *   counts(key)      → { items, maxItems, keys, maxKeys, map, compass, bigkey }
 *                      Any field left undefined falls back to the item-tracker
 *                      snapshot, then to live SRAM, then to vanilla totals.
 *   completion(key)  → { cleared, fullyCleared } — boss down / dungeon finished.
 *   bossOk(key)      → false when the dungeon's selected boss needs an item the
 *                      player doesn't have yet; the Boss line says so.
 *   compact: true    → pin the smaller type size (a plain property, not a hook).
 *   locations(key)   → false to leave the per-chest list off the card.
 *   items(key)       → item states for the per-location rules ({lamp: 1, ...}).
 * Every hook is optional.
 */
'use strict';

(function () {

// Bumped with every change to this file. The map's gear menu shows it, so a
// stale packaged build can be spotted without guessing (Chris, Sep 2026).
window.DNGPANEL_BUILD = '1127n';

var DNG_PANEL_CSS = `
/* ── Dungeon hover panel ── */
#dng-panel {
  max-width: calc(100vw - 12px);
  position: fixed; pointer-events: none; z-index: 9998;
  display: none;
  background: #050505;
  border: 1px solid #444; border-radius: 6px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.7);
  padding: 8px 10px 7px;
  min-width: 168px;
  font-size: 12px; color: #fff;
}
#dng-panel.open { display: block; }
/* Click a location to skip it (junk you don't want, or a chest you can't get).
   The card takes the mouse while it is open: with only the rows taking it, the
   marker underneath fired mouseleave the moment the pointer crossed onto a row,
   which hid the card, which put the pointer back on the marker — a show/hide
   loop that read as the map hanging (Chris, Sep 2026). */
#dng-panel.open.dp-clickable { pointer-events: auto; }
#dng-panel .dp-row.dp-skip { cursor: pointer; }
#dng-panel .dp-row.dp-skip:hover .dp-label { color: #fff; text-decoration: underline; }
#dng-panel .dp-val.skipped { color: #888; text-decoration: line-through; font-style: italic; }
#dng-panel .dp-title {
  font-size: 15px; font-weight: 700; color: #fff;
  padding-bottom: 4px; margin-bottom: 5px;
  border-bottom: 1px solid #777;
  white-space: nowrap;
}
/* Check panels put the availability beside the name instead of in its own row. */
#dng-panel .dp-title.with-status {
  display: flex; align-items: baseline; justify-content: space-between; gap: 22px;
}
#dng-panel .dp-title.with-status .dp-val { font-size: 13px; }
#dng-panel .dp-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; line-height: 1.45; white-space: nowrap;
}
#dng-panel .dp-label { color: #ddd; }
#dng-panel .dp-val   { font-weight: 600; }
#dng-panel .dp-val.available { color: #4caf50; }
#dng-panel .dp-val.possible  { color: #ffd700; }
#dng-panel .dp-val.visible   { color: #ff9800; }
#dng-panel .dp-val.ool       { color: #b07ae0; }
#dng-panel .dp-val.unavail   { color: #e04a4a; }
#dng-panel .dp-val.done      { color: #7fd4ff; }
#dng-panel .dp-val.cleared   { color: #888; text-decoration: line-through; }
/* A player's own right-click tag ("Marked: Sword") — a note, not a status. */
#dng-panel .dp-val.marked    { color: #cfd3da; font-style: italic; }
#dng-panel .dp-icons {
  display: flex; align-items: center; gap: 6px;
  margin-top: 6px; padding-top: 5px; border-top: 1px solid #333;
}
#dng-panel .dp-icons img {
  width: 18px; height: 18px; object-fit: contain; image-rendering: pixelated;
}
#dng-panel .dp-icons img.dim { opacity: 0.28; filter: grayscale(1); }
#dng-panel .dp-locs {
  margin-top: 6px; padding-top: 5px; border-top: 1px solid #333;
  font-size: 11px;
}
#dng-panel .dp-locs { column-gap: 18px; }
#dng-panel .dp-locs .dp-row { break-inside: avoid; gap: 12px; }
#dng-panel .dp-locs .dp-label { overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1 1 auto; }
#dng-panel .dp-locs .dp-val { flex: 0 0 auto; }
/* Let a narrow window squeeze the columns instead of overflowing it. */
#dng-panel .dp-locs { column-fill: balance; max-width: 100%; }
/* Fallback type size for a window too small to hold the card at normal size. */
#dng-panel.compact { font-size: 11px; padding: 6px 9px 6px; min-width: 0; }
#dng-panel.compact .dp-title { font-size: 13px; }
#dng-panel.compact .dp-row { line-height: 1.35; gap: 12px; }
#dng-panel.compact .dp-locs { font-size: 10px; column-gap: 14px; }
#dng-panel.compact .dp-icons img { width: 15px; height: 15px; }
#dng-panel .dp-locs .dp-label { color: #ccc; }
`;

// ── Data ──────────────────────────────────────────────────────────────────────

// Location names per dungeon, in the order a player normally meets them
// (Chris's ordering, Sep 2026 — not the source file's alphabetical order).
// Names are also the keys for DUNGEON_LOC_FLAGS and LOC_RULES, so they must
// match those tables exactly; only the order is free. "Prize" is not listed
// (the marker draws it) and GT has no Boss line (Agahnim 2 isn't tracked).
var DUNGEON_LOCATIONS = {
  hc:  ['Map Chest', 'Boomerang Chest', "Zelda's Chest", 'Sanctuary', 'Sewers - Dark Cross',
        'Sewers - Secret Room - Left', 'Sewers - Secret Room - Middle',
        'Sewers - Secret Room - Right'],
  ep:  ['Cannonball Chest', 'Map Chest', 'Compass Chest', 'Big Chest', 'Big Key Chest', 'Boss'],
  dp:  ['Map Chest', 'Compass Chest', 'Big Key Chest', 'Torch', 'Big Chest', 'Boss'],
  toh: ['Basement Cage', 'Map Chest', 'Big Key Chest', 'Compass Chest', 'Big Chest', 'Boss'],
  ct:  ['Room 03', 'Dark Maze', 'Boss'],
  pod: ['Shooter Room', 'The Arena - Bridge', 'The Arena - Ledge', 'Map Chest',
        'Stalfos Basement', 'Compass Chest', 'Dark Basement - Left', 'Dark Basement - Right',
        'Harmless Hellway', 'Big Key Chest', 'Dark Maze - Top', 'Dark Maze - Bottom',
        'Big Chest', 'Boss'],
  sp:  ['Entrance', 'Map Chest', 'Compass Chest', 'West Chest', 'Big Key Chest', 'Big Chest',
        'Flooded Room - Left', 'Flooded Room - Right', 'Waterfall Room', 'Boss'],
  sw:  ['Map Chest', 'Pot Prison', 'Compass Chest', 'Pinball Room', 'Big Key Chest',
        'Big Chest', 'Bridge Room', 'Boss'],
  tt:  ['Map Chest', 'Ambush Chest', 'Compass Chest', 'Big Key Chest', 'Attic', "Blind's Cell",
        'Big Chest', 'Boss'],
  ip:  ['Compass Chest', 'Big Key Chest', 'Spike Room', 'Map Chest', 'Freezor Chest',
        'Iced T Room', 'Big Chest', 'Boss'],
  mm:  ['Bridge Chest', 'Spike Chest', 'Compass Chest', 'Main Lobby', 'Map Chest',
        'Big Key Chest', 'Big Chest', 'Boss'],
  tr:  ['Compass Chest', 'Roller Room - Left', 'Roller Room - Right', 'Chain Chomps',
        'Big Key Chest', 'Big Chest', 'Crystaroller Room', 'Eye Bridge - Top Left',
        'Eye Bridge - Top Right', 'Eye Bridge - Bottom Left', 'Eye Bridge - Bottom Right',
        'Boss'],
  gt:  ['Hope Room - Left', 'Hope Room - Right', "Bob's Torch", 'DMs Room - Bottom Left',
        'DMs Room - Bottom Right', 'DMs Room - Top Left', 'DMs Room - Top Right', 'Map Chest',
        'Firesnake Room', 'Randomizer Room - Bottom Left', 'Randomizer Room - Bottom Right',
        'Randomizer Room - Top Left', 'Randomizer Room - Top Right', "Bob's Chest",
        'Big Key Chest', 'Big Key Room - Left', 'Big Key Room - Right',
        'Compass Room - Bottom Left', 'Compass Room - Bottom Right', 'Compass Room - Top Right',
        'Compass Room - Top Left', 'Tile Room', 'Big Chest', 'Mini Helmasaur Room - Left',
        'Mini Helmasaur Room - Right', 'Pre-Moldorm Chest', 'Validation Chest'],
};

// Display-only labels; the key stays canonical so the flag and rule tables bind.
var DUNGEON_LOC_LABELS = {
  ct: { 'Boss': 'Agahnim 1' },
  mm: { 'Big Key Chest': 'Big Key Chest (Cutscene)' },
  sp: { 'Compass Chest': 'Compass Chest (Reach-around)' },
  tr: { 'Big Key Chest': 'Big Key Chest (Lava)' }
};

// ── Key Drop Shuffle locations ────────────────────────────────────────────────
// The pot keys and enemy drops that become real item locations under Key Drop
// shuffle. Flags are the same [offset, mask] shape as DUNGEON_LOC_FLAGS but
// they live in a DIFFERENT SRAM block (KEYDROP_START in js/items.js), with the
// enemy-drop half at +0x250 — so they are read from window._lastKeyDropData,
// never from the room array. Bits copied from js/items.js KEYDROP_DATA.
//
// `after` / `before` name the location the drop is listed beneath or above, so
// play order survives without rewriting DUNGEON_LOCATIONS. `kind` picks which setting shows it:
// 'pot' → Pot Key Drop, 'drop' → Enemy Key Drop (Key Drop turns on both).
//
// Names are the randomizer's, matched to the rooms the flags point at. If one
// reads wrong on a live seed, only this table needs the fix.
var KEYDROP_LOCS = {
  hc:  [{ name: 'Boomerang Guard Key Drop', kind: 'drop', flag: [0x0e3, 0x40], after: 'Boomerang Chest' },
        { name: 'Map Guard Key Drop',       kind: 'drop', flag: [0x0e5, 0x80], after: 'Map Chest' },
        { name: 'Big Key Drop',             kind: 'drop', flag: [0x101, 0x20], before: "Zelda's Chest" },
        { name: 'Key Rat Key Drop',         kind: 'drop', flag: [0x043, 0x80], after: 'Sewers - Dark Cross' }],
  ep:  [{ name: 'Dark Square Pot Key',   kind: 'pot',  flag: [0x175, 0x08], after: 'Big Chest' },
        { name: 'Dark Eyegore Key Drop', kind: 'drop', flag: [0x133, 0x10], after: 'Big Key Chest' }],
  dp:  [{ name: 'Desert Tiles 1 Pot Key', kind: 'pot', flag: [0x0c7, 0x04], after: 'Big Chest' },
        { name: 'Beamos Hall Pot Key',    kind: 'pot', flag: [0x0a7, 0x20], after: 'Big Chest' },
        { name: 'Desert Tiles 2 Pot Key', kind: 'pot', flag: [0x087, 0x01], after: 'Big Chest' }],
  ct:  [{ name: 'Dark Archer Key Drop',  kind: 'drop', flag: [0x181, 0x10], after: 'Dark Maze' },
        { name: 'Circle of Pots Key Drop', kind: 'drop', flag: [0x160, 0x20], after: 'Dark Maze' }],
  sp:  [{ name: 'Pot Row Pot Key',  kind: 'pot', flag: [0x071, 0x10], after: 'Map Chest' },
        { name: 'Trench 1 Pot Key', kind: 'pot', flag: [0x06f, 0x80], before: 'Compass Chest' },
        { name: 'Hookshot Pot Key', kind: 'pot', flag: [0x06d, 0x08], before: 'West Chest' },
        { name: 'Trench 2 Pot Key', kind: 'pot', flag: [0x06b, 0x80], after: 'Big Key Chest' },
        { name: 'Waterway Pot Key', kind: 'pot', flag: [0x02c, 0x80], after: 'Waterfall Room' }],
  sw:  [{ name: 'West Lobby Pot Key',    kind: 'pot',  flag: [0x0ac, 0x04], after: 'Map Chest' },
        { name: 'Spike Corner Key Drop', kind: 'drop', flag: [0x073, 0x40], after: 'Bridge Room' }],
  tt:  [{ name: 'Hallway Pot Key',      kind: 'pot', flag: [0x179, 0x40], after: 'Big Key Chest' },
        { name: 'Spike Switch Pot Key', kind: 'pot', flag: [0x157, 0x80], after: 'Big Key Chest' }],
  ip:  [{ name: 'Jelly Key Drop',       kind: 'drop', flag: [0x01d, 0x10], before: 'Compass Chest' },
        { name: 'Conveyor Key Drop',    kind: 'drop', flag: [0x07c, 0x80], after: 'Big Key Chest' },
        { name: 'Hammer Block Key Drop', kind: 'pot', flag: [0x07f, 0x02], after: 'Spike Room' },
        { name: 'Many Pots Pot Key',    kind: 'pot',  flag: [0x13f, 0x08], before: 'Big Chest' }],
  mm:  [{ name: 'Spikes Pot Key',            kind: 'pot',  flag: [0x167, 0x80], before: 'Spike Chest' },
        { name: 'Fishbone Pot Key',          kind: 'pot',  flag: [0x143, 0x80], after: 'Spike Chest' },
        { name: 'Conveyor Crystal Key Drop', kind: 'drop', flag: [0x182, 0x40], before: 'Map Chest' }],
  tr:  [{ name: 'Pokey 1 Key Drop', kind: 'drop', flag: [0x16d, 0x04], before: 'Chain Chomps' },
        { name: 'Pokey 2 Key Drop', kind: 'drop', flag: [0x027, 0x02], before: 'Big Key Chest' }],
  gt:  [{ name: 'Conveyor Cross Pot Key',     kind: 'pot',  flag: [0x117, 0x40], after: "Bob's Torch" },
        { name: 'Double Switch Pot Key',      kind: 'pot',  flag: [0x137, 0x40], before: 'Firesnake Room' },
        { name: 'Conveyor Star Pits Pot Key', kind: 'pot',  flag: [0x0f7, 0x08], after: 'Compass Room - Top Left' },
        { name: 'Mini Helmasaur Key Drop',    kind: 'drop', flag: [0x07b, 0x20], after: 'Mini Helmasaur Room - Right' }]
};

// Pot keys and enemy drops are separate settings; "Key Drop" turns on both.
// items.js owns the real flags; the map has only trackerSettings.
function keyDropOn(kind) {
  var fn = (kind === 'pot') ? window.keyDropFlag : window.enemyKeyDropFlag;
  if (typeof fn === 'function') { try { return !!fn(); } catch (e) {} }
  var s = window.trackerSettings || {};
  if (s.keyDropAll === 'yes') return true;
  return ((kind === 'pot') ? s.keyDrop : s.enemyKeyDrop) === 'yes';
}

// For the map: it doesn't load items.js, so window.keyDropFlag is missing
// there and the settings fallback above is the only answer it can get.
window.dngKeyDropOn = keyDropOn;

// Are this kind's key drops in the item pool? Key Drop says so, and so do the
// full drop modes: dungeon-wide Pottery Shuffle shuffles every dungeon pot, key
// pots included, and Enemy Drop "Underworld" every enemy. keyDropOn() alone
// missed those, so a Pottery + Underworld Key Sanity seed read every key
// threshold as vanilla — Desert's boss available on one key (Chris, Sep 2026).
// The key-drop LINES still follow keyDropOn(): in a drop mode those pots and
// enemies are counted in the card's Pots / Enemies rows instead.
function keysShuffledBy(kind) {
  if (keyDropOn(kind)) return true;
  return (kind === 'pot') ? !!POTTERY_DUNGEON_MODES[potteryModeName()] : enemyDropsOn();
}
window.dngKeysShuffled = keysShuffledBy;

// The dungeon's location list with the enabled key drops spliced in.
function locsFor(locKey) {
  var base = DUNGEON_LOCATIONS[locKey] || [];
  var drops = (KEYDROP_LOCS[locKey] || []).filter(function (d) { return keyDropOn(d.kind); });
  if (!drops.length) return base;
  var out = [];
  base.forEach(function (n) {
    drops.forEach(function (d) { if (d.before === n) out.push(d.name); });
    out.push(n);
    drops.forEach(function (d) { if (d.after === n) out.push(d.name); });
  });
  // Anything whose anchor isn't in the list (a renamed location) still shows.
  drops.forEach(function (d) { if (out.indexOf(d.name) === -1) out.push(d.name); });
  return out;
}

function keyDropFlagFor(locKey, loc) {
  var list = KEYDROP_LOCS[locKey] || [];
  for (var i = 0; i < list.length; i++) if (list[i].name === loc) return list[i];
  return null;
}

var DUNGEON_LOC_FLAGS = {
  hc: {
    'Boomerang Chest':             [0x0e2, 0x10],  // room 0x71
    'Map Chest':                   [0x0e4, 0x10],  // room 0x72
    "Zelda's Chest":               [0x100, 0x10],  // room 0x80
    'Sanctuary':                   [0x024, 0x10],  // room 0x12
    'Sewers - Dark Cross':         [0x064, 0x10],  // room 0x32
    'Sewers - Secret Room - Left': [0x022, 0x10],  // room 0x11
    'Sewers - Secret Room - Middle':[0x022, 0x20],
    'Sewers - Secret Room - Right': [0x022, 0x40]
  },
  ep: {
    'Compass Chest':    [0x150, 0x10],  // room 0xa8
    'Big Chest':        [0x152, 0x10],  // room 0xa9
    'Cannonball Chest': [0x172, 0x10],  // room 0xb9
    'Big Key Chest':    [0x170, 0x10],  // room 0xb8
    'Map Chest':        [0x154, 0x10],  // room 0xaa
    'Boss':             [0x191, 0x08]  // room 0xc8  boss
  },
  dp: {
    'Big Chest':     [0x0e6, 0x10],  // room 0x73
    'Torch':         [0x0e7, 0x04],  // room 0x73
    'Map Chest':     [0x0e8, 0x10],  // room 0x74
    'Compass Chest': [0x10a, 0x10],  // room 0x85
    'Big Key Chest': [0x0ea, 0x10],  // room 0x75
    'Boss':          [0x067, 0x08]  // room 0x33  boss
  },
  toh: {
    'Basement Cage': [0x10f, 0x04],  // room 0x87
    'Map Chest':     [0x0ee, 0x10],  // room 0x77
    'Big Key Chest': [0x10e, 0x10],  // room 0x87
    'Compass Chest': [0x04e, 0x20],  // room 0x27
    'Big Chest':     [0x04e, 0x10],  // room 0x27
    'Boss':          [0x00f, 0x08]  // room 0x07  boss
  },
  ct: {
    'Room 03':   [0x1c0, 0x10],  // room 0xe0
    'Dark Maze': [0x1a0, 0x10]  // room 0xd0
  },
  pod: {
    'Shooter Room':          [0x012, 0x10],  // room 0x09
    'The Arena - Bridge':    [0x054, 0x20],  // room 0x2a
    'Stalfos Basement':      [0x014, 0x10],  // room 0x0a
    'Big Key Chest':         [0x074, 0x10],  // room 0x3a
    'The Arena - Ledge':     [0x054, 0x10],  // room 0x2a
    'Map Chest':             [0x056, 0x10],  // room 0x2b
    'Compass Chest':         [0x034, 0x20],  // room 0x1a
    'Dark Basement - Left':  [0x0d4, 0x10],  // room 0x6a
    'Dark Basement - Right': [0x0d4, 0x20],  // room 0x6a
    'Dark Maze - Top':       [0x032, 0x10],  // room 0x19
    'Dark Maze - Bottom':    [0x032, 0x20],  // room 0x19
    'Big Chest':             [0x034, 0x10],  // room 0x1a
    'Harmless Hellway':      [0x034, 0x40],  // room 0x1a
    'Boss':                  [0x0b5, 0x08]  // room 0x5a  boss
  },
  sp: {
    'Entrance':             [0x050, 0x10],  // room 0x28
    'Map Chest':            [0x06e, 0x10],  // room 0x37
    'Big Chest':            [0x06c, 0x10],  // room 0x36
    'Compass Chest':        [0x08c, 0x10],  // room 0x46
    'Big Key Chest':        [0x06a, 0x10],  // room 0x35
    'West Chest':           [0x068, 0x10],  // room 0x34
    'Flooded Room - Left':  [0x0ec, 0x10],  // room 0x76
    'Flooded Room - Right': [0x0ec, 0x20],  // room 0x76
    'Waterfall Room':       [0x0cc, 0x10],  // room 0x66
    'Boss':                 [0x00d, 0x08]  // room 0x06  boss
  },
  sw: {
    'Compass Chest': [0x0ce, 0x10],  // room 0x67
    'Map Chest':     [0x0b0, 0x20],  // room 0x58
    'Big Chest':     [0x0b0, 0x10],  // room 0x58
    'Pot Prison':    [0x0ae, 0x20],  // room 0x57
    'Pinball Room':  [0x0d0, 0x10],  // room 0x68
    'Big Key Chest': [0x0ae, 0x10],  // room 0x57
    'Bridge Room':   [0x0b2, 0x10],  // room 0x59
    'Boss':          [0x053, 0x08]  // room 0x29  boss
  },
  tt: {
    'Big Key Chest': [0x1b6, 0x20],  // room 0xdb
    'Map Chest':     [0x1b6, 0x10],  // room 0xdb
    'Compass Chest': [0x1b8, 0x10],  // room 0xdc
    'Ambush Chest':  [0x196, 0x10],  // room 0xcb
    'Attic':         [0x0ca, 0x10],  // room 0x65
    'Big Chest':     [0x088, 0x10],  // room 0x44
    'Blind\'s Cell': [0x08a, 0x10],  // room 0x45
    'Boss':          [0x159, 0x08]  // room 0xac  boss
  },
  ip: {
    'Compass Chest': [0x05c, 0x10],  // room 0x2e
    'Freezor Chest': [0x0fc, 0x10],  // room 0x7e
    'Big Chest':     [0x13c, 0x10],  // room 0x9e
    'Iced T Room':   [0x15c, 0x10],  // room 0xae
    'Spike Room':    [0x0be, 0x10],  // room 0x5f
    'Big Key Chest': [0x03e, 0x10],  // room 0x1f
    'Map Chest':     [0x07e, 0x10],  // room 0x3f
    'Boss':          [0x1bd, 0x08]  // room 0xde  boss
  },
  mm: {
    'Big Chest':     [0x186, 0x10],  // room 0xc3
    'Map Chest':     [0x186, 0x20],  // room 0xc3
    'Main Lobby':    [0x184, 0x10],  // room 0xc2
    'Bridge Chest':  [0x144, 0x10],  // room 0xa2
    'Spike Chest':   [0x166, 0x10],  // room 0xb3
    'Compass Chest': [0x182, 0x10],  // room 0xc1
    'Big Key Chest': [0x1a2, 0x10],  // room 0xd1
    'Boss':          [0x121, 0x08]  // room 0x90  boss
  },
  tr: {
    'Compass Chest':             [0x1ac, 0x10],  // room 0xd6
    'Roller Room - Left':        [0x16e, 0x10],  // room 0xb7
    'Roller Room - Right':       [0x16e, 0x20],  // room 0xb7
    'Chain Chomps':              [0x16c, 0x10],  // room 0xb6
    'Big Key Chest':             [0x028, 0x10],  // room 0x14
    'Big Chest':                 [0x048, 0x10],  // room 0x24
    'Crystaroller Room':         [0x008, 0x10],  // room 0x04
    'Eye Bridge - Bottom Left':  [0x1aa, 0x80],  // room 0xd5
    'Eye Bridge - Bottom Right': [0x1aa, 0x40],  // room 0xd5
    'Eye Bridge - Top Left':     [0x1aa, 0x20],  // room 0xd5
    'Eye Bridge - Top Right':    [0x1aa, 0x10],  // room 0xd5
    'Boss':                      [0x149, 0x08]  // room 0xa4  boss
  },
  gt: {
    'Bob\'s Torch':                   [0x119, 0x04],  // room 0x8c
    'Hope Room - Left':               [0x118, 0x20],  // room 0x8c
    'Hope Room - Right':              [0x118, 0x40],  // room 0x8c
    'Tile Room':                      [0x11a, 0x10],  // room 0x8d
    'Compass Room - Top Left':        [0x13a, 0x10],  // room 0x9d
    'Compass Room - Top Right':       [0x13a, 0x20],  // room 0x9d
    'Compass Room - Bottom Left':     [0x13a, 0x40],  // room 0x9d
    'Compass Room - Bottom Right':    [0x13a, 0x80],  // room 0x9d
    'DMs Room - Top Left':            [0x0f6, 0x10],  // room 0x7b
    'DMs Room - Top Right':           [0x0f6, 0x20],  // room 0x7b
    'DMs Room - Bottom Left':         [0x0f6, 0x40],  // room 0x7b
    'DMs Room - Bottom Right':        [0x0f6, 0x80],  // room 0x7b
    'Map Chest':                      [0x116, 0x10],  // room 0x8b
    'Firesnake Room':                 [0x0fa, 0x10],  // room 0x7d
    'Randomizer Room - Top Left':     [0x0f8, 0x10],  // room 0x7c
    'Randomizer Room - Top Right':    [0x0f8, 0x20],  // room 0x7c
    'Randomizer Room - Bottom Left':  [0x0f8, 0x40],  // room 0x7c
    'Randomizer Room - Bottom Right': [0x0f8, 0x80],  // room 0x7c
    'Bob\'s Chest':                   [0x118, 0x80],  // room 0x8c
    'Big Chest':                      [0x118, 0x10],  // room 0x8c
    'Big Key Room - Left':            [0x038, 0x20],  // room 0x1c
    'Big Key Room - Right':           [0x038, 0x40],  // room 0x1c
    'Big Key Chest':                  [0x038, 0x10],  // room 0x1c
    'Mini Helmasaur Room - Left':     [0x07a, 0x10],  // room 0x3d
    'Mini Helmasaur Room - Right':    [0x07a, 0x20],  // room 0x3d
    'Pre-Moldorm Chest':              [0x07a, 0x40],  // room 0x3d
    'Validation Chest':               [0x09a, 0x10],  // room 0x4d
    'Boss':                           [0x01b, 0x08]  // room 0x0d  boss
  },
};

var DUNGEON_ITEM_FLAGS = {
  hc:  { map:[0x369,0x40],                         bigkey:[0x367,0x40] },
  ep:  { map:[0x369,0x20], compass:[0x365,0x20], bigkey:[0x367,0x20] },
  dp:  { map:[0x369,0x10], compass:[0x365,0x10], bigkey:[0x367,0x10] },
  toh: { map:[0x368,0x20], compass:[0x364,0x20], bigkey:[0x366,0x20] },
  ct:  {                                         bigkey:[0x367,0x08] },
  pod: { map:[0x369,0x02], compass:[0x365,0x02], bigkey:[0x367,0x02] },
  sp:  { map:[0x369,0x04], compass:[0x365,0x04], bigkey:[0x367,0x04] },
  sw:  { map:[0x368,0x80], compass:[0x364,0x80], bigkey:[0x366,0x80] },
  tt:  { map:[0x368,0x10], compass:[0x364,0x10], bigkey:[0x366,0x10] },
  ip:  { map:[0x368,0x40], compass:[0x364,0x40], bigkey:[0x366,0x40] },
  mm:  { map:[0x369,0x01], compass:[0x365,0x01], bigkey:[0x367,0x01] },
  tr:  { map:[0x368,0x08], compass:[0x364,0x08], bigkey:[0x366,0x08] },
  gt:  { map:[0x368,0x04], compass:[0x364,0x04], bigkey:[0x366,0x04] }
};

// Vanilla item/key totals — the last resort when neither the item tracker's
// dungeon state nor a broadcast snapshot is available yet.
var DUNGEON_MAX_FALLBACK = {
  hc:  { items: 6,  keys: 1 }, ep: { items: 3, keys: 0 }, dp:  { items: 2, keys: 1 },
  toh: { items: 2,  keys: 1 }, pod:{ items: 5, keys: 6 }, sp:  { items: 6, keys: 1 },
  sw:  { items: 2,  keys: 3 }, tt: { items: 4, keys: 1 }, ip:  { items: 3, keys: 2 },
  mm:  { items: 2,  keys: 3 }, tr: { items: 5, keys: 4 }, gt:  { items: 20, keys: 4 }
};

var DUNGEON_FULL_NAMES = {
  hc:'Hyrule Castle', ep:'Eastern Palace', dp:'Desert Palace', toh:'Tower of Hera',
  ct:"Agahnim's Tower", pod:'Palace of Darkness', sp:'Swamp Palace',
  sw:'Skull Woods', tt:"Thieves' Town", ip:'Ice Palace',
  mm:'Misery Mire', tr:'Turtle Rock', gt:"Ganon's Tower"
};

// ── Cleared marks ─────────────────────────────────────────────────────────────
// Keyed '<dungeon>/<location>'. Both windows scan the same SRAM and write the
// same localStorage key, so they agree without talking to each other.

// **Not persisted, deliberately.** These marks are a view of live SRAM and
// nothing else. Saving them meant a mark outlived the seed that produced it: a
// chest opened in an earlier file kept reading "cleared", and with no emulator
// attached there was never a fresh read to correct it — Chris relaunched twice
// and TT's Big Chest stayed wrong. In memory only, they repopulate from the
// first poll (sub-second when autotracking is attached) and are simply absent
// when it isn't, which leaves the honest logic status on screen.
var dngLocCleared = {};
// Clear the key the persisting version left behind, so its stale marks go away
// on the next launch without anyone having to touch the console.
try { localStorage.removeItem('dng-loc-cleared'); } catch (e) {}
function saveDngLocCleared() { /* nothing to save — see above */ }

// Locations the player has skipped by clicking them on the card: junk they saw
// and don't want counted, or a chest they can't reach. In memory only, same as
// the marks above — a skip belongs to the file being played, not to the app.
// The per-dungeon COUNT lives on the dungeon (js/items.js `skipped`), which is
// what lowers the target; this map only remembers which lines to strike out.
// 1 = skipped, and it takes an item off the dungeon's total (the chest held
// an item you won't collect). 2 = skipped, but it held one of the dungeon's own
// items (map, compass, key), so the item total is untouched (Chris, Sep 2026).
var dngLocSkipped = {};

function dngSkipCount(dk) {
  var pre = dk + '/', n = 0;
  Object.keys(dngLocSkipped).forEach(function (id) {
    if (id.indexOf(pre) === 0 && dngLocSkipped[id] === 1) n++;
  });
  return n;
}

// Hand the new count to whoever owns it: the item tracker sets it directly,
// the map relays it over the broadcast channel (both define the hook).
function pushDngSkip(dk) {
  if (typeof window.onDngSkipChanged === 'function') window.onDngSkipChanged(dk, dngSkipCount(dk));
}

window.dngLocSkipToggle = function (dk, loc) {
  var id = dk + '/' + loc;
  // none -> skipped -> skipped (dungeon item) -> none
  var v = dngLocSkipped[id];
  if (v === 1) dngLocSkipped[id] = 2; else if (v === 2) delete dngLocSkipped[id]; else dngLocSkipped[id] = 1;
  pushDngSkip(dk);
  refresh();
};
window.dngLocSkipped = function (dk, loc) { return !!dngLocSkipped[dk + '/' + loc]; };
// Done with, one way or another: collected, or waved off on the card. Used by
// the map's dungeon colour for a requirement that only one location needs
// (Chris, Sep 2026 — Desert's boots are the Torch's and nothing else's).
window.dngLocDone = function (dk, loc) {
  return window.dngLocSkipped(dk, loc) || locIsCleared(dk, loc);
};

window.dngLocClearedReset = function () {
  dngLocCleared = {};
  var hadSkips = Object.keys(dngLocSkipped);
  dngLocSkipped = {};
  hadSkips.forEach(function (id) { pushDngSkip(id.split('/')[0]); });
  // The card renders from the last room array, so New Game has to drop that
  // too — otherwise every chest kept reading "cleared" off the old file until
  // the next poll. Both resetChecks and resetItemTracker route through here.
  window._lastRoomData = null;
  window._lastKeyDropData = null;
  gtBk = { armed: false, at: null, atTorch: false };
  saveGtBk();
  refresh();
};

// The room-flag region: two bytes per room, 0x000–0x27f (chests, the boss bit).
// Those bits only ever go up within a file, but a save & quit blanks the block
// for a moment — and a read can catch it half written — which made every chest
// on the card read uncollected again: Desert's Big Chest and Map Chest came
// back after a save & quit (Chris, Sep 2026). So the region is merged with what
// we already had, exactly as the key-drop block is.
//
// Only that region. Small-key counts (0x4e0+) and Agahnim's counter (0x3c5) are
// VALUES, not flags, and ORing those would corrupt them.
var ROOM_FLAG_END = 0x280;
window.mergeRoomFlags = function (data) {
  if (!data || !data.length) return data;
  var prev = window._lastRoomData;
  if (!prev || prev.length !== data.length) return data;
  var out = new Uint8Array(data.length);
  out.set(data);
  var end = Math.min(ROOM_FLAG_END, data.length);
  for (var i = 0; i < end; i++) out[i] = data[i] | prev[i];
  return out;
};

function sramBit(data, flag) {
  if (!data || flag[0] >= data.length) return false;
  return (data[flag[0]] & flag[1]) !== 0;
}

// Is this location open, according to the most recent room data? The panel
// renders from THIS, not from the mark map — the marks are only a change
// detector for deciding when to redraw. Chris hit a card that said "cleared"
// while dumpDungeonChests() said the bit was clear; reading the same bytes at
// render time as the dump does makes that disagreement impossible.
function locIsCleared(dk, loc) {
  var data = window._lastRoomData;
  if (dk === 'ct' && loc === 'Boss') {
    return !!(data && 0x3c5 < data.length && data[0x3c5] >= 3);
  }
  var kd = keyDropFlagFor(dk, loc);
  if (kd) {
    // Key drops live in their own SRAM block, with the enemy half at +0x250.
    var kdata = window._lastKeyDropData;
    if (!kdata) return false;
    return sramBit(kdata, [kd.flag[0] + (kd.kind === 'drop' ? 0x250 : 0), kd.flag[1]]);
  }
  var flag = (DUNGEON_LOC_FLAGS[dk] || {})[loc];
  if (!flag) return false;
  if (!data) return !!dngLocCleared[dk + '/' + loc];   // nothing polled yet
  return sramBit(data, flag);
}

// Call with the raw SRAM room array on every poll.
//
// A full read (>= 0x400 bytes, which covers every offset in the tables above)
// is authoritative: the marks are REBUILT from it, so a chest that isn't open
// stops being marked. That matters because the marks are persisted — carrying
// them forward made a chest from an earlier seed or file show "cleared" in a
// dungeon where it had never been taken (Chris hit this on TT: dungeon
// complete, Big Chest never obtained, line still read cleared).
//
// A short/partial read can only ADD marks, never clear them, so a truncated
// response can't wipe real progress.
window.updateDungeonLocFlags = function (data) {
  if (!data || !data.length) return;
  var authoritative = data.length >= 0x400;
  // Only a full read becomes the reference copy. A short/partial response must
  // not replace it — the panel reads these bytes to decide what is cleared, and
  // a truncated array would blank every mark on screen.
  if (authoritative) {
    data = window.mergeRoomFlags(data);
    window._lastRoomData = data;
  }
  var next  = authoritative ? {} : dngLocCleared;
  var dirty = false;

  Object.keys(DUNGEON_LOC_FLAGS).forEach(function (dk) {
    var table = DUNGEON_LOC_FLAGS[dk];
    Object.keys(table).forEach(function (loc) {
      var id = dk + '/' + loc;
      if (sramBit(data, table[loc])) {
        if (!next[id]) { next[id] = 1; dirty = true; }
        // Actually taken — a skip on it would double-count against the target.
        if (dngLocSkipped[id]) { delete dngLocSkipped[id]; pushDngSkip(dk); }
      } else if (authoritative && dngLocCleared[id]) {
        dirty = true;                       // was marked, isn't open — drop it
      }
    });
  });

  // Agahnim has no room bit — the game counts him at 0x3c5 (>= 3 = defeated).
  if (0x3c5 < data.length && data[0x3c5] >= 3) {
    if (!next['ct/Boss']) { next['ct/Boss'] = 1; dirty = true; }
  } else if (authoritative && dngLocCleared['ct/Boss']) {
    dirty = true;
  }

  if (authoritative) dngLocCleared = next;
  if (dirty) saveDngLocCleared();
  if (authoritative) updateGtBk();
  // Refresh either way: the map/compass/big key icons read room data directly,
  // so they can change with no new cleared mark.
  refresh();
};

// ── GT big key count (the "which chest has the big key?" guessing game) ──
// Counts the Ganon's Tower chests opened and freezes the count on the read
// where the big key arrives: "Chest 9 had the big key" counts the big key
// chest itself. Chests only — Bob's Torch is reported separately (the overlay
// can add it by hand when it's skipped) — and only where the big key isn't
// shuffled and no key drops are on (Chris, Oct 2026). Published as
// snap.gtBk → tracker:gt-bk → overlays/announce.html.
//
// `at` is captured only if we saw the big key still missing first, so a tracker
// opened mid-run with the key already found reports found-but-unknown rather
// than a made-up number. Remembered across reloads; New Game clears it.
var GTBK_KEY = 'alttp-gtbk';
var gtBk = (function () {
  try { var v = JSON.parse(localStorage.getItem(GTBK_KEY) || 'null'); if (v) return v; } catch (e) {}
  return { armed: false, at: null, atTorch: false };
})();
function saveGtBk() { try { localStorage.setItem(GTBK_KEY, JSON.stringify(gtBk)); } catch (e) {} }
function gtChestsOpened(data) {
  var t = DUNGEON_LOC_FLAGS.gt, n = 0;
  Object.keys(t).forEach(function (loc) {
    if (loc === 'Boss' || loc === "Bob's Torch") return;
    if (sramBit(data, t[loc])) n++;
  });
  return n;
}
function gtBkEnabled() {
  var bkShuffled = window.dungeonShuffle ? !!window.dungeonShuffle().bigkey
                 : !!(window.shuffleBigKey && window.shuffleBigKey());
  return !bkShuffled && !keysShuffledBy('pot') && !keysShuffledBy('drop');
}
var _gtBkSent = '';
function updateGtBk() {
  var data = window._lastRoomData;
  if (!data) return;
  var found = dngItemState('gt', 'bigkey') === 1;
  // Big key gone again → a different file or seed: start over.
  if (!found && (gtBk.at !== null || !gtBk.armed)) {
    gtBk = { armed: true, at: null, atTorch: false }; saveGtBk();
  }
  if (found && gtBk.armed && gtBk.at === null) {
    gtBk.at = gtChestsOpened(data);
    gtBk.atTorch = sramBit(data, DUNGEON_LOC_FLAGS.gt["Bob's Torch"]);
    saveGtBk();
  }
  var st = JSON.stringify(window.gtBkState());
  if (st !== _gtBkSent) {
    _gtBkSent = st;
    if (window.broadcastItemSnap) window.broadcastItemSnap();
  }
}
window.gtBkState = function () {
  var data = window._lastRoomData;
  return {
    enabled: gtBkEnabled(),
    chests:  data ? gtChestsOpened(data) : 0,
    torch:   !!(data && sramBit(data, DUNGEON_LOC_FLAGS.gt["Bob's Torch"])),
    found:   dngItemState('gt', 'bigkey') === 1,
    at:      gtBk.at,          // chests opened when the big key arrived (null = unknown)
    atTorch: !!gtBk.atTorch    // was the torch taken by then
  };
};

// Chests opened / total and the boss, for the announce card in
// overlays/announce.html (Chris, Oct 2026). Chests only — pots and key drops
// aren't counted — read from the same flags the hover card uses.
window.dngCardCounts = function (dk) {
  var names = (DUNGEON_LOCATIONS[dk] || []).filter(function (n) { return n !== 'Boss'; });
  var opened = names.filter(function (n) { return locIsCleared(dk, n); }).length;
  var hasBoss = (DUNGEON_LOCATIONS[dk] || []).indexOf('Boss') !== -1 ||
                !!(DUNGEON_LOC_FLAGS[dk] || {}).Boss;   // GT: Agahnim 2's room
  return { opened: opened, total: names.length,
           bossBeaten: hasBoss ? locIsCleared(dk, 'Boss') : null };
};

// The key drop SRAM block, straight from the poll (js/items.js) or relayed to
// the map over BroadcastChannel. Rendered live, same as the room array.
window.updateKeyDropFlags = function (data) {
  if (!data || !data.length) return;
  // Merge rather than replace. Save & quit blanks this block for a moment (and
  // a mid-save read can catch it half written), which made every pot and drop
  // read "not collected" until the game was back in. Within a seed these bits
  // only ever go up, so OR them together; New Game clears the store outright
  // through dngLocClearedReset.
  var prev = window._lastKeyDropData;
  if (prev && prev.length === data.length) {
    var merged = new Uint8Array(data.length);
    for (var i = 0; i < data.length; i++) merged[i] = data[i] | prev[i];
    data = merged;
  }
  window._lastKeyDropData = data;
  refresh();
};

// Console helper for verifying a mapping against a live seed:
//   dumpDungeonChests('dp')  →  one line per location with its raw byte.
window.dumpDungeonChests = function (dk, data) {
  data = data || window._lastRoomData;
  var table = DUNGEON_LOC_FLAGS[dk];
  if (!table) { console.log('no flag table for ' + dk); return; }
  if (!data)  { console.log('no room data yet — attach the emulator first'); return; }
  Object.keys(table).forEach(function (loc) {
    var off = table[loc][0], mask = table[loc][1];
    var val = off < data.length ? data[off] : null;
    console.log(loc.padEnd(24),
      '0x' + off.toString(16), 'mask 0x' + mask.toString(16),
      'byte=0x' + (val === null ? '--' : val.toString(16)),
      (val !== null && (val & mask)) ? '→ CLEARED' : '→ not cleared');
  });
};

// ── Host hooks ────────────────────────────────────────────────────────────────

// Logic color → the word and CSS class the panel shows. Shared so the map and
// the item tracker describe the same color identically; the item tracker gets
// its colors from the map over BroadcastChannel (type 'dungeoncolors').
var DNG_STATUS_WORD  = { green:'available', yellow:'possible', orange:'visible only',
                         purple:'out of logic', red:'unavailable' };
var DNG_STATUS_CLASS = { green:'available', yellow:'possible', orange:'visible',
                         purple:'ool', red:'unavail' };
window.dngStatusFromColor = function (color) {
  if (!color || !DNG_STATUS_WORD[color]) return null;
  return { word: DNG_STATUS_WORD[color], cls: DNG_STATUS_CLASS[color] };
};

// ── Per-location logic ────────────────────────────────────────────────────────
// A rule decides one line's status outright: it may raise a line above the
// dungeon's own status (a chest with no requirements is "available" even while
// the dungeon as a whole is only "possible") as well as lower it. What it never
// touches is the dungeon's availability itself — the map marker's colour still
// comes from dungeonColor() alone.
//
// The one guard: an upgrade only applies while the dungeon is actually
// reachable. If the dungeon is visible-only / out of logic / unavailable, the
// line takes the worse of the two, so no line ever claims to be available
// inside a dungeon you can't get into.
//
// A rule returns a class name, 'bossitem', or null to inherit the dungeon's
// status unchanged.
//   ctx.item('lamp') → truthy when held    ctx.bigkey → the dungeon's big key
//   ctx.keys         → small keys held     ctx.bossOk → boss-item check, or null
//   ctx.enemizer     → enemizer is on      ctx.base   → the dungeon's own class
var DNG_RANK = { available:0, possible:1, visible:2, ool:3, unavail:4 };
var DNG_WORD_BY_CLS = { available:'available', possible:'possible',
                        visible:'visible only', ool:'out of logic', unavail:'unavailable' };

function worseCls(a, b) {
  if (!a || DNG_RANK[a] === undefined) return b;
  if (!b || DNG_RANK[b] === undefined) return a;
  return (DNG_RANK[b] > DNG_RANK[a]) ? b : a;
}

// Is the dungeon reachable enough for a rule to raise a line above it?
function dungeonReachable(baseCls) {
  return !baseCls || baseCls === 'available' || baseCls === 'possible';
}

// Key Drop shuffle turns SP's single key into six, with a door in front of
// nearly every location. `spKeys(c, need, poss, inner)` passes `inner` through
// once the count is met, downgrades an available line to possible while the
// count is at `poss`, and calls it unavailable below that. Vanilla SP has one
// key and none of these thresholds apply.
// SP shorthand: the hammer decides available vs out of logic, and the flooded
// half also wants the hookshot.
// SP past the hammer barrier. Without the hammer it is a swim through the
// trenches, and that needs the hookshot to get back out again — so no hookshot
// means no route at all, not merely one out of logic (Chris, Sep 2026).
function ham(c) {
  if (c.item('hammer'))   return 'available';
  return c.item('hookshot') ? 'ool' : 'unavail';
}
function hook(c, need, poss, oolAt) {
  if (!c.item('hookshot')) return 'unavail';
  return spKeys(c, need, poss, ham(c), oolAt);
}

// `oolAt`: from this many keys up to the possible/available counts, a
// reachable line reads out of logic instead of unavailable (Chris, Oct 2026).
function spKeys(c, need, poss, inner, oolAt) {
  if (!c.keydrop || c.keys >= need) return inner;
  if (poss && c.keys >= poss) return inner === 'available' ? 'possible' : inner;
  if (oolAt && c.keys >= oolAt && inner !== 'unavail') return 'ool';
  return 'unavail';
}

function dpKeyed(c) {
  // Under Pot Key Drop the dungeon holds four keys and the back route eats
  // them, so one key in hand says only that this door MIGHT be the one it
  // opens: possible from the first key, certain once all four are held. The
  // gloves route at the back doesn't reach these two at all, so with no key it
  // is unavailable rather than possible (Chris, Sep 2026).
  if (c.keydrop) {
    if (c.keys >= 4) return 'available';
    return c.keys >= 1 ? 'possible' : 'unavail';
  }
  // Vanilla DP has a single key, so holding it settles the matter.
  if (c.keys >= 1) return 'available';
  return c.item('gloves') ? 'possible' : 'unavail';
}

// Palace of Darkness's key-gated locations. `need` keys makes it certain; from
// `poss` up to that it is merely possible (the keys may be wanted deeper in);
// below `poss` it can't be reached at all. PoD holds six keys, and its deep
// locations only become certain once you have them all.
// Compass side (Compass Chest, Dark Basement): the bow opens a one-key route,
// so one key and the bow (or enemizer) reads possible (Chris, Sep 2026).
// Mothula: under entrance shuffle one small key, and the fire rod or the lamp
// and bombs; otherwise the fire rod alone, as before (Chris, Sep 2026).
function swEntShuffle() {
  return !!(window.trackerSettings && window.trackerSettings.entranceShuffle);
}
function swFire(c) {
  if (!swEntShuffle()) return c.item('firerod');
  if (c.keys < 1) return false;
  return c.item('firerod') || (c.item('lamp') && c.item('bomb'));
}
function podCompass(c) {
  if (c.keys === 1 && (c.enemizer || c.item('bow'))) return 'possible';
  return podKeyed(c, 4, 2);
}
function podKeyed(c, need, poss) {
  if (c.keys >= need) return 'available';
  if (c.keys >= (poss === undefined ? need - 1 : poss)) return 'possible';
  return 'unavail';
}

// Turtle Rock's key-gated locations. `need` is the count that makes it a
// certainty; one key short of that it is merely possible (the keys may be
// wanted deeper in). `noBigKey` for the Lava Chest, which sits in front of the
// big key door.
function trKeyed(c, need, noBigKey) {
  if (!noBigKey && !c.bigkey) return 'unavail';
  if (c.keys >= need) return 'available';
  if (c.keys >= need - 1) return 'possible';
  return 'unavail';
}

// Repeated GT requirements, shared by the many identical rooms.
function gtMain(c)    { return (c.item('hammer') && c.item('hookshot')) ? 'available' : 'unavail'; }
function gtCompass(c) { return (c.item('somaria') && c.item('firerod')) ? 'available' : 'unavail'; }
function gtBigKey(c)  { return c.bigkey ? 'available' : 'unavail'; }
// The floors past the big key door are a bow fight — the mini-helmasaurs
// guarding the climb have to be shot. Enemizer can replace them with anything,
// so the bow only counts on a vanilla enemy set (Chris, Sep 2026).
function gtClimb(c) {
  if (!c.bigkey) return 'unavail';
  if (!c.enemizer && !c.item('bow')) return 'unavail';
  return 'available';
}
// GT's Map Chest: the hammer, then either the hookshot or the boots to cross.
function gtMapChest(c) {
  return (c.item('hammer') && (c.item('hookshot') || c.item('boots')))
    ? 'available' : 'unavail';
}
// Key Drop shuffle layers key counts on top of GT's item requirements: the
// item rule still has to pass, then `poss` keys make the line possible and
// `avail` keys make it available. Without key drop nothing changes.
function gtKD(inner, poss, avail) {
  return function (c) {
    var base = inner(c);
    if (base !== 'available' || !c.keydrop) return base;
    if (c.keys >= avail) return 'available';
    return c.keys >= poss ? 'possible' : 'unavail';
  };
}
function gtFree()   { return 'available'; }

// HC's key thresholds are Key Drop shuffle's — vanilla HC has a single key,
// so without key drop only the one-key doors are enforced.
// The three Escape Sewers secret-room chests. The wall always needs boots or a
// bomb; past that either the gloves (lift the rock, skipping the dark room) or
// the key door route, which crosses the dark room and so wants the lamp. Key
// Drop shuffle moves that door to the fourth key.
// IP's deep tier (Big Key Chest, Map Chest, Hammer Block): the hookshot route
// wants a fourth key, the somaria route gets there on three, and three keys
// with only the hammer is the out-of-logic-ish "possible" reading.
// Past the big key chest. The hammer is what carries you through, in every
// branch — the key-drop tier used to hand out 'available' on four keys and the
// hookshot alone, which put the Map Chest in logic with no hammer at all
// (Chris, Sep 2026).
function ipDeep(c) {
  if (!c.item('hammer')) return 'unavail';
  var res;
  if (!c.keydrop) res = 'available';
  else if (c.keys >= 4 && c.item('hookshot')) res = 'available';
  else if (c.keys >= 3 && c.item('somaria') && c.item('hookshot')) res = 'available';
  else res = (c.keys >= 3) ? 'possible' : 'unavail';
  return ipBack(c, res);
}

// The Big Key Chest sits in the same tier, but it can be reached without the
// hammer — out of logic rather than impossible. Asked of ipDeep with a hammer
// granted, so the key tiers stay in one place.
function ipBigKey(c) {
  if (!c.keydrop && c.keys >= 1 && c.item('hammer')) return 'available';
  // Key Drop, with the hammer and the hookshot: two keys possible, three
  // available (Chris, Oct 2026).
  if (c.keydrop && c.keys >= 2 && c.item('hammer') && c.item('hookshot')) return c.keys >= 3 ? 'available' : 'possible';
  var res = ipDeep(c);
  if (res !== 'unavail') return res;
  // Key Drop: the cane's way in still takes the first key (Chris, Oct 2026).
  if (c.keydrop && c.keys < 1) return 'unavail';
  // The Cane of Somaria reaches it on its own — not something to call in
  // logic, but not impossible either. With neither the cane nor the hammer
  // there is no way in and it stays red: an earlier version asked "would a
  // hammer fix this?", which read out of logic on the hookshot alone (Chris,
  // Sep 2026).
  return c.item('somaria') ? 'ool' : 'unavail';
}
// Everything past the gap in Ice Palace's descent. The hookshot crosses it, and
// Somaria's block does the same job, so either one is enough; with neither, the
// only way over is a bomb jump — doable, not in logic. Applied on top of
// whatever the key/item tiers already said, so a location that isn't reachable
// at all stays unavailable rather than being softened to out of logic.
// Inverted (1.0 and 2.0) puts a lifted block between the descent and both the
// Map Chest and the boss door, so a glove is required for those two and for
// nothing else in here (Chris, Sep 2026).
function ipInvGlove(c, res) {
  if (res === 'unavail' || res === 'bossitem') return res;
  if (!(window.trackerSettings || {}).inverted) return res;
  return c.item('gloves') ? res : 'unavail';
}

function ipBack(c, res) {
  if (res === 'unavail' || res === 'bossitem') return res;
  return (c.item('hookshot') || c.item('somaria')) ? res : 'ool';
}
// With every small key and the big key in hand the key doors take you round
// the gap, so the Big Chest and the boss don't need the hookshot or Somaria
// (Chris, Sep 2026).
function ipBackAll(c, res) {
  return (c.bigkey && c.keys >= (c.keydrop ? 6 : 2)) ? res : ipBack(c, res);
}
// Without key drop, one small key and the hammer take the other way round the
// gap, so these rooms are in logic with neither hookshot nor Somaria (Chris,
// Sep 2026 — Big Key Chest, Spike Room, Freezor Chest, Iced T Room).
function ipBackKey(c, res) {
  if (!c.keydrop && c.keys >= 1 && c.item('hammer') && res !== 'unavail' && res !== 'bossitem') return res;
  return ipBack(c, res);
}

// A plain key threshold that only applies under key drop.
function ipKeys(c, need) {
  if (!c.keydrop) return 'available';
  return c.keys >= need ? 'available' : 'unavail';
}

// TR's back half under Key Drop: five keys and the big key does it outright;
// three keys plus the boss item is the possible reading.
function trDeep(c) {
  if (!c.bigkey) return 'unavail';
  if (c.keys >= 5) return 'available';
  return (c.keys >= 3 && c.bossOk !== false) ? 'possible' : 'unavail';
}
// The Eye Bridge sits past the Crystaroller Room's key door; the only key door
// after it is the pair before the boss. So one key short of TR's total still
// reaches the bridge for certain — only the boss needs the last one (Chris,
// Sep 2026). Possible from two keys (three under key drop).
function trBridge(c) {
  if (!c.bigkey) return 'unavail';
  var need = c.keydrop ? 5 : 3;
  var some = c.keydrop ? 3 : 2;
  if (c.keys < some) return 'unavail';
  // Dark rooms on the way in from the front: no lamp is out of logic.
  if (!c.item('lamp')) return 'ool';
  return c.keys >= need ? 'available' : 'possible';
}

// MM under Key Drop: possible from `poss` keys (the first, by default),
// available at `need`.
function mmTier(c, need, poss) {
  if (c.keys >= need) return 'available';
  return c.keys >= (poss || 1) ? 'possible' : 'unavail';
}

// TT's higher key counts only exist under Key Drop shuffle; vanilla TT has one.
function ttKeys(c, need) { return !c.keydrop || c.keys >= need; }
// Key Drop: possible at `poss` keys, available at `need`; vanilla, available.
function ttTier(c, need, poss) {
  if (ttKeys(c, need)) return 'available';
  return c.keys >= poss ? 'possible' : 'unavail';
}

function escapeSewers(c) {
  if (!c.item('boots') && !c.item('bomb')) return 'unavail';
  if (c.item('gloves')) return 'available';
  if (c.keys < (c.keydrop ? 4 : 1)) return 'unavail';
  // Standard start walks Zelda out through a lit sewer, so the dark-room
  // navigation the lamp covers isn't needed. Open and Inverted start you
  // outside, and then it is.
  return (c.item('lamp') || standardStart()) ? 'available' : 'ool';
}

// Standard world state: the game walks you out through the escape, so anything
// the escape hands you on the way is guaranteed rather than gated.
function standardStart() {
  return ((window.trackerSettings || {}).gamemode || 'standard') === 'standard';
}

function hcKeys(c, need) {
  return c.keys >= (c.keydrop ? need : Math.min(need, 1));
}

var LOC_RULES = {
  hc: {
    'Map Chest':                function () { return 'available'; },
    'Map Guard Key Drop':       function () { return 'available'; },
    // The key for this door comes off the guard standing in front of it. Unless
    // key drop shuffles that guard's key somewhere else, it is always there —
    // Key Sanity included, since Key Sanity alone doesn't touch guard drops.
    'Boomerang Chest':          function (c) {
      if (!c.keydrop) return 'available';
      return hcKeys(c, 1) ? 'available' : 'unavail';
    },
    'Boomerang Guard Key Drop': function (c) { return hcKeys(c, 1) ? 'available' : 'unavail'; },
    'Big Key Drop':             function (c) { return hcKeys(c, 2) ? 'available' : 'unavail'; },
    "Zelda's Chest":            function (c) {
      // The cell door's key comes off the guard in front of it, like the
      // Boomerang Chest's. HC's one tracked key is the Dark Cross key for the
      // sewers, so outside key drop shuffle no key count gates this chest
      // (Chris, Sep 2026).
      if (c.keydrop && !hcKeys(c, 2)) return 'unavail';
      if (c.bigkey) return 'available';
      // Outside Big Key Shuffle the chain guard in front of the cell always
      // drops HC's big key, so nothing gates this chest — it is a give, and the
      // dungeon reads green rather than sitting red until the drop is tracked
      // (Chris, Sep 2026). Key Drop shuffle makes that guard a real location,
      // and Key Sanity shuffles the key itself, so both keep the gate below.
      if (!window.shuffleBigKey() && !c.keydrop) return 'available';
      // Standard start hands you HC's big key on the way through the escape,
      // so the chest is only a matter of getting there — possible until the
      // key actually shows up. In Open the big key is a shuffled item and its
      // absence really does block the chest.
      return standardStart() ? 'possible' : 'unavail';
    },
    'Key Rat Key Drop':         function (c) { return hcKeys(c, 3) ? 'available' : 'unavail'; },
    // The escape sewers: four keys under key drop, otherwise whatever the
    // dungeon's own status already says (null = inherit).
    'Sewers - Secret Room - Left':   escapeSewers,
    'Sewers - Secret Room - Middle': escapeSewers,
    'Sewers - Secret Room - Right':  escapeSewers
  },

  ep: {
    // Nothing gates these three beyond getting into the dungeon.
    'Cannonball Chest': function () { return 'available'; },
    'Compass Chest':    function () { return 'available'; },
    'Map Chest':        function () { return 'available'; },
    'Big Chest':        function (c) { return c.bigkey ? 'available' : 'unavail'; },
    // Reachable in the dark, but not something to call in logic. Key Drop
    // shuffle puts a key door in front of it; vanilla EP has none. Under key
    // drop one key reads possible, two available (Chris, Oct 2026).
    'Big Key Chest':    function (c) {
      if (c.keydrop && c.keys < 1) return 'unavail';
      if (!c.item('lamp')) return 'ool';
      return (c.keydrop && c.keys < 2) ? 'possible' : 'available';
    },
    'Boss':             function (c) {
      if (!c.bigkey) return 'unavail';
      // Key Drop shuffle puts two small key doors between the entrance and
      // Armos; vanilla EP has none, so the count only counts under key drop.
      // One key reads possible, both available (Chris, Sep 2026).
      if (c.keydrop && c.keys < 1) return 'unavail';
      if (!c.enemizer && !c.item('bow')) return 'unavail';  // Armos needs the bow unless enemizer
      // Torch room on the way: the fire rod lights it as well as the lamp
      // (the reference logic's canTorchRoomNavigate).
      if (!c.item('lamp') && !c.item('firerod')) return 'ool';
      return (c.keydrop && c.keys < 2) ? 'possible' : 'available';
    },
    // Key drops. The dark square is crossable without light, just not in logic.
    'Dark Square Pot Key':   function (c) { return c.item('lamp') ? 'available' : 'ool'; },
    'Dark Eyegore Key Drop': function (c) {
      if (!c.bigkey) return 'unavail';
      return (c.item('lamp') || c.item('firerod')) ? 'available' : 'ool';
    }
  },
  toh: {
    'Basement Cage':  function () { return 'available'; },
    'Map Chest':      function () { return 'available'; },
    'Big Chest':      function (c) { return c.bigkey ? 'available' : 'unavail'; },
    // Without the big key it's still reachable by hookshotting across and
    // blowing/dashing the wall — out of logic rather than unavailable.
    'Compass Chest':  function (c) {
      if (c.bigkey) return 'available';
      return (c.item('hookshot') && (c.item('bomb') || c.item('boots'))) ? 'ool' : 'unavail';
    },
    // Small key for the door, and a fire source for the torches behind it.
    'Big Key Chest':  function (c) {
      if (c.keys < 1) return 'unavail';
      return (c.item('firerod') || c.item('lamp')) ? 'available' : 'unavail';
    },
    'Boss':           function (c) {
      if (c.bossOk === false) return 'bossitem';
      if (c.bigkey) return 'available';
      // Hera pot glitch: anyone who can reach the Compass Chest can carry a pot
      // up to Moldorm and skip the big key door, so the boss is out of logic
      // rather than unavailable (Chris, Sep 2026). Boss items still decide it.
      return LOC_RULES.toh['Compass Chest'](c) === 'ool' ? 'ool' : 'unavail';
    }
  },

  dp: {
    // Behind the dungeon's small key. Without it, only possible with the gloves
    // (the back route); with neither, nothing doing.
    'Compass Chest': dpKeyed,
    'Big Key Chest': dpKeyed,
    'Map Chest':     function () { return 'available'; },
    // Seen from the ledge without the boots, but not obtainable.
    'Torch':         function (c) { return c.item('boots') ? 'available' : 'visible'; },
    'Big Chest':     function (c) { return c.bigkey ? 'available' : 'unavail'; },
    'Boss':          function (c) {
      if (!c.bigkey) return 'unavail';
      if (!c.item('gloves')) return 'unavail';                        // back of the dungeon
      if (!c.item('lamp') && !c.item('firerod')) return 'unavail';    // torches to open the way
      if (c.bossOk === false) return 'bossitem';
      // Key Drop shuffle puts four key doors on the way to Lanmolas; vanilla
      // DP's single key isn't between the entrance and the boss at all.
      if (c.keydrop) {
        if (c.keys >= 4) return 'available';
        return c.keys >= 3 ? 'possible' : 'unavail';
      }
      return 'available';
    },
    // Key drops: all three are past the gloves barrier, and the last two want
    // keys on top of it (one short = possible).
    'Desert Tiles 1 Pot Key': function (c) { return c.item('gloves') ? 'available' : 'unavail'; },
    'Beamos Hall Pot Key':    function (c) {
      if (!c.item('gloves')) return 'unavail';
      if (c.keys >= 2) return 'available';
      return c.keys >= 1 ? 'possible' : 'unavail';
    },
    'Desert Tiles 2 Pot Key': function (c) {
      if (!c.item('gloves')) return 'unavail';
      if (c.keys >= 3) return 'available';
      return c.keys >= 2 ? 'possible' : 'unavail';
    }
  },

  ct: {
    // Getting in (cape or master sword, and the overworld route) is the
    // dungeon's own status. Everything past Room 03 is in the dark maze, so
    // every line below wants the lamp plus its share of the small keys.
    'Room 03':   function () { return 'available'; },
    'Dark Maze': function (c) {
      return (c.item('lamp') && c.keys >= 1) ? 'available' : 'unavail';
    },
    'Dark Archer Key Drop':   function (c) {
      return (c.item('lamp') && c.keys >= 2) ? 'available' : 'unavail';
    },
    'Circle of Pots Key Drop': function (c) {
      return (c.item('lamp') && c.keys >= 3) ? 'available' : 'unavail';
    },
    // Four keys once Key Drop shuffle adds its two, otherwise CT's own pair.
    // The cape sneaks past the barrier but doesn't fight Agahnim, so the
    // weapon requirement lives here rather than in the dungeon's status.
    'Boss':      function (c) {
      if (!c.item('lamp')) return 'unavail';
      if (c.keys < (c.keydrop ? 4 : 2)) return 'unavail';
      return (c.swordless ? c.item('hammer') : c.item('sword')) ? 'available' : 'unavail';
    }
  },

  pod: {
    'Shooter Room':          function () { return 'available'; },
    'The Arena - Bridge':    function (c) { return c.keys >= 1 ? 'available' : 'unavail'; },
    // Bombs drop the chest off the ledge; boots won't do it.
    'The Arena - Ledge':     function (c) {
      if (!c.enemizer && !c.item('bow')) return 'unavail';
      return c.item('bomb') ? 'available' : 'unavail';
    },
    'Map Chest':             function (c) {
      return (c.enemizer || c.item('bow')) ? 'available' : 'unavail';
    },
    'Stalfos Basement':      function (c) { return c.keys >= 1 ? 'available' : 'unavail'; },
    'Compass Chest':         podCompass,
    // Dark rooms: keys first, then a light source. No light is out of logic —
    // including when the keys only make it possible, since doing it blind isn't
    // in logic either way.
    'Dark Basement - Left':  function (c) {
      var k = podCompass(c);
      if (k === 'unavail') return k;
      return (c.item('lamp') || c.item('firerod')) ? k : 'ool';
    },
    'Dark Basement - Right': function (c) {
      var k = podCompass(c);
      if (k === 'unavail') return k;
      return (c.item('lamp') || c.item('firerod')) ? k : 'ool';
    },
    'Harmless Hellway':      function (c) { return podKeyed(c, 6, 2); },
    // Possible from two keys, with Hellway and the Dark Maze (Chris, Sep 2026).
    'Big Key Chest':         function (c) { return podKeyed(c, 6, 2); },
    'Dark Maze - Top':       function (c) {
      var k = podKeyed(c, 6, 2);
      if (k === 'unavail') return k;
      return c.item('lamp') ? k : 'ool';
    },
    'Dark Maze - Bottom':    function (c) {
      var k = podKeyed(c, 6, 2);
      if (k === 'unavail') return k;
      return c.item('lamp') ? k : 'ool';
    },
    'Big Chest':             function (c) {
      if (!c.bigkey) return 'unavail';
      var k = podKeyed(c, 6, 2);
      if (k === 'unavail') return k;
      return c.item('lamp') ? k : 'ool';
    },
    'Boss':                  function (c) {
      if (!c.bigkey || !c.item('bow') || !c.item('hammer')) return 'unavail';
      if (c.bossOk === false) return 'bossitem';
      // One key gets you moving toward him; only all six make it certain.
      return podKeyed(c, 6, 1);
    }
  },


  sp: {
    // Everything past the entrance wants the hammer; without it the tracker
    // shows out of logic rather than unavailable (Chris's call). The key
    // counts are Key Drop shuffle's; see spKeys().
    'Entrance':            function () { return 'available'; },
    // Just past the entrance door: nothing of its own to ask for. The wrapper
    // below adds SP's first key, and only where small keys are shuffled — the
    // rule used to ask for the key itself, which kept it red in modes where the
    // key is simply the Entrance chest (Chris, Sep 2026).
    'Map Chest':           function () { return 'available'; },
    // The pot row is before the hammer barrier — one key is all it wants.
    'Pot Row Pot Key':     function (c) { return spKeys(c, 1, 0, 'available'); },
    // Key Drop: two keys out of logic, three available (Chris, Oct 2026) —
    // likewise one key short reads out of logic for the lines below.
    'Compass Chest':       function (c) { return spKeys(c, 3, 0, ham(c), 2); },
    // Trench 1's pot is on this side of the hammer barrier, like the pot row —
    // two keys and nothing else (Chris, Sep 2026).
    'Trench 1 Pot Key':    function (c) { return spKeys(c, 2, 0, 'available'); },
    'Hookshot Pot Key':    function (c) { return hook(c, 3, 0, 2); },
    'West Chest':          function (c) { return spKeys(c, 4, 0, ham(c), 3); },
    'Big Key Chest':       function (c) { return spKeys(c, 4, 0, ham(c), 3); },
    'Trench 2 Pot Key':    function (c) { return spKeys(c, 3, 0, ham(c), 2); },
    'Big Chest':           function (c) {
      if (!c.bigkey) return 'unavail';
      // Same room as the Hookshot Pot Key: two keys out of logic, three
      // available (Chris, Oct 2026).
      return spKeys(c, 3, 0, ham(c), 2);
    },
    'Flooded Room - Left':  function (c) { return hook(c, 5, 4, 3); },
    'Flooded Room - Right': function (c) { return hook(c, 5, 4, 3); },
    'Waterfall Room':       function (c) { return hook(c, 5, 4, 3); },
    'Waterway Pot Key':     function (c) { return hook(c, 5, 4, 3); },
    'Boss':                function (c) {
      if (!c.item('hookshot')) return 'unavail';
      if (c.bossOk === false) return 'bossitem';
      return spKeys(c, 6, 5, ham(c), 4);
    }
  },
  sw: {
    'Map Chest':     function () { return 'available'; },
    // Same lobby as the Map Chest, so the same (empty) requirements.
    'West Lobby Pot Key': function () { return 'available'; },
    'Pot Prison':    function () { return 'available'; },
    'Compass Chest': function () { return 'available'; },
    'Pinball Room':  function () { return 'available'; },
    'Big Key Chest': function () { return 'available'; },
    'Big Chest':     function (c) { return c.bigkey ? 'available' : 'unavail'; },
    // Entrance shuffle: the SW label is all it takes (the wrapper below checks
    // it) — the key and fire are the boss's, not the bridge's (Chris, Sep 2026).
    'Bridge Room':   function (c) {
      if (swEntShuffle()) return 'available';
      return c.item('firerod') ? 'available' : 'unavail';
    },
    // Key drop only. One key reads possible, three available (Chris, Oct 2026).
    'Spike Corner Key Drop': function (c) {
      if (!c.item('firerod') || !c.item('sword')) return 'unavail';
      return podKeyed(c, 3, 1);
    },
    'Boss':          function (c) {
      if (!swFire(c)) return 'unavail';
      // The curtain in front of Mothula is cut with a sword, in every mode but
      // swordless (Chris, Sep 2026).
      if (!c.swordless && !c.item('sword')) return 'unavail';
      // The keys between the entrance and Mothula come off a pot and an enemy,
      // so outside Key Drop shuffle they are always there and no count gates
      // the boss (Chris, Sep 2026). Key drop shuffles them into the pool: two
      // keys read possible, four available (Chris, Oct 2026).
      var st = c.keydrop ? podKeyed(c, 4, 2) : 'available';
      if (st === 'unavail') return st;
      if (c.bossOk === false) return 'bossitem';
      return st;
    }
  },

  tt: {
    'Map Chest':     function () { return 'available'; },
    'Ambush Chest':  function () { return 'available'; },
    'Compass Chest': function () { return 'available'; },
    'Big Key Chest': function () { return 'available'; },
    // Everything past the big key door. The key counts above one are Key Drop
    // shuffle's — vanilla TT has a single key (see ttKeys).
    'Hallway Pot Key':      function (c) { return c.bigkey ? 'available' : 'unavail'; },
    'Spike Switch Pot Key': function (c) {
      return (c.bigkey && c.keys >= 1) ? 'available' : 'unavail';
    },
    // Key Drop: two keys possible, three available (Chris, Oct 2026) — the
    // boss likewise.
    'Attic':         function (c) { return c.bigkey ? ttTier(c, 3, 2) : 'unavail'; },
    // One key opens the cell under Key Drop too (Chris, Oct 2026).
    "Blind's Cell":  function (c) {
      return (c.bigkey && ttKeys(c, 1)) ? 'available' : 'unavail';
    },
    'Big Chest':     function (c) {
      // The hammer smashes the floor above it — no way in without one, in any
      // mode.
      // One small key, the big key and the hammer — key drop or not (Chris,
      // Oct 2026; it wanted three keys under key drop). With keys unshuffled
      // the count is normally taken as met, but TT's one key sits in a chest
      // you have to open first, so here it must actually be picked up.
      var k = c.keysFree ? c.held : c.keys;
      return (c.bigkey && c.item('hammer') && k >= 1) ? 'available' : 'unavail';
    },
    'Boss':          function (c) {
      if (!c.bigkey) return 'unavail';
      // Boss Shuffle: Blind's attic-and-maiden setup doesn't apply, so the big
      // key alone opens the way (Chris, Oct 2026).
      var st = bossShuffleOn() ? 'available' : ttTier(c, 3, 2);
      if (st === 'unavail') return st;
      if (c.bossOk === false) return 'bossitem';
      return st;
    }
  },

  ip: {
    // Vanilla IP has two keys and barely uses them; Key Drop shuffle raises it
    // to six and puts a door in front of most of the dungeon, so each rule
    // keeps its old (vanilla) answer and adds a key-drop branch. ipDeep() is
    // the shared "past the big key chest" tier.
    'Jelly Key Drop':   function () { return 'available'; },
    // The first chest in: no key door in front of it, key drop or not
    // (Chris, Sep 2026).
    'Compass Chest':    function () { return 'available'; },
    'Big Key Chest':    ipBigKey,
    'Conveyor Key Drop': function (c) { return c.keys >= 1 ? 'available' : 'unavail'; },
    'Spike Room':       function (c) {
      if (!c.keydrop) return ipBackKey(c, 'available');
      if (c.keys >= 3 && c.item('hookshot')) return 'available';
      // One key is enough to call it possible (Chris, Sep 2026).
      return ipBack(c, c.keys >= 1 ? 'possible' : 'unavail');
    },
    'Hammer Block Key Drop': ipDeep,
    'Map Chest':        function (c) {
      // Same one-key route as the Big Key Chest (Chris, Sep 2026).
      if (!c.keydrop && c.keys >= 1 && c.item('hammer')) return ipInvGlove(c, 'available');
      var res = ipDeep(c);
      // The Cane of Somaria reaches it without the hammer — out of logic, the
      // same as the Big Key Chest (Chris, Sep 2026).
      if (res === 'unavail' && c.item('somaria')) res = 'ool';
      return ipInvGlove(c, res);
    },
    'Freezor Chest':    function (c) { return ipBackKey(c, ipKeys(c, 2)); },
    'Iced T Room':      function (c) { return ipBackKey(c, ipKeys(c, 2)); },
    'Many Pots Pot Key': function (c) { return c.keys >= 2 ? 'available' : 'unavail'; },
    'Big Chest':        function (c) {
      if (!c.bigkey) return 'unavail';
      var res = ipBackAll(c, ipKeys(c, 2));
      // One key short of all of them, with no hookshot or Somaria: possible
      // rather than out of logic (Chris, Sep 2026).
      if (res === 'ool' && c.keys >= (c.keydrop ? 5 : 1)) return 'possible';
      return res;
    },
    'Boss':             function (c) {
      // Kholdstare is reachable without the big key, so a missing big key
      // softens the answer to possible instead of killing it.
      var res;
      // Vanilla keys: the descent hands them to you, so a key you haven't
      // picked up yet doesn't rule Kholdstare out — it just isn't certain.
      // Certain means BOTH keys found; one is still only possible (Chris,
      // Sep 2026, correcting the earlier "available from the first key").
      // One key is enough with the Cane of Somaria (Chris, Sep 2026).
      if (!c.keydrop) res = (c.keys >= 2 || (c.keys >= 1 && c.item('somaria'))) ? 'available' : 'possible';
      else if (!c.item('hammer')) res = 'unavail';
      // Key Drop. These counts are in "both halves on" terms — Ice Palace has
      // six then, and a seed running only one half credits the other, so a
      // pot-key-only seed reads held + 2 here. Chris's numbers (Sep 2026), in
      // held keys on a pot-key seed: four keys and no glitches gets you there
      // (six effective); three with the red cane, or two and the bomb jump, are
      // the possible readings (five and four effective).
      else if (c.keys >= 6) res = 'available';
      else if (c.keys >= 4) res = 'possible';
      // Three keys, the hammer and the red cane (Chris, Oct 2026).
      else if (c.keys >= 3 && c.item('somaria')) res = 'possible';
      else res = 'unavail';
      if (!c.bigkey) res = (res === 'unavail') ? 'unavail' : 'possible';
      else if (c.bossOk === false) return 'bossitem';
      return ipInvGlove(c, ipBackAll(c, res));
    }
  },

  mm: {
    // The three lines by the entrance are free; everything deeper is behind a
    // key door under Key Drop shuffle (six keys there, three in vanilla), and
    // reads possible from the first key until the count is met. Without key
    // drop each line keeps its old rule.
    'Bridge Chest':  function () { return 'available'; },
    'Spikes Pot Key': function () { return 'available'; },
    'Spike Chest':   function () { return 'available'; },
    // Key Drop counts (Chris, Oct 2026). Nothing needs a sixth key: the last
    // key door, at the back, leads nowhere that matters.
    'Fishbone Pot Key': function (c) { return mmTier(c, 4); },
    'Compass Chest': function (c) {
      // The lamp or the fire rod in every mode; under Key Drop possible from
      // two keys (Chris, Oct 2026).
      if (!c.item('lamp') && !c.item('firerod')) return 'unavail';
      return c.keydrop ? mmTier(c, 5, 2) : 'available';
    },
    'Main Lobby':    function (c) { return c.keydrop ? mmTier(c, 1) : 'available'; },
    'Conveyor Crystal Key Drop': function (c) { return mmTier(c, 3); },
    'Map Chest':     function (c) { return c.keydrop ? mmTier(c, 5) : 'available'; },
    // The cutscene chest is behind the torch room either way.
    'Big Key Chest': function (c) {
      if (!c.item('lamp') && !c.item('firerod')) return 'unavail';
      return c.keydrop ? mmTier(c, 5, 2) : 'available';   // possible from two keys
    },
    'Big Chest':     function (c) { return c.bigkey ? 'available' : 'unavail'; },
    'Boss':          function (c) {
      if (!c.bigkey || !c.item('somaria')) return 'unavail';
      if (c.bossOk === false) return 'bossitem';
      return c.item('lamp') ? 'available' : 'ool';   // dark room before Vitreous
    }
  },

  tr: {
    // Vanilla TR has four keys; Key Drop shuffle raises it to six and moves
    // every threshold, so each rule keeps its old answer and adds a key-drop
    // branch. trDeep() is the shared back-half tier.
    'Compass Chest':               function () { return 'available'; },
    'Roller Room - Left':          function (c) { return c.item('firerod') ? 'available' : 'unavail'; },
    'Roller Room - Right':         function (c) { return c.item('firerod') ? 'available' : 'unavail'; },
    'Pokey 1 Key Drop':            function (c) { return c.keys >= 1 ? 'available' : 'unavail'; },
    'Chain Chomps':                function (c) {
      return c.keys >= (c.keydrop ? 2 : 1) ? 'available' : 'unavail';
    },
    'Pokey 2 Key Drop':            function (c) {
      if (c.keys >= 5) return 'available';
      return c.keys >= 3 ? 'possible' : 'unavail';
    },
    // The lava chest. Two keys physically reaches it, but spending them here is
    // a choice most players don't make — the chest is commonly skipped, so
    // calling it available at 2 of 4 overstated it. Possible until every key is
    // in hand, available once none of them is needed elsewhere (Chris, Sep
    // 2026). Key drop already used that shape at 4/6.
    'Big Key Chest':               function (c) {
      if (!c.keydrop) {
        if (c.keys >= (c.maxKeys || 4)) return 'available';
        return c.keys >= 2 ? 'possible' : 'unavail';
      }
      if (c.keys >= 6) return 'available';
      return c.keys >= 4 ? 'possible' : 'unavail';
    },
    'Big Chest':                   function (c) {
      if (c.keydrop) return trDeep(c);
      return (c.bigkey && c.keys >= 2) ? 'available' : 'unavail';
    },
    'Crystaroller Room':           function (c) {
      if (c.keydrop) return trDeep(c);
      return (c.bigkey && c.keys >= 2) ? 'available' : 'unavail';
    },
    // Two keys reaches the bridge, three makes it certain (three/five under key drop).
    'Eye Bridge - Top Left':       trBridge,
    'Eye Bridge - Top Right':      trBridge,
    'Eye Bridge - Bottom Left':    trBridge,
    'Eye Bridge - Bottom Right':   trBridge,
    'Boss':                        function (c) {
      if (!c.bigkey) return 'unavail';
      if (c.bossOk === false) return 'bossitem';
      if (c.keydrop) {
        if (c.keys >= 6) return 'available';
        return c.keys >= 5 ? 'possible' : 'unavail';
      }
      if (c.keys < 3) return 'unavail';
      // Three keys can get you there; all four makes it certain.
      return c.keys >= 4 ? 'available' : 'possible';
    }
  },

  gt: {
    // The main body of the tower: hammer + hookshot. Key counts are Key Drop
    // shuffle's (GT goes from four keys to eight) — see gtKD.
    'Hope Room - Left':               function () { return 'available'; },
    'Hope Room - Right':              function () { return 'available'; },
    "Bob's Torch":                    function (c) { return c.item('boots') ? 'available' : 'unavail'; },
    'Conveyor Cross Pot Key':         gtFree,
    'Tile Room':                      function (c) { return c.item('somaria') ? 'available' : 'unavail'; },
    'DMs Room - Bottom Left':         gtKD(gtMain, 1, 2),
    'DMs Room - Bottom Right':        gtKD(gtMain, 1, 2),
    'DMs Room - Top Left':            gtKD(gtMain, 1, 2),
    'DMs Room - Top Right':           gtKD(gtMain, 1, 2),
    'Map Chest':                      gtKD(gtMapChest, 1, 2),
    'Double Switch Pot Key':          gtKD(gtFree, 1, 2),
    'Firesnake Room':                 gtKD(gtMain, 2, 3),
    'Randomizer Room - Bottom Left':  gtKD(gtMain, 3, 4),
    'Randomizer Room - Bottom Right': gtKD(gtMain, 3, 4),
    'Randomizer Room - Top Left':     gtKD(gtMain, 3, 4),
    'Randomizer Room - Top Right':    gtKD(gtMain, 3, 4),
    "Bob's Chest":                    gtKD(gtMain, 3, 4),
    'Big Key Chest':                  gtKD(gtMain, 3, 4),
    'Big Key Room - Left':            gtKD(gtMain, 3, 4),
    'Big Key Room - Right':           gtKD(gtMain, 3, 4),
    // Compass room side: cane of somaria + fire rod.
    'Compass Room - Bottom Left':     gtKD(gtCompass, 1, 5),
    'Compass Room - Bottom Right':    gtKD(gtCompass, 1, 5),
    'Compass Room - Top Left':        gtKD(gtCompass, 1, 5),
    'Compass Room - Top Right':       gtKD(gtCompass, 1, 5),
    'Conveyor Star Pits Pot Key':     gtKD(gtCompass, 1, 5),
    // Past the big key door.
    'Big Chest':                      gtKD(gtBigKey, 2, 5),
    'Mini Helmasaur Room - Left':     gtKD(gtClimb, 0, 6),
    'Mini Helmasaur Room - Right':    gtKD(gtClimb, 0, 6),
    'Mini Helmasaur Key Drop':        gtKD(gtClimb, 0, 6),
    'Pre-Moldorm Chest':              gtKD(gtClimb, 1, 7),
    'Validation Chest':               gtKD(function (c) {
      return (gtClimb(c) === 'available' && c.item('hookshot')) ? 'available' : 'unavail';
    }, 2, 8)
  }
};

// SP's first small key opens the door past the entrance, so nothing beyond the
// Entrance chest is reachable without it. Wrapped here rather than repeated in
// each rule so a later edit to one of them can't lose the gate.
// TR through its back door only (inverted, no cane / medallion / sword): you
// mirror in from Mimic or Spiral and reach four locations, on their own terms —
// the Big Chest and Crystaroller Room want the big key, the Big Key Chest and
// Chain Chomps one small key. Everything else in TR is behind the front door.
// Wrapped over the whole table so a later edit to one rule can't escape it.
var TR_BACKDOOR = {
  // Chris's own reading of this route (Sep 2026), which the reference tracker
  // gets wrong: the Crystaroller Room and the Big Chest still want the big key
  // from this side, while the Big Key Chest over the lava and Chain Chomps are
  // one small key.
  'Big Chest':         function (c) { return c.bigkey ? 'available' : 'unavail'; },
  'Crystaroller Room': function (c) {
    if (c.bigkey) return 'available';
    // Or in through the laser-bridge door and across: the cane for the
    // platforms and the lamp for the dark room (the mirror is already the
    // price of standing here at all) — Chris, Sep 2026.
    return (c.item('somaria') && c.item('lamp')) ? 'available' : 'unavail';
  },
  'Big Key Chest':     function (c) { return c.keys >= 1 ? 'available' : 'unavail'; },
  'Chain Chomps':      function (c) { return c.keys >= 1 ? 'available' : 'unavail'; },
  // The laser bridge is reached by a drop-down and the mirror, so it costs
  // nothing beyond getting here — no key, no big key.
  'Eye Bridge - Top Left':     trBackFree,
  'Eye Bridge - Top Right':    trBackFree,
  'Eye Bridge - Bottom Left':  trBackFree,
  'Eye Bridge - Bottom Right': trBackFree,
  // Trinexx from this side: the cane for his room, one small key and the big
  // key. Reachable here without the medallion, which only opens the front.
  'Boss': function (c) {
    if (!c.item('somaria') || c.keys < 1 || !c.bigkey) return 'unavail';
    return (c.bossOk === false) ? 'bossitem' : 'available';
  }
};
function trBackFree() { return 'available'; }
var TR_RANK = { available: 0, possible: 1, visible: 2, ool: 3, bossitem: 4, unavail: 5 };
Object.keys(LOC_RULES.tr).forEach(function (n) {
  var inner = LOC_RULES.tr[n];
  LOC_RULES.tr[n] = function (c) {
    var back = (window.trBackDoorOpen && window.trBackDoorOpen() && TR_BACKDOOR[n])
             ? TR_BACKDOOR[n](c) : null;
    // Front door shut: the back door is the only answer there is.
    if (window.trBackDoorOnly && window.trBackDoorOnly()) return back || 'unavail';
    var front = inner(c);
    if (!back) return front;
    // Both routes open — take whichever is better. The laser bridge needs no
    // key and no big key from the back, so it must not inherit the front's
    // requirements just because the front is also walkable.
    return (TR_RANK[back] < TR_RANK[front]) ? back : front;
  };
});

// Skull Woods is several entrances, and under entrance shuffle each section of
// the card opens only once the entrance label that leads there has been placed
// on the map (Chris, Sep 2026). The Big Chest also wants the big key (its own
// rule). Only the map knows the labels; with none to read (the item tracker),
// nothing is gated here.
var SW_LABELS = {
  'Map Chest': ['SW M'], 'West Lobby Pot Key': ['SW M'], 'Pot Prison': ['SW M'],
  'Compass Chest': ['SW M'], 'Pinball Room': ['SW M'], 'Big Chest': ['SW M'],
  'Big Key Chest': ['SW E', 'SW W'],
  'Bridge Room': ['SW'], 'Spike Corner Key Drop': ['SW'], 'Boss': ['SW']
};
function swLabelPlaced(codes) {
  var labels = window._entLabels;
  if (!labels) return true;
  for (var k in labels) if (codes.indexOf(labels[k]) !== -1) return true;
  return false;
}
Object.keys(LOC_RULES.sw).forEach(function (n) {
  var inner = LOC_RULES.sw[n];
  LOC_RULES.sw[n] = function (c) {
    if (swEntShuffle() && SW_LABELS[n] && !swLabelPlaced(SW_LABELS[n])) return 'unavail';
    return inner(c);
  };
});

// The Boss line in every dungeon whose boss can be shuffled, applied on top of
// the dungeon's own Boss rule (Chris, Oct 2026):
//   - boss known, its item missing → "need boss item", the same test that puts
//     the red stripe on the map (some rules, EP's among them, never asked);
//   - boss unknown under Boss Shuffle → possible rather than available, the
//     card's version of the yellow stripe — unless the fire rod, ice rod,
//     hookshot and hammer are all held, which beat any boss (the stripe's rule).
function bossShuffleOn() {
  var s = window.trackerSettings || {};
  var v = s.bossShuffle;
  if (v === undefined) {
    try { v = new URLSearchParams(window.location.search).get('bossshuffle') || localStorage.getItem('alttp-bossshuffle'); } catch (e) {}
  }
  return v !== 'no';
}
function allBossItems(c) {
  return c.item('firerod') && c.item('icerod') && c.item('hookshot') && c.item('hammer');
}
Object.keys(LOC_RULES).forEach(function (dk) {
  if (dk === 'ct' || !LOC_RULES[dk].Boss) return;
  var inner = LOC_RULES[dk].Boss;
  LOC_RULES[dk].Boss = function (c) {
    var res = inner(c);
    if (res === 'unavail' || res === 'bossitem') return res;
    if (c.bossOk === false) return 'bossitem';
    if (c.bossOk == null && res === 'available' && bossShuffleOn() && !allBossItems(c)) return 'possible';
    return res;
  };
});

Object.keys(LOC_RULES.sp).forEach(function (n) {
  if (n === 'Entrance') return;
  var inner = LOC_RULES.sp[n];
  LOC_RULES.sp[n] = function (c) {
    // Only where small keys are shuffled. Everywhere else SP's key IS the
    // Entrance chest, so it is always there for the taking and no count gates
    // the dungeon (Chris, Sep 2026) — the same reasoning as HC's guard key.
    if (!window.shuffleSmallKeys()) return inner(c);
    return c.keys < 1 ? 'unavail' : inner(c);
  };
});

function enemizerOn() {
  if (window.trackerSettings && window.trackerSettings.enemizer !== undefined) {
    return window.trackerSettings.enemizer !== 'no';
  }
  try { var v = localStorage.getItem('alttp-enemizer'); return !!v && v !== 'no'; } catch (e) { return false; }
}

// Item values: the map reads the broadcast snapshot; the item tracker supplies
// its own live states through the `items` hook (its trackerItems is sparse).
// Every rule answers to the keys COLLECTED, not the keys in hand. A spent key
// is gone from the HUD but the door it opened stays open, and the HUD counter
// reads 0 on a pause or save screen, so in-hand was never a safe basis for
// logic (Chris, Sep 2026). Keys in hand are shown on the card and nothing else;
// a dungeon with a check still available reads yellow with a green quadrant.
function ruleContext(dk, baseCls) {
  // `dk` is the REAL dungeon, never a marker: inverted trades the CT and GT
  // markers, so a caller holding a marker key resolves it with locationKey()
  // first. Resolving in here instead double-swapped for dungeonLocClass, whose
  // key is already a dungeon (Chris, Sep 2026 — GT's card read Castle Tower's
  // big key, and CT has no map or compass, so one dim icon showed where three
  // should have been).
  var it = hostCall('items', dk) || window.trackerItems || {};
  // Small keys held: the item tracker's own dungeon state first (it is the one
  // that counts them), then the broadcast snapshot.
  var counts = hostCall('counts', dk) || {};
  // Keys FOUND, not keys in hand. A key you spent is gone from the count but
  // the door it opened stays open, so spending three of PoD's six must not walk
  // the dungeon's logic back to red (Chris, Sep 2026). The highest figure any
  // source has seen is the honest one: the item tracker keeps a high-water mark
  // per dungeon, and the map's snapshot already carries it. The card's own
  // "Small Keys" line still shows what is in hand — that is the number you act
  // on at a door.
  var _it = window.trackerItems || {};
  var keys = Math.max(
    (counts.keysFound !== undefined) ? counts.keysFound : 0,
    (counts.keys      !== undefined) ? counts.keys      : 0,
    _it[dk + 'SmallKeysMax'] || 0,
    _it[dk + 'SmallKeys']    || 0
  );
  // Every rule's key thresholds are written for Key Drop shuffle with BOTH
  // halves on. Turn only one half on and some of that dungeon's drop keys are
  // no longer shuffled items — the player still gets them off the pot or the
  // enemy, the tracker just never counts them. So credit one key per drop
  // location the current settings leave out, and every threshold lands where it
  // should without a second set of numbers per mode. (Vanilla is untouched:
  // with no key drop at all the rules take their own non-keydrop branch.)
  var onDrops = 0, offDrops = 0;
  (KEYDROP_LOCS[dk] || []).forEach(function (d) {
    if (keysShuffledBy(d.kind)) onDrops++; else offDrops++;
  });
  // No drop of this dungeon's own is shuffled → it behaves exactly as vanilla,
  // whatever the global setting says (DP is all pot keys, so Enemy Key Drop
  // alone leaves it with its single vanilla key).
  var untracked = onDrops ? offDrops : 0;
  var held = (counts.keys !== undefined) ? counts.keys : (_it[dk + 'SmallKeys'] || 0);
  var maxKeys = (counts.maxKeys !== undefined) ? counts.maxKeys
              : (_it[dk + 'MaxSmallKeys'] || 0);
  var have = Math.max((keys || 0), (held || 0)) + untracked;
  // Where small keys are NOT shuffled, a dungeon's keys sit in its own chests
  // along the way: you pick them up as you go, so no threshold in any rule is
  // a real barrier and every one of them reads as met (Chris, Sep 2026 — IP's
  // boss, and the same for PoD, SP, MM and the rest). Key Drop shuffles keys
  // into the item pool, so that keeps the counts honest.
  var keysFree = !window.shuffleSmallKeys() && onDrops === 0;
  if (keysFree) have = Math.max(have, maxKeys || 0, 99);
  return {
    item:     function (n) { return !!it[n]; },
    bigkey:   dngItemState(dk, 'bigkey') === 1,
    keys:     have,
    found:    have,
    held:     held || 0,      // the keys actually picked up, with no free credit
    keysFree: keysFree,
    maxKeys:  maxKeys,
    keydrop:  onDrops > 0,
    swordless: !!(window.trackerSettings && window.trackerSettings.swordless === 'yes'),
    enemizer: enemizerOn(),
    bossOk:   hostCall('bossOk', dk),   // item tracker keys bosses by dungeon
    base:     baseCls
  };
}

function host()        { return window.DngPanelHost || {}; }
function hostCall(fn, key) {
  var h = host();
  try { return typeof h[fn] === 'function' ? h[fn](key) : null; } catch (e) { return null; }
}

// ── Dungeon item shuffle ───────────────────────────────────────
// Newer randomizers shuffle the map, the compass, the big key and the small
// keys independently, so those four flags are the real setting and the old mode
// names are presets over them. Every rule that used to ask "is the mode
// keysanity?" asks the flag it actually cares about instead, which is both
// shorter and correct under a combination no preset covers.
//
// Stored as a letter string — m map, c compass, b big key, k small keys — in
// `alttp-dungeon-shuffle` / the `dungeonshuffle` query param. Absent means "no
// custom setting", and the preset named by the old alttp-dungeon-items decides.
var DI_PRESETS = {
  standard:       { map: false, compass: false, bigkey: false, smallkey: false },
  mapcompass:     { map: true,  compass: true,  bigkey: false, smallkey: false },
  mapcompasskeys: { map: true,  compass: true,  bigkey: false, smallkey: true  },
  keysanity:      { map: true,  compass: true,  bigkey: true,  smallkey: true  },
  other:          { map: false, compass: false, bigkey: false, smallkey: false }
};

function diParse(str) {
  return { map:      str.indexOf('m') !== -1,
           compass:  str.indexOf('c') !== -1,
           bigkey:   str.indexOf('b') !== -1,
           smallkey: str.indexOf('k') !== -1 };
}

window.dungeonShuffleStr = function (f) {
  return (f.map ? 'm' : '') + (f.compass ? 'c' : '') +
         (f.bigkey ? 'b' : '') + (f.smallkey ? 'k' : '');
};

// The legacy mode name to store alongside the flags, so anything still reading
// alttp-dungeon-items (the broadcast view, an older window) lands somewhere
// sensible. An exact preset match wins; otherwise the nearest one.
window.dungeonShuffleMode = function (f) {
  var want = window.dungeonShuffleStr(f), name;
  for (name in DI_PRESETS) {
    if (name !== 'other' && window.dungeonShuffleStr(DI_PRESETS[name]) === want) return name;
  }
  if (f.bigkey && f.smallkey) return 'keysanity';
  if (f.smallkey)             return 'mapcompasskeys';
  if (f.map || f.compass)     return 'mapcompass';
  return 'standard';
};

window.dungeonShuffle = function () {
  var raw = window._dungeonShuffleOverride;
  if (raw === undefined || raw === null) raw = (window.trackerSettings || {}).dungeonShuffle;
  if (raw === undefined || raw === null) {
    try {
      raw = new URLSearchParams(window.location.search).get('dungeonshuffle');
      if (raw === null) raw = localStorage.getItem('alttp-dungeon-shuffle');
    } catch (e) { raw = null; }
  }
  if (typeof raw === 'object' && raw) return raw;
  if (typeof raw === 'string')        return diParse(raw);
  return DI_PRESETS[dungeonItemsMode()] || DI_PRESETS.standard;
};

window.shuffleMap       = function () { return window.dungeonShuffle().map; };
window.shuffleCompass   = function () { return window.dungeonShuffle().compass; };
window.shuffleBigKey    = function () { return window.dungeonShuffle().bigkey; };
window.shuffleSmallKeys = function () { return window.dungeonShuffle().smallkey; };
// Anything at all shuffled — the test for "does this seed have dungeon items
// to track", which used to be "keysanity or MCK".
window.shuffleAnyDngItem = function () {
  var f = window.dungeonShuffle();
  return !!(f.map || f.compass || f.bigkey || f.smallkey);
};

function dungeonItemsMode() {
  if (typeof window.dungeonItemsMode === 'function') {
    try { return window.dungeonItemsMode(); } catch (e) {}
  }
  return (window.trackerSettings && window.trackerSettings.dungeonItems) || 'standard';
}

// Snapshot first (it reflects manual clicks too), then live SRAM.
// Returns 1, 0, or null when the dungeon has no such item at all.
function dngItemState(key, kind, supplied) {
  if (supplied !== undefined && supplied !== null) return supplied ? 1 : 0;
  var it = window.trackerItems || {};
  var v = it[key + { map: 'Map', compass: 'Compass', bigkey: 'BigKey' }[kind]];
  if (v) return 1;
  var tbl = DUNGEON_ITEM_FLAGS[key];
  if (!tbl || !tbl[kind]) return (v === undefined) ? null : 0;
  if (window._lastRoomData && sramBit(window._lastRoomData, tbl[kind])) return 1;
  return 0;
}

function displayName(key) {
  // Inverted swaps which marker draws Agahnim and which draws Ganon.
  var inv = !!(window.trackerSettings && window.trackerSettings.inverted);
  if (inv && key === 'gt') return DUNGEON_FULL_NAMES.ct;
  if (inv && key === 'ct') return DUNGEON_FULL_NAMES.gt;
  return DUNGEON_FULL_NAMES[key] || key.toUpperCase();
}

function locationKey(key) {
  var inv = !!(window.trackerSettings && window.trackerSettings.inverted);
  if (inv && key === 'gt') return 'ct';
  if (inv && key === 'ct') return 'gt';
  return key;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function row(label, value, cls) {
  return '<div class="dp-row"><span class="dp-label">' + label +
         '</span><span class="dp-val ' + (cls || '') + '">' + value + '</span></div>';
}

// The prize as a line of its own, under the Boss. It is NOT the prize's
// identity — under Random Prize Shuffle that could be anything, and the point
// of the line is whether it can be got, which is exactly the Boss's answer
// (Chris, Sep 2026). A dungeon with no prize of its own — HC, CT, GT — reports
// none and gets no line.
function randomPrizeOn() {
  if (typeof window.randomPrizeShuffle === 'function') {
    try { return !!window.randomPrizeShuffle(); } catch (e) {}
  }
  var s = window.trackerSettings || {};
  if (s.randomPrize !== undefined) return s.randomPrize === 'yes';
  try { return localStorage.getItem('alttp-random-prize') === 'yes'; } catch (e) { return false; }
}

// Only worth a line when the prize could be anything: Random Prize Shuffle
// (Chris, Sep 2026). Anywhere else the prize follows the boss and says nothing.
function prizeRow(key, word, cls) {
  if (!randomPrizeOn()) return '';
  var it = window.trackerItems || {};
  var pz = hostCall('prize', key) || {};
  var name = (it[key + 'Prize'] !== undefined) ? it[key + 'Prize'] : pz.name;
  if (!name) return '';
  var got = (it[key + 'PrizeObtained'] !== undefined) ? it[key + 'PrizeObtained'] : pz.obtained;
  if (got) return row('Prize', 'obtained', 'cleared');
  return row('Prize', word || '&nbsp;', cls || '');
}

function buildDungeonPanelHTML(key, titlePrefix) {
  var diMode = dungeonItemsMode();
  // See ruleContext: in inverted the card for GT is built under the key 'ct'.
  // Anything that is DATA about the dungeon goes through locationKey().
  var dk     = locationKey(key);
  var c      = hostCall('counts', dk) || {};
  var done   = hostCall('completion', key) || {};
  var fb     = DUNGEON_MAX_FALLBACK[dk] || {};
  var it     = window.trackerItems || {};
  var html   = '<div class="dp-title">' + (titlePrefix || '') + displayName(key) + '</div>';

  // Status — completion beats logic color.
  // Boss down means the prize is there for the taking.
  if (done.fullyCleared)   html += row('Status', 'Completed', 'done') + prizeRow(dk, 'available', 'available');
  else if (done.cleared)   html += row('Status', 'Boss defeated', 'done') + prizeRow(dk, 'available', 'available');
  else {
    var st = hostCall('status', key);
    if (st) html += row('Status', st.word, st.cls);
  }

  // Items (chests).
  var chests    = (c.items    !== undefined) ? c.items    : it[dk + 'Chests'];
  var maxChests = (c.maxItems !== undefined) ? c.maxItems : it[dk + 'MaxChests'];
  if (maxChests === undefined) maxChests = fb.items;
  if (maxChests !== undefined) {
    chests = chests || 0;
    html += row('Items', chests + '/' + maxChests,
                (maxChests > 0 && chests >= maxChests) ? 'available' : '');
  }

  // Small keys. CT reports a count with no max.
  var keys    = (c.keys    !== undefined) ? c.keys    : it[dk + 'SmallKeys'];
  var maxKeys = (c.maxKeys !== undefined) ? c.maxKeys : it[dk + 'MaxSmallKeys'];
  if (maxKeys === undefined) maxKeys = fb.keys;
  // One figure: how much of the dungeon's key pool has turned up. $7EF4E0+ only
  // ever counts up, which is the count the logic answers to (Chris, Sep 2026 —
  // keys in hand were a dead end).
  var found = (c.keysFound !== undefined) ? c.keysFound : it[dk + 'SmallKeysMax'];
  if (found === undefined || found < keys) found = keys;
  if (diMode !== 'other') {
    if (maxKeys > 0) {
      html += row('Small Keys', (found || 0) + '/' + maxKeys,
                  (found || 0) >= maxKeys ? 'available' : '');
    } else if (key === 'ct' && found) {
      html += row('Small Keys', String(found), '');
    }
  }

  // Map / Compass / Big Key — dimmed until found. A dungeon without one of them
  // (CT has no map or compass) simply omits that icon.
  if (diMode !== 'other') {
    var icons = '';
    [['map', 'items/map1.png', 'Map'],
     ['compass', 'items/compass1.png', 'Compass'],
     ['bigkey', 'items/bigkey1.png', 'Big Key']].forEach(function (ic) {
      var state = dngItemState(dk, ic[0], c[ic[0]]);
      if (state === null) return;
      icons += '<img src="' + ic[1] + '" alt="' + ic[2] + '" title="' + ic[2] + '"' +
               (state ? '' : ' class="dim"') + '>';
    });
    if (icons) html += '<div class="dp-icons">' + icons + '</div>';
  }

  // Location list. A line with a known SRAM flag reports its own cleared state;
  // the rest carry the dungeon's status until per-location logic exists.
  var locKey = dk;
  var locs   = locsFor(locKey);
  var showLocs = hostCall('locations', key);
  if (locs && locs.length && showLocs !== false) {
    var st2      = hostCall('status', key) || {};
    // A finished dungeon does NOT mark its lines cleared: only a location whose
    // own SRAM flag was seen reads "cleared", and everything else keeps its
    // status. Chris's call — a dungeon can be counted complete while an
    // individual chest hasn't actually been logged.
    var lineWord = st2.word || '';
    var lineCls  = st2.cls  || '';
    var flagTable = DUNGEON_LOC_FLAGS[locKey] || {};
    var rules     = LOC_RULES[locKey] || {};
    var ctx       = ruleContext(dk, lineCls);
    var reachable = dungeonReachable(lineCls);
    var body      = '';
    var bossWord = null, bossCls = null;
    locs.forEach(function (n) {
      var word = lineWord, cls = lineCls;
      if (n === 'Boss' && done.cleared) { word = 'defeated'; cls = 'cleared'; }
      else if (rules[n]) {
        // Per-location logic. The rule decides the line outright while the
        // dungeon is reachable; otherwise it can only make it worse.
        var res = rules[n](ctx);
        if (res === 'bossitem')  { word = 'need boss item'; cls = 'unavail'; }
        else if (res)            {
          cls  = reachable ? res : worseCls(cls, res);
          word = DNG_WORD_BY_CLS[cls] || word;
        }
      }
      // A boss whose required item is missing can't be beaten however reachable
      // the dungeon is — for dungeons with no rule table of their own.
      else if (n === 'Boss' && hostCall('bossOk', key) === false) {
        word = 'need boss item'; cls = 'unavail';
      }
      if ((flagTable[n] || keyDropFlagFor(locKey, n)) && locIsCleared(locKey, n)) {
        word = (n === 'Boss') ? 'defeated' : 'cleared';
        cls  = 'cleared';
      }
      // A chest the tracker never saw opened in a completed dungeon keeps its
      // ordinary status — the "missing" wording was tried and dropped.
      var label = (DUNGEON_LOC_LABELS[locKey] || {})[n] || n;
      // Skipped by hand: struck out, and it no longer counts against the target.
      var skippable = n !== 'Boss' && cls !== 'cleared';
      var skipV = skippable && dngLocSkipped[locKey + '/' + n];
      if (skipV) { word = skipV === 2 ? 'skipped (dungeon item)' : 'skipped'; cls = 'skipped'; }
      if (n === 'Boss') { bossWord = word; bossCls = cls; }
      body += '<div class="dp-row' + (skippable ? ' dp-skip' : '') + '"' +
              (skippable ? ' data-dk="' + locKey + '" data-loc="' + n.replace(/"/g, '&quot;') + '"' +
                           ' title="Click: skip (takes an item off the total). Again: skipped dungeon item (total unchanged). Again: undo."' : '') +
              '><span class="dp-label">' + label +
              '</span><span class="dp-val ' + cls + '">' + (word || '&nbsp;') + '</span></div>';
    });
    // Under the Boss line, which ends the list, and carrying its answer.
    body += prizeRow(locationKey(key), bossWord, bossCls);
    // Pots and enemy drops, a room at a time.
    dropRollup(locKey).forEach(function (r) {
      // Everything taken → cleared; everything left needing an item you don't
      // have → unavailable; some of it blocked → possible; otherwise the
      // dungeon's own status carries.
      var left = r.total - r.done;
      var cls  = r.done >= r.total ? 'cleared'
               : (r.blocked >= left) ? 'unavail'
               : r.blocked ? 'possible' : lineCls;
      body += '<div class="dp-row"><span class="dp-label">' + r.label +
              '</span><span class="dp-val ' + cls + '">' +
              r.done + '/' + r.total + '</span></div>';
    });
    html += '<div class="dp-locs">' + body + '</div>';
  }
  return html;
}
// Share of a dungeon's UNCLEARED chests that are currently obtainable, rounded
// UP to a quarter (so "a quarter or less" still shows a quarter). null when the
// dungeon-item mode doesn't track chests, or nothing is left to get. The Boss
// line is not a chest and is excluded. Drives the fill on the map's marker.
// `force` overrides the mode gate: Standard and Map/Compass don't carry
// quadrants normally, but once the boss is down and items are still inside,
// "how much of what's left can I get" is the only question left, so the map
// asks for the fill in that one case.
// How much of a dungeon is still outstanding, and how much of that you can
// actually get: { total, left, obtainable }. null when the dungeon-item mode
// doesn't track chests (unless `force`), or nothing is left. The Boss line is
// counted like any other location; key drops count when their mode is on.
window.dungeonCounts = function (key, force, allKeys) {
  // Chest tracking, so the quadrants, exist wherever the keys or the big key
  // are shuffled — which is what "keysanity or MCK" used to mean.
  if (!force && !(window.shuffleSmallKeys() || window.shuffleBigKey())) return null;
  var locKey = locationKey(key);
  var locs   = locsFor(locKey);
  if (!locs.length) return null;

  var base      = (hostCall('status', key) || {}).cls || '';
  var reachable = dungeonReachable(base);
  var rules     = LOC_RULES[locKey] || {};
  var ctx       = ruleContext(locKey, base);
  if (allKeys) {                                   // "what if I held them all"
    ctx = Object.create(ctx);
    ctx.keys = ctx.found = Math.max(ctx.maxKeys || 0, (ctx.found || 0) + 1);
  }
  // `obtainable` is what is outright available; `gettable` also counts what is
  // merely possible. The quadrant fill uses the second: a dungeon with four
  // "possible" chests left is not a dungeon with nothing to do, and painting no
  // quadrant said it was (Chris, Sep 2026 — PoD with a key in hand).
  var left = 0, obtainable = 0, gettable = 0, byCls = {};

  locs.forEach(function (n) {
    if (locIsCleared(locKey, n)) return;
    // Skipped by hand on the card: out of the tally altogether, so it can't
    // keep painting a green quadrant on a dungeon whose remaining locations
    // are all out of reach (Chris, Sep 2026 — the Desert torch).
    if (dngLocSkipped[locKey + '/' + n]) return;
    left++;
    var cls = base;
    if (rules[n]) {
      var res = rules[n](ctx);
      if (res === 'bossitem') res = 'unavail';
      if (res) cls = reachable ? res : worseCls(base, res);
    }
    if (cls === 'available') obtainable++;   // only outright available counts
    if (cls === 'available' || cls === 'possible') gettable++;
    byCls[cls] = (byCls[cls] || 0) + 1;      // and every status, for the map
  });
  // A skipped chest never sets a flag, so it stays in `left` forever and keeps
  // painting a quadrant on a dungeon the player has called done. Take those
  // off the top — which one was skipped is unknowable, and doesn't matter.
  var counts = hostCall('counts', locKey) || {};
  var skipped = (counts.skipped !== undefined)
              ? counts.skipped
              : ((window.trackerItems || {})[locKey + 'Skipped'] || 0);
  // Named skips are already out of the loop above; only skips made by clicking
  // the item count (which say a number, not a location) still come off here.
  var extra = Math.max(0, skipped - dngSkipCount(locKey));
  if (extra) {
    left = Math.max(0, left - extra);
    obtainable = Math.min(obtainable, left);
    gettable   = Math.min(gettable, left);
  }
  if (!left) return null;
  return { total: locs.length, left: left, obtainable: obtainable,
           gettable: gettable, byCls: byCls };
};

// Share of a dungeon's UNCLEARED chests that are currently obtainable, rounded
// DOWN to a quarter but never to nothing. null when there is nothing to show.
// Drives the fill on the map's marker.
window.dungeonFillFraction = function (key, force) {
  var c = window.dungeonCounts(key, force);
  if (!c) return null;
  // A green quadrant means "this much of what is left is outright available", so
  // the fraction counts only what is available — never what is merely possible.
  //   every location available  → 1, solid green.
  //   some available            → quadrants for that share, and map.html steps
  //                               the square itself down to yellow.
  //   none available, some possible → null: no quadrant at all, the square just
  //                               shows its own status (Chris, Sep 2026: PoD at
  //                               5/6 keys with only a possible boss left read
  //                               green with a yellow corner; the green was
  //                               claiming a clearable dungeon).
  //   nothing gettable          → 0, which map.html paints red.
  if (c.obtainable === c.left) return 1;
  if (!c.obtainable) return (c.gettable > 0) ? null : 0;
  return Math.max(0.25, Math.min(0.75, Math.floor(c.obtainable / c.left * 4) / 4));
};

// The status class one location on a dungeon card resolves to, for callers
// outside the card — map.html's CT dots (109/110) show the same two locations
// as CT's card, and read this so the dot and the card can't disagree.
window.dungeonLocClass = function (key, loc) {
  // No inverted swap here: locationKey() exists because the CT and GT *markers*
  // trade places in inverted, but a caller naming a dungeon means that dungeon.
  var locKey = key;
  if (locIsCleared(locKey, loc)) return 'cleared';
  // The host keys its colours by MARKER, and inverted trades CT's and GT's.
  // locationKey() maps the two symmetrically, so it turns this real dungeon
  // into the marker whose colour the host is holding (Chris, Sep 2026).
  var base  = (hostCall('status', locationKey(key)) || {}).cls || '';
  var rule  = (LOC_RULES[locKey] || {})[loc];
  if (!rule) return base;
  var res = rule(ruleContext(key, base));
  if (res === 'bossitem') res = 'unavail';
  if (!res) return base;
  return dungeonReachable(base) ? res : worseCls(base, res);
};

// ── Pot requirements ─────────────────────────────────────────────────────────
// Each pot and enemy drop can carry an item requirement of its own (a dark
// room wants the lantern, a pot across water wants the hookshot). The rules
// come from the reference tracker — see js/potlocations.js POT_REQS — and are
// pure item checks: reaching the room is a separate question this does not try
// to answer.
function potItems() {
  return (typeof hostCall === 'function' && hostCall('items')) || window.trackerItems || {};
}
function potToken(t) {
  var it = potItems();
  switch (t.split('|')[0]) {
    case 'moonpearl':  return !!it.moonpearl;
    case 'lantern':    return !!it.lamp;
    case 'hammer':     return !!it.hammer;
    case 'glove':      return (it.gloves || 0) >= 1;
    case 'boots':      return !!it.boots;
    case 'bomb':       return !!it.bomb;
    case 'cape':       return !!it.cape;
    case 'byrna':      return !!it.byrna;
    case 'somaria':    return !!it.somaria;
    case 'hookshot':   return !!it.hookshot;
    // Not in the reference vocabulary, but our own hand-added requirements use
    // it (Magic Bat's cave can be mirrored into). Without a case here the token
    // fell through to the default below and never blocked anything.
    case 'mirror':     return !!it.mirror;
    case 'flippers':   return !!it.flippers;
    case 'canHitSwitch':
      return !!(it.bomb || it.sword || it.hammer || it.bow || it.boomerang ||
                it.somaria || it.byrna || it.firerod || it.icerod);
    // Magic to sustain the cape or Byrna. Half magic or a bottle covers it —
    // an approximation of the reference tracker's magic budget.
    case 'canExtendMagic': return !!(it.halfmagic || (it.bottle || 0) >= 1);
    default: return true;   // an unknown token never blocks
  }
}
function evalPotReq(r) {
  if (!r) return true;
  if (typeof r === 'string') {
    // canExtendMagic|16 carries its own pipe, so tokens are checked first.
    if (/^canExtendMagic/.test(r)) return potToken(r);
    if (r.indexOf('|') !== -1) return r.split('|').some(evalPotReq);
    if (r.indexOf('+') !== -1) return r.split('+').every(evalPotReq);
    return potToken(r);
  }
  if (r.allOf) return r.allOf.every(evalPotReq);
  if (r.anyOf) return r.anyOf.some(evalPotReq);
  return true;
}
// Does the player hold what this pot asks for? Index 0 / missing = nothing.
window.potReqMet = function (idx) {
  if (!idx || !window.POT_REQS) return true;
  var pair = window.POT_REQS[idx];
  if (!pair) return true;
  var inv = !!(window.trackerSettings && window.trackerSettings.inverted);
  return evalPotReq(pair[inv ? 1 : 0]);
};

// ── Pottery / Enemy Drop rollup ──────────────────────────────────────────────
// A dungeon in a full-shuffle mode holds far too many of these to list one by
// one — GT alone has 198 pots — so the card gets one row per ROOM with the
// count collected, which is the number you actually act on.
//
// Which modes put them in a dungeon: pottery 'dungeon', 'lottery', 'reduced',
// 'clustered' and 'nonempty' shuffle dungeon pots ('cave'/'cavekeys'/'keys' do
// not), and Enemy Drop 'Underworld' shuffles the enemy drops.
var POTTERY_DUNGEON_MODES = { dungeon:1, lottery:1, reduced:1, clustered:1, nonempty:1 };

// Rooms the reference data files under a dungeon that dungeon-mode pottery
// doesn't actually shuffle with it. They keep their own marker on the map and
// stay out of the dungeon's rollup, so the same two pots aren't counted twice.
var POT_ROOMS_MAP_ONLY = window.POT_ROOMS_MAP_ONLY = { 'Hyrule Castle Secret Entrance': 1 };

function potteryModeName() {
  try {
    return (new URLSearchParams(window.location.search).get('pottery') ||
            (window.trackerSettings && window.trackerSettings.pottery) ||
            localStorage.getItem('alttp-pottery') || 'none');
  } catch (e) { return 'none'; }
}
function enemyDropsOn() {
  var s = window.trackerSettings || {};
  if (s.enemyDrops !== undefined) return s.enemyDrops === 'yes';
  try { return localStorage.getItem('alttp-enemy-drops') === 'yes'; } catch (e) { return false; }
}

// [{ label, done, total }] for one dungeon, or [] when neither mode is on.
function dropRollup(key) {
  if (!window.POT_LOCATIONS) return [];
  var wantPots  = !!POTTERY_DUNGEON_MODES[potteryModeName()];
  var wantDrops = enemyDropsOn();
  if (!wantPots && !wantDrops) return [];
  var data = window._lastKeyDropData;
  // One count per dungeon rather than a row per room. Naming the room only
  // helps if the tracker knows which room you are standing in, which it
  // doesn't — and under enemizer the enemies move anyway. Every other tracker
  // reports these as a total, so we do too.
  var pots  = { label: 'Pots',    done: 0, total: 0, blocked: 0 };
  var drops = { label: 'Enemies', done: 0, total: 0, blocked: 0 };
  // Standard start walks the whole escape, so Hyrule Castle's pots are all in
  // hand there whatever the item requirement says. Open and Inverted drop you
  // outside and the requirements apply as usual.
  var freeHC = key === 'hc' &&
               ((window.trackerSettings || {}).gamemode || 'standard') === 'standard';
  function tally(p, acc) {
    acc.total++;
    if (data && sramBit(data, [p[0], p[1]])) acc.done++;
    else if (!freeHC && !window.potReqMet(p[4])) acc.blocked++;
  }
  Object.keys(window.POT_LOCATIONS).forEach(function (r) {
    var e = window.POT_LOCATIONS[r];
    if (e.dng !== key) return;
    if (POT_ROOMS_MAP_ONLY[e.name]) return;
    if (wantPots  && e.pots)  e.pots.forEach(function (p) { tally(p, pots); });
    if (wantDrops && e.drops) e.drops.forEach(function (p) { tally(p, drops); });
  });
  // ── the enemy row, from the cartridge rather than from our masks ──
  // POT_LOCATIONS' per-enemy bit arrays are wrong: they over-list by ~49%
  // game-wide (1021 listed against 685 real) and mis-assign bits within a room,
  // so matching them both invents locations and misses collected ones — Swamp
  // Palace read 51 of 81 with every enemy dead, against a real 55 of 55.
  //
  // The pot arrays from the same generator ARE right (13 of 13 dungeons read
  // N/N on a full clear), and the host can say how many of the dungeon's
  // locations are not chests at all. Pots subtracted from that is the enemy
  // row, with no enemy table involved (Chris, Sep 2026).
  var nc = hostCall('nonChest', key);
  if (wantDrops && nc && nc.total !== null && nc.total !== undefined) {
    drops.total = Math.max(0, nc.total - pots.total);
    drops.done  = Math.max(0, Math.min(nc.done - pots.done, drops.total));
    // `blocked` was counted off the same bad masks; the enemy side has no
    // per-location requirements to report anyway.
    drops.blocked = 0;
  }
  var rows = [];
  if (pots.total)  rows.push(pots);
  if (drops.total) rows.push(drops);
  return rows;
}

// Exposed for map.html: Hyrule Castle has no dungeon square, so its card is a
// check hover and it needs the rollup from over there.
window.dungeonDropRollup = dropRollup;

window.buildDungeonPanelHTML = buildDungeonPanelHTML;

// ── Panel element ─────────────────────────────────────────────────────────────

var panelEl = null, activeKey = null, anchorEl = null, activeRender = null;

function ensurePanel() {
  if (panelEl) return panelEl;
  panelEl = document.getElementById('dng-panel');
  if (!panelEl) {
    panelEl = document.createElement('div');
    panelEl.id = 'dng-panel';
  }
  if (panelEl.dataset.dpClick !== '1') {
    panelEl.dataset.dpClick = '1';
    panelEl.addEventListener('click', function (e) {
      var r = e.target && e.target.closest ? e.target.closest('.dp-skip') : null;
      if (!r || !r.dataset.dk) return;
      e.stopPropagation();
      window.dngLocSkipToggle(r.dataset.dk, r.dataset.loc);
    });
    // Moving off the marker normally hides the card; while the pointer is on
    // the card itself it has to stay, or a row could never be clicked.
    panelEl.addEventListener('mouseenter', function () { _holdPanel = true; });
    panelEl.addEventListener('mouseleave', function () { _holdPanel = false; hideNow(); });
    // Catch-alls. Now that the card holds itself open while the pointer is on
    // it, the pointer can leave the window without the card ever seeing a
    // mouseleave — it then sat there over the map until something else
    // repainted (Chris, Sep 2026). Any pointer movement that is neither on the
    // card nor on the thing it belongs to closes it, and so does leaving the
    // document or the window losing focus.
    document.addEventListener('mousemove', function (e) {
      if (!panelEl.classList.contains('open')) return;
      if (panelEl.contains(e.target)) return;
      if (anchorEl && anchorEl.contains && anchorEl.contains(e.target)) return;
      _holdPanel = false;
      hide();          // deferred: the pointer may be on its way to the card
    }, true);
    document.addEventListener('mouseleave', function () { _holdPanel = false; hideNow(); });
    window.addEventListener('blur', function () { _holdPanel = false; hideNow(); });
  }
  // Append to <html>, not <body>: the item tracker puts CSS `zoom` on the body
  // when the window is scaled, which would scale this panel along with it (and
  // shift a position:fixed child out of true viewport coordinates). The boss
  // popup and the settings overlay live on documentElement for the same reason.
  // The panel is meant to stay legible at its own size whatever the tracker
  // scale is, so it must sit outside the zoomed subtree.
  if (panelEl.parentElement !== document.documentElement) {
    document.documentElement.appendChild(panelEl);
  }
  return panelEl;
}

// Keep the whole card inside the window. A long list (GT has 28 lines) is taller
// than a scaled-up item tracker window, and a clipped panel is useless. Try
// column counts first, then a compact type size, and keep whichever combination
// overflows least if nothing fits outright.
function fit() {
  var list = panelEl.querySelector('.dp-locs');
  // `compact: true` on the host pins the smaller type size (the item tracker
  // wants it; the map has room for the normal one).
  var forceCompact = !!host().compact;
  panelEl.classList.toggle('compact', forceCompact);
  if (!list) return;
  var maxH = window.innerHeight - 12;
  var maxW = window.innerWidth  - 12;
  var best = null;

  function attempt(compact, cols) {
    panelEl.classList.toggle('compact', compact);
    list.style.columnCount = cols;
    var h = panelEl.offsetHeight, w = panelEl.offsetWidth;
    if (h <= maxH && w <= maxW) return true;
    // Overflow score, so the least-bad layout can be restored if none fit.
    var over = Math.max(0, h - maxH) + Math.max(0, w - maxW) * 2;
    if (!best || over < best.over) best = { compact: compact, cols: cols, over: over };
    return false;
  }

  for (var pass = forceCompact ? 1 : 0; pass < 2; pass++) {
    for (var cols = 1; cols <= 4; cols++) {
      if (attempt(pass === 1, cols)) return;
    }
  }
  panelEl.classList.toggle('compact', best.compact);
  list.style.columnCount = best.cols;
}

function position() {
  if (!panelEl || !anchorEl) return;
  var r  = anchorEl.getBoundingClientRect();
  var pw = panelEl.offsetWidth, ph = panelEl.offsetHeight;
  // Sit to the right of the anchor; flip left when that would run off-screen.
  var x = r.right + 5;
  if (x + pw > window.innerWidth - 6) x = r.left - pw - 5;
  if (x < 6) x = 6;
  var y = r.top + r.height / 2 - ph / 2;
  if (y + ph > window.innerHeight - 6) y = window.innerHeight - ph - 6;
  if (y < 6) y = 6;
  panelEl.style.left = Math.round(x) + 'px';
  panelEl.style.top  = Math.round(y) + 'px';
}

function show(key, el, titlePrefix) {
  ensurePanel();
  clearTimeout(_hideTimer);          // a fresh hover, not a poll repaint
  activeKey = key;
  anchorEl  = el;
  activeRender = function () { return buildDungeonPanelHTML(key, titlePrefix); };
  render();
}

// The same card for an overworld check: a name, its availability, and — for the
// caves that hold several chests — one line per chest.
//   opts = { title, status: {word, cls}, rows: [{ name, word, cls }] }
function buildCheckPanelHTML(opts) {
  var html = '<div class="dp-title' + (opts.status ? ' with-status' : '') + '">' +
             '<span>' + opts.title + '</span>' +
             (opts.status ? '<span class="dp-val ' + opts.status.cls + '">' +
                            opts.status.word + '</span>' : '') + '</div>';
  if (opts.rows && opts.rows.length) {
    var body = '';
    opts.rows.forEach(function (r) {
      body += '<div class="dp-row"><span class="dp-label">' + r.name +
              '</span><span class="dp-val ' + (r.cls || '') + '">' +
              (r.word || '&nbsp;') + '</span></div>';
    });
    html += '<div class="dp-locs">' + body + '</div>';
  }
  return html;
}

window.showCheckPanel = function (opts, el) {
  ensurePanel();
  clearTimeout(_hideTimer);          // a fresh hover, not a poll repaint
  activeKey = null;
  anchorEl  = el;
  activeRender = function () { return buildCheckPanelHTML(opts); };
  render();
};

function render() {
  panelEl.innerHTML = activeRender();
  panelEl.classList.add('open');
  // Only a card with skippable rows takes the mouse and lingers: a plain check
  // card has nothing to click, so it should vanish the moment you leave the
  // dot, the way it always did.
  panelEl.classList.toggle('dp-clickable', !!panelEl.querySelector('.dp-row.dp-skip'));
  fit();
  position();
}
// Hiding is deferred by a beat so the pointer can cross the gap from the
// marker to the card and land on a clickable row; getting there sets
// _holdPanel, which cancels the pending hide. Re-hovering anything cancels it
// too (render clears the timer).
var _holdPanel = false;
var _hideTimer = null;
function hideNow() {
  if (!panelEl) return;
  panelEl.classList.remove('open');
  activeKey    = null;
  anchorEl     = null;
  activeRender = null;
}
function hide() {
  if (!panelEl) return;
  clearTimeout(_hideTimer);
  if (!panelEl.classList.contains('dp-clickable')) { hideNow(); return; }
  _hideTimer = setTimeout(function () { if (!_holdPanel) hideNow(); }, 450);
}
function refresh() {
  if (activeRender && panelEl && panelEl.classList.contains('open')) render();
}

window.showDungeonPanel    = show;
window.hideDungeonPanel    = hide;
window.refreshDungeonPanel = refresh;

// Attach hover handlers to an element (marker or slot) for one dungeon.
window.attachDungeonPanel = function (el, key) {
  if (!el || el.dataset.dngPanel === '1') return;
  el.dataset.dngPanel = '1';
  el.addEventListener('mouseenter', function () { show(key, el); });
  el.addEventListener('mouseleave', hide);
};

// ── Styles ────────────────────────────────────────────────────────────────────

(function injectCSS() {
  if (document.getElementById('dng-panel-css')) return;
  var st = document.createElement('style');
  st.id = 'dng-panel-css';
  st.textContent = DNG_PANEL_CSS;
  document.head.appendChild(st);
})();

})();
