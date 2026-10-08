// Cosmetic seed-flag overlays (pseudo boots, mirror scroll). When the seed is
// generated with one of these, the item shows a variant image as its STARTING
// state, replaced by the real item once obtained. DISPLAY ONLY — the value used
// by logic is never changed (map/checks behave exactly as normal).
function seedFlagFromQueryOrStore(param, storeKey) {
    var p = new URLSearchParams(window.location.search).get(param);
    return (p || localStorage.getItem(storeKey) || 'no') === 'yes';
}
function pseudoBootsOn()  { return seedFlagFromQueryOrStore('pseudoboots',  'alttp-pseudoboots'); }
function mirrorScrollOn() { return seedFlagFromQueryOrStore('mirrorscroll', 'alttp-mirrorscroll'); }

// Returns { img, name } to override a slot's display for a seed-flag cosmetic,
// or null. Shown as the starting state (currentState 0); the real item image is
// used once obtained. Uses BASE_URL so it stays correct after applyBaseUrl.
function seedFlagOverlay(itemKey, currentState) {
    if (itemKey === 'boots'  && currentState === 0 && pseudoBootsOn())  return { img: BASE_URL + '/pseudoboots.png',  name: 'Pseudo Boots' };
    if (itemKey === 'mirror' && currentState === 0 && mirrorScrollOn()) return { img: BASE_URL + '/mirrorscroll.png', name: 'Mirror Scroll' };
    return null;
}

// BASE_URL for item images.
// In Electron we ask the main process for the real absolute file:// path.
// In browser we use the normal relative path.
let BASE_URL = 'items';
// BOSS_URL points at the sibling boss/ folder (boss0.png … boss10.png).
let BOSS_URL = 'boss';

function applyBaseUrl(newBase) {
  BASE_URL = newBase;
  // boss/ lives next to items/ — derive its path from the same base.
  BOSS_URL = newBase.replace(/items\/?$/, 'boss');
  // Rebuild all image src paths in the items object
  Object.keys(items).forEach(function(key) {
    var item = items[key];
    if (!item.states) return;
    item.states.forEach(function(state) {
      if (state.img) {
        // Replace any existing base (items/ or file://.../) with the new one
        state.img = state.img.replace(/^.*\/items\//, newBase + '/');
        // Handle case where img is just 'items/filename.png'
        if (!state.img.startsWith(newBase)) {
          state.img = state.img.replace(/^items\//, newBase + '/');
        }
      }
    });
  });
  // Re-render all currently displayed item images
  document.querySelectorAll('[data-item-key] img, .item-slot img').forEach(function(img) {
    var slot = img.closest('[data-item-key]') || img.closest('.item-slot');
    if (!slot) return;
    var key = slot.dataset.itemKey || slot.dataset.dungeonKey;
    if (key && items[key]) {
      var state = items[key].states[items[key].currentState];
      if (state && state.img) img.src = state.img;
      // Seed-flag cosmetics: this re-render (Electron base-path resolution) would
      // otherwise clobber the pseudo/scroll starting image. Re-apply it. BASE_URL
      // has already been set to newBase above, so seedFlagOverlay resolves right.
      var _ovB = seedFlagOverlay(key, items[key].currentState);
      if (_ovB) { img.src = _ovB.img; img.alt = _ovB.name; slot.dataset.itemName = _ovB.name; }
    }
  });
  // Re-render boss circles with the corrected boss/ base path (no-op if the
  // dungeon slots haven't been built yet — createTracker will refresh later).
  if (typeof refreshAllBossCircles === 'function') refreshAllBossCircles();
}

(async function() {
  if (window.electronAPI && window.electronAPI.getPaths) {
    try {
      const paths = await window.electronAPI.getPaths();
      if (paths && paths.itemsUrl) {
        // Wait for DOM so items object and rendered images are available
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() { applyBaseUrl(paths.itemsUrl); });
        } else {
          // Small delay to let createTracker() finish rendering
          setTimeout(function() { applyBaseUrl(paths.itemsUrl); }, 100);
        }
      }
    } catch(e) { /* fall back to relative path */ }
  }
})();

// WebSocket connection
let ws = null;
let wsHost = 'localhost';
let wsPort = 23074;
let reconnectInterval = null;
let deviceName = null;
let deviceAttached = false;
let _deviceRetryTimer = null;
let _gamemodeValid = false;
let _currentGamemode = 0;   // latest game-mode byte (0x7E0010) from each read cycle
const GAMEMODE_SRAM = (0xF50010).toString(16).toUpperCase();
// ── Connection retry timings ─────────────────────────────────────────────────
// v1.1.17, added after a report of the tracker taking ~10 seconds to pick up
// the game (SNI + snes9x). Grouped here so the whole change can be reverted in
// one place if it causes trouble.
//
// Previously: DeviceList retried on a flat 3s; the first SRAM read waited a
// full second because setInterval doesn't fire immediately; and an
// unrecognised game-mode byte re-sent DeviceList, whose handler is skipped
// once deviceAttached is true — so nothing ever re-checked and the tracker
// could sit there until the socket dropped.
//
// To revert: set DEVICE_RETRY_FAST_TRIES to 0 and drop the immediate
// _sramReadOnce() call in startSRAMReading(). Keep the game-mode retry — that
// one is a straight bug fix, not a tuning change.
const DEVICE_RETRY_FAST_MS    = 750;   // early DeviceList retries, while the emulator is still coming up
const DEVICE_RETRY_SLOW_MS    = 3000;  // steady-state, so we don't hammer SNI forever
const DEVICE_RETRY_FAST_TRIES = 8;     // ~6s of fast polling before backing off
const GAMEMODE_RETRY_MS       = 750;   // re-read the mode byte while it's unrecognised

let _deviceRetryCount = 0;
let _gamemodeRetryTimer = null;

const GAMEPLAY_MODES = [0x07, 0x09, 0x0B];
const KNOWN_ALTTP_MODES = [
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
    0x08, 0x0A, 0x0C, 0x0D, 0x0E, 0x0F,
    0x10, 0x14, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B
];
let readTimer = null;
let previousSRAM = null;

// Bumped with every change to this file, relayed in the broadcast snapshot so
// the map's gear menu can show which build the ITEM TRACKER is running — the
// two windows are packaged together but reload independently.
window.ITEMS_BUILD = '1126r';
let _bombClearTimer = null; // debounce: only clear bombs after sustained 0 reading

const items = {
    bow: {
        states: [
            { img: `${BASE_URL}/bow00.png`, name: 'No Bow' },
            { img: `${BASE_URL}/bow10.png`, name: 'Bow' },
            { img: `${BASE_URL}/bow11.png`, name: 'Bow & Arrows' },
            { img: `${BASE_URL}/bow12.png`, name: 'Silver Arrows' }
        ],
        currentState: 0
    },
    boomerang: {
        states: [
            { img: `${BASE_URL}/boomerang00.png`, name: 'No Boomerang' },
            { img: `${BASE_URL}/boomerang10.png`, name: 'Blue Boomerang' },
            { img: `${BASE_URL}/boomerang01.png`, name: 'Red Boomerang' },
            { img: `${BASE_URL}/boomerang11.png`, name: 'Both Boomerangs' }
        ],
        currentState: 0
    },
    hookshot: {
        states: [
            { img: `${BASE_URL}/hookshot0.png`, name: 'No Hookshot' },
            { img: `${BASE_URL}/hookshot1.png`, name: 'Hookshot' }
        ],
        currentState: 0
    },
    bomb: {
        states: [
            { img: `${BASE_URL}/bomb00.png`, name: 'No Bombs' },
            { img: `${BASE_URL}/bomb10.png`, name: 'Bombs' }
        ],
        currentState: 0
    },
    mushroom: {
        states: [
            { img: `${BASE_URL}/mushroom0.png`, name: 'No Mushroom' },
            { img: `${BASE_URL}/mushroom1.png`, name: 'Mushroom' },
            { img: `${BASE_URL}/mushroom2.png`, name: 'Turned In' }
        ],
        currentState: 0
    },
    powder: {
        states: [
            { img: `${BASE_URL}/powder00.png`, name: 'No Powder' },
            { img: `${BASE_URL}/powder10.png`, name: 'Magic Powder' }
        ],
        currentState: 0
    },
    firerod: {
        states: [
            { img: `${BASE_URL}/firerod0.png`, name: 'No Fire Rod' },
            { img: `${BASE_URL}/firerod1.png`, name: 'Fire Rod' }
        ],
        currentState: 0
    },
    icerod: {
        states: [
            { img: `${BASE_URL}/icerod0.png`, name: 'No Ice Rod' },
            { img: `${BASE_URL}/icerod1.png`, name: 'Ice Rod' }
        ],
        currentState: 0
    },
    bombos: {
        states: [
            { img: `${BASE_URL}/bombos00.png`, name: 'No Bombos' },
            { img: `${BASE_URL}/bombos10.png`, name: 'Bombos' }
        ],
        currentState: 0,
        medallionLabel: ''
    },
    ether: {
        states: [
            { img: `${BASE_URL}/ether00.png`, name: 'No Ether' },
            { img: `${BASE_URL}/ether10.png`, name: 'Ether' }
        ],
        currentState: 0,
        medallionLabel: ''
    },
    quake: {
        states: [
            { img: `${BASE_URL}/quake00.png`, name: 'No Quake' },
            { img: `${BASE_URL}/quake10.png`, name: 'Quake' }
        ],
        currentState: 0,
        medallionLabel: ''
    },
    agahnim: {
        states: [
            { img: `${BASE_URL}/aga10.png`, name: 'Agahnim Alive' },
            { img: `${BASE_URL}/aga11.png`, name: 'Agahnim Defeated' }
        ],
        currentState: 0
    },
    gomode: {
        states: [
            { img: null, name: 'Go Mode Off',      color: '#666'     },
            { img: null, name: 'Go Mode On',        color: '#2ecc71'  },
            { img: null, name: 'Go Mode Feeling',   color: '#eee600'  }
        ],
        currentState: 0,
        isGoMode: true
    },
    lamp: {
        states: [
            { img: `${BASE_URL}/lamp0.png`, name: 'No Lamp' },
            { img: `${BASE_URL}/lamp1.png`, name: 'Lamp' }
        ],
        currentState: 0
    },
    hammer: {
        states: [
            { img: `${BASE_URL}/hammer0.png`, name: 'No Hammer' },
            { img: `${BASE_URL}/hammer1.png`, name: 'Hammer' }
        ],
        currentState: 0
    },
    shovel: {
        states: [
            { img: `${BASE_URL}/shovel0.png`, name: 'No Shovel' },
            { img: `${BASE_URL}/shovel1.png`, name: 'Shovel' }
        ],
        currentState: 0
    },
    flute: {
        states: [
            { img: `${BASE_URL}/flute00.png`, name: 'No Flute' },
            { img: `${BASE_URL}/flute10.png`, name: 'Flute' },
            { img: `${BASE_URL}/flute11.png`, name: 'Flute & Bird' }
        ],
        currentState: 0
    },
    net: {
        states: [
            { img: `${BASE_URL}/net0.png`, name: 'No Net' },
            { img: `${BASE_URL}/net1.png`, name: 'Net' }
        ],
        currentState: 0
    },
    book: {
        states: [
            { img: `${BASE_URL}/book0.png`, name: 'No Book' },
            { img: `${BASE_URL}/book1.png`, name: 'Book of Mudora' }
        ],
        currentState: 0
    },
    bottle1: {
        states: [
            { img: `${BASE_URL}/bottle0.png`,      name: 'Empty Slot' },
            { img: `${BASE_URL}/bottle_empty.png`, name: 'Empty Bottle' },
            { img: `${BASE_URL}/bottle_red.png`,   name: 'Red Potion' },
            { img: `${BASE_URL}/bottle_green.png`, name: 'Green Potion' },
            { img: `${BASE_URL}/bottle_blue.png`,  name: 'Blue Potion' },
            { img: `${BASE_URL}/bottle_fairy.png`, name: 'Fairy' },
            { img: `${BASE_URL}/bottle_bee.png`,   name: 'Bee' },
            { img: `${BASE_URL}/bottle_goodbee.png`,      name: 'Good Bee' },
        ], currentState: 0
    },
    bottle2: {
        states: [
            { img: `${BASE_URL}/bottle0.png`,      name: 'Empty Slot' },
            { img: `${BASE_URL}/bottle_empty.png`, name: 'Empty Bottle' },
            { img: `${BASE_URL}/bottle_red.png`,   name: 'Red Potion' },
            { img: `${BASE_URL}/bottle_green.png`, name: 'Green Potion' },
            { img: `${BASE_URL}/bottle_blue.png`,  name: 'Blue Potion' },
            { img: `${BASE_URL}/bottle_fairy.png`, name: 'Fairy' },
            { img: `${BASE_URL}/bottle_bee.png`,   name: 'Bee' },
            { img: `${BASE_URL}/bottle_goodbee.png`,      name: 'Good Bee' },
        ], currentState: 0
    },
    bottle3: {
        states: [
            { img: `${BASE_URL}/bottle0.png`,      name: 'Empty Slot' },
            { img: `${BASE_URL}/bottle_empty.png`, name: 'Empty Bottle' },
            { img: `${BASE_URL}/bottle_red.png`,   name: 'Red Potion' },
            { img: `${BASE_URL}/bottle_green.png`, name: 'Green Potion' },
            { img: `${BASE_URL}/bottle_blue.png`,  name: 'Blue Potion' },
            { img: `${BASE_URL}/bottle_fairy.png`, name: 'Fairy' },
            { img: `${BASE_URL}/bottle_bee.png`,   name: 'Bee' },
            { img: `${BASE_URL}/bottle_goodbee.png`,      name: 'Good Bee' },
        ], currentState: 0
    },
    bottle4: {
        states: [
            { img: `${BASE_URL}/bottle0.png`,      name: 'Empty Slot' },
            { img: `${BASE_URL}/bottle_empty.png`, name: 'Empty Bottle' },
            { img: `${BASE_URL}/bottle_red.png`,   name: 'Red Potion' },
            { img: `${BASE_URL}/bottle_green.png`, name: 'Green Potion' },
            { img: `${BASE_URL}/bottle_blue.png`,  name: 'Blue Potion' },
            { img: `${BASE_URL}/bottle_fairy.png`, name: 'Fairy' },
            { img: `${BASE_URL}/bottle_bee.png`,   name: 'Bee' },
            { img: `${BASE_URL}/bottle_goodbee.png`,      name: 'Good Bee' },
        ], currentState: 0
    },
    somaria: {
        states: [
            { img: `${BASE_URL}/caneofsomaria0.png`, name: 'No Somaria' },
            { img: `${BASE_URL}/caneofsomaria1.png`, name: 'Cane of Somaria' }
        ],
        currentState: 0
    },
    byrna: {
        states: [
            { img: `${BASE_URL}/caneofbyrna0.png`, name: 'No Byrna' },
            { img: `${BASE_URL}/caneofbyrna1.png`, name: 'Cane of Byrna' }
        ],
        currentState: 0
    },
    cape: {
        states: [
            { img: `${BASE_URL}/cape0.png`, name: 'No Cape' },
            { img: `${BASE_URL}/cape1.png`, name: 'Magic Cape' }
        ],
        currentState: 0
    },
    mirror: {
        states: [
            { img: `${BASE_URL}/mirror0.png`, name: 'No Mirror' },
            { img: `${BASE_URL}/mirror1.png`, name: 'Magic Mirror' }
        ],
        currentState: 0
    },
    halfmagic: {
        states: [
            { img: `${BASE_URL}/halfmagic0.png`, name: 'No Half Magic' },
            { img: `${BASE_URL}/halfmagic1.png`, name: 'Half Magic' }
        ],
        currentState: 0
    },
    boots: {
        states: [
            { img: `${BASE_URL}/boots0.png`, name: 'No Boots' },
            { img: `${BASE_URL}/boots1.png`, name: 'Pegasus Boots' }
        ],
        currentState: 0
    },
    gloves: {
        states: [
            { img: `${BASE_URL}/gloves0.png`, name: 'No Gloves' },
            { img: `${BASE_URL}/gloves1.png`, name: 'Power Glove' },
            { img: `${BASE_URL}/gloves2.png`, name: 'Titan\'s Mitt' }
        ],
        currentState: 0
    },
    flippers: {
        states: [
            { img: `${BASE_URL}/flippers0.png`, name: 'No Flippers' },
            { img: `${BASE_URL}/flippers1.png`, name: 'Flippers' }
        ],
        currentState: 0
    },
    moonpearl: {
        states: [
            { img: `${BASE_URL}/moonpearl0.png`, name: 'No Moon Pearl' },
            { img: `${BASE_URL}/moonpearl1.png`, name: 'Moon Pearl' }
        ],
        currentState: 0
    },
    sword: {
        states: [
            { img: `${BASE_URL}/sword0.png`, name: 'No Sword' },
            { img: `${BASE_URL}/sword1.png`, name: 'Fighter\'s Sword' },
            { img: `${BASE_URL}/sword2.png`, name: 'Master Sword' },
            { img: `${BASE_URL}/sword3.png`, name: 'Tempered Sword' },
            { img: `${BASE_URL}/sword4.png`, name: 'Golden Sword' }
        ],
        currentState: 0
    },
    shield: {
        states: [
            { img: `${BASE_URL}/shield0.png`, name: 'No Shield' },
            { img: `${BASE_URL}/shield1.png`, name: 'Fighter\'s Shield' },
            { img: `${BASE_URL}/shield2.png`, name: 'Fire Shield' },
            { img: `${BASE_URL}/shield3.png`, name: 'Mirror Shield' }
        ],
        currentState: 0
    },
    tunic: {
        states: [
            { img: `${BASE_URL}/mail0.png`, name: 'Green Mail' },
            { img: `${BASE_URL}/mail1.png`, name: 'Blue Mail' },
            { img: `${BASE_URL}/mail2.png`, name: 'Red Mail' }
        ],
        currentState: 0
    }
};

const dungeons = {
    hc: { name: 'HC', bossAddr: null, bigkeyAddr: 0x367, bigkeyMask: 0x40, compassAddr: null, compassMask: 0, mapAddr: 0x369, mapMask: 0x40, smallKeyAddr: 0x4e0, maxChests: 8, maxSmallKeys: 1, maxItems: 6, smallKeyCount: 0, itemCount: 0, prizeState: 0, bigkeyState: 0, compassState: 0, mapState: 0, noCompass: true, noPrize: true, noBigKeyItem: true,
        locations: [[0x022,0x10],[0x022,0x20],[0x022,0x40],[0x0e4,0x10],[0x0e2,0x10],[0x100,0x10],[0x024,0x10],[0x064,0x10]] },
    ep: { name: 'EP', bossAddr: 0x191, bigkeyAddr: 0x367, bigkeyMask: 0x20, compassAddr: 0x365, compassMask: 0x20, mapAddr: 0x369, mapMask: 0x20, smallKeyAddr: 0x4e2, maxChests: 6, maxSmallKeys: 0, maxItems: 3, smallKeyCount: 0, itemCount: 0, prizeState: 0, bigkeyState: 0, compassState: 0, mapState: 0,
        locations: [[0x172,0x10],[0x154,0x10],[0x150,0x10],[0x152,0x10],[0x170,0x10],[0x191,0x08]] },
    dp: { name: 'DP', bossAddr: 0x067, bigkeyAddr: 0x367, bigkeyMask: 0x10, compassAddr: 0x365, compassMask: 0x10, mapAddr: 0x369, mapMask: 0x10, smallKeyAddr: 0x4e3, maxChests: 6, maxSmallKeys: 1, maxItems: 2, smallKeyCount: 0, itemCount: 0, prizeState: 0, bigkeyState: 0, compassState: 0, mapState: 0,
        locations: [[0xe6,0x10],[0xe7,0x04],[0xe8,0x10],[0x10a,0x10],[0xea,0x10],[0x67,0x08]] },
    toh: { name: 'TOH', bossAddr: 0x00f, bigkeyAddr: 0x366, bigkeyMask: 0x20, compassAddr: 0x364, compassMask: 0x20, mapAddr: 0x368, mapMask: 0x20, smallKeyAddr: 0x4ea, maxChests: 6, maxSmallKeys: 1, maxItems: 2, smallKeyCount: 0, itemCount: 0, prizeState: 0, bigkeyState: 0, compassState: 0, mapState: 0,
        locations: [[0x10f,0x04],[0xee,0x10],[0x10e,0x10],[0x4e,0x10],[0x4e,0x20],[0xf,0x08]] },
    pod: { name: 'POD', bossAddr: 0x0b5, bigkeyAddr: 0x367, bigkeyMask: 0x02, compassAddr: 0x365, compassMask: 0x02, mapAddr: 0x369, mapMask: 0x02, smallKeyAddr: 0x4e6, maxChests: 14, maxSmallKeys: 6, maxItems: 5, smallKeyCount: 0, itemCount: 0, prizeState: 0, bigkeyState: 0, compassState: 0, mapState: 0,
        locations: [[0x12,0x10],[0x56,0x10],[0x54,0x10],[0x54,0x20],[0x74,0x10],[0x14,0x10],[0x34,0x10],[0x34,0x20],[0x34,0x40],[0x32,0x10],[0x32,0x20],[0xd4,0x10],[0xd4,0x20],[0xb5,0x08]] },
    sp: { name: 'SP', bossAddr: 0x00d, bigkeyAddr: 0x367, bigkeyMask: 0x04, compassAddr: 0x365, compassMask: 0x04, mapAddr: 0x369, mapMask: 0x04, smallKeyAddr: 0x4e5, maxChests: 10, maxSmallKeys: 1, maxItems: 6, smallKeyCount: 0, itemCount: 0, prizeState: 0, bigkeyState: 0, compassState: 0, mapState: 0,
        locations: [[0x50,0x10],[0x6e,0x10],[0x6c,0x10],[0x6a,0x10],[0x68,0x10],[0x8c,0x10],[0xec,0x10],[0xec,0x20],[0xcc,0x10],[0xd,0x08]] },
    sw: { name: 'SW', bossAddr: 0x053, bigkeyAddr: 0x366, bigkeyMask: 0x80, compassAddr: 0x364, compassMask: 0x80, mapAddr: 0x368, mapMask: 0x80, smallKeyAddr: 0x4e8, maxChests: 8, maxSmallKeys: 3, maxItems: 2, smallKeyCount: 0, itemCount: 0, prizeState: 0, bigkeyState: 0, compassState: 0, mapState: 0,
        locations: [[0xce,0x10],[0xd0,0x10],[0xae,0x10],[0xae,0x20],[0xb0,0x10],[0xb0,0x20],[0xb2,0x10],[0x53,0x08]] },
    tt: { name: 'TT', bossAddr: 0x159, bigkeyAddr: 0x366, bigkeyMask: 0x10, compassAddr: 0x364, compassMask: 0x10, mapAddr: 0x368, mapMask: 0x10, smallKeyAddr: 0x4eb, maxChests: 8, maxSmallKeys: 1, maxItems: 4, smallKeyCount: 0, itemCount: 0, prizeState: 0, bigkeyState: 0, compassState: 0, mapState: 0,
        locations: [[0x1b6,0x10],[0x1b6,0x20],[0x196,0x10],[0x1b8,0x10],[0xca,0x10],[0x8a,0x10],[0x88,0x10],[0x159,0x08]] },
    ip: { name: 'IP', bossAddr: 0x1bd, bigkeyAddr: 0x366, bigkeyMask: 0x40, compassAddr: 0x364, compassMask: 0x40, mapAddr: 0x368, mapMask: 0x40, smallKeyAddr: 0x4e9, maxChests: 8, maxSmallKeys: 2, maxItems: 3, smallKeyCount: 0, itemCount: 0, prizeState: 0, bigkeyState: 0, compassState: 0, mapState: 0,
        locations: [[0x5c,0x10],[0x7e,0x10],[0x3e,0x10],[0xbe,0x10],[0xfc,0x10],[0x15c,0x10],[0x13c,0x10],[0x1bd,0x08]] },
    mm: { name: 'MM', bossAddr: 0x121, bigkeyAddr: 0x367, bigkeyMask: 0x01, compassAddr: 0x365, compassMask: 0x01, mapAddr: 0x369, mapMask: 0x01, smallKeyAddr: 0x4e7, maxChests: 8, maxSmallKeys: 3, maxItems: 2, smallKeyCount: 0, itemCount: 0, prizeState: 0, bigkeyState: 0, compassState: 0, mapState: 0,
        locations: [[0x144,0x10],[0x166,0x10],[0x184,0x10],[0x182,0x10],[0x1a2,0x10],[0x186,0x10],[0x186,0x20],[0x121,0x08]] },
    tr: { name: 'TR', bossAddr: 0x149, bigkeyAddr: 0x366, bigkeyMask: 0x08, compassAddr: 0x364, compassMask: 0x08, mapAddr: 0x368, mapMask: 0x08, smallKeyAddr: 0x4ec, maxChests: 12, maxSmallKeys: 4, maxItems: 5, smallKeyCount: 0, itemCount: 0, prizeState: 0, bigkeyState: 0, compassState: 0, mapState: 0,
        locations: [[0x1ac,0x10],[0x16e,0x10],[0x16e,0x20],[0x16c,0x10],[0x28,0x10],[0x48,0x10],[0x8,0x10],[0x1aa,0x10],[0x1aa,0x20],[0x1aa,0x40],[0x1aa,0x80],[0x149,0x08]] },
    gt: { name: 'GT', bossAddr: null, bigkeyAddr: 0x366, bigkeyMask: 0x04, compassAddr: 0x364, compassMask: 0x04, mapAddr: 0x368, mapMask: 0x04, smallKeyAddr: 0x4ed, maxChests: 27, maxSmallKeys: 4, maxItems: 20, smallKeyCount: 0, itemCount: 0, prizeState: 0, bigkeyState: 0, compassState: 0, mapState: 0, bigkeyOnly: true,
        locations: [[0x119,0x04],[0xf6,0x10],[0xf6,0x20],[0xf6,0x40],[0xf6,0x80],[0x116,0x10],[0xfa,0x10],[0xf8,0x10],[0xf8,0x20],[0xf8,0x40],[0xf8,0x80],[0x118,0x10],[0x118,0x20],[0x118,0x40],[0x118,0x80],[0x38,0x10],[0x38,0x20],[0x38,0x40],[0x11a,0x10],[0x13a,0x10],[0x13a,0x20],[0x13a,0x40],[0x13a,0x80],[0x7a,0x10],[0x7a,0x20],[0x7a,0x40],[0x9a,0x10]] }
};

// ── Key Drop Shuffle ─────────────────────────────────────────────────────────
// The keys normally found under pots and dropped by enemies become shuffled
// item locations: +33 across the dungeons, and the same number of extra small
// keys. Same [room, bitmask] shape as `locations`, but these bits do NOT live
// in the room data — pot keys are flagged in one SRAM region and enemy drops in
// another (see KEYDROP_START in the autotracking section), so they are stored
// and read separately.
//
// Ported from alttptracker-main/data/data_objects.js. CT is in this table even
// though it isn't in `dungeons` — its two key drops raise the CT key count from
// 2 to 4, which the CT key box and the map both read.
window.KEYDROP_DATA = {
    // HC follows the general rule: 12 locations = 9 items + 1 key + map + big key.
    //
    // It carried a hand-written `extra` of 11/1/8 for a while, read off a
    // mid-run HUD while the small-key slot bug was still live. That override
    // cost real locations two ways: it capped `keyDropCount` at 3 when HC has
    // FOUR drop bits, so the Boomerang Guard drop was silently discarded, and
    // it capped maxItems at 8 when HC has 9 — hiding the last chest collected.
    // Chris hit both (Aug 2026): the guard drop, Zelda's Cell and the Sewers
    // chests all failing to register. Derived, everything counts.
    //
    // If HC ever needs stating again, get the numbers from a FRESH dungeon's
    // HUD, not from a partly-cleared one.
    hc:  { keypots: [],
           keydrops: [[0x0e5,0x80],[0x0e3,0x40],[0x101,0x20],[0x043,0x80]],
           bigkeydrop: true },
    // EP: 7 locations = 3 items + 1 key + map + compass + big key. Its Dark
    // Square Pot Key is the new location; the Dark Eyegore drop stays a key.
    ep:  { keypots: [[0x175,0x08]], keydrops: [[0x133,0x10]] },
    dp:  { keypots: [[0x0c7,0x04],[0x0a7,0x20],[0x087,0x01]], keydrops: [] },
    toh: { keypots: [], keydrops: [] },
    pod: { keypots: [], keydrops: [] },
    sp:  { keypots: [[0x071,0x10],[0x06f,0x80],[0x06d,0x08],[0x06b,0x80],[0x02c,0x80]], keydrops: [] },
    sw:  { keypots: [[0x0ac,0x04]], keydrops: [[0x073,0x40]] },
    tt:  { keypots: [[0x179,0x40],[0x157,0x80]], keydrops: [] },
    // IP: 10 locations = 3 items + 4 keys + map + compass + big key. Its two
    // pot keys are the new locations; Conveyor / Hammer Block / Jelly stay keys.
    ip:  { keypots: [[0x07f,0x02],[0x13f,0x08]], keydrops: [[0x01d,0x10],[0x07c,0x80]] },
    mm:  { keypots: [[0x167,0x80],[0x143,0x80]], keydrops: [[0x182,0x40]] },
    tr:  { keypots: [], keydrops: [[0x16d,0x04],[0x027,0x02]] },
    gt:  { keypots: [[0x117,0x40],[0x137,0x40],[0x0f7,0x08]], keydrops: [[0x07b,0x20]] },
    ct:  { keypots: [], keydrops: [[0x181,0x10],[0x160,0x20]] }
};

// Merge the arrays onto the dungeon objects so the autotracker can walk one
// structure. Done here rather than in the literals above to keep those lines
// readable and to leave CT (which has no dungeon object) out of it.
Object.keys(window.KEYDROP_DATA).forEach(function(k) {
    if (!dungeons[k]) return;
    dungeons[k].keypots    = window.KEYDROP_DATA[k].keypots  || [];
    dungeons[k].keydrops   = window.KEYDROP_DATA[k].keydrops || [];
    dungeons[k].bigkeydrop = !!window.KEYDROP_DATA[k].bigkeydrop;
});

// Expose dungeons globally so itemtracker.html can read/update them
window.dungeons = dungeons;

// ── Dungeon prize cycle ──────────────────────────────────────────────────────
// One cycle for every dungeon-item mode. "?" used to be offered only in the
// shuffled modes, but some seeds place dungeon prizes out in the overworld, so
// it has to be reachable in Standard too. Keeping a single cycle also keeps the
// index meaning stable and matches map.html, whose prizeIndexByName() would
// otherwise silently resolve an unknown prize to crystal.
window.PRIZE_IMAGE_CYCLE = ['unknown0.png', 'crystal0.png', 'redcrystal0.png', 'pendant0.png', 'greenpendant0.png'];
window.PRIZE_INDEX_UNKNOWN = 0;
window.PRIZE_INDEX_CRYSTAL = 1;

// The seed's Dungeon Item Shuffle setting: standard | mapcompass |
// mapcompasskeys | keysanity | other.
// Live override, set when the map's settings menu changes the mode under an
// open window. A live change never rewrites the URL, so this has to beat the
// URL param the window was launched with.
window._dungeonItemsOverride = null;

window.dungeonItemsMode = function() {
    if (window._dungeonItemsOverride) return window._dungeonItemsOverride;
    try {
        return new URLSearchParams(window.location.search).get('dungeonitems')
            || localStorage.getItem('alttp-dungeon-items')
            || 'standard';
    } catch (e) { return 'standard'; }
};

// What a fresh board starts on for a given Dungeon Item Shuffle setting.
// Standard keeps the crystals, because the prizes are where they always are.
// Every shuffled setting starts on ? instead — the prizes move, so showing a
// crystal would be asserting something the player doesn't know yet.
// Random Prize Shuffle (launcher, Other Settings): the prizes can be anywhere,
// so even a Standard board can't assert crystals.
window.randomPrizeShuffle = function() {
    try { return localStorage.getItem('alttp-random-prize') === 'yes'; } catch (e) { return false; }
};

// The '?' start belongs to the MAP being shuffled: that is the mode where the
// tracker shows a dungeon's map as its prize hint, so asserting a crystal would
// be claiming something the player hasn't seen. A shuffle without the map —
// big key only, BK/SK, compass — leaves the prizes exactly where they always
// are, so those start on the crystal like Standard (Chris, Sep 2026).
window.defaultPrizeForMode = function(mode) {
    if (window.randomPrizeShuffle()) return 'unknown';
    return (window.shuffleMap && window.shuffleMap()) ? 'unknown' : 'crystal';
};

// A change made in the item tracker's settings panel. Deliberately held in
// memory and NOT persisted: every launch starts from the seed's Dungeon Item
// Shuffle setting, and the player's change lasts only for that session. Chris
// asked for exactly this — a standard seed must always open on crystals, no
// matter what was picked last time.
window._prizeOverride = null;

// Drop the keys older builds persisted, so a stale choice can't survive a
// relaunch and reintroduce the behaviour above.
try {
    localStorage.removeItem('alttp-itemtracker-default-prize');
    localStorage.removeItem('alttp-itemtracker-default-prize-mode');
} catch (e) {}

// Which prize every dungeon starts on: derived from the seed's Dungeon Item
// Shuffle setting, unless overridden for this session.
window.defaultPrizeIndex = function() {
    var pref = window._prizeOverride;
    if (pref !== 'crystal' && pref !== 'unknown') pref = window.defaultPrizeForMode();
    return pref === 'unknown' ? window.PRIZE_INDEX_UNKNOWN : window.PRIZE_INDEX_CRYSTAL;
};

// The effective setting as a name, for the settings panel radios.
window.defaultPrizeSetting = function() {
    return window.defaultPrizeIndex() === window.PRIZE_INDEX_UNKNOWN ? 'unknown' : 'crystal';
};

// Seed every dungeon's prizeState to match the image it will be drawn with.
// If these disagree the first click appears to do nothing, because cycling
// advances the index onto the entry already being displayed.
Object.keys(dungeons).forEach(function(k) { dungeons[k].prizeState = window.defaultPrizeIndex(); });

// Re-apply the default prize to every dungeon right now. Called when the
// setting is changed so the board updates immediately rather than only on the
// next launch — flipping a setting and seeing nothing happen reads as broken.
// Prizes are reset to un-obtained, same as New Game does.
// Set one dungeon's prize from the outside (the map's dungeon markers cycle
// prizes too). Named rather than indexed so the two prize cycles can't drift.
window.setDungeonPrize = function(key, name) {
    var idx = window.PRIZE_IMAGE_CYCLE.indexOf(name + '0.png');
    if (idx < 0 || !dungeons[key]) return;
    dungeons[key].prizeState = idx;
    var slot = document.querySelector('[data-dungeon-key="' + key + '"]');
    var prizeImg = slot && slot.querySelector('.prize-img');
    if (prizeImg) prizeImg.src = (typeof BASE_URL !== 'undefined' ? BASE_URL + '/' : '') + window.PRIZE_IMAGE_CYCLE[idx];
    if (typeof updateBossCircle === 'function') updateBossCircle(key);
    if (typeof updateDungeonCountDisplay === 'function') updateDungeonCountDisplay(key);
    if (typeof window.onPrizeCycled === 'function') window.onPrizeCycled();
    if (window.broadcastItemSnap) window.broadcastItemSnap();
};

window.applyDefaultPrizeToAll = function() {
    var idx = window.defaultPrizeIndex();
    var img = window.PRIZE_IMAGE_CYCLE[idx];
    Object.keys(dungeons).forEach(function(k) {
        dungeons[k].prizeState = idx;
        var slot = document.querySelector('[data-dungeon-key="' + k + '"]');
        if (!slot) return;
        var prizeImg = slot.querySelector('.prize-img');
        if (prizeImg) prizeImg.src = (typeof BASE_URL !== 'undefined' ? BASE_URL + '/' : '') + img;
        if (typeof updateBossCircle === 'function') updateBossCircle(k);
        if (typeof updateDungeonCountDisplay === 'function') updateDungeonCountDisplay(k);
    });
    if (typeof window.onPrizeCycled === 'function') window.onPrizeCycled();
    if (window.broadcastItemSnap) window.broadcastItemSnap();
};

// The world state can be changed from the map's settings menu while the item
// tracker is open, so anything derived from it has to be recomputable rather
// than resolved once at load. Held in memory; a live change never rewrites the
// URL, so this override has to beat the URL param that seeded the window.
window._worldStateOverride = null;

window.currentWorldState = function() {
    if (window._worldStateOverride) return window._worldStateOverride;
    try {
        return new URLSearchParams(window.location.search).get('gamemode')
            || localStorage.getItem('alttp-gamemode')
            || 'standard';
    } catch (e) { return 'standard'; }
};

// ── Key-source helpers ───────────────────────────────────────────────────────
// Defined HERE, above applyDungeonItemMaxes, because that function runs
// immediately at load and calls keysAreUniversal(). Defining these further down
// (next to the other Retro helpers, where they read more naturally) throws
// "keysAreUniversal is not a function" during load and aborts the rest of
// items.js — the tracker then half-initialises with no visible error.
window.isRetroMode = function() { return window.currentWorldState() === 'retro'; };

// Universal Keys — a seed flag of its own, set from the map's gear menu.
// Retro *implies* it, but a seed can use universal keys under any world state,
// which is why this isn't just isRetroMode(). Live override, same reason as the
// others: a change from the map never rewrites this window's URL.
window._universalKeysOverride = null;

window.universalKeysFlag = function() {
    if (window._universalKeysOverride) return window._universalKeysOverride === 'yes';
    try {
        return (new URLSearchParams(window.location.search).get('universalkeys')
             || localStorage.getItem('alttp-universal-keys')
             || 'no') === 'yes';
    } catch (e) { return false; }
};

// True when small keys are bought rather than found — the Universal Keys flag
// or the Retro world state, unless a key-shuffling dungeon item mode has put
// them back into the dungeon pool. Anything that waits for a key to be
// *collected* has to account for this.
window.keysAreUniversal = function() {
    try {
        if (!(window.universalKeysFlag() || window.isRetroMode())) return false;
        return !(window.shuffleSmallKeys && window.shuffleSmallKeys());
    } catch (e) { return false; }
};

// ── The Key Drop Shuffle flag ────────────────────────────────────────────────
// Defined HERE, above applyDungeonItemMaxes, because that runs at load and
// calls into it. Putting these lower down throws and silently aborts the rest
// of the file — the same trap universal keys fell into.
window._keyDropOverride = null;   // set by a live settings change; beats the URL

// "Key Drop" — the combined mode, pot keys AND enemy drops. Kept as a flag of
// its own rather than just ticking the other two, so a player's individual
// choices survive underneath it and a reload can tell the two states apart.
window._keyDropAllOverride = null;

window.keyDropAllFlag = function() {
    if (window._keyDropAllOverride) return window._keyDropAllOverride === 'yes';
    try {
        return (new URLSearchParams(window.location.search).get('keydropall')
             || localStorage.getItem('alttp-keydrop-all')
             || 'no') === 'yes';
    } catch (e) { return false; }
};

window.keyDropFlag = function() {
    if (window.keyDropAllFlag()) return true;
    if (window._keyDropOverride) return window._keyDropOverride === 'yes';
    try {
        return (new URLSearchParams(window.location.search).get('keydrop')
             || localStorage.getItem('alttp-keydrop')
             || 'no') === 'yes';
    } catch (e) { return false; }
};

// Enemy Key Drop — the separate option that shuffles the keys dropped by
// enemies, the mirror of the pottery flag above. Each enemy drop becomes a
// location holding one of the dungeon's small keys, exactly as a pot key does.
// The two are independent; either, both or neither can be on.
window._enemyKeyDropOverride = null;

window.enemyKeyDropFlag = function() {
    if (window.keyDropAllFlag()) return true;
    if (window._enemyKeyDropOverride) return window._enemyKeyDropOverride === 'yes';
    try {
        return (new URLSearchParams(window.location.search).get('enemykeydrop')
             || localStorage.getItem('alttp-enemy-keydrop')
             || 'no') === 'yes';
    } catch (e) { return false; }
};

// Either flag means the key-drop SRAM block is worth reading.
window.anyKeyDropFlag = function() {
    return window.keyDropFlag() || window.enemyKeyDropFlag();
};

// ── Pot Drops / Enemy Drops / Pots and Bones ─────────────────────────────────
//
// The full-shuffle modes: EVERY pot, or EVERY enemy, is a location — not just
// the ones that hold a key. There is no hand-kept table for these and there
// never will be; the location lists run to hundreds of entries and
// alttptracker-main has none of them either (its `pottery` and `mobbery` fields
// are placeholder zeros).
//
// They work anyway because two things come straight from the cartridge:
//
//   $F65410 / $F65430   what the seed put in each dungeon   (totals)
//   $F5F4B0             how many of them you have checked   (progress)
//
// So in these modes the tracker stops deriving anything and simply reports what
// the game already knows. See seed-count-tables.md and drop-modes.md.
window._potDropsOverride = null;
window._enemyDropsOverride = null;
window._potsBonesOverride = null;

// Pots and Bones is both halves at once, exactly as Key Drop is for its two.
// Pottery shuffle: which of the game's ~830 pots are item locations. Nine
// modes; the tracker only needs to know whether one is on, because the pot bits
// live in the same block key drop uses (js/potlocations.js has the mapping).
window.potteryFlag = function() {
    if (window._potteryOverride) return window._potteryOverride !== 'none';
    try {
        return (new URLSearchParams(window.location.search).get('pottery')
             || localStorage.getItem('alttp-pottery')
             || 'none') !== 'none';
    } catch (e) { return false; }
};

window.potsBonesFlag = function() {
    if (window._potsBonesOverride) return window._potsBonesOverride === 'yes';
    try {
        return (new URLSearchParams(window.location.search).get('potsbones')
             || localStorage.getItem('alttp-pots-bones')
             || 'no') === 'yes';
    } catch (e) { return false; }
};

window.potDropsFlag = function() {
    if (window.potsBonesFlag()) return true;
    if (window._potDropsOverride) return window._potDropsOverride === 'yes';
    try {
        return (new URLSearchParams(window.location.search).get('potdrops')
             || localStorage.getItem('alttp-pot-drops')
             || 'no') === 'yes';
    } catch (e) { return false; }
};

window.enemyDropsFlag = function() {
    if (window.potsBonesFlag()) return true;
    if (window._enemyDropsOverride) return window._enemyDropsOverride === 'yes';
    try {
        return (new URLSearchParams(window.location.search).get('enemydrops')
             || localStorage.getItem('alttp-enemy-drops')
             || 'no') === 'yes';
    } catch (e) { return false; }
};

// "Is the tracker running on the seed's own numbers rather than its table?"
// The one predicate every drop-mode branch hangs off.
window.anyDropModeFlag = function() {
    return window.potDropsFlag() || window.enemyDropsFlag();
};

// What key drop adds to one dungeon. Returns zeroes when the flag is off, so
// callers can add unconditionally.
//
// **Each flag brings in its own half, and only its own half.** What the two
// halves HOLD differs:
//
//   Pot Key Drop Only  ->  pot locations, holding the dungeon's extra SMALL KEYS
//   Enemy Key Drop     ->  enemy-drop locations, also holding SMALL KEYS
//                          (plus HC's big key drop, which is an enemy drop)
//
// The master Key Drop flag is simply both at once — keyDropFlag() and
// enemyKeyDropFlag() each return true when it is set.
//
// Every consumer must ask the flag that matches the half it is dealing with:
// pot counts on keyDropFlag, enemy/big-key on enemyKeyDropFlag, and "is any of
// this live at all" on anyKeyDropFlag. Two separate defects came from reaching
// for keyDropFlag as a general on/off switch — under Enemy Key Drop alone it is
// false, so the counts moved but the collected tallies did not.
//
// **Settled against the randomizer's own tables** (Chris, Aug 2026). A live
// key-drop seed was dumped with keyprobe.html, which reads the two tables the
// ROM writes at $F65410 (max locations per dungeon, 16-bit little-endian) and
// $F65430 (max small keys per dungeon):
//
//            ROM loc / keys      ROM loc / keys
//   HC          12 / 4        SP     15 / 6
//   EP           8 / 2        POD    14 / 6
//   DP           9 / 4        MM     11 / 6
//   CT           4 / 4        SW     10 / 5
//   ToH          6 / 1        IP     12 / 6
//   TT          10 / 3        TR     14 / 6
//   GT          31 / 8
//
// Max locations matched this file exactly for all fourteen slots, and max keys
// came back as base + pots + drops for all fourteen. That is the whole rule,
// and there is no longer anything to infer:
//
//   EP  1 pot + 1 enemy drop ->  8 locations, 2 keys, 3 items
//   DP  3 pots + 0 drops     ->  9 locations, 4 keys, 2 items
//   TR  0 pots + 2 drops     -> 14 locations, 6 keys, 5 items
//   HC  0 pots + 4 drops     -> 12 locations, 4 keys, 6 items
//
// Before believing any argument that moves a count between the key and item
// columns, dump a seed with keyprobe.html. Four rounds of in-game readings and
// one reference tracker all failed to settle this; the ROM settled it once.
// ── Keys FOUND per dungeon ───────────────────────────────────────────────────
// The per-dungeon SRAM byte holds keys IN HAND, which drops as doors are
// opened — so the dungeon's logic, which cares about doors you can already be
// through, has to work from the highest count ever seen. That high-water mark
// used to live in memory only, and a window reload mid-run threw it away
// (Chris, Sep 2026: four of PoD's keys found, three spent, nothing changed
// after a reload). It persists here instead, and New Game clears it.
//
// Safe to persist where cleared-chest marks were not: it only ever rises, it is
// capped at the dungeon's own key count, and a stale value can at worst say a
// door is open that isn't — which the live count corrects the moment the player
// picks a key up.
var KEYS_FOUND_STORE = 'alttp-keys-found';

window.keysFoundLoad = function() {
    try { return JSON.parse(localStorage.getItem(KEYS_FOUND_STORE) || '{}') || {}; }
    catch (e) { return {}; }
};

window.keysFoundReset = function() {
    try { localStorage.removeItem(KEYS_FOUND_STORE); } catch (e) {}
    Object.keys(dungeons).forEach(function(k) {
        dungeons[k].smallKeyMax = 0;
        if (window.trackerItems) delete window.trackerItems[k + 'SmallKeysMax'];
    });
};

// Remember `n` keys found in `key`, capped at what that dungeon can hold.
// Returns the figure to use.
// The first live SRAM read of a launch REPLACES the persisted figures instead
// of maxing with them. $7EF4E0+ is itself the collected tally and survives a
// reload on its own, so the store is only needed for the window before a game
// is attached — and keeping it as a floor meant a new seed opened showing the
// last seed's keys until New Game was pressed (Chris, Sep 2026).
var _keysFoundFresh = {};

window.keysFoundNote = function(key, n) {
    var d = dungeons[key];
    var cap = d ? (d.maxSmallKeys || 0) : 0;
    var store = window.keysFoundLoad();
    var val = _keysFoundFresh[key] ? (n || 0) : Math.max(n || 0, store[key] || 0);
    if (cap > 0) val = Math.min(val, cap);
    if (val !== store[key]) {
        store[key] = val;
        try { localStorage.setItem(KEYS_FOUND_STORE, JSON.stringify(store)); } catch (e) {}
    }
    return val;
};

window.keyDropExtras = function(key) {
    var kd = window.KEYDROP_DATA[key];
    if (!kd) return { locations: 0, keys: 0, items: 0, nonBigKey: 0 };

    var potOn   = window.keyDropFlag();
    var enemyOn = window.enemyKeyDropFlag();
    if (!potOn && !enemyOn) return { locations: 0, keys: 0, items: 0, nonBigKey: 0 };

    var bigdrop = kd.bigkeydrop ? 1 : 0;
    // Each half brings in its own locations, and EVERY one of them holds a
    // small key — pots and enemy drops alike. See the ROM table above.
    //
    // The "a guard dropped an ITEM" report that pushed this the other way for a
    // while was about one location's contents in one seed. Key drop shuffle
    // randomizes what sits in each spot, so it says nothing about the counts.
    var pots  = potOn   ? (kd.keypots  || []).length : 0;
    var drops = enemyOn ? ((kd.keydrops || []).length - bigdrop) : 0;
    // HC's big key drop is itself an enemy drop, so it rides with that half.
    var bigLoc = (enemyOn && bigdrop) ? 1 : 0;

    // A dungeon may state its own figures where the general rule doesn't hold.
    // **Nothing uses this now** — HC did, and its stated numbers turned out to
    // be a mid-run misreading that silently discarded locations. Prefer fixing
    // the rule over adding an entry here; if you must, take the figures from a
    // dungeon nobody has touched yet.
    if (kd.extra && potOn && enemyOn) {
        return {
            locations: kd.extra.locations,
            keys:      kd.extra.keys,
            items:     kd.extra.items,
            nonBigKey: kd.extra.locations - bigLoc
        };
    }
    return {
        locations: pots + drops + bigLoc,   // every new location
        keys:      pots + drops,            // ...and every one of them holds a key
        items:     0,                       // so none of them holds an item
        nonBigKey: pots + drops             // every new location bar a big key one
    };
};

// CT's small key count: 2 normally, 4 under key drop. CT has no dungeon object,
// so its max lives here rather than on `dungeons`.
window.ctMaxSmallKeys = function() {
    var seed = window.seedCountsFor('ct');
    if (seed) return seed.keys;
    var fb = window.dropModeFallback && window.dropModeFallback('ct');
    if (fb) return fb.keys;
    return 2 + window.keyDropExtras('ct').keys;
};

// CT's item count. Normally zero — its two (or four) locations are all keys —
// so the box that shows this is hidden unless a mode actually gives CT items,
// which today means a drop mode. CT has no map, compass or big key, so there is
// nothing to subtract beyond the keys.
window.ctMaxItems = function() {
    var seed = window.seedCountsFor('ct');
    if (seed) return Math.max(0, seed.locations - seed.keys);
    var fb = window.dropModeFallback && window.dropModeFallback('ct');
    if (fb) return Math.max(0, fb.locations - fb.keys);
    return Math.max(0, (2 + window.keyDropExtras('ct').locations) - window.ctMaxSmallKeys());
};

// ── The seed's own counts ────────────────────────────────────────────────────
//
// The randomizer writes two per-dungeon tables that say exactly how many
// locations and how many small keys THIS seed put in each dungeon:
//
//     $F65410   0x20   max locations, 16-bit LITTLE-endian at 2i
//     $F65430   0x10   max small keys, one byte at i
//
// They are contiguous, so one 0x30 read at $F65410 covers both — and 0x30 is a
// free length for processSRAMData, which routes purely by response size.
//
// Slot order is the 0x4E0 small-key order. Slot 0 is the Sewers alone (max 1
// key); slot 1 is Hyrule Castle including them, which is the one that matches
// the combined counter at 0x4E0 and so the one we use for `hc`.
//
// **This is the authority for the key/item split.** The hand-kept KEYDROP_DATA
// figures took four rounds of in-game readings to get right and were still
// wrong; these two rows settled it in one go. See key-drop-shuffle.md.
window.SEED_COUNT_SLOT = {
    hc:1, ep:2, dp:3, ct:4, sp:5, pod:6, mm:7, sw:8, ip:9, toh:10, tt:11, tr:12, gt:13
};
window._seedCountRaw = null;      // { hc: {locations, keys}, ... }, straight from SRAM
window._seedCountUsed = null;     // the subset applyDungeonItemMaxes actually trusted

// Which of the parsed rows we are willing to believe.
//
// The location total is used as a **checksum**, not as data: we only take a
// dungeon's key count when its location total already agrees with what the
// tracker computed. That does three things at once —
//
//   * it proves the block is real and correctly indexed (this region is
//     arbitrary WRAM in a ROM that doesn't write it, so it can hold anything);
//   * it proves the seed's settings match the flags the player ticked, since a
//     key-drop seed read with key drop off would disagree everywhere;
//   * it keeps the collected side honest — processRoomData can only count the
//     drop bits its flags tell it to read, so accepting a location total we
//     can't actually track would leave the dungeon permanently unfinishable.
//
// A whole-block sanity gate comes first, so a stray coincidence in one dungeon
// can't drag a junk row in on its own.
window.seedCountsUsable = function(raw) {
    if (!raw) return false;
    // A drop mode shuffles far more locations in, so the normal ceiling would
    // reject a perfectly good table.
    var dropMode = window.anyDropModeFlag();
    var ceiling  = dropMode ? 400 : 60;
    var keys = Object.keys(raw), sane = 0, nonZero = 0;
    for (var i = 0; i < keys.length; i++) {
        var r = raw[keys[i]];
        if (!(r.locations >= 1 && r.locations <= ceiling)) return false;
        if (!(r.keys >= 0 && r.keys <= r.locations)) return false;
        if (r.locations > 0) nonZero++;
        if (dungeons[keys[i]] && r.locations === dungeons[keys[i]].maxChests) sane++;
    }
    // In a drop mode the tracker has NO table of its own to check against —
    // that is the whole point of the mode — so the location totals cannot be
    // used as a checksum. The plausibility gate above is all there is. Still
    // require the block to hold something, or an all-zero read would be
    // "accepted" and zero every dungeon.
    if (dropMode) return nonZero >= 12;
    // 12 dungeons carry a `dungeons` entry; require most of them to line up.
    return sane >= 8;
};

// The trusted row for one dungeon, or null to fall back to the table.
window.seedCountsFor = function(key) {
    var raw = window._seedCountRaw;
    if (!raw || !raw[key] || !window.seedCountsUsable(raw)) return null;
    var row = raw[key];
    // Drop mode: take it as read. There is nothing to compare against, and the
    // collected side comes from the game's own counter too, so the two halves
    // stay consistent with each other.
    if (window.anyDropModeFlag()) return row;
    var have = dungeons[key]
        ? dungeons[key].maxChests
        : 2 + window.keyDropExtras('ct').locations;   // CT has no dungeon object
    return (row.locations === have) ? row : null;
};

// The game's own per-dungeon "checks done" tally, or null when the tracker
// should stick to counting location bits.
//
//     $F5F4B0, 16-bit slot per dungeon, low byte at 2i
//
// It sits inside the 0x500 room read the tracker already issues, so this costs
// nothing. Slot order is SEED_COUNT_SLOT, which matches the ROM's exactly:
// Sewers 0, HC 1, EP 2, DP 3, CT 4, SP 5, PD 6, MM 7, SW 8, IP 9, TH 10,
// TT 11, TR 12, GT 13.
//
// CONFIRMED against a live seed (Chris, Sep 2026). With Hyrule Castle finished
// at 108 checks and nothing else touched, $F5F4B0..$F5F4DF read:
//
//     0x4b0: 00 00 6c 00 00 00 00 00 00 00 00 00 00 00 00 00
//     0x4c0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
//
// 0x6c = 108, sitting at 0x4b2 — exactly `0x4b0 + 2 * SEED_COUNT_SLOT.hc`. The
// table is 14 SIXTEEN-BIT slots spanning 0x4b0..0x4cb, which is why 0x4c0 is
// zero here: those are the slots for SW through GT, none of them cleared yet.
//
// Do NOT "correct" this to z3randomizer's sram.asm, which puts
// DungeonLocationsChecked at $7EF4C0 with one byte per dungeon. That is a
// different ROM's map; ALTTPR does not populate it, and reading `0x4c0 + slot`
// made every dungeon read zero (1125a, reverted).
//
// The Swamp Palace "51 of 81 enemies" report was never this counter — that is
// the Enemies row on the hover card, which counts per-enemy bits out of
// POT_LOCATIONS and is over-listed. See POTTERY-DROPS-README.md.
//
// Returns null outside a drop mode ON PURPOSE — every other mode counts bits,
// which is what all of the key-drop work was verified against. Widening this is
// a decision, not a tidy-up.
// Every location a dungeon has BEFORE any shuffle adds more — its own chests,
// dungeon items included. `ALL_LOC` inside applyDungeonItemMaxes was the only
// copy; the drop rollup needs it too, to work out how many of a drop-mode
// dungeon's locations are pots and enemies rather than chests.
//
// CT is the one that isn't DUNGEON_LOCATIONS.ct.length (that list carries Boss
// as a fourth line). Verified against a full clear: 59 - 2 - 25 pots = 32
// enemy drops, which is exactly what the cartridge holds (Chris, Sep 2026).
window.BASE_LOC = { hc:8, ep:6, dp:6, toh:6, ct:2, pod:14, sp:10, sw:8, tt:8,
                    ip:8, mm:8, tr:12, gt:27 };

// Everything in a dungeon that ISN'T one of its own chests — i.e. the pots and
// enemy drops together — as { done, total }, or null outside a drop mode.
//
// Both terms come from figures confirmed against a full 13-dungeon clear:
//   total = the seed's own location count  -  BASE_LOC
//   done  = the cartridge's checks-done counter  -  chests counted from bits
//
// The drop rollup subtracts its (verified) pot figures from these to get the
// enemy row, instead of matching per-enemy bitmasks. Those masks over-list by
// 49% game-wide and mis-assign bits — Swamp Palace read 51 of 81 with every
// enemy dead, where the truth is 55 of 55 (Chris, Sep 2026).
window.dungeonNonChest = function (key) {
    if (!window.anyDropModeFlag()) return null;
    // CT has no `dungeons` entry, so without this it fell back to the enemy
    // masks and read 40 against a real 32 (34 locations less its 2 chests —
    // Chris, Sep 2026). Same sum from the seed, the checks-done counter and
    // its two chest bits.
    if (key === 'ct') {
        var cs = window.seedCountsFor('ct'), rd = previousRoomData;
        if (!cs) return null;
        var ctTotal = cs.locations - window.BASE_LOC.ct;
        var ctChecks = rd ? window.checksDoneFor('ct', rd) : 0;
        var ctChests = rd ? ((rd[0x1c0] & 0x10) ? 1 : 0) + ((rd[0x1a0] & 0x10) ? 1 : 0) : 0;
        if (ctTotal < 0) return null;
        return { done: Math.max(0, Math.min((ctChecks || 0) - ctChests, ctTotal)), total: ctTotal };
    }
    var d = dungeons[key];
    var base = window.BASE_LOC[key];
    if (!d || base === undefined) return null;
    var total = (d.maxChests || 0) - base;
    var done  = (d.chestsMax  || 0) - (d.chestBits || 0);
    if (total < 0) return null;
    return { done: Math.max(0, Math.min(done, total)), total: total };
};

window.CHECKS_DONE_OFFSET = 0x4b0;
window.checksDoneFor = function(key, roomData) {
    if (!window.anyDropModeFlag()) return null;
    var slot = window.SEED_COUNT_SLOT[key];
    if (slot === undefined || !roomData) return null;
    var at = window.CHECKS_DONE_OFFSET + 2 * slot;
    if (at + 1 >= roomData.length) return null;
    // Genuinely 16-bit — the dump shows every high byte at 00, and GT already
    // reaches 198 in Pots and Bones. Reading the low byte alone worked but put
    // a 255 ceiling under a field that doesn't have one.
    return roomData[at] | (roomData[at + 1] << 8);
};

// How many of a dungeon's locations are taken by its map, compass and big key.
// **The single definition** — processRoomData calls this rather than repeating
// the rule, because a second copy is exactly how HC's big key came to be
// counted in maxItems but not in the collected count.
//
// HC is the whole complication: no big key of its own normally, but key drop
// and every drop mode give it one. Chris's baseline chart lists a big key for
// HC in all three drop modes, so `anyDropModeFlag` counts here as well —
// without it HC's item count runs one high in a pot-drops-only seed, where the
// enemy key-drop flag is off.
window.dungeonItemSlots = function(key) {
    var d = dungeons[key];
    if (!d) return { map: 0, compass: 0, bigKey: 0 };
    var kd = window.KEYDROP_DATA[key] || {};
    var hasBigKeyDrop = kd.bigkeydrop &&
        (window.enemyKeyDropFlag() || window.anyDropModeFlag());
    return {
        map:     d.mapAddr ? 1 : 0,
        compass: (d.compassAddr && !d.noCompass) ? 1 : 0,
        bigKey:  (!d.noBigKeyItem || hasBigKeyDrop) ? 1 : 0
    };
};

// ── The drop-mode fallback table ─────────────────────────────────────────────
//
// Counted by hand (Chris, Aug 2026) and used ONLY when a drop mode is on and
// the seed's own tables can't be read. The seed always wins where it is
// available — this is the safety net for a ROM that doesn't publish them.
//
// `locations` is the SUM of his columns (drops + keys + big key + map +
// compass). After his corrections (Aug 2026) the chart is self-consistent in
// 38 of its 39 rows, and — the part worth trusting — **every one of its 39 key
// values equals what KEYDROP_DATA independently says**:
//
//   Enemy Drops     keys = base + enemy key drops      13/13
//   Pot Drops       keys = base + pot keys             13/13
//   Pots and Bones  keys = base + pots + drops         13/13
//
// Two hand-counts arrived at from different directions agreeing on all 39 is
// about as good as this gets without a seed. CT corroborates the drop counts
// too: 30 enemies + 25 pots = the 55 listed under Pots and Bones exactly.
//
// The one row still out:
//
//   PB  ToH  71+1+1+1+1 = 75, chart says 42 — below the Pot Drops total of 43,
//            and ToH's own halves (34 enemies + 39 pots) come to 73, so 42 is
//            a stray copy. **75 used.**
//
// **Anything here is a guess until a seed confirms it.** keyprobe.html shows
// the seed's numbers beside these; when one disagrees, the seed is right.
window.DROP_MODE_FALLBACK = {
    // locations, keys
    enemydrops: {
        hc:[74,4], ep:[54,1], dp:[57,1], toh:[38,1], ct:[34,4], pod:[66,6], sp:[65,1],
        sw:[63,4], tt:[75,1], ip:[85,4], mm:[52,4], tr:[39,6], gt:[106,5]
    },
    potdrops: {
        hc:[42,1], ep:[57,1], dp:[56,4], toh:[43,1], ct:[27,2], pod:[53,6], sp:[71,6],
        sw:[90,4], tt:[54,3], ip:[61,4], mm:[47,5], tr:[61,4], gt:[119,7]
    },
    potsbones: {
        hc:[108,4], ep:[105,2], dp:[107,4], toh:[75,1], ct:[59,4], pod:[105,6], sp:[126,6],
        sw:[145,5], tt:[121,3], ip:[138,6], mm:[91,6], tr:[88,6], gt:[198,8]
    }
};

// Which of the three tables applies, or null outside a drop mode. Both halves
// on — however they were ticked — is the Pots and Bones column.
window.dropModeFallback = function(key) {
    var pot = window.potDropsFlag(), enemy = window.enemyDropsFlag();
    if (!pot && !enemy) return null;
    var t = (pot && enemy) ? window.DROP_MODE_FALLBACK.potsbones
          : pot            ? window.DROP_MODE_FALLBACK.potdrops
                           : window.DROP_MODE_FALLBACK.enemydrops;
    var row = t[key];
    return row ? { locations: row[0], keys: row[1] } : null;
};

// Items = locations, less whatever the current mode leaves sitting in the
// dungeon. Reproduces the four hard-coded mode tables exactly when handed the
// tracker's own figures — `seedcounts.js` asserts that for every dungeon in
// every mode, which is what makes it safe to let the seed drive it.
// `mode` is ignored and kept only so old callers still fit: the four shuffle
// flags decide this now, and they reproduce every legacy mode exactly.
// Everything this dungeon holds that ISN'T shuffled into the pool is one of its
// own chests rather than a tracked item, so it comes off the item target.
window.itemsFromCounts = function(key, locations, smallKeys, mode) {
    var s = window.dungeonItemSlots(key);
    var f = window.dungeonShuffle();
    var n = locations;
    if (!f.map)      n -= s.map;
    if (!f.compass)  n -= s.compass;
    if (!f.bigkey)   n -= s.bigKey;
    if (!f.smallkey) n -= smallKeys;
    return n;
};

// Base counts straight from the dungeon literals, captured before any mode
// override touches them. applyDungeonItemMaxes() always recomputes from these,
// so calling it repeatedly can't compound.
var _BASE_MAX_ITEMS = {}, _BASE_MAX_CHESTS = {}, _BASE_MAX_SMALL_KEYS = {};
Object.keys(dungeons).forEach(function(k) {
    _BASE_MAX_ITEMS[k]      = dungeons[k].maxItems;
    _BASE_MAX_CHESTS[k]     = dungeons[k].maxChests;
    _BASE_MAX_SMALL_KEYS[k] = dungeons[k].maxSmallKeys;
});

// js/dngpanel.js owns the four shuffle flags and loads before this file. This
// is the safety net: if it ever isn't there, fall back to the legacy mode so
// the item tracker still counts something sensible.
if (!window.dungeonShuffle) {
    window.dungeonShuffle = function () {
        var m = window.dungeonItemsMode();
        return { map:      m === 'mapcompass' || m === 'mapcompasskeys' || m === 'keysanity',
                 compass:  m === 'mapcompass' || m === 'mapcompasskeys' || m === 'keysanity',
                 bigkey:   m === 'keysanity',
                 smallkey: m === 'mapcompasskeys' || m === 'keysanity' };
    };
}

// Apply dungeon item shuffle maxItems overrides based on mode
window.applyDungeonItemMaxes = function() {
    var mode = window.dungeonItemsMode();
    Object.keys(_BASE_MAX_ITEMS).forEach(function(k) {
        if (!dungeons[k]) return;
        dungeons[k].maxItems     = _BASE_MAX_ITEMS[k];
        dungeons[k].maxChests    = _BASE_MAX_CHESTS[k];
        dungeons[k].maxSmallKeys = _BASE_MAX_SMALL_KEYS[k];
    });

    // ── Key Drop Shuffle ──
    // Applied before the mode tables so those can be stated as deltas on top.
    //
    // Every key-drop location holds a small key, so in Standard and Map/Compass
    // the whole bump lands on maxSmallKeys and `items` is 0. The two modes that
    // shuffle keys into the general pool take `nonBigKey` / `locations`
    // instead, and there the same locations do count as item locations.
    var _kdExtra = {};
    Object.keys(dungeons).forEach(function(k) {
        var x = window.keyDropExtras(k);
        _kdExtra[k] = x;
        dungeons[k].maxChests    += x.locations;
        dungeons[k].maxSmallKeys += x.keys;
        dungeons[k].maxItems     += x.items;   // Standard; the mode tables below override
    });
    // Key Sanity counts every new location. MCK counts every new location
    // except a big key one, because it doesn't shuffle big keys — which only
    // affects HC, the one dungeon whose key drops include its big key.
    var kdLoc   = function(k) { return (_kdExtra[k] && _kdExtra[k].locations) || 0; };
    var kdMck   = function(k) { return (_kdExtra[k] && _kdExtra[k].nonBigKey) || 0; };
    var kdItems = function(k) { return (_kdExtra[k] && _kdExtra[k].items)     || 0; };

    // ── What the dungeon's item target is, from the four shuffle flags ──
    // ALL_LOC is every location in the dungeon, dungeon items included — the
    // old Key Sanity table, because Key Sanity shuffles all four. Take away
    // whatever this seed does NOT shuffle and you have the target for any
    // combination, the three legacy tables included:
    //   nothing shuffled  -> the standard base counts
    //   map + compass     -> the old MC table
    //   + small keys      -> the old MCK table
    //   all four          -> ALL_LOC itself
    // Key drop rides along: kdLoc() adds its locations to the total and the
    // dungeon's own maxSmallKeys / dungeonItemSlots already count its keys and
    // HC's big key drop, so each term stays in exactly one place.
    var ALL_LOC = window.BASE_LOC;
    var flags = window.dungeonShuffle();
    Object.keys(ALL_LOC).forEach(function(k) {
        var dd = dungeons[k];
        if (!dd) return;
        var slots = window.dungeonItemSlots(k);
        var n = ALL_LOC[k] + kdLoc(k);
        if (!flags.map)      n -= slots.map;
        if (!flags.compass)  n -= slots.compass;
        if (!flags.bigkey)   n -= slots.bigKey;
        if (!flags.smallkey) n -= (dd.maxSmallKeys || 0);
        dd.maxItems = Math.max(0, n);
    });

    // ── the seed's own key counts, where they agree with ours ──
    // Everything above is the fallback: a hand-kept table of what key drop does
    // to each dungeon. When a device is attached and the randomizer's tables
    // read back cleanly, the seed itself supplies the key count and the item
    // count falls out of it. Runs before the Universal Keys layer, which sums
    // the two columns and so has to see the final split.
    window._seedCountUsed = null;
    Object.keys(dungeons).forEach(function(k) {
        var seed = window.seedCountsFor(k);
        if (!seed) return;
        // Outside a drop mode this is a no-op — the seed only gets this far
        // when its location total already matches. In a drop mode it is the
        // whole point: the tracker has no table that knows about pot or enemy
        // locations, so the seed supplies the total as well as the split.
        dungeons[k].maxChests    = seed.locations;
        dungeons[k].maxSmallKeys = seed.keys;
        dungeons[k].maxItems     = window.itemsFromCounts(k, seed.locations, seed.keys, mode);
        if (!window._seedCountUsed) window._seedCountUsed = {};
        window._seedCountUsed[k] = seed;
    });

    // ── the drop-mode fallback ──
    // Only where the seed didn't answer. A drop mode has no table of its own,
    // so without this the counts would sit at their no-drop values and every
    // dungeon would look tiny.
    if (window.anyDropModeFlag()) {
        Object.keys(dungeons).forEach(function(k) {
            if (window._seedCountUsed && window._seedCountUsed[k]) return;   // the seed won
            var fb = window.dropModeFallback(k);
            if (!fb) return;
            dungeons[k].maxChests    = fb.locations;
            dungeons[k].maxSmallKeys = fb.keys;
            dungeons[k].maxItems     = window.itemsFromCounts(k, fb.locations, fb.keys, mode);
        });
    }

    // Retro world state: small keys become universal and are bought from shops,
    // so every small-key chest now holds a real item and counts toward the
    // dungeon total. Layered on top of whatever the shuffle mode above set.
    //
    // Only Standard and Map/Compass need this. Map/Compass/Keys and Key Sanity
    // already shuffle small keys into the pool, so their counts include those
    // chests — adding again would double-count them (e.g. DP would read 6,
    // wrongly counting the un-shuffled big key chest).
    //
    // On Standard this yields exactly: HC 7, EP 3, DP 3, ToH 3, POD 11, SP 7,
    // SW 5, TT 5, IP 5, MM 5, TR 9, GT 24.
    // Keeping the explicit standard/mapcompass test alongside the predicate:
    // keysAreUniversal() also allows 'other', which has its own display rules
    // and never had this bump.
    if (window.keysAreUniversal() && (mode === 'standard' || mode === 'mapcompass')) {
        Object.keys(dungeons).forEach(function(k) {
            var d = dungeons[k];
            if (!d) return;
            // maxChests is a hard ceiling — a dungeon can never hold more.
            d.maxItems = Math.min(d.maxItems + (d.maxSmallKeys || 0), d.maxChests);
        });
    }
};
window.applyDungeonItemMaxes();

// ── Retro small keys ──────────────────────────────────────────────────────────
// When small keys are bought from a shop they aren't tied to a dungeon, so a
// "collected of max" tally means nothing. The key row instead just states how
// many key doors the dungeon has — POD reads "6", not "0/6".
// The CT key box shows a plain "2" reference rather than a live tally in
// exactly those seeds.
window.ctKeyBoxIsStatic = function() { return window.keysAreUniversal(); };

// Show/hide and label the CT key box for the current mode.
// boxEl is passed while the tracker is still being built — the box isn't in the
// document yet at that point, so getElementById would miss it and the box would
// keep its default (visible) styling.
// The CT item box. Same build-always/show-hide rule as everything else: the
// element exists in every mode so a live settings change has something to
// update, and `display` decides whether it is on screen.
window.updateCtItemBox = function(boxEl) {
    var box = boxEl || document.querySelector('.stat-ctitem');
    if (!box) return;
    var el = box.querySelector('#toh-ctitem-count') || document.getElementById('toh-ctitem-count');
    if (!el) return;
    var max = window.ctMaxItems();
    box.style.display = max > 0 ? '' : 'none';
    box.style.cursor  = deviceAttached ? 'default' : 'pointer';
    var n = (window.trackerItems && window.trackerItems.ctItems) || 0;
    if (n > max) n = max;
    el.textContent = n + '/' + max;
    el.style.color = (max > 0 && n >= max) ? '#2ecc71' : '';
    if (window.updateCtGroup) window.updateCtGroup();
};

// The bordered wrapper around the two CT counters. It is only worth drawing
// while at least one of them is on screen.
window.updateCtGroup = function(groupEl) {
    // Takes the element when called during construction: the tracker is built
    // detached and only appended at the end, so a document.querySelector here
    // finds nothing and the border would be left showing around two hidden
    // counters until the next settings change.
    var g = groupEl || document.querySelector('.ct-group');
    if (!g) return;
    var shown = function(sel) {
        var e = g.querySelector(sel);
        return !!e && e.style.display !== 'none';
    };
    g.style.visibility = '';
    g.style.display = (shown('.stat-ctkey') || shown('.stat-ctitem')) ? '' : 'none';
    if (window.equalizeTopBoxes) window.equalizeTopBoxes();
};

// FLUTES shows in EVERY mode. It was hidden in the drop modes for one release,
// on the theory that the CT item count needed its slot; once the CT counters
// moved into their own compact group Chris looked at a Pots and Bones tracker
// and said there was "plenty of space for the Flute Stat" after all. The
// function stays as the one place to hide it again if a taller stats column
// ever starts overlapping GT — flutebox.js asserts that clearance.
window.updateFluteBox = function(boxEl) {
    var box = boxEl || document.querySelector('.stat-flute');
    if (!box) return;
    box.style.display = '';
};

window.updateCtKeyBox = function(boxEl) {
    var box = boxEl || document.querySelector('.stat-ctkey');
    if (!box) return;
    var el = box.querySelector('#toh-ctkey-count') || document.getElementById('toh-ctkey-count');
    if (!el) return;
    var mode = '';
    try {
        mode = window.dungeonItemsMode();
    } catch (e) { mode = 'standard'; }
    var static_ = window.ctKeyBoxIsStatic();
    // Shown in EVERY mode (Chris, Aug 2026: "we can probably just leave the CT
    // key counts for standard and MC. I assume we are still tracking these" —
    // we are, from the inventory read, in every mode). It started life gated on
    // Key Sanity / MCK, then gained Retro and the key-drop and drop modes one
    // at a time; each of those was really the same observation, that CT's keys
    // are tracked and worth showing. Keeping it up in all modes also stops the
    // stats block below shifting as the mode changes.
    box.style.display = '';
    box.style.cursor  = static_ ? 'default' : 'pointer';
    if (window.updateCtGroup) window.updateCtGroup();
    var ctMax = window.ctMaxSmallKeys();   // 2 normally, 4 under key drop
    if (static_) {
        el.textContent = String(ctMax);
        el.style.color = '';
    } else {
        var n = (window.trackerItems && window.trackerItems.ctSmallKeys) || 0;
        el.textContent = n + '/' + ctMax;
        el.style.color = n >= ctMax ? '#2ecc71' : '';
    }
};

// Repaint every dungeon slot — counts, key rows, tints.
window.repaintAllDungeons = function() {
    Object.keys(dungeons).forEach(function(k) {
        if (typeof updateDungeonCountDisplay === 'function') updateDungeonCountDisplay(k);
    });
    window.equalizeTopBoxes();
};

// HC, the three pendant dungeons and the CT group form the right-hand column,
// and the seven crystal dungeons fill the row below it. Both are measured
// rather than given fixed widths, because the widest box changes with the mode
// and with the seed's own totals.
//
// THE LAYOUT IS FLUID. The item grid spreads to the window width, so widening
// the crystal row moves the dungeon column, which changes the very number the
// crystal row was measured against. One pass overshot badly on a wide window —
// TR ran past the pendant column and straight through the stats. So the whole
// thing runs to a fixed point instead: three passes, each starting by clearing
// every width it set. Do not "optimise" this back to a single pass.
window.equalizeTopBoxes = function() {
    for (var pass = 0; pass < 3; pass++) _equalizePass();
};

// getBoundingClientRect() is in DEVICE pixels, but a width we assign is in
// logical ones, and itemtracker.html scales the whole tracker with
// `document.body.style.zoom`. Measuring a zoomed box and writing that number
// straight back multiplied every width by the zoom factor — once per pass, so
// a 1.5x tracker blew up 3.4x and the crystal row ran straight through the
// stats column. Everything below measures through this.
function _lp(el) {
    var z = (window._trackerScale || parseFloat(document.body.style.zoom) || 1);
    if (!z) z = 1;
    var r = el.getBoundingClientRect();
    return { left: r.left / z, right: r.right / z, width: r.width / z };
}

function _equalizePass() {
    // ── the right-hand column: HC / EP / DP / ToH / the CT group ──
    var els = [];
    ['hc','ep','dp','toh'].forEach(function(k) {
        var e = document.querySelector('.dungeon-slot[data-dungeon-key="' + k + '"]');
        if (e) els.push(e);
    });
    var g = document.querySelector('.ct-group');
    if (g && g.style.display !== 'none') els.push(g);
    if (!els.length) return;

    // Clear first, always. A measure-and-apply pass that keeps the old widths
    // can only ever grow: the previous maximum becomes the new floor.
    els.forEach(function(e) { e.style.width = ''; });
    var max = 0;
    els.forEach(function(e) {
        var w = _lp(e).width;
        if (w > max) max = w;
    });
    if (!max) return;
    // The CT group lines up with the dungeon boxes above it — same width, same
    // left and right edges (Chris, Aug 2026: "The CT checks should be line up
    // with the pendant dungeons above them").
    els.forEach(function(e) { e.style.width = max + 'px'; });

    // ── the plain stat rows are as wide as their own content, no wider ──
    // They are label + number and nothing else, so stretching them to the width
    // of a dungeon box only pushed each label away from its own number — and
    // .stat-box's space-between meant the gap grew with the column. They hang
    // off the right of the slot, which the CT group has already sized.
    var rows = ['.stat-death','.stat-bonk','.stat-revival','.stat-flute']
        .map(function(sel) { return document.querySelector(sel); })
        .filter(Boolean);
    var natural = 0;
    rows.forEach(function(e) {
        e.style.width = 'max-content';
        var w = _lp(e).width;
        if (w > natural) natural = w;
    });
    if (natural) {
        // Left-justified, not hung off the right: sized to content it looked
        // centred in the wider drop-mode column (Chris, Aug 2026: "I would
        // prefer that it stays left justified but with a little padding on the
        // left so it isn't touching the Crystal dungeon boxes"). The padding is
        // .stat-row-inset in items.css; the width is clamped to leave room for
        // it so a row can never run past the column.
        var inset = 2;   // matches the margin-left on those rows in items.css
        if (natural > max - inset) natural = max - inset;
        rows.forEach(function(e) {
            e.style.width = Math.ceil(natural) + 'px';
            e.style.alignSelf = 'flex-start';
        });
    }

    equalizeCrystalRow();
}

// The seven crystal dungeons sit in a gapless flex row that stopped well short
// of the pendant column. Chris: "the TR right side should be inline with the
// Pedant dungeon left side. and the other crystal dungeons expanded equally."
// GT follows TR in the same row and rides along under the pendant column.
function equalizeCrystalRow() {
    var keys = ['pod','sp','sw','tt','ip','mm','tr'];
    var els = keys.map(function(k) {
        return document.querySelector('.dungeon-slot[data-dungeon-key="' + k + '"]');
    });
    if (els.some(function(e) { return !e; })) return;
    var ref = document.querySelector('.dungeon-slot[data-dungeon-key="ep"]') ||
              document.querySelector('.dungeon-slot[data-dungeon-key="hc"]');
    if (!ref) return;
    els.forEach(function(e) { e.style.width = ''; });
    var natural = _lp(els[0]).width;
    var start = _lp(els[0]).left;
    var each = (_lp(ref).left - start) / els.length;
    if (!(each > natural)) return;   // nothing to fill
    els.forEach(function(e) { e.style.width = each.toFixed(3) + 'px'; });
}
window.equalizeCrystalRow = equalizeCrystalRow;

// The bottom bar's mode label. The old names still read best where they apply,
// but the four flags can be mixed freely now, so anything without a name is
// spelled out in initials instead of being forced into the nearest preset
// (Chris, Sep 2026): M map, C compass, B big key, K small keys.
window.dungeonModeLabel = function () {
    if (window.dungeonItemsMode() === 'other') return 'O';
    var f = window.dungeonShuffle();
    if (!f.map && !f.compass && !f.bigkey && !f.smallkey) return 'STD';
    if (f.map && f.compass && f.bigkey && f.smallkey)     return 'KS';
    // The community's shorthand: BK big key, SK small keys, and map+compass
    // together as plain MC. Parts joined with a slash (Chris, Sep 2026) —
    // "MC/SK", "C/BK", "BK".
    var parts = [];
    if (f.map && f.compass) parts.push('MC');
    else { if (f.map) parts.push('M'); if (f.compass) parts.push('C'); }
    if (f.bigkey)   parts.push('BK');
    if (f.smallkey) parts.push('SK');
    return parts.join('/');
};

// The four shuffle flags changed elsewhere (the map's settings menu). Held as
// an override because the window's own query string would otherwise keep
// winning for the rest of the session.
window.applyDungeonShuffleChange = function(str) {
    if (str === null || str === undefined) return;
    window._dungeonShuffleOverride = str;
    try { localStorage.setItem('alttp-dungeon-shuffle', str); } catch (e) {}
    var lbl = document.getElementById('item-mode-label');
    if (lbl) lbl.textContent = window.dungeonModeLabel();
    if (window.applyDungeonItemMaxes) window.applyDungeonItemMaxes();
    window.repaintAllDungeons();
    if (window.broadcastItemSnap) window.broadcastItemSnap();
};

// Dungeon Item Shuffle changed from the map's settings menu.
window.applyDungeonItemsChange = function(mode) {
    if (!mode) return;
    window._dungeonItemsOverride = mode;
    window._dungeonItemsMode = mode;
    try { localStorage.setItem('alttp-dungeon-items', mode); } catch (e) {}
    // Bottom-bar mode label.
    var lbl = document.getElementById('item-mode-label');
    if (lbl) {
        lbl.textContent = window.dungeonModeLabel();
    }
    if (window.applyDungeonItemMaxes) window.applyDungeonItemMaxes();
    window.repaintAllDungeons();
    window.updateCtKeyBox();
    window.updateCtItemBox();
    window.updateFluteBox();
    if (window.broadcastItemSnap) window.broadcastItemSnap();
};

// Random Prize Shuffle changed from the map's settings menu. Only dungeons
// still sitting on the OLD default are switched — anything the player (or the
// ROM read) has already named keeps its prize, so flipping this mid-run isn't
// a reset.
window.applyRandomPrizeChange = function(v) {
    try { localStorage.setItem('alttp-random-prize', v); } catch (e) {}
    window._prizeOverride = null;        // the seed flag beats a session pick
    var from = (v === 'yes') ? window.PRIZE_INDEX_CRYSTAL : window.PRIZE_INDEX_UNKNOWN;
    var to   = window.defaultPrizeIndex();
    if (from === to) return;
    var name = window.PRIZE_IMAGE_CYCLE[to].replace('0.png', '');
    Object.keys(dungeons).forEach(function(k) {
        if (dungeons[k].prizeState === from) window.setDungeonPrize(k, name);
    });
};

// A location was skipped (or un-skipped) on a dungeon hover card — here or on
// the map, which relays it. The card owns which lines are struck out; the
// count that lowers the dungeon's target lives here, so it is set from the
// number of skipped lines. Clicking the count directly still works: whichever
// happened last wins.
window.onDngSkipChanged = function (key, n) {
    var d = dungeons[key];
    if (!d) return;
    var collected = Math.min(d.itemCount || 0, d.maxItems || 0);
    d.skipped = Math.max(0, Math.min(n || 0, (d.maxItems || 0) - collected));
    if (typeof updateDungeonCountDisplay === 'function') updateDungeonCountDisplay(key);
    if (window.broadcastItemSnap) window.broadcastItemSnap();
};

// Boss Shuffle changed from the map's settings menu.
//   off -> the bosses are vanilla, so seed the real assignments and lock the
//          circles (a CSS class kills interaction)
//   on  -> the bosses are shuffled and unknown, so clear every circle back to
//          unassigned for the player to fill in as they find them
// Turning it on used to only remove the lock, which left the vanilla bosses
// sitting there looking authoritative until some other setting forced a
// repaint. Chris reported exactly that.
window.VANILLA_BOSSES = { ep:1, dp:2, toh:3, pod:4, sp:5, sw:6, tt:7, ip:8, mm:9, tr:10 };
window.applyBossShuffleChange = function(v) {
    var next = (v === 'no') ? 'no' : 'yes';
    var prev = window._bossShuffle || 'yes';
    window._bossShuffle = next;
    try { localStorage.setItem('alttp-bossshuffle', next); } catch (e) {}
    document.documentElement.classList.toggle('no-boss-shuffle', next === 'no');
    // Only act on a real transition. Both delivery paths fire for one change,
    // and re-clearing on the second would wipe assignments the player had just
    // started making.
    if (next !== prev && typeof setBoss === 'function') {
        Object.keys(window.VANILLA_BOSSES).forEach(function(k) {
            setBoss(k, next === 'no' ? window.VANILLA_BOSSES[k] : 0);
        });
    }
    if (window.broadcastItemSnap) window.broadcastItemSnap();
};

// Universal Keys changed from the map's settings menu. Same recompute as a
// world-state change: chest totals, key rows and the CT box all hang off it.
window.applyUniversalKeysChange = function(v) {
    window._universalKeysOverride = (v === 'yes') ? 'yes' : 'no';
    try { localStorage.setItem('alttp-universal-keys', window._universalKeysOverride); } catch (e) {}
    if (window.applyDungeonItemMaxes) window.applyDungeonItemMaxes();
    window.repaintAllDungeons();
    window.updateCtKeyBox();
    window.updateCtItemBox();
    window.updateFluteBox();
    if (window.broadcastItemSnap) window.broadcastItemSnap();
};

// Key Drop Shuffle changed from the map's settings menu. Same shape as
// universal keys, plus a reset of the per-dungeon key-drop tallies: those come
// from a separate SRAM read that isn't issued at all while the flag is off, so
// a stale count would otherwise survive a toggle.
window.applyKeyDropChange = function(v) {
    window._keyDropOverride = (v === 'yes') ? 'yes' : 'no';
    try { localStorage.setItem('alttp-keydrop', window._keyDropOverride); } catch (e) {}
    _applyDropModeChange();
};

// The combined Key Drop mode changed from the map's settings menu.
window.applyKeyDropAllChange = function(v) {
    window._keyDropAllOverride = (v === 'yes') ? 'yes' : 'no';
    try { localStorage.setItem('alttp-keydrop-all', window._keyDropAllOverride); } catch (e) {}
    _applyDropModeChange();
};

// Enemy Key Drop changed from the map's settings menu. Same shape.
window.applyEnemyKeyDropChange = function(v) {
    window._enemyKeyDropOverride = (v === 'yes') ? 'yes' : 'no';
    try { localStorage.setItem('alttp-enemy-keydrop', window._enemyKeyDropOverride); } catch (e) {}
    _applyDropModeChange();
};

// The three drop-mode flags. Same shape as the key-drop trio: reset the
// autotracking tallies, recompute, repaint. The tallies matter more here —
// chestsMax comes from the game's counter in a drop mode and from location bits
// outside one, so a stale high-water mark from the other path would stick.
window.applyPotDropsChange = function(v) {
    window._potDropsOverride = (v === 'yes') ? 'yes' : 'no';
    try { localStorage.setItem('alttp-pot-drops', window._potDropsOverride); } catch (e) {}
    _applyDropModeChange();
};
window.applyEnemyDropsChange = function(v) {
    window._enemyDropsOverride = (v === 'yes') ? 'yes' : 'no';
    try { localStorage.setItem('alttp-enemy-drops', window._enemyDropsOverride); } catch (e) {}
    _applyDropModeChange();
};
window.applyPotsBonesChange = function(v) {
    window._potsBonesOverride = (v === 'yes') ? 'yes' : 'no';
    try { localStorage.setItem('alttp-pots-bones', window._potsBonesOverride); } catch (e) {}
    _applyDropModeChange();
};
// The map's gear menu changes one dropdown and pushes SIX flags, each over both
// BroadcastChannel and a localStorage write — so this used to run twelve times
// per change, with a full repaint and a snapshot broadcast each time. Unnoticed
// on macOS, a visible hang on Windows, where cross-process storage events and
// BroadcastChannel are slower (Chris, Sep 2026). The flags themselves are set
// synchronously by the callers; only the recompute is coalesced, so a burst
// costs one pass.
var _dropRecalcTimer = null;
function _applyDropModeChange() {
    if (_dropRecalcTimer) return;
    _dropRecalcTimer = setTimeout(function () {
        _dropRecalcTimer = null;
        _resetKeyDropTallies();
        if (window.applyDungeonItemMaxes) window.applyDungeonItemMaxes();
        window.repaintAllDungeons();
        window.updateCtKeyBox();
        window.updateCtItemBox();
        window.updateFluteBox();
        if (window.broadcastItemSnap) window.broadcastItemSnap();
    }, 60);
}

// Reset the autotracking tallies so the next SRAM read recounts from scratch.
// chestsMax and itemCount are high-water marks that never fall on their own, so
// without this the key drops stay counted after a flag goes off.
//
// Only when a device is attached: with no autotracking, itemCount is the
// player's own manual tally and clearing it would throw their run away.
function _resetKeyDropTallies() {
    Object.keys(dungeons).forEach(function(k) {
        dungeons[k].keyDropCount = 0;
        if (typeof deviceAttached !== 'undefined' && deviceAttached) {
            dungeons[k].chestsMax = 0;
            dungeons[k].chestBits = 0;   // travels with chestsMax — see below
            dungeons[k].itemCount = 0;
        }
    });
    window._ctKeyDropCount = 0;
}

// Keys found in an earlier window of this same run.
(function () {
    var store = window.keysFoundLoad();
    if (!window.trackerItems) window.trackerItems = {};
    Object.keys(store).forEach(function (k) {
        if (!dungeons[k]) return;
        dungeons[k].smallKeyMax = store[k];
        window.trackerItems[k + 'SmallKeysMax'] = store[k];
        if (!window.trackerItems[k + 'SmallKeys']) window.trackerItems[k + 'SmallKeys'] = store[k];
    });
})();

window.addEventListener('storage', function(ev) {
    if (ev.key === 'alttp-dungeon-items')   window.applyDungeonItemsChange(ev.newValue);
    if (ev.key === 'alttp-dungeon-shuffle') window.applyDungeonShuffleChange(ev.newValue);
    if (ev.key === 'alttp-bossshuffle')     window.applyBossShuffleChange(ev.newValue);
    if (ev.key === 'alttp-universal-keys')  window.applyUniversalKeysChange(ev.newValue);
    if (ev.key === 'alttp-keydrop')         window.applyKeyDropChange(ev.newValue);
    if (ev.key === 'alttp-pot-drops')       window.applyPotDropsChange(ev.newValue);
    if (ev.key === 'alttp-enemy-drops')     window.applyEnemyDropsChange(ev.newValue);
    if (ev.key === 'alttp-pots-bones')      window.applyPotsBonesChange(ev.newValue);
    if (ev.key === 'alttp-enemy-keydrop')   window.applyEnemyKeyDropChange(ev.newValue);
    if (ev.key === 'alttp-keydrop-all')     window.applyKeyDropAllChange(ev.newValue);
    if (ev.key === 'alttp-random-prize')    window.applyRandomPrizeChange(ev.newValue);
});

// The world state changed while this window was open — from the map's settings
// menu. Recompute everything derived from it and repaint.
window.applyWorldStateChange = function(mode) {
    if (!mode) return;
    window._worldStateOverride = mode;
    try { localStorage.setItem('alttp-gamemode', mode); } catch (e) {}
    if (window.applyDungeonItemMaxes) window.applyDungeonItemMaxes();
    window.repaintAllDungeons();
    window.updateCtKeyBox();
    window.updateCtItemBox();
    window.updateFluteBox();
    if (window.broadcastItemSnap) window.broadcastItemSnap();
};

// The map writes alttp-gamemode from another window; same dual delivery as the
// swordless flag (see swordless-mode notes) because neither storage events nor
// BroadcastChannel are reliable on their own across Electron windows.
window.addEventListener('storage', function(ev) {
    if (ev.key !== 'alttp-gamemode') return;
    window.applyWorldStateChange(ev.newValue);
});

// The text for a dungeon's small-key readout, in whichever world state is live.
window.smallKeyLabel = function(d) {
    if (!d) return '';
    var max = d.maxSmallKeys || 0;
    return window.keysAreUniversal() ? String(max) : (d.smallKeyCount || 0) + '/' + max;
};

// Prize-count widgets on the new top line: prize icon + "current/max". Each
// spans two item slots so the four fill the row above the item grid.
const COUNT_WIDGETS = {
    crystalcount:      { img: 'crystal1.png',      id: 'crystal-count',      max: 5 },
    redcrystalcount:   { img: 'redcrystal1.png',   id: 'redcrystal-count',   max: 2 },
    pendantcount:      { img: 'pendant1.png',      id: 'pendant-count',      max: 2 },
    greenpendantcount: { img: 'greenpendant1.png', id: 'greenpendant-count', max: 1 }
};

const layout = [
    ['crystalcount', 'redcrystalcount', 'pendantcount', 'greenpendantcount', 'heartcount', 'checkcount', 'hc'],
    ['bow', 'boomerang', 'hookshot', 'bomb', 'mushroom', 'powder', 'moonpearl', 'sword', 'ep'],
    ['firerod', 'icerod', 'bombos', 'ether', 'quake', 'boots', 'gloves', 'shield', 'dp'],
    ['lamp', 'hammer', 'shovel', 'flute', 'net', 'book', 'flippers', 'tunic', 'toh'],
    ['bottles', 'somaria', 'byrna', 'cape', 'mirror', 'halfmagic', 'agahnim', 'gomode', 'stats'],
    ['pod', 'sp', 'sw', 'tt', 'ip', 'mm', 'tr', 'gt']
];

function createTracker() {
    // Clear cache on load
    localStorage.removeItem('alttp-tracker-state');
    
    const container = document.querySelector('.tracker-container');
    
    layout.forEach((row, rowIndex) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'tracker-row';
        // The row holding the (tall) stats box is top-aligned so its 48px
        // items hug the row above instead of floating in the middle.
        if (row.indexOf('stats') !== -1) rowDiv.classList.add('stats-row');
        // Row 0 is the new prize-count / HC line; rows 1-4 are the item rows
        // (uniform fixed height); the last row is the DW dungeon row (auto height).
        if (rowIndex === 0) rowDiv.classList.add('count-row');
        else if (rowIndex <= 4) rowDiv.classList.add('item-row');

        row.forEach(itemKey => {
            // Prize-count widget (crystal / red crystal / pendant / green pendant)
            if (COUNT_WIDGETS[itemKey]) {
                const w = COUNT_WIDGETS[itemKey];
                const slot = document.createElement('div');
                slot.className = 'item-slot prize-count-slot';
                const img = document.createElement('img');
                img.src = `${BASE_URL}/${w.img}`;
                img.className = 'prize-count-icon';
                img.alt = itemKey;
                const num = document.createElement('span');
                num.className = 'prize-count-num';
                num.id = w.id;
                num.textContent = '0/' + w.max;
                slot.appendChild(img);
                slot.appendChild(num);
                rowDiv.appendChild(slot);
                return;
            }
            // Empty spacer to keep the top row aligned with the grid below.
            if (itemKey === 'spacer') {
                const sp = document.createElement('div');
                sp.className = 'item-slot';
                rowDiv.appendChild(sp);
                return;
            }
            // Heart-piece widget: a pixel heart that fills one quadrant per piece
            // (bottom-left, top-left, top-right, bottom-right), matching the game's
            // heart-piece display. Built from static <rect> cells — setHeartFill only
            // recolours them, so it renders reliably in Electron (unlike clip-path /
            // nested-viewport reveals, whose geometry updates didn't repaint).
            if (itemKey === 'heartcount') {
                const slot = document.createElement('div');
                slot.className = 'item-slot heart-count-slot';
                const G = [
                    '...XX......XX...',
                    '..XXXX....XXXX..',
                    '.XXXXXX..XXXXXX.',
                    'XXXXXXXXXXXXXXXX',
                    'XXXXXXXXXXXXXXXX',
                    'XXXXXXXXXXXXXXXX',
                    'XXXXXXXXXXXXXXXX',
                    '.XXXXXXXXXXXXXX.',
                    '.XXXXXXXXXXXXXX.',
                    '..XXXXXXXXXXXX..',
                    '...XXXXXXXXXX...',
                    '....XXXXXXXX....',
                    '.....XXXXXX.....',
                    '......XXXX......',
                    '.......XX.......'
                ].map(row => row.split('').map(ch => ch === 'X' ? 1 : 0));
                const R = G.length, C = G[0].length;
                const isH = (r, c) => r >= 0 && r < R && c >= 0 && c < C && G[r][c] === 1;
                // Fill order matches the game: top-left, bottom-left, top-right,
                // bottom-right (setHeartFill lights quadrants in this index order).
                const quad = (r, c) => {
                    const top = r < 7, left = c < 8;
                    if (top && left)  return 0;   // top-left     (1st piece)
                    if (!top && left) return 1;   // bottom-left  (2nd)
                    if (top && !left) return 2;   // top-right    (3rd)
                    return 3;                     // bottom-right (4th)
                };
                let cells = '';
                for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
                    if (!G[r][c]) continue;
                    const border = !isH(r-1,c) || !isH(r+1,c) || !isH(r,c-1) || !isH(r,c+1);
                    // Border cells are a fixed dark outline; interior cells carry the
                    // quadrant fill (empty maroon → red) toggled by setHeartFill.
                    const cls = border ? 'hcell hborder' : ('hcell hq' + quad(r, c));
                    const fill = border ? '#7a1226' : '#43212b';
                    cells += '<rect class="' + cls + '" x="' + c + '" y="' + r
                           + '" width="1.02" height="1.02" fill="' + fill + '"/>';
                }
                slot.innerHTML = '<svg class="heart-svg" viewBox="-1 -1 18 17" aria-label="Heart pieces">' + cells + '</svg>';
                rowDiv.appendChild(slot);
                return;
            }
            // Prominent check-count box (mirrors the stats CHECKS value for now).
            if (itemKey === 'checkcount') {
                const box = document.createElement('div');
                box.className = 'check-count-box';
                box.innerHTML =
                    '<span class="check-count-label">CHECKS</span>'
                  + '<span class="check-count-value" id="hdr-check-count">0</span>';
                rowDiv.appendChild(box);
                return;
            }
            // Check if this is a dungeon
            if (dungeons[itemKey]) {
                const dungeonSlot = document.createElement('div');
                dungeonSlot.className = 'dungeon-slot';
                dungeonSlot.dataset.dungeonKey = itemKey;
                
                // Check if this is a pendant dungeon (EP, DP, ToH)
                // The tablet view (mobile.html) builds every dungeon in the tall
                // crystal-dungeon layout, so the bottom row lines up (Chris, Oct 2026).
                const isPendantDungeon = ['ep', 'dp', 'toh', 'hc'].includes(itemKey) && !window._mobileLayout;
                if (isPendantDungeon) {
                    dungeonSlot.classList.add('pendant-dungeon');
                }

                // Container for label and prize (left side for pendant dungeons)
                const dungeonContent = document.createElement('div');
                dungeonContent.className = 'dungeon-content';

                if (isPendantDungeon) {
                    // Pendant dungeons: label then prize stacked vertically
                    const label = document.createElement('div');
                    label.className = 'dungeon-label';
                    label.textContent = dungeons[itemKey].name;
                    dungeonContent.appendChild(label);

                    if (!dungeons[itemKey].bigkeyOnly && !dungeons[itemKey].noPrize) {
                        const prizeImg = document.createElement('img');
                        prizeImg.className = 'prize-img';
                        const _ksMode = window.dungeonItemsMode();
                        const _isShuffled = ['keysanity','mapcompass','mapcompasskeys','other'].includes(_ksMode);
                        prizeImg.src = `${BASE_URL}/${window.PRIZE_IMAGE_CYCLE[window.defaultPrizeIndex()]}`;
                        prizeImg.alt = 'Prize';
                        prizeImg.addEventListener('contextmenu', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            togglePrizeObtained(itemKey, dungeonSlot);
                        });
                        dungeonContent.appendChild(prizeImg);
                        dungeonSlot.addEventListener('click', () => cycleDungeonPrize(itemKey, dungeonSlot));
                    }
                    dungeonSlot.appendChild(dungeonContent);
                } else {
                    // DW dungeons: label left, prize right on top row
                    const topRow = document.createElement('div');
                    topRow.className = 'dungeon-top-row';
                    const label = document.createElement('div');
                    label.className = 'dungeon-label';
                    label.textContent = dungeons[itemKey].name;
                    topRow.appendChild(label);

                    if (!dungeons[itemKey].bigkeyOnly && !dungeons[itemKey].noPrize) {
                        const prizeImg = document.createElement('img');
                        prizeImg.className = 'prize-img';
                        const _ksMode = window.dungeonItemsMode();
                        const _isShuffled = ['keysanity','mapcompass','mapcompasskeys','other'].includes(_ksMode);
                        prizeImg.src = `${BASE_URL}/${window.PRIZE_IMAGE_CYCLE[window.defaultPrizeIndex()]}`;
                        prizeImg.alt = 'Prize';
                        prizeImg.addEventListener('contextmenu', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            togglePrizeObtained(itemKey, dungeonSlot);
                        });
                        topRow.appendChild(prizeImg);
                        dungeonSlot.addEventListener('click', () => cycleDungeonPrize(itemKey, dungeonSlot));
                    }
                    dungeonSlot.appendChild(topRow);
                    dungeonSlot.appendChild(dungeonContent); // empty but needed for consistent structure
                }
                
                // Container for dungeon items (bigkey, compass, map)
                const itemsContainer = document.createElement('div');
                itemsContainer.className = 'dungeon-items';
                
                const bigkeyImg = document.createElement('img');
                bigkeyImg.className = 'bigkey-img';
                bigkeyImg.src = `${BASE_URL}/bigkey0.png`;
                bigkeyImg.alt = 'Big Key';
                bigkeyImg.style.cursor = 'pointer';
                bigkeyImg.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const d = dungeons[itemKey];
                    d.bigkeyState = d.bigkeyState ? 0 : 1;
                    bigkeyImg.src = `${BASE_URL}/bigkey${d.bigkeyState}.png`;
                    if (!window.trackerItems) window.trackerItems = {};
                    window.trackerItems[itemKey + 'BigKey'] = d.bigkeyState;
                    if (window.broadcastItemSnap) window.broadcastItemSnap();
                });
                itemsContainer.appendChild(bigkeyImg);

                if (!dungeons[itemKey].noCompass) {
                const compassImg = document.createElement('img');
                compassImg.className = 'compass-img';
                compassImg.src = `${BASE_URL}/compass0.png`;
                compassImg.alt = 'Compass';
                compassImg.style.cursor = 'pointer';
                compassImg.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const d = dungeons[itemKey];
                    d.compassState = d.compassState ? 0 : 1;
                    compassImg.src = `${BASE_URL}/compass${d.compassState}.png`;
                    updateDungeonCountDisplay(itemKey);
                    if (window.broadcastItemSnap) window.broadcastItemSnap();
                });
                itemsContainer.appendChild(compassImg);
                }

                const mapImg = document.createElement('img');
                mapImg.className = 'map-img';
                mapImg.src = `${BASE_URL}/map0.png`;
                mapImg.alt = 'Map';
                mapImg.style.cursor = 'pointer';
                mapImg.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const d = dungeons[itemKey];
                    d.mapState = d.mapState ? 0 : 1;
                    mapImg.src = `${BASE_URL}/map${d.mapState}.png`;
                    updateDungeonCountDisplay(itemKey);
                    if (typeof broadcastPrizes === 'function') setTimeout(broadcastPrizes, 50);
                    if (window.broadcastItemSnap) window.broadcastItemSnap();
                });
                itemsContainer.appendChild(mapImg);
                
                dungeonSlot.appendChild(itemsContainer);
                
                // Add small key and item count displays
                const _diModeSlot = window.dungeonItemsMode();
                const _isOtherMode = _diModeSlot === 'other';
                const countsContainer = document.createElement('div');
                countsContainer.className = isPendantDungeon ? 'dungeon-counts-pendant' : 'dungeon-counts';
                
                // Small key count with icon.
                //
                // **Built whenever the mode allows one at all, then shown or
                // hidden.** It used to be built only when maxSmallKeys > 0 at
                // render time, which meant EP — the one dungeon with no small
                // keys in a normal seed — had no key row to update when key
                // drop was switched on later from the map. Its two pot/drop
                // keys were counted and simply never displayed. Third instance
                // of this rule; see cross-window-settings.md.
                if (!_isOtherMode) {
                    const keyContainer = document.createElement('div');
                    keyContainer.className = 'count-item key-count-item';
                    keyContainer.style.display = dungeons[itemKey].maxSmallKeys > 0 ? '' : 'none';
                    
                    const keyImg = document.createElement('img');
                    keyImg.className = 'count-icon';
                    keyImg.src = `${BASE_URL}/smallkey0.png`;
                    keyImg.alt = 'Small Key';
                    
                    const keyCount = document.createElement('span');
                    keyCount.className = 'key-count';
                    keyCount.textContent = window.smallKeyLabel(dungeons[itemKey]);
                    keyCount.dataset.dungeonKey = itemKey;
                    
                    keyContainer.appendChild(keyImg);
                    keyContainer.appendChild(keyCount);
                    keyContainer.style.cursor = 'pointer';
                    keyContainer.addEventListener('click', function(e) {
                        e.stopPropagation();
                        if (deviceAttached) return;
                        const d = dungeons[itemKey];
                        if (d.smallKeyCount < d.maxSmallKeys) {
                            d.smallKeyCount++;
                            if (d.smallKeyCount > (d.smallKeyMax || 0)) d.smallKeyMax = d.smallKeyCount;
                            if (!window.trackerItems) window.trackerItems = {};
                            window.trackerItems[itemKey + 'SmallKeys'] = d.smallKeyCount;
                            updateDungeonCountDisplay(itemKey);
                            if (window.broadcastItemSnap) window.broadcastItemSnap();
                        }
                    });
                    keyContainer.addEventListener('contextmenu', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (deviceAttached) return;
                        const d = dungeons[itemKey];
                        if (d.smallKeyCount > 0) {
                            d.smallKeyCount--;
                            if (!window.trackerItems) window.trackerItems = {};
                            window.trackerItems[itemKey + 'SmallKeys'] = d.smallKeyCount;
                            updateDungeonCountDisplay(itemKey);
                            if (window.broadcastItemSnap) window.broadcastItemSnap();
                        }
                    });
                    countsContainer.appendChild(keyContainer);
                }
                
                // Non-dungeon item count with icon (hidden in Other mode)
                if (_isOtherMode) {
                    // Other mode: clickable chest toggles completion
                    const otherContainer = document.createElement('div');
                    otherContainer.className = 'count-item';
                    const otherChest = document.createElement('img');
                    otherChest.className = 'count-icon other-chest';
                    otherChest.src = `${BASE_URL}/chest0.png`;
                    otherChest.alt = 'Items';
                    otherChest.style.cursor = 'pointer';
                    otherChest.style.width = '16px';
                    otherChest.style.height = '16px';
                    otherChest.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const d = dungeons[itemKey];
                        d.otherCleared = !d.otherCleared;
                        otherChest.src = `${BASE_URL}/${d.otherCleared ? 'chest00.png' : 'chest0.png'}`;
                        updateDungeonCountDisplay(itemKey);
                        if (typeof broadcastPrizes === 'function') setTimeout(broadcastPrizes, 50);
                    });
                    otherContainer.appendChild(otherChest);
                    countsContainer.appendChild(otherContainer);
                } else {
                const itemContainer = document.createElement('div');
                itemContainer.className = 'count-item';
                
                const chestImg = document.createElement('img');
                chestImg.className = 'count-icon';
                chestImg.src = `${BASE_URL}/chest0.png`;
                chestImg.alt = 'Items';
                
                const itemCount = document.createElement('span');
                itemCount.className = 'item-count';
                itemCount.textContent = `0/${dungeons[itemKey].maxItems}`;
                itemCount.dataset.dungeonKey = itemKey;
                
                itemContainer.appendChild(chestImg);
                itemContainer.appendChild(itemCount);
                itemContainer.style.cursor = 'pointer';
                itemContainer.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const d = dungeons[itemKey];
                    if (deviceAttached) {
                        // Autotracking: left-click skips a chest — lowers the target so
                        // the dungeon can complete without a chest the player can't or
                        // won't get. Each click skips one more; once the target drops to
                        // the number already collected the dungeon reads complete, and
                        // one more click cycles back to the full, un-skipped target.
                        const collected = Math.min(d.itemCount || 0, d.maxItems);
                        const maxSkip = d.maxItems - collected;   // never skip a collected chest
                        d.skipped = (d.skipped || 0) + 1;
                        if (d.skipped > maxSkip) d.skipped = 0;   // wrap back to full target
                        updateDungeonCountDisplay(itemKey);
                        if (window.broadcastItemSnap) window.broadcastItemSnap();
                        return;
                    }
                    if (d.itemCount < d.maxItems) {
                        d.itemCount++;
                        updateDungeonCountDisplay(itemKey);
                    }
                });
                itemContainer.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const d = dungeons[itemKey];
                    if (deviceAttached) {
                        // Autotracking: right-click un-skips one chest (raises the target
                        // back toward full), the inverse of a left-click.
                        d.skipped = Math.max(0, (d.skipped || 0) - 1);
                        updateDungeonCountDisplay(itemKey);
                        if (window.broadcastItemSnap) window.broadcastItemSnap();
                        return;
                    }
                    if (d.itemCount > 0) {
                        d.itemCount--;
                        updateDungeonCountDisplay(itemKey);
                    }
                });
                countsContainer.appendChild(itemContainer);
                } // end !_isOtherMode item count
                
                dungeonSlot.appendChild(countsContainer);

                // Boss circle — left of the row for pendant dungeons, underneath for the
                // rest. HC has no boss/prize, so skip it.
                if (!dungeons[itemKey].noPrize) createBossCircle(itemKey, dungeonSlot, isPendantDungeon);

                rowDiv.appendChild(dungeonSlot);
            } else if (itemKey === 'stats') {
                const statsSlot = document.createElement('div');
                statsSlot.className = 'stats-slot';
                // CHECKS and HEARTS were removed from the visible stats box, but their
                // SRAM counters still drive the header CHECKS box and the heart widget,
                // so keep those two IDs alive in a hidden holder.
                const hiddenStats = document.createElement('div');
                hiddenStats.style.display = 'none';
                hiddenStats.innerHTML = '<span id="toh-check-count">0</span><span id="toh-heartpiece-count">0/4</span>';
                const deathBox = document.createElement('div');
                deathBox.className = 'stat-box stat-death';
                deathBox.innerHTML = '<span class="stat-label">DEATHS</span><span class="stat-value" id="toh-death-count">0</span>';
                const bonkBox = document.createElement('div');
                bonkBox.className = 'stat-box stat-bonk';
                bonkBox.innerHTML = '<span class="stat-label">BONKS</span><span class="stat-value" id="toh-bonk-count">0</span>';
                const revivalBox = document.createElement('div');
                revivalBox.className = 'stat-box stat-revival';
                revivalBox.innerHTML = '<span class="stat-label">REVIVALS</span><span class="stat-value" id="toh-revival-count">0</span>';
                // The two CT counters live inside their own bordered group, so a
                // count that belongs to Castle Tower reads as separate from the
                // DEATHS/BONKS/FLUTES stats stacked with it (Chris, Aug 2026).
                // updateCtGroup() hides the border when neither counter shows.
                const ctGroup = document.createElement('div');
                ctGroup.className = 'ct-group';
                // CT has no dungeon slot of its own — it is this pair of stat
                // rows — so tag it with the same key the hover card reads, and
                // it gets a card like every other dungeon.
                ctGroup.dataset.dungeonKey = 'ct';
                // One CT label for the pair, on the left and styled like a
                // pendant dungeon's label — same font, same position, so the
                // group reads as one more box in that column (Chris, Aug 2026).
                // The per-row labels are hidden in CSS; the key/chest icons are
                // what tell the two rows apart.
                const ctGroupLabel = document.createElement('div');
                ctGroupLabel.className = 'dungeon-label ct-group-label';
                ctGroupLabel.textContent = 'CT';
                ctGroup.appendChild(ctGroupLabel);
                const ctGroupRows = document.createElement('div');
                ctGroupRows.className = 'ct-group-rows';
                ctGroup.appendChild(ctGroupRows);

                // CT small key counter. Always built; updateCtKeyBox() decides
                // whether it is shown at all (key-shuffling modes and Retro),
                // and whether it is a live tally or a plain, non-clickable "2"
                // (Retro buys keys from shops, so there is nothing to tally).
                // It re-runs when the world state changes under an open window.
                {
                    const ctKeyBox = document.createElement('div');
                    ctKeyBox.className = 'stat-box stat-ctkey';
                    ctKeyBox.innerHTML = `<span class="stat-label">CT</span><img src="${BASE_URL}/smallkey0.png" class="stat-icon" alt="Key"><span class="stat-value" id="toh-ctkey-count">0/2</span>`;
                    ctKeyBox.addEventListener('click', function(e) {
                        e.stopPropagation();
                        if (deviceAttached) return;
                        if (window.ctKeyBoxIsStatic()) return;   // informational in Retro
                        if (!window.trackerItems) window.trackerItems = {};
                        var cur = window.trackerItems.ctSmallKeys || 0;
                        var ctMax = window.ctMaxSmallKeys();   // 2, or 4 under key drop
                        if (cur < ctMax) {
                            window.trackerItems.ctSmallKeys = cur + 1;
                            var el = document.getElementById('toh-ctkey-count');
                            if (el) { el.textContent = window.trackerItems.ctSmallKeys + '/' + ctMax; el.style.color = window.trackerItems.ctSmallKeys >= ctMax ? '#2ecc71' : ''; }
                            if (window.broadcastItemSnap) window.broadcastItemSnap();
                        }
                    });
                    ctKeyBox.addEventListener('contextmenu', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (deviceAttached) return;
                        if (window.ctKeyBoxIsStatic()) return;   // informational in Retro
                        if (!window.trackerItems) window.trackerItems = {};
                        var cur = window.trackerItems.ctSmallKeys || 0;
                        if (cur > 0) {
                            window.trackerItems.ctSmallKeys = cur - 1;
                            var el = document.getElementById('toh-ctkey-count');
                            var ctMax = window.ctMaxSmallKeys();
                            if (el) { el.textContent = window.trackerItems.ctSmallKeys + '/' + ctMax; el.style.color = window.trackerItems.ctSmallKeys >= ctMax ? '#2ecc71' : ''; }
                            if (window.broadcastItemSnap) window.broadcastItemSnap();
                        }
                    });
                    ctGroupRows.appendChild(ctKeyBox);
                    if (window.updateCtKeyBox) window.updateCtKeyBox(ctKeyBox);
                }
                // CT item count, directly under the key count. It took the
                // FLUTES box's place (Chris, Aug 2026). Hidden unless the mode
                // actually gives CT items — normally its locations are all
                // keys, and a permanent 0/0 is just noise. Today that means a
                // drop mode, where the count comes from the seed.
                {
                    const ctItemBox = document.createElement('div');
                    ctItemBox.className = 'stat-box stat-ctitem';
                    ctItemBox.innerHTML = `<span class="stat-label">CT</span><img src="${BASE_URL}/chest0.png" class="stat-icon" alt="Items"><span class="stat-value" id="toh-ctitem-count">0/0</span>`;
                    const bump = function(delta) {
                        if (deviceAttached) return;
                        if (!window.trackerItems) window.trackerItems = {};
                        var cur = window.trackerItems.ctItems || 0;
                        var max = window.ctMaxItems();
                        var next = cur + delta;
                        if (next < 0 || next > max) return;
                        window.trackerItems.ctItems = next;
                        if (window.updateCtItemBox) window.updateCtItemBox();
                        if (window.broadcastItemSnap) window.broadcastItemSnap();
                    };
                    ctItemBox.addEventListener('click', function(e) { e.stopPropagation(); bump(1); });
                    ctItemBox.addEventListener('contextmenu', function(e) {
                        e.preventDefault(); e.stopPropagation(); bump(-1);
                    });
                    ctGroupRows.appendChild(ctItemBox);
                    if (window.updateCtItemBox) window.updateCtItemBox(ctItemBox);
                }
                statsSlot.appendChild(ctGroup);
                if (window.updateCtGroup) window.updateCtGroup(ctGroup);
                statsSlot.appendChild(hiddenStats);
                statsSlot.appendChild(deathBox);
                statsSlot.appendChild(bonkBox);
                statsSlot.appendChild(revivalBox);
                // FLUTES last, at the bottom of the column (Chris, Aug 2026).
                // It hides in the drop modes, which is exactly when the CT item
                // count appears, so the column never grows by both at once.
                {
                    const fluteBox = document.createElement('div');
                    fluteBox.className = 'stat-box stat-flute';
                    fluteBox.innerHTML = '<span class="stat-label">FLUTES</span><span class="stat-value" id="toh-flute-count">0</span>';
                    statsSlot.appendChild(fluteBox);
                    if (window.updateFluteBox) window.updateFluteBox(fluteBox);
                }
                rowDiv.appendChild(statsSlot);
            } else if (itemKey === 'bottles') {
                // 2x2 grid of bottle slots, same footprint as a single item slot (48x48)
                const bottleGrid = document.createElement('div');
                bottleGrid.className = 'bottle-grid';
                bottleGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;width:48px;height:48px;gap:1px;padding:1px;cursor:pointer;';

                ['bottle1','bottle2','bottle3','bottle4'].forEach(function(bKey) {
                    const cell = document.createElement('div');
                    cell.dataset.itemKey = bKey;
                    cell.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;';
                    const img = document.createElement('img');
                    img.src = items[bKey].states[0].img;
                    img.alt = items[bKey].states[0].name;
                    img.style.cssText = 'width:22px;height:22px;image-rendering:pixelated;';
                    cell.appendChild(img);
                    cell.addEventListener('click', function(e) {
                        e.stopPropagation();
                        cycleItem(bKey, cell);
                    });
                    cell.addEventListener('contextmenu', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        // Right-click cycles backward
                        const cur = items[bKey].currentState;
                        const total = items[bKey].states.length;
                        items[bKey].currentState = (cur - 1 + total) % total;
                        const img = cell.querySelector('img');
                        if (img) {
                            img.src = items[bKey].states[items[bKey].currentState].img;
                            img.alt = items[bKey].states[items[bKey].currentState].name;
                        }
                        if (window.broadcastItemSnap) window.broadcastItemSnap();
                    });
                    bottleGrid.appendChild(cell);
                });
                rowDiv.appendChild(bottleGrid);
            } else {
                const itemSlot = document.createElement('div');
                itemSlot.className = 'item-slot';
                itemSlot.dataset.itemKey = itemKey;
                itemSlot.dataset.itemName = items[itemKey].states[0].name;
                
                if (items[itemKey].isGoMode) {
                    itemSlot.classList.add('go-mode');
                    itemSlot.textContent = 'GO';
                    itemSlot.style.marginLeft = '5px';
                    const state0 = items[itemKey].states[0];
                    if (state0.color === '#666') {
                        itemSlot.style.color = state0.color;
                        itemSlot.style.background = 'transparent';
                    } else {
                        itemSlot.style.color = '#000';
                        itemSlot.style.background = state0.color;
                    }
                } else {
                    const img = document.createElement('img');
                    img.src = items[itemKey].states[0].img;
                    img.alt = items[itemKey].states[0].name;
                    // Seed-flag cosmetic (pseudo boots / mirror scroll): show the
                    // variant as the starting state when the flag is on.
                    const _ov0 = seedFlagOverlay(itemKey, items[itemKey].currentState);
                    if (_ov0) { img.src = _ov0.img; img.alt = _ov0.name; itemSlot.dataset.itemName = _ov0.name; }
                    itemSlot.appendChild(img);
                    
                    // Add medallion label container for bombos, ether, quake
                    if (['bombos', 'ether', 'quake'].includes(itemKey)) {
                        const label = document.createElement('div');
                        label.className = 'medallion-label';
                        itemSlot.appendChild(label);
                    }
                }
                
                itemSlot.addEventListener('click', () => cycleItem(itemKey, itemSlot));
                itemSlot.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    if (['bombos', 'ether', 'quake'].includes(itemKey)) {
                        cycleMedallionLabel(itemKey, itemSlot);
                    } else if (items[itemKey].isGoMode) {
                        toggleGoModeFeeling(itemKey, itemSlot);
                    }
                });
                
                rowDiv.appendChild(itemSlot);
            }
        });
        
        container.appendChild(rowDiv);
    });
}

function togglePrizeObtained(dungeonKey, slot) {
    const prizeImg = slot.querySelector('.prize-img');
    if (!prizeImg) return;
    const src = prizeImg.src;
    // Toggle between dim (0.png) and bright (1.png) versions of current prize
    if (src.includes('0.png')) {
        prizeImg.src = src.replace('0.png', '1.png');
    } else {
        prizeImg.src = src.replace('1.png', '0.png');
    }
    updateDungeonCountDisplay(dungeonKey);
    updateBossCircle(dungeonKey);   // grey/un-grey the boss image to match
    if (typeof window.onPrizeCycled === 'function') window.onPrizeCycled();
    if (window.broadcastItemSnap) window.broadcastItemSnap();
}

function cycleDungeonPrize(dungeonKey, slot) {
    const dungeon = dungeons[dungeonKey];
    const prizeImages = window.PRIZE_IMAGE_CYCLE;

    dungeon.prizeState = (dungeon.prizeState + 1) % prizeImages.length;
    
    const prizeImg = slot.querySelector('.prize-img');
    prizeImg.src = `${BASE_URL}/${prizeImages[dungeon.prizeState]}`;
    updateBossCircle(dungeonKey);   // cycling resets the prize to un-obtained — un-grey the boss

    // Hook for external listeners (e.g. map window sync)
    if (typeof window.onPrizeCycled === 'function') window.onPrizeCycled();
    if (window.broadcastItemSnap) window.broadcastItemSnap();
}

// ── Boss circle ──────────────────────────────────────────────────────────────
// Each dungeon slot carries a "boss circle": a circle showing one of boss0..10.
// boss0 is the default '?' (neutral). The user right-clicks to pick a boss.
// Certain bosses need specific items; the circle turns red until those items
// are collected, green once they are (or immediately, for bosses with no
// requirement).
var BOSS_REQUIREMENTS = {
    // Armos Knights: Bow OR Byrna OR Somaria OR Fire Rod OR Hammer OR Ice Rod OR Sword
    1:  function() { return hasBossItem('bow') || hasBossItem('byrna') || hasBossItem('somaria') || hasBossItem('firerod') || hasBossItem('hammer') || hasBossItem('icerod') || hasBossItem('sword'); },
    // Lanmolas: Bow OR Byrna OR Somaria OR Fire Rod OR Hammer OR Ice Rod OR Sword
    2:  function() { return hasBossItem('bow') || hasBossItem('byrna') || hasBossItem('somaria') || hasBossItem('firerod') || hasBossItem('hammer') || hasBossItem('icerod') || hasBossItem('sword'); },
    // Moldorm: Hammer OR Sword
    3:  function() { return hasBossItem('hammer') || hasBossItem('sword'); },
    // Helmasaur King: Hammer OR (Bombs AND (Sword OR Bow))
    4:  function() { return hasBossItem('hammer') || (hasBossItem('bomb') && (hasBossItem('sword') || hasBossItem('bow'))); },
    // Arrghus: Hookshot + (Bow OR Fire Rod OR Hammer OR Ice Rod OR Sword)
    5:  function() { return hasBossItem('hookshot') && (hasBossItem('bow') || hasBossItem('firerod') || hasBossItem('hammer') || hasBossItem('icerod') || hasBossItem('sword')); },
    // Mothula: Fire Rod OR Hammer OR Byrna OR Somaria OR Sword
    6:  function() { return hasBossItem('firerod') || hasBossItem('hammer') || hasBossItem('byrna') || hasBossItem('somaria') || hasBossItem('sword'); },
    // Blind: Byrna OR Somaria OR Hammer OR Sword
    7:  function() { return hasBossItem('byrna') || hasBossItem('somaria') || hasBossItem('hammer') || hasBossItem('sword'); },
    // Kholdstare: (Fire Rod OR Bombos) + (Hammer OR Sword)
    8:  function() { return (hasBossItem('firerod') || hasBossItem('bombos')) && (hasBossItem('hammer') || hasBossItem('sword')); },
    // Vitreous: Bow OR Hammer OR Sword
    9:  function() { return hasBossItem('bow') || hasBossItem('hammer') || hasBossItem('sword'); },
    // Trinexx: (Fire Rod AND Ice Rod) + (Hammer OR Sword)
    10: function() { return hasBossItem('firerod') && hasBossItem('icerod') && (hasBossItem('hammer') || hasBossItem('sword')); }
};

function hasBossItem(key) {
    return !!(items[key] && items[key].currentState > 0);
}

// Build the boss circle for one dungeon slot. Pendant dungeons (EP/DP/ToH) get
// it on the left of the row; all other dungeons get it underneath.
function createBossCircle(dungeonKey, dungeonSlot, isPendant) {
    // GT's boss is always Agahnim 2 / Ganon — no boss selector needed there.
    if (dungeonKey === 'gt') return;
    if (dungeons[dungeonKey].bossState === undefined) dungeons[dungeonKey].bossState = 0;

    const circle = document.createElement('div');
    circle.className = 'boss-circle';

    const img = document.createElement('img');
    img.className = 'boss-img';
    img.src = `${BOSS_URL}/boss0.png`;
    img.alt = 'Boss';
    circle.appendChild(img);

    // Both left-click and right-click open the boss-selection popup. The
    // stopPropagation keeps the click from bubbling up to the dungeon's prize
    // cycle handler.
    circle.addEventListener('click', function(e) {
        e.stopPropagation();
        openBossPopup(dungeonKey, e.clientX, e.clientY);
    });
    circle.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openBossPopup(dungeonKey, e.clientX, e.clientY);
    });

    if (isPendant) {
        // Pendant dungeons are a horizontal row — drop the circle into the
        // counts column so it sits underneath the chest count.
        const counts = dungeonSlot.querySelector('.dungeon-counts-pendant');
        (counts || dungeonSlot).appendChild(circle);
    } else {
        // Other dungeons are a vertical column — append lands it underneath.
        dungeonSlot.appendChild(circle);
    }
    updateBossCircle(dungeonKey);
}

// Refresh one dungeon's boss circle image + red/green/neutral state.
function updateBossCircle(dungeonKey) {
    const d = dungeons[dungeonKey];
    if (!d) return;
    const slot = document.querySelector(`[data-dungeon-key="${dungeonKey}"]`);
    if (!slot) return;
    const circle = slot.querySelector('.boss-circle');
    if (!circle) return;
    const img = circle.querySelector('.boss-img');
    const bossNum = d.bossState || 0;
    if (img) img.src = `${BOSS_URL}/boss${bossNum}.png`;

    // Prize obtained = boss defeated (the prize image switches to its bright
    // "1.png" variant, set either manually or by the auto-tracker).
    const prizeImg = slot.querySelector('.prize-img');
    const prizeObtained = !!(prizeImg && prizeImg.src.includes('1.png'));

    circle.classList.remove('boss-need', 'boss-ok');
    // Once defeated the red/green requirement ring is moot — leave the border
    // at its default neutral grey by skipping the boss-ok / boss-need class.
    if (bossNum > 0 && !prizeObtained) {
        const req = BOSS_REQUIREMENTS[bossNum];
        const met = req ? req() : true;   // bosses with no requirement are always "ok"
        circle.classList.add(met ? 'boss-ok' : 'boss-need');
    }

    // Grey out the boss image once the prize has been obtained.
    circle.classList.toggle('boss-defeated', prizeObtained);
}

// Re-evaluate every dungeon's boss circle — called whenever item state changes.
function refreshAllBossCircles() {
    Object.keys(dungeons).forEach(updateBossCircle);
}

function setBoss(dungeonKey, bossNum) {
    if (!dungeonKey || !dungeons[dungeonKey]) return;
    dungeons[dungeonKey].bossState = bossNum;
    updateBossCircle(dungeonKey);
    // Dedicated 'boss' message — short, fast, authoritative. The map applies
    // it directly to DUNGEONS[key] so the stripe state survives any subsequent
    // 'items' / 'prizes' snap (which replaces trackerItems wholesale).
    try {
        if (window._itemsBc) {
            var _req = (typeof BOSS_REQUIREMENTS !== 'undefined') ? BOSS_REQUIREMENTS[bossNum] : null;
            var _ok  = (!bossNum || !_req) ? true : !!_req();
            window._itemsBc.postMessage({ type: 'boss', data: { key: dungeonKey, state: bossNum, ok: _ok } });
        }
    } catch(e) {}
    // Also push a full snap so anything else that hangs off item state refreshes.
    if (window.broadcastItemSnap) window.broadcastItemSnap();
}

// ── Boss selection popup ─────────────────────────────────────────────────────
let _bossPopup = null;
let _bossPopupActiveKey = null;

function ensureBossPopup() {
    if (_bossPopup) return _bossPopup;
    const popup = document.createElement('div');
    popup.id = 'boss-popup';
    const grid = document.createElement('div');
    grid.className = 'boss-popup-grid';
    for (let i = 1; i <= 10; i++) {
        (function(n) {
            const cell = document.createElement('div');
            cell.className = 'boss-popup-item';
            cell.title = 'Boss ' + n;
            const cellImg = document.createElement('img');
            cellImg.src = `${BOSS_URL}/boss${n}.png`;
            cell.appendChild(cellImg);
            cell.addEventListener('click', function() {
                setBoss(_bossPopupActiveKey, n);
                closeBossPopup();
            });
            grid.appendChild(cell);
        })(i);
    }
    const clearBtn = document.createElement('button');
    clearBtn.className = 'boss-popup-clear';
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear ( ? )';
    clearBtn.addEventListener('click', function() {
        setBoss(_bossPopupActiveKey, 0);
        closeBossPopup();
    });
    grid.appendChild(clearBtn);
    popup.appendChild(grid);
    // Append to <html>, not <body>: the item tracker applies CSS `zoom` to the
    // body when scaled, which shifts position:fixed children out of true
    // viewport coordinates. Living on documentElement keeps the popup aligned
    // with the cursor's clientX/clientY.
    document.documentElement.appendChild(popup);

    // Dismiss on outside-click or Escape
    document.addEventListener('mousedown', function(e) {
        if (!popup.classList.contains('open')) return;
        if (popup.contains(e.target)) return;
        closeBossPopup();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeBossPopup();
    });

    _bossPopup = popup;
    return popup;
}

function openBossPopup(dungeonKey, x, y) {
    const popup = ensureBossPopup();
    _bossPopupActiveKey = dungeonKey;
    popup.classList.add('open');
    // Measure now that it's displayed, then position relative to the cursor.
    const pw = popup.offsetWidth, ph = popup.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    // Horizontal: open to the right of the cursor; flip left if it would overflow.
    let px = x;
    if (px + pw + 8 > vw) px = x - pw;
    px = Math.max(8, Math.min(px, vw - pw - 8));
    // Vertical: open below the cursor; flip above if it would overflow the
    // bottom of the window (common for the bottom-row crystal dungeons).
    let py = y;
    if (py + ph + 8 > vh) py = y - ph;
    py = Math.max(8, Math.min(py, vh - ph - 8));
    popup.style.left = px + 'px';
    popup.style.top  = py + 'px';
}

function closeBossPopup() {
    if (_bossPopup) _bossPopup.classList.remove('open');
    _bossPopupActiveKey = null;
}

// Header check box mirrors the stats CHECKS value.
function setHeaderChecks(n) {
    const el = document.getElementById('hdr-check-count');
    if (el) el.textContent = n;
}
// Header heart fills bottom-up, 25% per heart piece (0..4). The clipped fill
// rect lives in a 24-tall viewBox, so y/height slide it up as pieces are found.
function setHeartFill(pieces) {
    let p = parseInt(pieces, 10);
    if (isNaN(p) || p < 0) p = 0;
    if (p > 4) p = 4;
    const slot = document.querySelector('.heart-count-slot');
    if (!slot) return;
    // Quadrants fill in index order (0=BL, 1=TL, 2=TR, 3=BR); recolour each
    // quadrant's interior cells red when collected, dark maroon when not. Border
    // cells (.hborder) keep their fixed outline colour.
    for (let q = 0; q < 4; q++) {
        const on = q < p;
        slot.querySelectorAll('.hq' + q).forEach(function(el) {
            el.setAttribute('fill', on ? '#ec2f4b' : '#43212b');
        });
    }
}

function updateDungeonCountDisplay(dungeonKey) {
    const dungeon = dungeons[dungeonKey];
    const slot = document.querySelector(`[data-dungeon-key="${dungeonKey}"]`);
    
    if (slot) {
        // Calculate status first — needed by key count color and completion logic.
        // "skipped" chests (right-clicked while autotracking) lower the target so
        // a dungeon can complete without a chest the player chooses to skip.
        const effMax = Math.max(0, dungeon.maxItems - (dungeon.skipped || 0));
        const shownCount = Math.min(dungeon.itemCount, effMax);
        const allItemsCollected = shownCount >= effMax;
        const allKeysCollected  = dungeon.maxSmallKeys > 0
            ? dungeon.smallKeyCount >= dungeon.maxSmallKeys
            : false;

        // Update small key count. The row exists in every mode that has one at
        // all; whether this dungeon currently has keys decides if it is shown.
        const keyItem = slot.querySelector('.key-count-item');
        if (keyItem) keyItem.style.display = dungeon.maxSmallKeys > 0 ? '' : 'none';

        if (dungeon.maxSmallKeys > 0) {
            const keyCountSpan = slot.querySelector('.key-count');
            if (keyCountSpan) {
                keyCountSpan.textContent = window.smallKeyLabel(dungeon);
                // All small keys found turns the row green — in EVERY mode, not
                // just the key-shuffling ones. Under universal keys the row is a
                // static "how many doors" label with nothing to collect, so
                // there is no "all found" state to colour.
                keyCountSpan.style.color =
                    (allKeysCollected && !window.keysAreUniversal()) ? '#2ecc71' : '';
            }
        }
        
        // Update item count and chest icon
        const itemCountSpan = slot.querySelector('.item-count');
        if (itemCountSpan) {
            itemCountSpan.textContent = `${shownCount}/${effMax}`;
            // Switch chest icon to chest00.png when all items collected
            const chestIcon = slot.querySelector('.count-icon[alt="Items"]');
            if (chestIcon) {
                chestIcon.src = `${BASE_URL}/${shownCount >= effMax ? 'chest00.png' : 'chest0.png'}`;
            }
            if (window.broadcastItemSnap) window.broadcastItemSnap();
        }

        // Check completion status (1.png = obtained/bright)
        const prizeImg = slot.querySelector('.prize-img');
        const prizeCollected = prizeImg && prizeImg.src.includes('1.png');

        const ksMode2 = window.dungeonItemsMode() === 'keysanity';
        const _isOther = window.dungeonItemsMode() === 'other';

        // Remove all completion classes first
        slot.classList.remove('completed-items', 'completed-full', 'prize-obtained');

        if (_isOther) {
            // Other mode: green border when chest clicked AND prize collected
            if (dungeon.otherCleared && prizeCollected) {
                slot.classList.add('completed-full');
            } else if (dungeon.otherCleared) {
                slot.classList.add('completed-items');
            } else if (prizeCollected) {
                // Boss defeated but no chest clicked yet — green outline only.
                slot.classList.add('prize-obtained');
            }
        } else if (dungeon.noPrize || dungeon.bigkeyOnly) {
            // Prize-less dungeons — HC (`noPrize`, no boss at all) and GT
            // (`bigkeyOnly`, whose boss is Agahnim 2 and gives no crystal).
            // Neither has a prize image, so `prizeCollected` can never become
            // true for them and the normal rule below would leave them stuck on
            // the all-chests colour forever. All chests IS complete here, in
            // every mode.
            //
            // GT is not gated on Agahnim 2 because **Aga2 isn't tracked**: the
            // map derives `agahnim2` FROM GT's cleared state, so gating on it
            // would be circular. Nothing leaks the other way either —
            // broadcastPrizes skips `bigkeyOnly` dungeons, so GT completing
            // here does not tell the map that Aga2 is dead.
            //
            // Deliberately NOT gated on the big key or the small key. One of
            // HC's chests is behind the big key, so having them all already
            // implies the big key; and Retro's small keys are bought rather
            // than found, so that one is never collected at all. Gating on
            // either left HC permanently short of the complete colour. Chris's
            // call — don't reintroduce the key checks.
            if (allItemsCollected) {
                slot.classList.add('completed-full');
            }
        } else if (allItemsCollected && prizeCollected) {
            // Green — all items + prize collected (both modes)
            slot.classList.add('completed-full');
        } else if (allItemsCollected && !ksMode2) {
            // Standard: blue when all items collected
            slot.classList.add('completed-items');
        } else if (prizeCollected) {
            // Boss defeated but items remain — green outline only (no fill).
            slot.classList.add('prize-obtained');
        }
        // Notify map of completion state change
        if (typeof broadcastPrizes === 'function') setTimeout(broadcastPrizes, 50);

        // The box widths are measured, then pinned. A count that grows past
        // what was measured ("0/12" at load, "12/12" later with key drop) ran
        // out of the box — Mac's Arial most of all (Chris, Oct 2026). Re-measure
        // whenever the content no longer fits.
        if (slot.scrollWidth > slot.clientWidth + 1 && window.equalizeTopBoxes) {
            window.equalizeTopBoxes();
        }
    }
}

function cycleItem(itemKey, slot) {
    const item = items[itemKey];
    item.currentState = (item.currentState + 1) % item.states.length;

    const newState = item.states[item.currentState];
    
    if (item.isGoMode) {
        if (newState.color === '#666') {
            slot.style.color = newState.color;
            slot.style.background = 'transparent';
        } else {
            slot.style.color = '#000';
            slot.style.background = newState.color;
        }
        slot.dataset.itemName = newState.name;
    } else {
        const img = slot.querySelector('img');
        img.src = newState.img;
        img.alt = newState.name;
        slot.dataset.itemName = newState.name;
        // Seed-flag cosmetic (pseudo boots / mirror scroll): starting-state image
        // until the real item is obtained. Display only — logic value unchanged.
        const _ov = seedFlagOverlay(itemKey, item.currentState);
        if (_ov) { img.src = _ov.img; img.alt = _ov.name; slot.dataset.itemName = _ov.name; }
    }

    // Broadcast updated item states to map
    broadcastItemSnap();

    // Item state changed — re-evaluate boss circle requirement colors
    refreshAllBossCircles();
    // …and the item-background fills (settings customization)
    if (window.refreshItemFills) window.refreshItemFills();
}

// Right-click on Go Mode: toggle directly between "Go Mode" (1) and
// "Go Mode Feeling" (2) without cycling through "Off". If currently Off,
// right-click jumps straight to "Go Mode Feeling".
function toggleGoModeFeeling(itemKey, slot) {
    const item = items[itemKey];
    item.currentState = (item.currentState === 2) ? 1 : 2;

    const newState = item.states[item.currentState];
    if (newState.color === '#666') {
        slot.style.color = newState.color;
        slot.style.background = 'transparent';
    } else {
        slot.style.color = '#000';
        slot.style.background = newState.color;
    }
    slot.dataset.itemName = newState.name;

    broadcastItemSnap();
    refreshAllBossCircles();
    if (window.refreshItemFills) window.refreshItemFills();
}

// 37 call sites, and updateDungeonCountDisplay is one of them — so a single
// repaintAllDungeons() published TWELVE snapshots, each one walking the DOM for
// every dungeon's prize image and posting over BroadcastChannel and IPC. Cheap
// enough to hide on macOS; on Windows a settings change visibly hung the map
// (Chris, Sep 2026). Coalesced here rather than at the callers: one edit covers
// all 37, and nothing reads the result synchronously — it is a postMessage.
var _snapTimer = null;
function broadcastItemSnap() {
    if (_snapTimer) return;
    _snapTimer = setTimeout(function () { _snapTimer = null; _broadcastItemSnapNow(); }, 30);
}
function _broadcastItemSnapNow() {
    if (!window._itemsBc) return;
    var snap = {};
    var copyKeys = ['bow','boomerang','hookshot','bomb','mushroom','powder','firerod','icerod',
                    'bombos','ether','quake','lamp','hammer','shovel','flute','net','book',
                    'bottle1','bottle2','bottle3','bottle4',
                    'somaria','byrna','cape','mirror','boots','gloves','flippers',
                    'moonpearl','sword','shield','tunic','agahnim','halfmagic'];
    copyKeys.forEach(function(k) {
        if (items[k]) snap[k] = items[k].currentState;
    });
    // Cosmetic seed-flag overlays only. `boots`/`mirror` keep their real 0/1
    // values (logic unchanged); these flags just tell views to swap the image.
    snap.pseudoboots  = pseudoBootsOn()  ? 1 : 0;
    snap.mirrorscroll = mirrorScrollOn() ? 1 : 0;
    // Derive bottle count for map logic (trackerItems.bottle)
    snap.bottle = ['bottle1','bottle2','bottle3','bottle4'].filter(k => items[k] && items[k].currentState > 0).length;
    // Compute crystal/pendant counts from DOM prize images (same as processInventoryData).
    // Reading from trackerItems here would always return 0 on the item-tracker side,
    // causing the map's greenPendant/redCrystal to be zeroed on every snap and making
    // Sahasrahla / Pyramid Fairy checks flash red after the prize is collected.
    (function() {
        var cc=0, rc=0, pc=0, gpc=0;
        Object.keys(typeof dungeons !== 'undefined' ? dungeons : {}).forEach(function(k) {
            var slot = document.querySelector('[data-dungeon-key="' + k + '"] .prize-img');
            if (!slot || !slot.src.includes('1.png')) return;
            var src = slot.src;
            if      (src.includes('greenpendant')) { pc++; gpc++; }
            else if (src.includes('pendant'))      { pc++; }
            else if (src.includes('redcrystal'))   { cc++; rc++; }
            else if (src.includes('crystal'))      { cc++; }
        });
        snap.crystals     = cc;
        snap.pendants     = pc;
        snap.greenPendant = gpc;
        snap.redCrystal   = rc;
        // When autotracking, the SRAM crystal/pendant counts (0x37A / 0x374) are
        // authoritative — the map's Pyramid Fairy (red crystals) and Sahasrahla
        // (green pendant) checks use these instead of the prize-image tally.
        // Manual mode (no device) keeps the prize-image counts above.
        if (deviceAttached && window._sramPrizesValid) {
            snap.crystals     = window.trackerItems.crystals;
            snap.pendants     = window.trackerItems.pendants;
            snap.greenPendant = window.trackerItems.greenPendant;
            snap.redCrystal   = window.trackerItems.redCrystal;
        }
    })();
    snap.mmMedallion  = (window.trackerItems && window.trackerItems.mmMedallion)  || 0;
    snap.trMedallion  = (window.trackerItems && window.trackerItems.trMedallion)  || 0;
    // Every dungeon, ep included: vanilla EP has no key doors, but Key Drop
    // shuffle gives it two and the hand-written list here had left it out,
    // so the map's card and its key-tier rules always read 0.
    ['hc','ct','ep','dp','toh','pod','sp','sw','tt','ip','mm','tr','gt'].forEach(function(_k) {
        snap[_k+'SmallKeys'] = (window.trackerItems && window.trackerItems[_k+'SmallKeys']) || 0;
        snap[_k+'SmallKeysMax'] = (window.trackerItems && window.trackerItems[_k+'SmallKeysMax']) || 0;
        // Pots + enemy drops together, for the map's drop rollup. Published
        // from THIS loop, not the dungeon loop below — that one skips hc and
        // ct, so HC's enemy row arrived on only one of the two snapshots and
        // flashed between the derived figure and the old mask fallback on
        // alternate polls (Chris, Sep 2026). Both builders use this same list.
        var _nc = window.dungeonNonChest ? window.dungeonNonChest(_k) : null;
        snap[_k+'NonChestDone']  = _nc ? _nc.done  : null;
        snap[_k+'NonChestTotal'] = _nc ? _nc.total : null;
    });
    snap.epBigKey     = (window.trackerItems && window.trackerItems.epBigKey)     || 0;
    snap.dpBigKey     = (window.trackerItems && window.trackerItems.dpBigKey)     || 0;
    snap.tohBigKey     = (window.trackerItems && window.trackerItems.tohBigKey)     || 0;
    snap.podBigKey     = (window.trackerItems && window.trackerItems.podBigKey)     || 0;
    snap.ttBigKey     = (window.trackerItems && window.trackerItems.ttBigKey)     || 0;
    snap.ipBigKey     = (window.trackerItems && window.trackerItems.ipBigKey)     || 0;
    snap.mmBigKey     = (window.trackerItems && window.trackerItems.mmBigKey)     || 0;
    snap.trBigKey     = (window.trackerItems && window.trackerItems.trBigKey)     || 0;
    snap.spBigKey     = (window.trackerItems && window.trackerItems.spBigKey)     || 0;
    snap.swBigKey     = (window.trackerItems && window.trackerItems.swBigKey)     || 0;
    // HC and CT are not in the dungeon loop below (no slot, no chest counts),
    // but their big keys still gate locations on the map's cards.
    ['hc','ct'].forEach(function (_k) {
        snap[_k+'BigKey'] = ((window.dungeons && window.dungeons[_k]) || {}).bigkeyState || 0;
    });
    snap.romName = window.ROM_NAME || '';
    snap.romIsDoor = !!window.ROM_IS_DOOR;
    snap.gomode = items['gomode'] ? items['gomode'].currentState : 0;
    // Include dungeon prize and chest data
    var dngKeys = ['ep','dp','toh','pod','sp','sw','tt','ip','mm','tr','gt'];
    dngKeys.forEach(function(k) {
        var d = window.dungeons && window.dungeons[k];
        if (!d) return;
        // Reflect the "skip a chest" adjustment (item tracker left-click while
        // autotracking): send the effective target and capped count so the
        // broadcast view shows the same reduced count and completion state.
        var _effMax = Math.max(0, (d.maxItems || 0) - (d.skipped || 0));
        snap[k+'Chests']        = Math.min(d.itemCount || 0, _effMax);
        snap[k+'MaxChests']     = _effMax;
        snap[k+'Skipped']       = d.skipped || 0;
        snap[k+'BigKey']        = d.bigkeyState     || 0;
        snap[k+'Map']           = d.mapState        || 0;
        snap[k+'Compass']       = d.compassState    || 0;
        snap[k+'MaxSmallKeys']  = d.maxSmallKeys    || 0;
        snap[k+'BigKeyOnly']    = !!d.bigkeyOnly;
        // Boss state for the map's stripe overlay: send the selected boss
        // number (0 = unknown) and whether its item requirement is currently
        // met (always true for bosses with no requirement / unknown bosses).
        var _bossNum = d.bossState || 0;
        var _bossOk  = true;
        if (_bossNum > 0 && typeof BOSS_REQUIREMENTS !== 'undefined') {
            var _req = BOSS_REQUIREMENTS[_bossNum];
            _bossOk = _req ? !!_req() : true;
        }
        snap[k+'BossState'] = _bossNum;
        snap[k+'BossOk']    = _bossOk;
        // Get prize from DOM
        var prizeImg = document.querySelector('[data-dungeon-key="'+k+'"] .prize-img');
        if (prizeImg) {
            var src = prizeImg.src || '';
            var obtained = src.includes('1.png');
            var prizeName = 'crystal';
            if      (src.includes('greenpendant')) prizeName = 'greenpendant';
            else if (src.includes('pendant'))      prizeName = 'pendant';
            else if (src.includes('redcrystal'))   prizeName = 'redcrystal';
            else if (src.includes('unknown'))      prizeName = 'unknown';
            snap[k+'Prize']         = prizeName;
            snap[k+'PrizeObtained'] = obtained;
        }
    });
    snap._itemsBuild = window.ITEMS_BUILD;     // shown in the map's gear menu
    snap.checks = parseInt((document.getElementById('toh-check-count')||{}).textContent||'0');
    snap.deaths = parseInt((document.getElementById('toh-death-count')||{}).textContent||'0');
    snap.bonks  = parseInt((document.getElementById('toh-bonk-count') ||{}).textContent||'0');
    snap.raceMode = !!window._raceMode;
    snap.currentDungeon = window._currentDungeon || null;
    snap.currentFloor   = window._currentDungeon ? (window._currentFloor || null) : null;
    snap.currentWorld   = window._currentWorld || null;
    snap.gtBk           = window.gtBkState ? window.gtBkState() : null;
    snap.dungeonCard    = window.dungeonCardState();
    snap.progress       = window._progress || null;
    window._itemsBc.postMessage({ type: 'items', data: snap });
    // Feed the read-only items REST API (Electron main process) if available.
    try {
        if (window.electronAPI && window.electronAPI.sendApiItems) {
            window.electronAPI.sendApiItems(snap);
        }
    } catch (e) {}
}
window.broadcastItemSnap = broadcastItemSnap;

function cycleMedallionLabel(itemKey, slot) {
    const item = items[itemKey];
    // Default cycle — will be overridden by itemtracker.html with context-aware filtering
    const labels = ['', 'MM', 'TR', 'BOTH'];
    const currentIndex = labels.indexOf(item.medallionLabel);
    item.medallionLabel = labels[(currentIndex + 1) % labels.length];

    const labelDiv = slot.querySelector('.medallion-label');
    if (labelDiv) labelDiv.textContent = item.medallionLabel;
}

const SAVEDATA_START = 0xF5F000;

// ── Key Drop Shuffle autotracking ────────────────────────────────────────────
// Pot keys and enemy-drop keys are NOT flagged in the room data we already
// read. The randomizer puts them in two blocks of its own in WRAM bank $7F:
//
//   pot keys     $7F6018  (0x250 bytes)   = SAVEDATA_START + 0x7018
//   enemy drops  $7F6268  (0x250 bytes)   = SAVEDATA_START + 0x7268
//
// They are contiguous, so one 0x4A0 read covers both — which also keeps
// processSRAMData's length-based routing unambiguous. Two separate 0x250 reads
// would be indistinguishable from each other in the response handler.
//
// These blocks only mean anything in a ROM built with key drop shuffle on, so
// the read is only issued when the flag is set.
const KEYDROP_START = SAVEDATA_START + 0x7018;   // 0xF66018
const KEYDROP_LEN   = 0x4a0;
const KEYDROP_SPRITE_OFFSET = 0x250;             // where the enemy-drop half starts

// The randomizer's own per-dungeon totals. Two contiguous tables, so one read
// covers both: max locations (0x20, 16-bit little-endian) then max small keys
// (0x10, one byte each). 0x30 is a length nothing else uses, which matters
// because processSRAMData routes responses purely by size.
const SEEDCOUNT_START = 0xf65410;
const SEEDCOUNT_LEN   = 0x30;
const SEEDCOUNT_KEYS_OFFSET = 0x20;

function connectWebSocket() {
    // Close any existing socket cleanly before opening a new one
    if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        try { ws.close(); } catch(e) {}
        ws = null;
    }

    try {
        ws = new WebSocket(`ws://${wsHost}:${wsPort}`);
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
            console.log('WebSocket connected - requesting device list');
            updateConnectionStatus('Connecting');
            _stopReconnect();
            // Fresh socket, fresh budget of fast device polls.
            _deviceRetryCount = 0;
            // …and a fresh look at the ROM: it may be a different seed now.
            forgetRomPrizes();
            window.ROM_NAME = null; _romNameTries = 0;
            ws.send(JSON.stringify({ Opcode: 'DeviceList', Space: 'SNES' }));
        };

        ws.onmessage = handleWebSocketMessage;

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateConnectionStatus('Error');
            _scheduleReconnect();
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            window._currentWorld = null; if (window.setCurrentDungeon) window.setCurrentDungeon(null);
            updateConnectionStatus('Disconnected');
            deviceAttached = false;
            _gamemodeValid = false;
            if (readTimer) { clearInterval(readTimer); readTimer = null; }
            // Don't leave a game-mode re-read pending against a dead socket.
            clearTimeout(_gamemodeRetryTimer); _gamemodeRetryTimer = null;
            clearTimeout(_deviceRetryTimer);
            _scheduleReconnect();
        };
    } catch (e) {
        console.error('Failed to create WebSocket connection:', e);
        updateConnectionStatus('Error');
        _scheduleReconnect();
    }
}

function _stopReconnect() {
    if (reconnectInterval) { clearTimeout(reconnectInterval); reconnectInterval = null; }
}

function _scheduleReconnect() {
    _stopReconnect(); // always reset — ensures a clean single timer
    reconnectInterval = setTimeout(() => {
        reconnectInterval = null;
        console.log('Attempting to reconnect...');
        connectWebSocket();
    }, 5000);
}

function handleWebSocketMessage(event) {
    try {
        // Handle binary data (SRAM reads)
        if (event.data instanceof ArrayBuffer) {
            const data = new Uint8Array(event.data);
            // If we haven't confirmed gamemode yet, this is a gamemode check response
            if (!_gamemodeValid) {
                const gm = data[0];
                _currentGamemode = gm;
                if (GAMEPLAY_MODES.indexOf(gm) !== -1 || KNOWN_ALTTP_MODES.indexOf(gm) !== -1) {
                    // Valid ALTTP mode (gameplay or menu/startup) — start SRAM reading
                    _gamemodeValid = true;
                    updateConnectionStatus('Connected');
                    startSRAMReading();
                } else {
                    // Unknown value — the emulator isn't running the game yet
                    // (still booting, or paused because its window lost focus;
                    // snes9x stops the frame loop then, which stalls the Lua
                    // bridge / NWA that SNI reads through).
                    //
                    // Re-read the mode byte. This used to re-send DeviceList,
                    // but that response is ignored once deviceAttached is true,
                    // so checkGamemode() never ran again and the tracker hung.
                    updateConnectionStatus('No device found');
                    clearTimeout(_gamemodeRetryTimer);
                    _gamemodeRetryTimer = setTimeout(() => {
                        _gamemodeRetryTimer = null;
                        checkGamemode();
                    }, GAMEMODE_RETRY_MS);
                }
                return;
            }
            // Steady-state SRAM reads.  Discriminate by length: a 1-byte
            // response is the game-mode read we issue each cycle for the
            // timer window's benefit; everything else goes to processSRAMData.
            if (data.length === 1) {
                _currentGamemode = data[0];
                broadcastGamemode(data[0]);
                return;
            }
            processSRAMData(data);
            return;
        }
        
        // Handle JSON responses
        const response = JSON.parse(event.data);
        
        if (response.Results) {
            if (!deviceAttached) {
                // DeviceList response
                if (response.Results.length > 0) {
                    deviceName = response.Results[0];
                    console.log('Found device:', deviceName);
                    
                    // Attach to device
                    ws.send(JSON.stringify({
                        Opcode: 'Attach',
                        Space: 'SNES',
                        Operands: [deviceName]
                    }));
                    
                    deviceAttached = true;
                    _gamemodeValid = false;
                    _deviceRetryCount = 0;
                    updateConnectionStatus('Connected');

                    // Check gamemode first — wait for game to be running before reading SRAM
                    checkGamemode();
                } else {
                    updateConnectionStatus('No device found');
                    // Retry DeviceList automatically. Poll quickly at first —
                    // the common case is the emulator simply not being up yet,
                    // and a flat 3s meant the player waited up to 3s past the
                    // moment it became available — then back off.
                    _deviceRetryCount++;
                    var _wait = (_deviceRetryCount <= DEVICE_RETRY_FAST_TRIES)
                        ? DEVICE_RETRY_FAST_MS : DEVICE_RETRY_SLOW_MS;
                    clearTimeout(_deviceRetryTimer);
                    _deviceRetryTimer = setTimeout(() => {
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ Opcode: 'DeviceList', Space: 'SNES' }));
                        }
                    }, _wait);
                }
            }
        }
    } catch (e) {
        console.error('Failed to handle WebSocket message:', e);
    }
}

function checkGamemode() {
    if (!ws || ws.readyState !== WebSocket.OPEN || !deviceAttached) return;
    ws.send(JSON.stringify({
        Opcode: 'GetAddress',
        Space: 'SNES',
        Operands: ['F50010', '01']
    }));
}

// One full read cycle: game mode, inventory, rooms.
function _sramReadOnce() {
    if (!(ws && ws.readyState === WebSocket.OPEN && deviceAttached)) return;
    // Game mode (1 byte). Read first so we can broadcast to the timer
    // window each cycle (lets the timer skip its own SNES poll when
    // the item tracker is feeding fresh data over BroadcastChannel).
    ws.send(JSON.stringify({
        Opcode: 'GetAddress',
        Space: 'SNES',
        Operands: ['F50010', '01']
    }));

    // Which dungeon Link is in: $7E040C, 2 bytes so the reply's length
    // (dispatched on in processSRAMData) can't be mistaken for the game mode.
    ws.send(JSON.stringify({
        Opcode: 'GetAddress',
        Space: 'SNES',
        Operands: ['F5040C', '02']
    }));
    // …and which floor of it: $7E00A4 (0 = 1F, 1 = 2F, 0xFF = B1, 0xFE = B2).
    // 3 bytes, again only so the reply's length is one nothing else uses.
    ws.send(JSON.stringify({
        Opcode: 'GetAddress',
        Space: 'SNES',
        Operands: ['F500A4', '03']
    }));
    // …and which world: the overworld area, $7E008A — 0x40 and up is the Dark
    // World ($7E007B flipped meaning between seeds, so it's not used).
    // 4 bytes, once more for a reply length nothing else uses.
    ws.send(JSON.stringify({
        Opcode: 'GetAddress',
        Space: 'SNES',
        Operands: ['F5008A', '04']
    }));

    // Read inventory data (0x1ae bytes from F5F340)
    ws.send(JSON.stringify({
        Opcode: 'GetAddress',
        Space: 'SNES',
        Operands: [(SAVEDATA_START + 0x340).toString(16), '1ae']
    }));

    // Read full room/event data as single 0x500 read to guarantee ordering
    ws.send(JSON.stringify({
        Opcode: 'GetAddress',
        Space: 'SNES',
        Operands: [(SAVEDATA_START).toString(16), '500']
    }));

    // Key drop shuffle: pot keys + enemy drops, one read covering both blocks.
    // Skipped entirely when the flag is off — the region is meaningless in a
    // ROM without key drop, and there's no reason to pay for the read.
    // Pottery shuffle flags its pots in the same block, so it needs the read too.
    // Enemy Drop: Underworld too — cave enemies clear from this block, and
    // without it they never did (Chris, Sep 2026).
    if (window.anyKeyDropFlag() || window.potteryFlag() || window.anyDropModeFlag()) {
        ws.send(JSON.stringify({
            Opcode: 'GetAddress',
            Space: 'SNES',
            Operands: [KEYDROP_START.toString(16), KEYDROP_LEN.toString(16)]
        }));
    }

    // Which prize each dungeon holds. Two ROM tables the randomizer writes:
    // $1209b is the prize NUMBER per dungeon, $180050 the TYPE (0x40 = crystal,
    // anything else = pendant). Same source the reference tracker uses. Read
    // once per connection and only a few times — a ROM that doesn't answer
    // (hardware without ROM reads, some forks) just leaves prizes manual.
    // Re-read every ~10 s even once known: a new seed loaded without
    // reconnecting must not keep the last seed's prize table.
    if ((!window.ROM_NAME && _romNameTries < 5) || (window.ROM_NAME && (++_romNameTick % 10) === 0)) {
        _romNameTries++;
        ws.send(JSON.stringify({ Opcode: 'GetAddress', Space: 'SNES',
            Operands: [ROM_NAME_ADDR.toString(16), ROM_NAME_LEN.toString(16)] }));
    }

    if (!window._dungeonPrizeByKey && _romPrizeTries < 5) {
        _romPrizeTries++;
        _romPrizeNums = _romPrizeTypes = null;
        ws.send(JSON.stringify({ Opcode: 'GetAddress', Space: 'SNES',
            Operands: [ROM_PRIZE_NUM_ADDR.toString(16), ROM_PRIZE_LEN.toString(16)] }));
        ws.send(JSON.stringify({ Opcode: 'GetAddress', Space: 'SNES',
            Operands: [ROM_PRIZE_TYPE_ADDR.toString(16), ROM_PRIZE_LEN.toString(16)] }));
    }

    // The seed's own per-dungeon totals. Read in every mode, not just key drop:
    // it costs 48 bytes and it is the only thing that knows how a given seed
    // split its locations between keys and items. processSeedCounts ignores it
    // unless it reads back cleanly, so a ROM that doesn't write this region
    // simply leaves the tracker on its table.
    ws.send(JSON.stringify({
        Opcode: 'GetAddress',
        Space: 'SNES',
        Operands: [SEEDCOUNT_START.toString(16), SEEDCOUNT_LEN.toString(16)]
    }));
}

// ── Dungeon prizes from the ROM ──────────────────────────────────────────────
// $1209b: 13 bytes, the prize number each dungeon was given.
// $180050: 13 bytes, its type — 0x40 crystal, otherwise pendant.
// Crystal numbers 5 and 6 are the red ones (masks 0x04 / 0x01); pendant 0x04 is
// the green one. Index per dungeon is the randomizer's own order.
// ── Which randomizer built this ROM ──────────────────────────────────────────
// $7FC0, 21 bytes, the cartridge title. codemann8's Door randomizer writes
//   ER<ver>_<team>_<player>_<seed>      e.g. "ER156_1_1_052409646"
// (Rom.py: `rom.name = bytearray(f'ER{...}_{team+1}_{player}_{world.seed:09}')`).
//
// Worth one 21-byte read because an `ER` prefix settles a question nothing else
// can: that randomizer's Inverted is our Inverted 2.0. $18004A says "inverted"
// but not WHICH inverted, and a hand-loaded ROM carries no seed link to ask
// (Chris, Sep 2026).
const ROM_NAME_ADDR = 0x7fc0;
const ROM_NAME_LEN  = 0x15;
var _romNameTries = 0, _romNameTick = 0;

function processRomName(data) {
    var name = '';
    for (var i = 0; i < data.length; i++) {
        var c = data[i];
        if (c === 0) break;
        name += (c >= 32 && c < 127) ? String.fromCharCode(c) : '';
    }
    if (!name) return;
    // Another seed under the same connection: its prizes are different.
    if (window.ROM_NAME && window.ROM_NAME !== name) forgetRomPrizes();
    if (window.ROM_NAME === name) return;
    window.ROM_NAME    = name;
    window.ROM_IS_DOOR = /^ER\d/.test(name);
    if (window.broadcastItemSnap) window.broadcastItemSnap();
    if (!window.ROM_IS_DOOR) return;

    // Door seed + the player picked Inverted 1.0 → they meant 2.0. Only ever
    // promotes; a player who chose 2.0 already, or any other world state, is
    // left alone.
    var mode = window._worldStateOverride ||
               (function () { try { return localStorage.getItem('alttp-gamemode'); } catch (e) { return null; } })();
    if (mode !== 'inverted') return;
    window.applyWorldStateChange('inverted2');
    try { if (window._itemsBc) window._itemsBc.postMessage({ type: 'worldstate', data: 'inverted2' }); } catch (e) {}
    window.ROM_PROMOTED_INVERTED = true;
    console.log('[rom] ' + name + ' is a Door randomizer seed — Inverted promoted to 2.0');
}

const ROM_PRIZE_NUM_ADDR  = 0x1209b;
const ROM_PRIZE_TYPE_ADDR = 0x180050;
const ROM_PRIZE_LEN       = 0xd;
const ROM_PRIZE_INDEX = { ep:0x2, dp:0x3, toh:0xa, pod:0x6, sp:0x5,
                          sw:0x8, tt:0xb, ip:0x9, mm:0x7, tr:0xc };
var _romPrizeNums = null, _romPrizeTypes = null, _romPrizeTries = 0;

// The two tables come back the same size, and a late answer from an earlier
// try could pair one try's numbers with another's types, so the order isn't
// something to rely on. Tell them apart by content instead:
// the type table only ever holds 0x40 (crystal) or 0x00 (pendant), while the
// number table always carries the pendants' 0x01/0x02/0x04 (Chris, Oct 2026:
// a crystal turned red on collection).
function isPrizeTypeTable(data) {
    return Object.keys(ROM_PRIZE_INDEX).every(function (k) {
        var v = data[ROM_PRIZE_INDEX[k]];
        return v === 0x40 || v === 0x00;
    });
}
function takePrizeTable(data) {
    if (isPrizeTypeTable(data)) _romPrizeTypes = data; else _romPrizeNums = data;
    if (_romPrizeNums && _romPrizeTypes) {
        processPrizeTables(_romPrizeNums, _romPrizeTypes);
        _romPrizeNums = _romPrizeTypes = null;
    }
}
// A new seed (or a fresh connection): drop the table and let the boss-defeat
// auto-mark run again once it is re-read.
function forgetRomPrizes() {
    window._dungeonPrizeByKey = null;
    _romPrizeNums = _romPrizeTypes = null; _romPrizeTries = 0;
    Object.keys(dungeons).forEach(function (k) { dungeons[k]._prizeAuto = false; });
}

function processPrizeTables(nums, types) {
    var map = {}, sane = false;
    Object.keys(ROM_PRIZE_INDEX).forEach(function(key) {
        var i = ROM_PRIZE_INDEX[key], num = nums[i], type = types[i];
        if (!num) return;                       // nothing written here
        map[key] = (type === 0x40)
            ? ((num === 0x04 || num === 0x01) ? 'redcrystal' : 'crystal')
            : ((num === 0x04) ? 'greenpendant' : 'pendant');
        sane = true;
    });
    // All ten prizes are always assigned in a real seed; a partial read means
    // the ROM isn't answering the way we expect, so don't act on it.
    if (!sane || Object.keys(map).length < 10) return;
    window._dungeonPrizeByKey = map;
}

function startSRAMReading() {
    if (readTimer) {
        clearInterval(readTimer);
    }
    // Read once straight away — setInterval waits a full period before its
    // first tick, which put an extra second on every connect.
    _sramReadOnce();
    // ...then every second.
    readTimer = setInterval(_sramReadOnce, 1000);
}

// Push the latest game mode byte to any subscribers (timer window) so they
// can skip their own polling while we're feeding fresh data.
function broadcastGamemode(gm) {
    try {
        if (window._itemsBc) window._itemsBc.postMessage({ type: 'gamemode', data: gm });
    } catch (e) {}
}

let previousRoomData = null;
let roomChunk1 = null;        // first 0x280 chunk
let roomChunk1Time = 0;       // timestamp when chunk1 was stored

// ── Current dungeon ─────────────────────────────────────────────────────────
// $7E040C holds the dungeon Link is in — an even ID, 0xFF on the overworld and
// in ordinary caves. Published as `currentDungeon` (a tracker key, or null) in
// both item snapshots, which feeds the REST API, the overlay WebSocket, the
// broadcast view's dot and the one here (Chris, Oct 2026).
const DUNGEON_ID_KEY = {
    0x00: 'hc', 0x02: 'hc', 0x04: 'ep', 0x06: 'dp', 0x08: 'ct', 0x0A: 'sp',
    0x0C: 'pod', 0x0E: 'mm', 0x10: 'sw', 0x12: 'ip', 0x14: 'toh', 0x16: 'tt',
    0x18: 'tr', 0x1A: 'gt'
};
window._currentDungeon = null;
function setCurrentDungeon(key) {
    var changed = key !== window._currentDungeon;
    window._currentDungeon = key;
    // Re-applied on every read, not just on a change: the dungeon slots are
    // rebuilt when the layout or dungeon-item mode changes, and a rebuilt
    // slot would otherwise lose its dot until Link next moved.
    document.querySelectorAll('[data-dungeon-key]').forEach(function (el) {
        el.classList.toggle('dng-here', el.getAttribute('data-dungeon-key') === key);
    });
    if (changed && window.broadcastItemSnap) window.broadcastItemSnap();
}
function processDungeonId(id) {
    // Menus, text boxes and transitions keep the last answer; the title and
    // file-select screens mean nobody is anywhere.
    if (GAMEPLAY_MODES.indexOf(_currentGamemode) === -1) {
        if (_currentGamemode < 0x06) { window._currentWorld = null; setCurrentDungeon(null); }
        return;
    }
    setCurrentDungeon(DUNGEON_ID_KEY[id] || null);
}
window.setCurrentDungeon = setCurrentDungeon;

// The floor, as the game numbers it: 1F, 2F … above ground, B1, B2 … below.
// Only meaningful while currentDungeon is set; published as currentFloor.
window._currentFloor = null;
// The announce card for the dungeon Link is in (overlays/announce.html): chests,
// small keys, map / compass / big key and the boss. Null outside dungeons.
// Published as snap.dungeonCard → tracker:dungeon-card (Chris, Oct 2026).
var CARD_BOSS_NAMES = [null, 'Armos Knights', 'Lanmolas', 'Moldorm', 'Helmasaur King',
    'Arrghus', 'Mothula', 'Blind', 'Kholdstare', 'Vitreous', 'Trinexx'];
function cardPrize(k) {
    var img = document.querySelector('[data-dungeon-key="' + k + '"] .prize-img');
    if (!img) return { prize: null, got: false };
    var f = (img.getAttribute('src') || '').split('/').pop();
    var m = /^(greenpendant|redcrystal|pendant|crystal|unknown)/.exec(f);
    return { prize: m ? m[1] : 'unknown', got: /1\.png$/.test(f) };
}
window.dungeonCardState = function () {
    var k = window._currentDungeon;
    if (!k) return null;
    var d = (window.dungeons && window.dungeons[k]) || {};
    var c = window.dngCardCounts ? window.dngCardCounts(k) : { opened: 0, total: 0, bossBeaten: null };
    var ti = window.trackerItems || {};
    return {
        id:         k,
        chests:     c.opened,
        maxChests:  c.total,
        keys:       ti[k + 'SmallKeys'] || d.smallKeyCount || 0,
        maxKeys:    k === 'ct' && window.ctMaxSmallKeys ? window.ctMaxSmallKeys() : (d.maxSmallKeys || 0),
        // null = this dungeon has none (Agahnim's Tower has no map, compass or big key)
        map:        (k === 'ct' || !d.mapAddr) ? null : !!d.mapState,
        compass:    (k === 'ct' || d.noCompass) ? null : !!d.compassState,
        bigKey:     (k === 'ct' || d.noBigKeyItem) ? null : !!d.bigkeyState,
        boss:       k === 'ct' ? 'Agahnim' : k === 'gt' ? 'Agahnim 2'
                  : (CARD_BOSS_NAMES[d.bossState || 0] || null),
        // The item tracker's boss picture (boss/boss<n>.png; 0 = unknown).
        // Agahnim has none, so CT and GT send null.
        bossNum:    (k === 'ct' || k === 'gt' || k === 'hc') ? null : (d.bossState || 0),
        // The dungeon's prize as the item tracker shows it: crystal, redcrystal,
        // pendant, greenpendant or unknown — null where there is none (HC, CT, GT).
        prize:      cardPrize(k).prize,
        prizeGot:   cardPrize(k).got,
        bossBeaten: c.bossBeaten
    };
};

// Light or Dark World ('lw' / 'dw'), from the overworld area $7E008A (keeps the
// last area while in caves and dungeons) — for the map overlay's
// overworld image (Chris, Oct 2026). Published as currentWorld.
window._currentWorld = null;
function processWorld(b) {
    if (GAMEPLAY_MODES.indexOf(_currentGamemode) === -1) return;
    var w = (b & 0x40) ? 'dw' : 'lw';   // areas 0x40–0x7F are the Dark World
    if (w === window._currentWorld) return;
    window._currentWorld = w;
    if (window.broadcastItemSnap) window.broadcastItemSnap();
}

function processFloor(b) {
    if (GAMEPLAY_MODES.indexOf(_currentGamemode) === -1) return;
    var n = b > 127 ? b - 256 : b;
    var f = n >= 0 ? (n + 1) + 'F' : 'B' + (-n);
    if (!window._currentDungeon) f = null;
    if (f === window._currentFloor) return;
    window._currentFloor = f;
    if (window.broadcastItemSnap) window.broadcastItemSnap();
}

function processSRAMData(data) {
    if (data.length === 0x01) {
        _currentGamemode = data[0];
        broadcastGamemode(data[0]);
    } else if (data.length === 0x02) {
        processDungeonId(data[0]);
    } else if (data.length === 0x03) {
        processFloor(data[0]);
    } else if (data.length === 0x04) {
        processWorld(data[0]);
    } else if (data.length === 0x1ae) {
        processInventoryData(data);
    } else if (data.length === 0x280) {
        const now = Date.now();
        if (roomChunk1 === null || (now - roomChunk1Time) > 1500) {
            // No pending chunk, or the stored one is stale (>1.5s old) — store as first chunk
            roomChunk1 = data;
            roomChunk1Time = now;
        } else {
            // Have a fresh chunk1 — merge and process
            const merged = new Uint8Array(0x500);
            merged.set(roomChunk1, 0);
            merged.set(data, 0x280);
            roomChunk1 = null;
            roomChunk1Time = 0;
            processRoomData(merged);
        }
    } else if (data.length === KEYDROP_LEN) {
        processKeyDropData(data);
    } else if (data.length === SEEDCOUNT_LEN) {
        processSeedCounts(data);
    } else if (data.length === ROM_NAME_LEN) {
        processRomName(data);
    } else if (data.length === ROM_PRIZE_LEN) {
        takePrizeTable(data);
    } else if (data.length === 0x400 || data.length === 0x420 || data.length === 0x500) {
        processRoomData(data);
    }
}

// Count the pot keys and enemy drops collected in each dungeon. Stored on the
// dungeon rather than applied directly, because this arrives in a separate
// response from the room data and the two can land in either order —
// processRoomData adds whatever the last key-drop read produced.
function processKeyDropData(data) {
    // Fold the read into the running picture first (updateKeyDropFlags ORs it
    // with what we already had, so a save & quit blanking the block doesn't
    // un-collect anything) and count from that, not from the raw read.
    if (window.updateKeyDropFlags) window.updateKeyDropFlags(data);
    if (window._lastKeyDropData && window._lastKeyDropData.length === data.length) {
        data = window._lastKeyDropData;
    }
    var found = (list, base) => {
        var n = 0;
        for (var i = 0; i < list.length; i++) {
            var room = base + list[i][0], mask = list[i][1];
            if (room < data.length && (data[room] & mask) !== 0) n++;
        }
        return n;
    };
    var potOn   = window.keyDropFlag();
    var enemyOn = window.enemyKeyDropFlag();
    Object.keys(dungeons).forEach(function(k) {
        var d = dungeons[k];
        // Pot locations only exist under the pottery flag; enemy-drop locations
        // exist under either, matching keyDropExtras.
        var n = potOn   ? found(d.keypots  || [], 0) : 0;
        if (enemyOn) n += found(d.keydrops || [], KEYDROP_SPRITE_OFFSET);
        // The cap matters for HC, whose stated figures are fewer than its bits.
        d.keyDropCount = Math.min(n, window.keyDropExtras(k).locations);
    });
    // CT has no pot keys, so key drop adds it no locations.
    window._ctKeyDropCount = 0;
    // The map has no read of its own — send it the merged picture.
    if (window._itemsBc) {
        window._itemsBc.postMessage({ type: 'keydrops', data: Array.from(data) });
    }
}

// The randomizer's per-dungeon totals, straight from the seed.
//
// Parsed unconditionally and stored raw; whether any of it is believed is
// decided later by seedCountsFor(), against the flags in force at the time.
// Keeping the raw block means a flag change re-evaluates it without waiting for
// another read.
//
// Only re-applies when the numbers actually change, so this can sit in the
// poll loop without repainting the dungeon rows several times a second.
function processSeedCounts(data) {
    if (!data || data.length < SEEDCOUNT_LEN) return;
    var raw = {};
    Object.keys(window.SEED_COUNT_SLOT).forEach(function(k) {
        var i = window.SEED_COUNT_SLOT[k];
        raw[k] = {
            locations: data[2 * i] + (data[2 * i + 1] << 8),   // 16-bit little-endian
            keys:      data[SEEDCOUNT_KEYS_OFFSET + i]
        };
    });

    var sig = JSON.stringify(raw);
    if (sig === window._seedCountSig) return;
    window._seedCountSig = sig;
    window._seedCountRaw = raw;

    if (window.applyDungeonItemMaxes) window.applyDungeonItemMaxes();

    // Force the next inventory read to reprocess from scratch.
    //
    // The key counter is clamped to maxSmallKeys as it is read, and
    // processInventoryData skips bytes that haven't changed since last time.
    // The first inventory read lands BEFORE this block does, so keys were
    // clamped against the old maximum — and because the bytes never change
    // again, that stale figure stuck. HC read 4 keys as 1 and its item count
    // ran three high for the rest of the session.
    previousSRAM = null;

    // And clear the high-water marks. `itemCount` and `chestsMax` never fall on
    // their own, so a figure computed from the pre-seed maximums survives every
    // later recount — the keys came right and the item count stayed wrong.
    // Only clears while a device is attached; without one those are the
    // player's own manual tally.
    _resetKeyDropTallies();

    if (window.repaintAllDungeons) window.repaintAllDungeons();
    if (window.updateCtKeyBox) window.updateCtKeyBox();
    if (window.updateCtItemBox) window.updateCtItemBox();
    if (window.broadcastItemSnap) window.broadcastItemSnap();
}

function processRoomData(data) {
    // A save & quit blanks the room-flag block for a moment; merge it with what
    // we already had so the chest counts don't drop and come back.
    if (window.mergeRoomFlags) data = window.mergeRoomFlags(data);
    // Per-location cleared marks for the dungeon hover panel (js/dngpanel.js).
    // This window polls SRAM, so it records them itself rather than waiting on
    // the map; both windows write the same localStorage key.
    if (window.updateDungeonLocFlags) window.updateDungeonLocFlags(data);
    // Check boss defeats and track chests
    for (const [key, dungeon] of Object.entries(dungeons)) {
        // Check boss defeat
        if (dungeon.bossAddr && dungeon.bossAddr < data.length) {
            const roomByte = data[dungeon.bossAddr];
            const bossDefeated = (roomByte & 0x08) !== 0;
            
            const slot = document.querySelector(`[data-dungeon-key="${key}"]`);
            if (slot && bossDefeated) {
                // Boss down: the prize is now known, so set it from the ROM
                // table before marking it obtained. Once per dungeon, so a
                // later manual correction sticks.
                const prizeMap = window._dungeonPrizeByKey;
                if (prizeMap && prizeMap[key] && !dungeon._prizeAuto && window.setDungeonPrize) {
                    dungeon._prizeAuto = true;
                    window.setDungeonPrize(key, prizeMap[key]);
                }
                const prizeImg = slot.querySelector('.prize-img');
                if (prizeImg) {
                    const currentSrc = prizeImg.src;
                    if (currentSrc.includes('0.png')) {
                        prizeImg.src = currentSrc.replace('0.png', '1.png');
                        // Update completion status when prize is collected
                        updateDungeonCountDisplay(key);
                        updateBossCircle(key);   // grey out the boss image — boss defeated
                        if (typeof window.onPrizeCycled === 'function') window.onPrizeCycled();
                    }
                }
            }
        }
        
        // Track chests using [room, bitmask] locations
        if (dungeon.locations) {
            let chestsOpened = 0;
            
            for (const [room, bitmask] of dungeon.locations) {
                // For floor item locations (0x04): check both the floor pickup flag AND
                // chest-open flag (0x10) since KS mode places a chest there instead
                const effectiveMask = (bitmask === 0x04) ? (0x04 | 0x10) : bitmask;
                if (room < data.length && (data[room] & effectiveMask) !== 0) {
                    chestsOpened++;
                }
            }

            // Key drop shuffle: pot keys and enemy drops are locations too, but
            // their bits come from a different SRAM block, so they're counted
            // in processKeyDropData and folded in here. The flag is re-read
            // rather than trusted, so a stale tally can't leak in after a
            // toggle-off before the next read cycle.
            //
            // **anyKeyDropFlag, not keyDropFlag.** processKeyDropData already
            // counts each half against its own flag, so all that is asked here
            // is "is either half live?". Gating on the pottery flag alone let
            // Enemy Key Drop raise maxChests by its drop locations while never
            // counting a single drop bit — HC sat at 6 of 9 on a dungeon that
            // had been cleared out. It read correctly under the master flag
            // only because that turns the pottery flag on as well.
            if (window.anyKeyDropFlag()) chestsOpened += dungeon.keyDropCount || 0;

            // ── drop modes: the game's own counter, not our bits ──
            // Pot Drops and Enemy Drops shuffle in locations we have no table
            // for, so counting bits can only ever undercount. The game keeps a
            // per-dungeon "checks done" tally at $F5F4B0, which is inside this
            // very read, counts every location type, and needs no knowledge of
            // where anything lives. Used ONLY here — every other mode keeps the
            // bit counting it was verified with.
            // Keep the chest-only figure before the counter replaces it: the
            // drop rollup needs "checks done MINUS chests done" to work out how
            // many pots and enemies have been collected.
            var _seedChecks = window.checksDoneFor(key, data);
            if (_seedChecks !== null) {
                // High-water like chestsMax, and it MUST be cleared wherever
                // chestsMax is. Left behind on its own it kept a finished
                // dungeon's chest count against a reverted save's checks-done,
                // so `done` went negative and clamped to 0 — Turtle Rock read
                // 0 of 27 with two enemies dead (Chris, Sep 2026).
                dungeons[key].chestBits = Math.max(chestsOpened, dungeons[key].chestBits || 0);
                chestsOpened = _seedChecks;
            }

            // High-water mark: chest count never goes down (handles flickering SRAM on BizHawk etc.)
            chestsOpened = Math.max(chestsOpened, dungeons[key].chestsMax || 0);
            dungeons[key].chestsMax = chestsOpened;
            
            // Calculate items = total chests - dungeon items - small keys
            // Subtract only items that are NOT shuffled into the general pool for this mode
            const diFlags = window.dungeonShuffle();
            // Which of this dungeon's locations hold its map, compass and big
            // key — asked of `dungeonItemSlots`, the SAME helper that decides
            // maxItems, rather than worked out again here.
            //
            // HC is the whole reason: normally it has no big key of its own
            // (noBigKeyItem), but key drop and every drop mode give it one. This
            // used to be a second copy of that rule gated on the enemy KEY drop
            // flag alone, so under **Enemy Drops** — a drop mode, where that
            // flag is off — maxItems counted HC's big key and the collected
            // count didn't. Chris, Aug 2026: 66 of 68 with 71 of 74 checked,
            // one high, the big key never coming out.
            //
            // One definition, used by both, so they cannot drift apart again.
            const slots = window.dungeonItemSlots(key);
            const bigKeyIsALocation = !!slots.bigKey;

            // The mirror of the target above: every chest opened counts as an
            // item UNLESS it held one of this dungeon's own unshuffled items.
            // `slots` says whether the dungeon HAS each one; the state says
            // whether it has been found yet. Both are needed.
            let items = chestsOpened;
            if (!diFlags.map     && slots.map     && dungeon.mapState     > 0) items--;
            if (!diFlags.compass && slots.compass && dungeon.compassState > 0) items--;
            if (!diFlags.bigkey  && bigKeyIsALocation && dungeon.bigkeyState > 0) items--;
            if (!diFlags.smallkey) {
                // The high-water mark of small keys ever held, so spending a key
                // doesn't shrink the subtraction and inflate the item count. Capped
                // at maxSmallKeys: the floor item (0x04) also ticks the SRAM key
                // counter. HC's key is a floor/enemy drop in the sewers rather than
                // one of its counted chests, so it is never subtracted.
                const smallKeys = dungeon.smallKeyMax || dungeon.smallKeyCount;
                items -= dungeon.keysNotInChests ? 0 : Math.min(smallKeys, dungeon.maxSmallKeys);
            }
            if (items < 0) items = 0;
            // Hard cap at maxItems. DP / ToH / GT have a floor-item location
            // (0x04 mask) that can briefly count toward chestsOpened before the
            // SRAM small-key counter ticks up, which would otherwise let the
            // subtraction lag and render e.g. 3/2. The cap keeps the displayed
            // value within bounds for every dungeon regardless of mode.
            if (items > dungeon.maxItems) items = dungeon.maxItems;

            // High-water mark: the item count never dips mid-game (same guard the
            // raw chest count above uses). This prevents the cosmetic -1 flicker
            // when the boss-defeat location, or a map/compass bit, is read a frame
            // before its paired chest/prize bit registers. Reset to 0 on New Game
            // (resetItemTracker), so a fresh file still recounts from scratch.
            items = Math.max(items, dungeon.itemCount || 0);

            // Update if changed
            if (items !== dungeon.itemCount) {
                dungeons[key].itemCount = items;
                updateDungeonCountDisplay(key);
            }
        }
    }
    
    // CT has no `dungeons` entry, so its collected count is folded in here.
    // Only in a drop mode — outside one CT's locations are all keys and the
    // item box is hidden anyway.
    var _ctChecks = window.checksDoneFor('ct', data);
    if (_ctChecks !== null) {
        if (!window.trackerItems) window.trackerItems = {};
        var _ctKeysHeld = window.trackerItems.ctSmallKeys || 0;
        window.trackerItems.ctItems = Math.max(0, _ctChecks - _ctKeysHeld);
        if (window.updateCtItemBox) window.updateCtItemBox();
    }

    previousRoomData = new Uint8Array(data);

    // Broadcast room data to map window via BroadcastChannel
    if (window._itemsBc) {
        window._itemsBc.postMessage({ type: 'rooms', data: Array.from(data) });
    }
}

// Count set bits in a byte.
function _popcount(n) { n = n & 0xff; var c = 0; while (n) { c += (n & 1); n >>= 1; } return c; }

// Read crystal & pendant counts straight from SRAM and update the top-line
// widgets. Crystals: 0x37A (offset 0x3A) — 7 bits, reds are crystals 5 (0x04)
// and 6 (0x01). Pendants: 0x374 (offset 0x34) — g=0x04, b=0x02, r=0x01.
function updatePrizeCounts(data) {
    if (!data) return;
    var cByte = data[0x3A] || 0;
    var pByte = data[0x34] || 0;
    var crystals   = _popcount(cByte & 0x7F);   // all 7 (kept for GT logic)
    var redCrystal = _popcount(cByte & 0x05);   // the 2 red crystals
    var pendants   = _popcount(pByte & 0x07);   // all 3 (kept for logic)
    var greenPend  = (pByte & 0x04) ? 1 : 0;    // green pendant
    // High-water mark: crystals and pendants only ever increase within a seed, so
    // never let a transient all-zero SRAM read (save & quit / menu) blank them —
    // the same guard the item states (updateIfBetter) and check/death/bonk stats
    // use. Reset to 0 on New Game in resetItemTracker so a fresh file recounts.
    if (!window.trackerItems) window.trackerItems = {};
    var _ti = window.trackerItems;
    crystals   = Math.max(crystals,   _ti.crystals     || 0);
    redCrystal = Math.max(redCrystal, _ti.redCrystal   || 0);
    pendants   = Math.max(pendants,   _ti.pendants     || 0);
    greenPend  = Math.max(greenPend,  _ti.greenPendant || 0);
    var nonRed   = crystals - redCrystal;   // 5 non-red crystals (x/5)
    var nonGreen = pendants - greenPend;    // 2 non-green pendants (x/2)
    var vals = {
        'crystal-count':      [nonRed,     5],
        'redcrystal-count':   [redCrystal, 2],
        'pendant-count':      [nonGreen,   2],
        'greenpendant-count': [greenPend,  1]
    };
    Object.keys(vals).forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.textContent = vals[id][0] + '/' + vals[id][1];
    });
    // Feed the map logic with the authoritative SRAM counts (Pyramid Fairy uses
    // red crystals, Sahasrahla uses the green pendant, GT uses total crystals).
    _ti.crystals     = crystals;
    _ti.redCrystal   = redCrystal;
    _ti.pendants     = pendants;
    _ti.greenPendant = greenPend;
    window._sramPrizesValid = true;
}

function processInventoryData(data) {
    try {
    // Data starts at offset 0x340 in SRAM, we read up to 0x38F
    const changed = (offset) => {
        return !previousSRAM || data[offset] !== previousSRAM[offset];
    };
    
    // newbit: fires when a bit is set that wasn't set before
    // On first connect (!previousSRAM), read all items regardless to get current state
    const isFirstRead = !previousSRAM;
    const newbit = (offset, mask) => {
        if (isFirstRead) return (data[offset] & mask) !== 0;
        return changed(offset) && (data[offset] & mask) !== 0 && (previousSRAM[offset] & mask) === 0;
    };
    
    // Helper: only update if new state >= current (prevents blanking during save/quit menu)
    const updateIfBetter = (key, newState) => {
        if (newState >= items[key].currentState) updateItemState(key, newState);
    };

    // Based on autot.js tracking logic
    if (changed(0x00)) { // 0x340 - Bow
        const bowValue = data[0x00];
        const bowState = bowValue === 0x00 ? 0 : bowValue === 0x01 ? 1 : bowValue === 0x02 ? 2 : 3;
        updateIfBetter('bow', bowState);
    }
    
    // Boomerang
    if (changed(0x4C)) {
        const bits = data[0x4C] & 0xC0;
        if (bits === 0x80) updateIfBetter('boomerang', 1);
        else if (bits === 0x40) updateIfBetter('boomerang', 2);
        else if (bits === 0xC0) updateIfBetter('boomerang', 3);
        else if (changed(0x01)) updateIfBetter('boomerang', data[0x01]);
    }
    if (newbit(0x02, 0x01)) updateItemState('hookshot', 1); // 0x342
    if (changed(0x03)) {
        if (data[0x03] > 0) {
            // Bombs present — cancel any pending clear and ensure state is on
            if (_bombClearTimer) { clearTimeout(_bombClearTimer); _bombClearTimer = null; }
            updateIfBetter('bomb', 1);
        } else if (items['bomb'].currentState > 0) {
            // Bombs read as 0 but tracker shows them — debounce 5s before clearing
            // to avoid save/quit SRAM blips removing bombs mid-game
            if (!_bombClearTimer) {
                _bombClearTimer = setTimeout(function() {
                    _bombClearTimer = null;
                    updateItemState('bomb', 0);
                }, 5000);
            }
        }
    }
    
    // Mushroom/Powder - check randomizer logic first (0x38c)
    if (changed(0x4C)) { // 0x38C - Randomizer mushroom/powder/flute/shovel tracking
        const bits38c = data[0x4C];
        
        // Mushroom tracking
        const mushroomBits = bits38c & 0x28;
        if (mushroomBits === 0x28) updateItemState('mushroom', 1);
        else if (mushroomBits === 0x08) updateItemState('mushroom', 2);
        // Don't zero mushroom — it stays
        
        // Powder tracking - never remove
        if (bits38c & 0x10) updateItemState('powder', 1);
        
        // Flute tracking (bits 0x03)
        const fluteState = bits38c & 0x03;
        if (fluteState === 0x01 || fluteState === 0x03) updateItemState('flute', 2);
        else if (fluteState === 0x02) updateIfBetter('flute', 1);
        // Don't zero flute
        
        // Shovel tracking - once obtained, it stays (bit 0x04)
        if ((bits38c & 0x04) && items.shovel.currentState === 0) {
            updateItemState('shovel', 1);
        }
    } // else if (changed(0x04)) { // 0x344 - Vanilla mushroom/powder
      //  const powderValue = data[0x04];
      //  if (powderValue === 0x01) {
      //      updateItemState('mushroom', 1);
      //     updateItemState('powder', 0);
      //  } else if (powderValue === 0x02) {
      //      updateItemState('powder', 1);
      //      updateItemState('mushroom', 2);
      //  } else {
      //      updateItemState('mushroom', 0);
      //      updateItemState('powder', 0);
      //  }
    // }
    
    if (newbit(0x05, 0x01)) updateItemState('firerod', 1); // 0x345
    if (newbit(0x06, 0x01)) updateItemState('icerod', 1); // 0x346
    if (newbit(0x07, 0x01)) updateItemState('bombos', 1); // 0x347
    if (newbit(0x08, 0x01)) updateItemState('ether', 1); // 0x348
    if (newbit(0x09, 0x01)) updateItemState('quake', 1); // 0x349
    if (newbit(0x0A, 0x01)) updateItemState('lamp', 1); // 0x34A
    if (newbit(0x0B, 0x01)) updateItemState('hammer', 1); // 0x34B
    if (newbit(0x0D, 0x01)) updateItemState('net', 1); // 0x34D
    if (newbit(0x0E, 0x01)) updateItemState('book', 1); // 0x34E
    
    // Bottles 0x35C-0x35F — track contents of each bottle individually
    // SRAM values: 0x00=none, 0x02=empty, 0x03=red, 0x04=green, 0x05=blue, 0x06=fairy, 0x07=bee, 0x08=goodbee
    const bottleContentMap = { 0x00: 0, 0x02: 1, 0x03: 2, 0x04: 3, 0x05: 4, 0x06: 5, 0x07: 6, 0x08: 7 };
    const bottleKeys = ['bottle1', 'bottle2', 'bottle3', 'bottle4'];
    for (let i = 0; i < 4; i++) {
        const val = data[0x1C + i];
        const state = bottleContentMap[val] !== undefined ? bottleContentMap[val] : 0;
        // Only update if obtained (state > 0) or bottle was never obtained
        if (state > 0 || items[bottleKeys[i]].currentState === 0) {
            updateItemState(bottleKeys[i], state);
        }
    }
    // Update trackerItems.bottle count for map logic compatibility
    if (window.trackerItems) {
        window.trackerItems.bottle = bottleKeys.filter((k, i) => data[0x1C + i] > 0).length;
    }
    
    if (newbit(0x10, 0x01)) updateItemState('somaria', 1); // 0x350
    if (newbit(0x11, 0x01)) updateItemState('byrna', 1); // 0x351
    if (newbit(0x12, 0x01)) updateItemState('cape', 1); // 0x352
    if (newbit(0x13, 0x02)) updateItemState('mirror', 1); // 0x353
    
    if (changed(0x14)) updateIfBetter('gloves', data[0x14]); // 0x354
    if (newbit(0x15, 0x01)) updateItemState('boots', 1); // 0x355

    // Crystal / pendant counts (SRAM 0x37A / 0x374) → top-line widgets.
    updatePrizeCounts(data);
    if (newbit(0x16, 0x01)) updateItemState('flippers', 1); // 0x356
    if (newbit(0x17, 0x01)) updateItemState('moonpearl', 1); // 0x357
    if (changed(0x19)) updateIfBetter('sword', data[0x19] === 0xFF ? 0 : data[0x19]); // 0x359
    if (changed(0x1A)) updateIfBetter('shield', data[0x1A]); // 0x35A
    if (changed(0x1B)) updateIfBetter('tunic', data[0x1B]); // 0x35B
    if (changed(0x3B)) { if (data[0x3B] > 0) updateItemState('halfmagic', 1); } // 0x37B - never remove halfmagic
    
    // Agahnim tracking (0x3C5 - offset 0x85 from 0x340)
    if (changed(0x85)) {
        if (data[0x85] >= 3) updateItemState('agahnim', 1); // Defeated — never go back to 0
    }
    
    // Small key tracking for dungeons (0x4E0-0x4ED range)
    for (const [key, dungeon] of Object.entries(dungeons)) {
        if (dungeon.smallKeyAddr) {
            const keyOffset = dungeon.smallKeyAddr - 0x340;
            if (keyOffset >= 0 && keyOffset < data.length && changed(keyOffset)) {
                const rawKeyCount = data[keyOffset];
                const keyCount = (dungeon.maxSmallKeys > 0) ? Math.min(rawKeyCount, dungeon.maxSmallKeys) : rawKeyCount;
                // KEYS COLLECTED, and it only ever rises. $7EF4E0+ is itself a
                // running tally, and a save & quit blanks the block for a poll
                // or two — believing that zero emptied every dungeon's keys
                // (Chris, Sep 2026). Nothing needs the figure to fall: keys in
                // hand were tried and dropped, and a new seed clears both
                // counts through resetItemTracker().
                if (keyCount > (dungeons[key].smallKeyMax || 0)) {
                    dungeons[key].smallKeyMax = keyCount;
                }
                var _shown = Math.max(keyCount, dungeons[key].smallKeyMax || 0);
                if (_shown !== (dungeons[key].smallKeyCount || 0)) {
                    dungeons[key].smallKeyCount = _shown;
                    updateDungeonCountDisplay(key);
                }
            }
        }
    }
    
    // Big key, Compass, and Map tracking (0x364-0x369)
    // NOT guarded on changed() any more. These bytes only move the moment the
    // item is picked up, so anything that reset bigkeyState/compassState/
    // mapState AFTER that — New Game, resetItemTracker, the launch reset —
    // left them stuck at 0 with no further change to re-trigger the read. GT's
    // big key then showed dim on the hover card and every rule behind it read
    // unavailable (Chris, Sep 2026). Re-asserting from SRAM each poll is a
    // 12-dungeon loop over six bytes, and the inner tests only ever set state,
    // never clear it, so a save & quit still can't blank anything.
    {
        for (const [key, dungeon] of Object.entries(dungeons)) {
            // HC (and CT) have no dungeon slot in the item tracker, and this
            // used to skip them entirely — so HC's big key was never recorded
            // and Zelda's Chest stayed unavailable with the key in hand
            // (Chris, Sep 2026). Every dungeon's state is tracked now; only the
            // images need a slot.
            const slot = document.querySelector(`[data-dungeon-key="${key}"]`);
            
            // Big key tracking
            const bigkeyOffset = dungeon.bigkeyAddr - 0x340;
            if (bigkeyOffset >= 0 && bigkeyOffset < data.length) {
                const bigkeyByte = data[bigkeyOffset];
                const hasBigKey = (bigkeyByte & dungeon.bigkeyMask) !== 0;
                
                if (hasBigKey && dungeons[key].bigkeyState === 0) {
                    dungeons[key].bigkeyState = 1;
                    const bigkeyImg = slot && slot.querySelector('.bigkey-img');
                    if (bigkeyImg) {
                        bigkeyImg.src = `${BASE_URL}/bigkey1.png`;
                    }
                    updateDungeonCountDisplay(key);
                    if (window.broadcastItemSnap) window.broadcastItemSnap();
                }
            }
            
            // Compass tracking
            const compassOffset = dungeon.compassAddr - 0x340;
            if (compassOffset >= 0 && compassOffset < data.length) {
                const compassByte = data[compassOffset];
                const hasCompass = (compassByte & dungeon.compassMask) !== 0;
                
                if (hasCompass && dungeons[key].compassState === 0) {
                    dungeons[key].compassState = 1;
                    const compassImg = slot && slot.querySelector('.compass-img');
                    if (compassImg) {
                        compassImg.src = `${BASE_URL}/compass1.png`;
                    }
                    // Recalculate chest item count now that compass is subtracted.
                    updateDungeonCountDisplay(key);
                    if (window.broadcastItemSnap) window.broadcastItemSnap();
                }
            }

            // Map tracking
            const mapOffset = dungeon.mapAddr - 0x340;
            if (mapOffset >= 0 && mapOffset < data.length) {
                const mapByte = data[mapOffset];
                const hasMap = (mapByte & dungeon.mapMask) !== 0;

                if (hasMap && dungeons[key].mapState === 0) {
                    dungeons[key].mapState = 1;
                    const mapImg = slot && slot.querySelector('.map-img');
                    if (mapImg) {
                        mapImg.src = `${BASE_URL}/map1.png`;
                    }
                    // Recalculate chest item count now that map is subtracted.
                    updateDungeonCountDisplay(key);
                    // Notify map window so it can show map1.png as prize placeholder
                    if (typeof broadcastPrizes === 'function') setTimeout(broadcastPrizes, 50);
                    if (window.broadcastItemSnap) window.broadcastItemSnap();
                }
            }
        }
    }
    
    } catch(e) { console.error('processInventoryData error:', e); }
    
    // Store current data for next comparison
    previousSRAM = new Uint8Array(data);

    // Broadcast item states to map window via BroadcastChannel
    if (window._itemsBc) {
        var snap = {};
        var copyKeys = ['bow','boomerang','hookshot','bomb','mushroom','powder','firerod','icerod',
                        'bombos','ether','quake','lamp','hammer','shovel','flute','net','book',
                        'bottle1','bottle2','bottle3','bottle4',
                        'somaria','byrna','cape','mirror','boots','gloves','flippers',
                        'moonpearl','sword','shield','tunic','agahnim','halfmagic'];
        copyKeys.forEach(function(k) {
            if (items[k]) snap[k] = items[k].currentState;
        });
        // Cosmetic overlay flags only — boots/mirror values untouched for logic.
        snap.pseudoboots  = pseudoBootsOn()  ? 1 : 0;
        snap.mirrorscroll = mirrorScrollOn() ? 1 : 0;
        snap.bottle = ['bottle1','bottle2','bottle3','bottle4'].filter(k => items[k] && items[k].currentState > 0).length;
        // Crystal count from trackerItems if available, else from items
        snap._itemsBuild = window.ITEMS_BUILD;   // the slim snap needs it as well,
                                                 // or the map's build line flickers
        snap.currentDungeon = window._currentDungeon || null;   // both builders, or the dot flickers
        snap.currentFloor   = window._currentDungeon ? (window._currentFloor || null) : null;
        snap.currentWorld   = window._currentWorld || null;
        snap.gtBk           = window.gtBkState ? window.gtBkState() : null;
        snap.dungeonCard    = window.dungeonCardState();
        snap.progress       = window._progress || null;
        snap.crystals = (window.trackerItems && window.trackerItems.crystals) || 0;
        snap.mmMedallion = (window.trackerItems && window.trackerItems.mmMedallion) || 0;
        snap.trMedallion = (window.trackerItems && window.trackerItems.trMedallion) || 0;
        // Every dungeon, ep included: vanilla EP has no key doors, but Key Drop
        // shuffle gives it two and the hand-written list here had left it out,
        // so the map's card and its key-tier rules always read 0.
        ['hc','ct','ep','dp','toh','pod','sp','sw','tt','ip','mm','tr','gt'].forEach(function(_k) {
            snap[_k+'SmallKeys'] = (window.trackerItems && window.trackerItems[_k+'SmallKeys']) || 0;
            snap[_k+'SmallKeysMax'] = (window.trackerItems && window.trackerItems[_k+'SmallKeysMax']) || 0;
            // The pots/enemies split, same as the full builder. Publishing it
            // from only one of the two made the enemy row flash: every other
            // broadcast dropped the keys, the map's host answered null, and the
            // rollup fell back to the old masks for that frame (Chris, Sep 2026).
            var _nc2 = window.dungeonNonChest ? window.dungeonNonChest(_k) : null;
            snap[_k+'NonChestDone']  = _nc2 ? _nc2.done  : null;
            snap[_k+'NonChestTotal'] = _nc2 ? _nc2.total : null;
        });
        snap.epBigKey     = (window.trackerItems && window.trackerItems.epBigKey)     || 0;
        snap.dpBigKey     = (window.trackerItems && window.trackerItems.dpBigKey)     || 0;
        snap.tohBigKey     = (window.trackerItems && window.trackerItems.tohBigKey)     || 0;
        snap.podBigKey     = (window.trackerItems && window.trackerItems.podBigKey)     || 0;
        snap.ttBigKey     = (window.trackerItems && window.trackerItems.ttBigKey)     || 0;
        snap.ipBigKey     = (window.trackerItems && window.trackerItems.ipBigKey)     || 0;
        snap.mmBigKey     = (window.trackerItems && window.trackerItems.mmBigKey)     || 0;
        snap.trBigKey     = (window.trackerItems && window.trackerItems.trBigKey)     || 0;
        snap.spBigKey     = (window.trackerItems && window.trackerItems.spBigKey)     || 0;
        snap.swBigKey     = (window.trackerItems && window.trackerItems.swBigKey)     || 0;
        ['hc','ct'].forEach(function (_k) {
            snap[_k+'BigKey'] = ((window.dungeons && window.dungeons[_k]) || {}).bigkeyState || 0;
        });
        // GT big key: read directly from dungeons object (bigkeyState tracked via SRAM/click).
        // This inline snap omitted gtBigKey, causing the map to reset it to 0 on every SRAM
        // poll tick — producing the green/yellow flash in entrance shuffle keysanity mode.
        snap.gtBigKey     = (dungeons.gt && dungeons.gt.bigkeyState) || 0;


        // Count obtained prizes from dungeon slots for check logic
        // prizeState tells us the TYPE
        // Standard:   0=crystal,1=redcrystal,2=pendant,3=greenpendant
        // Key Sanity: 0=unknown,1=crystal,2=redcrystal,3=pendant,4=greenpendant,5=unknown(obtained)
        var crystalCount = 0, redCrystalCount = 0, pendantCount = 0, greenPendantCount = 0;
        Object.keys(dungeons).forEach(function(key) {
            var d = dungeons[key];
            var slot = document.querySelector('[data-dungeon-key="' + key + '"]');
            var obtained = false;
            var prizeName = 'unknown';
            if (slot) {
                var prizeImg = slot.querySelector('.prize-img');
                obtained = prizeImg && prizeImg.src.includes('1.png');
                var src = prizeImg ? prizeImg.src : '';
                if      (src.includes('greenpendant')) prizeName = 'greenpendant';
                else if (src.includes('pendant'))      prizeName = 'pendant';
                else if (src.includes('redcrystal'))   prizeName = 'redcrystal';
                else if (src.includes('crystal'))      prizeName = 'crystal';
            }
            if (!obtained) return;
            if      (prizeName === 'crystal')      crystalCount++;
            else if (prizeName === 'redcrystal')   { crystalCount++; redCrystalCount++; }
            else if (prizeName === 'pendant')      pendantCount++;
            else if (prizeName === 'greenpendant') { pendantCount++; greenPendantCount++; }
        });
        snap.redCrystal   = redCrystalCount;
        snap.crystals     = crystalCount;
        snap.pendants     = pendantCount;
        snap.greenPendant = greenPendantCount;
        // When autotracking, the SRAM prize counts are authoritative. Without this
        // override, broadcastPrizes keeps sending the manual prize-img tally (0
        // until a prize is cycled) while broadcastItemSnap sends the real SRAM
        // totals — the two alternate on every poll and flash the crystal/pendant
        // checks (Sahasrahla, Master Sword Pedestal, Pyramid Fairy, Ganon's Tower)
        // green/red. Mirror broadcastItemSnap so SRAM always wins.
        if (deviceAttached && window._sramPrizesValid && window.trackerItems) {
            snap.crystals     = window.trackerItems.crystals;
            snap.pendants     = window.trackerItems.pendants;
            snap.greenPendant = window.trackerItems.greenPendant;
            snap.redCrystal   = window.trackerItems.redCrystal;
        }
        window._itemsBc.postMessage({ type: 'items', data: snap });
    }

    // Check count (SRAM 0xF5F423 = inv offset 0xE3) and death count (0xF5F449 = inv offset 0x109)
    //
    // TotalItemCounter is **two bytes**, little-endian, per the randomizer's own
    // sram.asm ($7EF423 TotalItemCounter, 2 bytes). Reading only the low byte
    // capped the display at 255, and the high-water guard below then rejected
    // the wrap to 0 — so it stuck there for the rest of the run. Seeds with
    // more than 255 checks are common enough that Chris hit it in testing.
    //
    // These three are high-water marks, so ONE garbage read latches forever and
    // can never come back down — the usual cause is SNI handing back a stale or
    // 0xFF-filled buffer while the emulator is between states, which reads as
    // 65535 checks. Two guards, both cheap: only trust the counters while the
    // game is actually in a gameplay mode (the same rule the heart-piece count
    // below already uses), and refuse a value no real run could produce.
    const statsTrustworthy = GAMEPLAY_MODES.indexOf(_currentGamemode) !== -1;
    const STAT_CEILING = 2000;   // far above any real seed; 0xFFFF garbage is not
    // The cumulative counters (bonks, revivals, flute uses) can legitimately run
    // into the hundreds over a long session, so they get a looser ceiling than
    // the per-seed ones — still tight enough to reject 0xFFFF garbage.
    const TALLY_CEILING = 9999;
    // WIDTHS ARE NOT UNIFORM. From z3randomizer sram.asm, which is the only
    // authority worth trusting here:
    //   BonkCounter        $7EF420  1 byte  (the ROM stops it at 99)
    //   YAItemCounter      $7EF421  1 byte  <- NOT the bonk high byte
    //   TotalItemCounter   $7EF423  2 bytes <- the one real 16-bit counter
    //   DeathCounter       $7EF449  1 byte  ($7EF44A is reserved)
    //   FluteCounter       $7EF44B  1 byte  ($7EF44C.. is a 4-byte gap)
    //   FaerieRevivalCtr   $7EF453  1 byte  ($7EF454 is ChallengeTimer, live)
    // Reading them all as little-endian pairs made bonks show 8545 (0x2161 =
    // 97 bonks + 33 Y/A items) and would have had revivals track a running
    // timer (Chris, Sep 2026). Deaths, flutes and revivals wrap at 256 in the
    // ROM; the high-water guard freezes the display there rather than resetting.

    const checkEl = document.getElementById('toh-check-count');
    const deathEl = document.getElementById('toh-death-count');
    if (statsTrustworthy && checkEl && 0xE4 < data.length) {
        const newChecks = data[0xE3] | (data[0xE4] << 8);
        if (newChecks <= STAT_CEILING && newChecks >= parseInt(checkEl.textContent || '0')) {
            checkEl.textContent = newChecks;
            setHeaderChecks(newChecks);
            if (window._itemsBc) window._itemsBc.postMessage({ type: 'stats', checks: newChecks, deaths: parseInt((document.getElementById('toh-death-count')||{}).textContent||'0'), bonks: parseInt((document.getElementById('toh-bonk-count')||{}).textContent||'0') });
        }
    }
    if (statsTrustworthy && deathEl && 0x109 < data.length) {
        const deaths = data[0x109];
        if (deaths <= STAT_CEILING && deaths >= parseInt(deathEl.textContent || '0')) {
            deathEl.textContent = deaths;
            if (window._itemsBc) window._itemsBc.postMessage({ type: 'stats', checks: parseInt((document.getElementById('toh-check-count')||{}).textContent||'0'), deaths: deaths, bonks: parseInt((document.getElementById('toh-bonk-count')||{}).textContent||'0') });
        }
    }
    // Bonk count (SRAM 0xF5F420 = inv offset 0xE0). ONE byte — see the widths
    // note above. The ROM itself caps it at 99.
    const bonkEl = document.getElementById('toh-bonk-count');
    if (statsTrustworthy && bonkEl && 0xE0 < data.length) {
        const newBonks = data[0xE0];
        if (newBonks <= TALLY_CEILING && newBonks >= parseInt(bonkEl.textContent || '0')) {
            bonkEl.textContent = newBonks;
            if (window._itemsBc) window._itemsBc.postMessage({ type: 'stats', checks: parseInt((document.getElementById('toh-check-count')||{}).textContent||'0'), deaths: parseInt((document.getElementById('toh-death-count')||{}).textContent||'0'), bonks: newBonks });
        }
    }
    // Heart piece count (SRAM 0xF5F36B = inv offset 0x2B) — pieces toward the
    // next heart container. It legitimately rolls 4→0 when a container completes,
    // so a high-water mark (like the other stats) would wrongly stick it at full.
    // Instead only accept updates while actually in gameplay, so a save & quit or
    // menu transition can't blank it — the last value persists like the others.
    const heartEl = document.getElementById('toh-heartpiece-count');
    if (heartEl && 0x2B < data.length && GAMEPLAY_MODES.indexOf(_currentGamemode) !== -1) {
        let hp = data[0x2B];
        if (hp > 4) hp = 4;
        if (hp < 0) hp = 0;
        heartEl.textContent = hp + '/4';
        setHeartFill(hp);
    }
    // For the announce overlay's overworld view (Chris, Oct 2026): pendants
    // ($7EF374, 3 bits) and crystals ($7EF37A, 7 bits) held, the heart pieces
    // toward the next heart (the 0/4 above) and the check total ($7EF423, the
    // CHECKS box's counter). Gameplay only, like the heart pieces above, so a
    // save & quit can't blank them.
    if (0xE4 < data.length && GAMEPLAY_MODES.indexOf(_currentGamemode) !== -1) {
        const bits = (v) => { let c = 0; for (; v; v &= v - 1) c++; return c; };
        // Split like the item tracker's top row: reds are crystals 5 and 6
        // (0x04, 0x01), green is pendant 0x04.
        const prog = { pendants: bits(data[0x34] & 0x07), crystals: bits(data[0x3A] & 0x7F),
                       redCrystals: bits(data[0x3A] & 0x05), greenPendant: (data[0x34] & 0x04) ? 1 : 0,
                       heartPieces: Math.min(4, data[0x2B]),
                       checks: data[0xE3] | (data[0xE4] << 8) };
        if (JSON.stringify(prog) !== JSON.stringify(window._progress || null)) {
            window._progress = prog;
            if (window.broadcastItemSnap) window.broadcastItemSnap();
        }
    }
    // Revival count (SRAM 0xF5F453 = inv offset 0x113). Cumulative counter, so
    // use a high-water mark like checks/deaths/bonks — only ever increases,
    // which also guards against garbage SRAM reads.
    const revivalEl = document.getElementById('toh-revival-count');
    if (statsTrustworthy && revivalEl && 0x113 < data.length) {
        const newRevivals = data[0x113];
        if (newRevivals <= TALLY_CEILING && newRevivals >= parseInt(revivalEl.textContent || '0')) {
            revivalEl.textContent = newRevivals;
        }
    }
    // Flute count (SRAM 0xF5F44B = inv offset 0x10B). Cumulative counter, so use a
    // high-water mark like deaths/bonks/revivals — only ever increases.
    const fluteEl = document.getElementById('toh-flute-count');
    if (statsTrustworthy && fluteEl && 0x10B < data.length) {
        const newFlutes = data[0x10B];
        if (newFlutes <= TALLY_CEILING && newFlutes >= parseInt(fluteEl.textContent || '0')) {
            fluteEl.textContent = newFlutes;
        }
    }
    // CT small key count (SRAM 0xF5F4E4 = inv offset 0x1a4) — Key Sanity only
    // Use high water mark so count doesn't drop when keys are used
    const ctKeyEl = document.getElementById('toh-ctkey-count');
    if (0x1a4 < data.length) {
        const ctKeysRaw = data[0x1a4];
        if (!window.trackerItems) window.trackerItems = {};
        const prev = window.trackerItems.ctSmallKeysMax || 0;
        const ctKeys = Math.max(ctKeysRaw, prev);
        window.trackerItems.ctSmallKeysMax = ctKeys;
        window.trackerItems.ctSmallKeys = ctKeys;
        // trackerItems is still updated above so the map's key logic keeps
        // working; only the visible label is left alone in Retro.
        if (ctKeyEl && !(window.ctKeyBoxIsStatic && window.ctKeyBoxIsStatic())) {
            const ctMax = window.ctMaxSmallKeys();   // 2 normally, 4 under key drop
            ctKeyEl.textContent = ctKeys + '/' + ctMax;
            ctKeyEl.style.color = ctKeys >= ctMax ? '#2ecc71' : '';
        }
    }
    // SP small key count (SRAM 0xF5F4E5 = inv offset 0x1a5) — KS/MCK map logic
    if (0x1a5 < data.length) {
        if (!window.trackerItems) window.trackerItems = {};
        const spRaw = data[0x1a5];
        // Same as the loop below: the first read of a launch replaces whatever
        // a previous seed left persisted.
        if (!_keysFoundFresh.sp) {
            _keysFoundFresh.sp = 1;
            window.trackerItems.spSmallKeysMax = spRaw;
            if (dungeons.sp) dungeons.sp.smallKeyMax = spRaw;
        }
        const spPrev = Math.max(window.trackerItems.spSmallKeysMax || 0,
                                (dungeons.sp || {}).smallKeyMax || 0);
        const spFound = window.keysFoundNote('sp', Math.max(spRaw, spPrev));
        window.trackerItems.spSmallKeysMax = spFound;   // found over the run
        window.trackerItems.spSmallKeys = spFound;

        if (dungeons.sp) dungeons.sp.smallKeyMax = spFound;
    }
    // Remaining dungeon small key counts — KS/MCK map logic (high water mark)
    const _skDungeons = [
        // HC's key is used by the Escape Sewers side-room logic on the map.
        // Inventory offset = smallKeyAddr - 0x340.
        //
        // HC reads slot **0x4E0**, not 0x4E1. The game's per-dungeon key array
        // is indexed by dungeon id, and ALTTPR treats Hyrule Castle and the
        // Sewers as one dungeon occupying slot 0 — 0x4E1 is a slot nothing ever
        // writes. Reading it meant hcSmallKeys was permanently 0: the Escape
        // Sewers check never went green, and under key drop every key HC
        // collected was counted as an item instead (nothing to subtract).
        // Confirmed against alttptracker-main's dungeonDataMem, which is the
        // only dungeon where our address disagreed with theirs.
        { key: 'hc',  offset: 0x1a0 },
        // EP was absent from this list: vanilla Eastern has no small keys, so
        // nothing missed it until Pot Key Drop gave it one. With no
        // epSmallKeys, the map's rule context read 0 keys and Armos stayed
        // unavailable however many you held (Chris, Sep 2026).
        { key: 'ep',  offset: 0x1a2 },
        { key: 'dp',  offset: 0x1a3 },
        { key: 'toh', offset: 0x1aa },
        { key: 'pod', offset: 0x1a6 },
        { key: 'tt',  offset: 0x1ab },
        { key: 'ip',  offset: 0x1a9 },
        { key: 'mm',  offset: 0x1a7 },
        { key: 'tr',  offset: 0x1ac },
        { key: 'sw',  offset: 0x1a8 },
        { key: 'gt',  offset: 0x1ad },
    ];
    if (!window.trackerItems) window.trackerItems = {};
    _skDungeons.forEach(function(d) {
        if (d.offset < data.length) {
            const raw = data[d.offset];
            // First read of this launch: believe the game outright, and drop
            // whatever a previous seed left in the store. After that the
            // persisted high-water stands, so a save & quit blanking the block
            // can't walk the count back.
            if (!_keysFoundFresh[d.key]) {
                _keysFoundFresh[d.key] = 1;
                window.trackerItems[d.key + 'SmallKeysMax'] = raw;
                if (dungeons[d.key]) dungeons[d.key].smallKeyMax = raw;
            }
            const prev = Math.max(window.trackerItems[d.key + 'SmallKeysMax'] || 0,
                                  (dungeons[d.key] || {}).smallKeyMax || 0);
            const val = window.keysFoundNote(d.key, Math.max(raw, prev));
            window.trackerItems[d.key + 'SmallKeysMax'] = val;   // collected over the run
            window.trackerItems[d.key + 'SmallKeys'] = val;

            if (dungeons[d.key]) dungeons[d.key].smallKeyMax = val;
        }
    });
    // Big key states — read from dungeon bigkeyState (already tracked via SRAM in processRoomData)
    // Expose on trackerItems for map logic
    const _bkDungeons = ['ep','dp','toh','pod','sp','sw','tt','ip','mm','tr'];
    _bkDungeons.forEach(function(k) {
        if (dungeons[k]) {
            window.trackerItems[k + 'BigKey'] = dungeons[k].bigkeyState || 0;
        }
    });
}

function updateItemState(itemKey, state) {
    const item = items[itemKey];
    if (!item || item.isGoMode) return;

    // Ensure state is within valid range
    state = Math.min(state, item.states.length - 1);
    item.currentState = state;
    
    const slot = document.querySelector(`[data-item-key="${itemKey}"]`);
    if (slot) {
        const img = slot.querySelector('img');
        if (!img) return;
        const newState = item.states[item.currentState];
        img.src = newState.img;
        img.alt = newState.name;
        slot.dataset.itemName = newState.name;
        // Seed-flag cosmetic (pseudo boots / mirror scroll): starting-state image
        // until the real item is obtained. Display only — logic value unchanged.
        const _ov = seedFlagOverlay(itemKey, item.currentState);
        if (_ov) { img.src = _ov.img; img.alt = _ov.name; slot.dataset.itemName = _ov.name; }
    }

    // Autotracker updated an item — re-evaluate boss circle requirement colors
    refreshAllBossCircles();
    // …and the item-background fills (settings customization)
    if (window.refreshItemFills) window.refreshItemFills();
    // Push updated bossOk state to map so stripe clears when autotracker
    // grants a boss-required item (e.g. icerod unlocking Trinexx stripe).
    if (window.broadcastItemSnap) window.broadcastItemSnap();
}

function resetItemTracker() {
    window._currentWorld = null; if (window.setCurrentDungeon) window.setCurrentDungeon(null);
    // Clear the hover panel's per-location marks (js/dngpanel.js owns the store)
    if (window.dngLocClearedReset) window.dngLocClearedReset();
    // …and the keys-found high-water marks: a new seed has its own.
    if (window.keysFoundReset) window.keysFoundReset();
    // A new game is a new seed: forget the ROM prize table and re-read it.
    forgetRomPrizes();
    // Reset all item states to default
    Object.keys(items).forEach(function(key) {
        items[key].currentState = 0;
        const slot = document.querySelector(`[data-item-key="${key}"]`);
        if (!slot) return;
        if (items[key].isGoMode) {
            slot.style.color = items[key].states[0].color;
            slot.style.background = 'transparent';
        } else {
            const img = slot.querySelector('img');
            if (img) { img.src = items[key].states[0].img; img.alt = items[key].states[0].name; }
            // Seed-flag cosmetic: restore the pseudo/scroll starting look after reset.
            const _ovR = img ? seedFlagOverlay(key, 0) : null;
            if (_ovR) { img.src = _ovR.img; img.alt = _ovR.name; slot.dataset.itemName = _ovR.name; }
        }
        if (['bombos','ether','quake'].includes(key)) {
            items[key].medallionLabel = '';
            const lbl = slot.querySelector('.medallion-label');
            if (lbl) lbl.textContent = '';
        }
    });

    // Reset all dungeon states
    const _ksMode = window.dungeonItemsMode();
    const _isShuffled = ['keysanity','mapcompass','mapcompasskeys','other'].includes(_ksMode);
    Object.keys(dungeons).forEach(function(key) {
        const d = dungeons[key];
        d.smallKeyCount = 0;
        d.smallKeyMax   = 0;
        d.itemCount     = 0;
        d.chestsMax     = 0;
        d.chestBits     = 0;
        d.skipped       = 0;
        d.bigkeyState   = 0;
        d.compassState  = 0;
        d.mapState      = 0;
        d.prizeState    = window.defaultPrizeIndex();
        d.bossState     = 0;
        d.otherCleared  = false;
        const slot = document.querySelector(`[data-dungeon-key="${key}"]`);
        if (!slot) return;
        // Reset prize image
        const prizeImg = slot.querySelector('.prize-img');
        if (prizeImg) prizeImg.src = `${BASE_URL}/${window.PRIZE_IMAGE_CYCLE[window.defaultPrizeIndex()]}`;
        // Reset bigkey/compass/map icons
        const bigkeyImg = slot.querySelector('.bigkey-img');
        if (bigkeyImg) bigkeyImg.src = `${BASE_URL}/bigkey0.png`;
        const compassImg = slot.querySelector('.compass-img');
        if (compassImg) compassImg.src = `${BASE_URL}/compass0.png`;
        const mapImg = slot.querySelector('.map-img');
        if (mapImg) mapImg.src = `${BASE_URL}/map0.png`;
        // Reset other chest
        const otherChest = slot.querySelector('.other-chest');
        if (otherChest) otherChest.src = `${BASE_URL}/chest0.png`;
        updateDungeonCountDisplay(key);
        // Reset boss circle back to boss0 (neutral)
        updateBossCircle(key);
    });

    // Reset stats display
    var checkEl = document.getElementById('toh-check-count');
    var deathEl = document.getElementById('toh-death-count');
    var bonkEl  = document.getElementById('toh-bonk-count');
    var heartEl = document.getElementById('toh-heartpiece-count');
    var revivalEl = document.getElementById('toh-revival-count');
    var fluteEl = document.getElementById('toh-flute-count');
    if (checkEl) checkEl.textContent = '0';
    if (deathEl) deathEl.textContent = '0';
    if (bonkEl)  bonkEl.textContent  = '0';
    if (heartEl) heartEl.textContent = '0/4';
    if (revivalEl) revivalEl.textContent = '0';
    if (fluteEl) fluteEl.textContent = '0';
    setHeaderChecks('0');
    setHeartFill(0);
    // Top-line crystal/pendant count widgets back to empty. Zeroing
    // window.trackerItems below resets the high-water base, but the visible spans
    // keep their old text until the next SRAM read — clear them now so New Game
    // blanks them immediately like the other counters.
    var _prizeReset = { 'crystal-count':'0/5', 'redcrystal-count':'0/2', 'pendant-count':'0/2', 'greenpendant-count':'0/1' };
    Object.keys(_prizeReset).forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.textContent = _prizeReset[id];
    });

    // Reset SRAM state so autotracking picks up fresh
    if (_bombClearTimer) { clearTimeout(_bombClearTimer); _bombClearTimer = null; }
    previousSRAM = null;
    previousRoomData = null;
    roomChunk1 = null;
    roomChunk1Time = 0;
    if (window.trackerItems) {
        window.trackerItems.bottle       = 0;
        window.trackerItems.crystals     = 0;
        window.trackerItems.pendants     = 0;
        window.trackerItems.greenPendant = 0;
        window.trackerItems.redCrystal   = 0;
        // Medallion assignments (MM / TR labels on bombos/ether/quake). The
        // item tracker's own labels are cleared above, but trackerItems is
        // what broadcastItemSnap sends to the broadcast view — without this,
        // the snap re-applies the old assignment after the newgame resetAll
        // already cleared the labels there.
        window.trackerItems.mmMedallion  = 0;
        window.trackerItems.trMedallion  = 0;
        // Reset every dungeon's per-dungeon small-key tracking. Previously
        // only CT and SP were cleared here, so the other nine dungeons kept
        // their stale *SmallKeysMax across New Game. Because the auto-tracker
        // updates trackerItems via Math.max(raw, prev), a stale prev (e.g. 85
        // from RetroArch garbage during save & quit) would never decrease
        // back to 0 — and the broadcast view, which reads small keys from
        // trackerItems, would show "85/1" while the item tracker (which
        // reads from dungeons[k].smallKeyCount) correctly showed 0.
        ['ct','sp','dp','toh','pod','sw','tt','ip','mm','tr','gt'].forEach(function(k) {
            window.trackerItems[k + 'SmallKeys']    = 0;
            window.trackerItems[k + 'SmallKeysMax'] = 0;
        });
        // While we're here, also clear the per-dungeon BigKey trackerItems
        // entries so the same staleness can't bite us on big-key visuals.
        ['ep','dp','toh','pod','sp','sw','tt','ip','mm','tr','gt'].forEach(function(k) {
            window.trackerItems[k + 'BigKey'] = 0;
        });
    }

    // If boss shuffle is off, re-seed vanilla bosses — resetItemTracker wiped them
    // and DOMContentLoaded won't fire again, so we must reapply manually.
    if (window._bossShuffle === 'no' && typeof setBoss === 'function') {
        var VANILLA_BOSSES = {
            ep: 1, dp: 2, toh: 3, pod: 4, sp: 5,
            sw: 6, tt: 7, ip: 8, mm: 9, tr: 10
        };
        Object.keys(VANILLA_BOSSES).forEach(function(key) {
            setBoss(key, VANILLA_BOSSES[key]);
        });
    }

    // Broadcast reset to map (guard prevents infinite loop)
    // Only broadcast if we weren't triggered BY a newgame message (avoid loop)
    if (!window._itemsResettingGame && window._itemsBc) window._itemsBc.postMessage({ type: 'newgame' });
    setTimeout(function() {}, 0); // yield before snap
    if (window.broadcastItemSnap) window.broadcastItemSnap();
    if (typeof broadcastPrizes === 'function') setTimeout(broadcastPrizes, 50);
    // Clear item-background fills now that every item is back to state 0
    if (window.refreshItemFills) window.refreshItemFills();
}

function manualReconnect() {
    const btn = document.getElementById('item-reconnect-btn') || document.querySelector('.reconnect-btn');
    if (btn) { btn.classList.add('reconnecting'); btn.disabled = true; }
    _stopReconnect();
    if (readTimer) { clearInterval(readTimer); readTimer = null; }
    deviceAttached = false;
    previousSRAM = null;
    updateConnectionStatus('Connecting');
    connectWebSocket(); // connectWebSocket now closes stale socket itself
    setTimeout(() => {
        if (btn) { btn.classList.remove('reconnecting'); btn.disabled = false; }
    }, 3000);
}

function ensureBottomBar() {
    // Bottom bar is in itemtracker.html — nothing to create
}

// Keep alias for legacy calls
function ensureReconnectButton() { ensureBottomBar(); }

function updateConnectionStatus(status) {
    // Relay the SNI/autotracker connection status to the overlay WebSocket API
    // (main broadcasts it as the HoellTracker 'sni:connection-status' channel).
    // Sent before the UI-div guard so it always propagates.
    if (window.electronAPI && window.electronAPI.sendApiConnection) {
        window.electronAPI.sendApiConnection({
            status: status === 'Connected' ? 'connected' : (status === 'Connecting' ? 'connecting' : 'disconnected'),
            backend: 'qusb2snes',
            detail: status
        });
    }

    let statusDiv = document.getElementById('item-conn-status') ||
                    document.querySelector('.connection-status');
    if (!statusDiv) return;
    
    const statusText = {
        'Connected': '● Connected',
        'Connecting': '○ Connecting',
        'Disconnected': '○ Disconnected',
        'Error': '○ Error',
        'No device found': '○ No device'
    };
    
    const statusColor = {
        'Connected': '#2ecc71',
        'Connecting': '#f39c12',
        'Disconnected': '#e74c3c',
        'Error': '#e74c3c',
        'No device found': '#e67e22'
    };
    
    statusDiv.textContent = statusText[status] || status;
    statusDiv.style.color = statusColor[status] || '#95a5a6';
}

// ── Swordless mode ────────────────────────────────────────────────────────────
// Swaps the *empty* sword slot between sword0.png and swordno.png. Only state 0
// changes — a player who already has a sword keeps seeing it, and the higher
// states stay intact so nothing breaks if the flag is turned back off.
//
// Reversible and idempotent on purpose: the map's settings menu can toggle
// swordless at any time and this gets called again with the new value.
var _swordBaseImg = null;   // the original state-0 image, captured once

window.applySwordlessMode = function(on) {
    if (!items['sword'] || !items['sword'].states || !items['sword'].states[0]) return;
    var st0 = items['sword'].states[0];
    if (_swordBaseImg === null) _swordBaseImg = st0.img;

    var want = on ? _swordBaseImg.replace(/sword\d\.png/, 'swordno.png') : _swordBaseImg;
    if (st0.img === want) return;   // nothing to do
    st0.img = want;

    // Repaint the slot only if it is actually showing state 0.
    if ((items['sword'].currentState || 0) === 0) {
        var swordSlot = document.querySelector('[data-item-key="sword"]');
        var swordImg  = swordSlot && swordSlot.querySelector('img');
        if (swordImg) swordImg.src = want;
    }
};

// The seed's swordless flag right now: URL param first, then localStorage.
window.swordlessFlag = function() {
    try {
        return (new URLSearchParams(window.location.search).get('swordless')
             || localStorage.getItem('alttp-swordless')
             || 'no') === 'yes';
    } catch (e) { return false; }
};

// The map's settings menu writes alttp-swordless from another window, which
// fires a storage event here. (The checklist bridge relies on the same
// mechanism — BroadcastChannel isn't reliable across Electron windows.)
window.addEventListener('storage', function(ev) {
    if (ev.key !== 'alttp-swordless') return;
    window.applySwordlessMode(ev.newValue === 'yes');
});

// macOS: Ctrl+click is the right-click. Chromium sends it as a contextmenu
// AND an ordinary click, so every control with both a left- and right-click
// action did both — right-clicking a prize to mark it collected also cycled it
// one step on (crystal → red crystal, pendant → green pendant; Chris, Oct
// 2026). The contextmenu handler is the one that means it, so the click is
// swallowed before any element sees it.
window.addEventListener('click', function (e) {
  if (e.ctrlKey) { e.stopPropagation(); e.preventDefault(); }
}, true);

document.addEventListener('DOMContentLoaded', () => {
    try {
        createTracker();
        window.applySwordlessMode(window.swordlessFlag());
        // After the first layout, so the boxes have real widths to match.
        requestAnimationFrame(function() { window.equalizeTopBoxes(); });
        // WebSocket is managed by itemtracker.html
    } catch (error) {
        console.error('Error initializing tracker:', error);
    }
});
