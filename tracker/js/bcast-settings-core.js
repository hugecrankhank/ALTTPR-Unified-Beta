// ── Broadcast settings core (shared) ─────────────────────────────────────────
// Single source of truth for the broadcast SETTINGS schema, load and save.
// Included by BOTH the broadcast view (broadcast.html) and the settings popout
// (bcast-settings.html) so the two never drift. Contains NO DOM / view code —
// the view keeps its apply-* functions; the popout keeps the settings UI.

var SETTINGS = {
  bg:           'black',
  bgImage:      '',          // data: URL of uploaded background image
  fillEnabled:  false,
  fillColor:    'green',     // green | blue | purple | custom (top-right of diagonal)
  fillCustom:   '#00aa00',
  fillColor2:   'purple',    // green | blue | purple | custom (bottom-left of diagonal)
  fillCustom2:  '#b675ff',
  fillEffect:   'none',      // none | falling | starburst
  chestsColor:  'blue',      // blue | green | purple | yellow | custom — All chests collected tint
  chestsCustom: '#5a8eff',
  completeColor:'green',     // green | blue | purple | yellow | custom — Dungeon complete tint
  completeCustom:'#4dff88',
  showMap:       true,
  showCompass:   true,
  showSmallKeys: true,
  showBigKey:    true,
  showChests:    true,
  dungeonFillEnabled: true, // When false the chests-done/prize-done tints are suppressed
  dungeonBoxEnabled:  true, // When false the default dark slot container is hidden — flat dungeons
  viewStyle:       'modern',     // 'modern' | 'classic'
  itemAnimEnabled: false,        // When true, full-screen spin-in animation on item collect
  animShowLabel:   true,         // Show item name at bottom during animation
  mapAnimEnabled:    true,       // Play the collect animation when a dungeon map is obtained
  compassAnimEnabled: true,      // Play the collect animation when a dungeon compass is obtained
  bigKeyAnimEnabled: true,       // Play the collect animation when a big key is obtained
  gomodeSoundEnabled: false,     // Play a sound when Go Mode (level 1) is activated
  gomodeSoundData:    '',        // data: URL of the audio file
  sparkColors:      ['#22cc55','#66ff88','#aaffbb','#4488ff','#88bbff','#cc44ff'],  // default
  gomodeSparksEnabled: false,
  animBg:           'none',      // 'none' | 'stars' | 'starburst' | 'matrix' | 'triforce' | 'lightning' | 'image' | 'random'
  animBgImage:      '',          // data URL for anim background image (empty = use triforce.jpg)
  animRandomPool:   { stars: true, starburst: true, matrix: true, triforce: true, lightning: true, image: true }, // eligible bgs when animBg==='random'
  // Relative weight of each pool entry; only the checked ones count, and each
  // one's chance is its weight over their total. Equal by default.
  animRandomWeights: { stars: 1, starburst: 1, matrix: 1, triforce: 1, lightning: 1, image: 1 },
  // These three are the *live* colours — whichever animation is running (or is
  // selected in the settings popout) writes its pair here, so every drawing
  // routine can keep reading SETTINGS.animColorA/B without knowing about the
  // per-animation map below.
  animColorPreset:  'blue',      // 'blue' | 'green' | 'purple' | 'yellow' | 'custom'
  animColorA:       '#3498db',   // color A (primary)
  animColorB:       '#88ccff',   // color B (lighter complement)
  // Per-animation colour themes. Each animated background remembers its own
  // preset and colour pair; see ANIM_COLOR_DEFAULTS.
  animColors:       null         // filled in below
};

// Backgrounds that have their own colour theme (none/image/random do not).
var ANIM_COLOR_KEYS = ['stars', 'starburst', 'matrix', 'triforce', 'lightning'];

// Out-of-the-box themes, chosen to suit each animation. Anyone upgrading from
// the old single-colour build keeps their existing colour on all five instead
// (see the migration in loadSettings).
var ANIM_COLOR_DEFAULTS = {
  stars:     { preset: 'blue',   a: '#3498db', b: '#88ccff' },
  starburst: { preset: 'purple', a: '#b675ff', b: '#ddb8ff' },
  matrix:    { preset: 'green',  a: '#2ecc71', b: '#88ffbb' },
  triforce:  { preset: 'yellow', a: '#ffcc44', b: '#fff3c4' },
  lightning: { preset: 'yellow', a: '#ffcc44', b: '#fff3c4' }
};

function _defaultAnimColors() {
  var out = {};
  for (var i = 0; i < ANIM_COLOR_KEYS.length; i++) {
    var k = ANIM_COLOR_KEYS[i], d = ANIM_COLOR_DEFAULTS[k];
    out[k] = { preset: d.preset, a: d.a, b: d.b };
  }
  return out;
}
SETTINGS.animColors = _defaultAnimColors();

// The colour theme for a given background. Backgrounds without a theme of
// their own (none/image/random) fall back to the live values.
function animColorsFor(bg) {
  var m = SETTINGS.animColors || {};
  if (m[bg]) return m[bg];
  return { preset: SETTINGS.animColorPreset, a: SETTINGS.animColorA, b: SETTINGS.animColorB };
}

// Copy a background's theme into the live values that the drawing code reads.
function applyAnimColorsFor(bg) {
  var c = animColorsFor(bg);
  SETTINGS.animColorPreset = c.preset;
  SETTINGS.animColorA      = c.a;
  SETTINGS.animColorB      = c.b;
  return c;
}

// Write the live values back into a background's theme.
function storeAnimColorsFor(bg) {
  if (!SETTINGS.animColors) SETTINGS.animColors = _defaultAnimColors();
  if (ANIM_COLOR_KEYS.indexOf(bg) === -1) return;
  SETTINGS.animColors[bg] = {
    preset: SETTINGS.animColorPreset,
    a:      SETTINGS.animColorA,
    b:      SETTINGS.animColorB
  };
}

var FILL_COLORS = {
  green:  '#2ecc71',
  blue:   '#3498db',
  purple: '#b675ff'
};
// Darker variants used for the second (bottom-left) fill color presets.
var FILL_COLORS_DARK = {
  green:  '#176b3b',
  blue:   '#1c5478',
  purple: '#5e3d99'
};

var DUNGEON_PRESETS = {
  blue:   '#5a8eff',
  green:  '#4dff88',
  purple: '#b675ff',
  yellow: '#ffcc44'
};

function loadSettings() {
  try {
    SETTINGS.bg            = localStorage.getItem('alttp-broadcast-bg') || SETTINGS.bg;
    SETTINGS.bgImage       = localStorage.getItem('alttp-broadcast-bg-image') || '';
    SETTINGS.fillEnabled   = localStorage.getItem('alttp-broadcast-fill-enabled') === 'true';
    SETTINGS.fillColor     = localStorage.getItem('alttp-broadcast-fill-color')   || SETTINGS.fillColor;
    SETTINGS.fillCustom    = localStorage.getItem('alttp-broadcast-fill-custom')  || SETTINGS.fillCustom;
    SETTINGS.fillColor2    = localStorage.getItem('alttp-broadcast-fill-color-2')  || SETTINGS.fillColor2;
    SETTINGS.fillCustom2   = localStorage.getItem('alttp-broadcast-fill-custom-2') || SETTINGS.fillCustom2;
    SETTINGS.fillEffect    = localStorage.getItem('alttp-broadcast-fill-effect')  || SETTINGS.fillEffect;
    SETTINGS.chestsColor   = localStorage.getItem('alttp-broadcast-chests-color') || SETTINGS.chestsColor;
    SETTINGS.chestsCustom  = localStorage.getItem('alttp-broadcast-chests-custom')|| SETTINGS.chestsCustom;
    SETTINGS.completeColor = localStorage.getItem('alttp-broadcast-complete-color') || SETTINGS.completeColor;
    SETTINGS.completeCustom= localStorage.getItem('alttp-broadcast-complete-custom')|| SETTINGS.completeCustom;
    // Default-on flags use !== 'false' so first-run / never-set means visible
    SETTINGS.showMap       = localStorage.getItem('alttp-broadcast-show-map')        !== 'false';
    SETTINGS.showCompass   = localStorage.getItem('alttp-broadcast-show-compass')    !== 'false';
    SETTINGS.showSmallKeys = localStorage.getItem('alttp-broadcast-show-smallkeys')  !== 'false';
    SETTINGS.showBigKey    = localStorage.getItem('alttp-broadcast-show-bigkey')     !== 'false';
    SETTINGS.showChests    = localStorage.getItem('alttp-broadcast-show-chests')     !== 'false';
    SETTINGS.dungeonFillEnabled = localStorage.getItem('alttp-broadcast-dungeon-fill') !== 'false';
    SETTINGS.dungeonBoxEnabled  = localStorage.getItem('alttp-broadcast-dungeon-box')  !== 'false';
    SETTINGS.viewStyle       = localStorage.getItem('alttp-broadcast-view-style')        || SETTINGS.viewStyle;
    SETTINGS.itemAnimEnabled    = localStorage.getItem('alttp-broadcast-item-anim') === 'true';
    SETTINGS.animShowLabel      = localStorage.getItem('alttp-broadcast-anim-label') !== 'false';
    SETTINGS.mapAnimEnabled     = localStorage.getItem('alttp-broadcast-map-anim') !== 'false';
    SETTINGS.compassAnimEnabled = localStorage.getItem('alttp-broadcast-compass-anim') !== 'false';
    SETTINGS.bigKeyAnimEnabled  = localStorage.getItem('alttp-broadcast-bigkey-anim') !== 'false';
    SETTINGS.gomodeSoundEnabled = localStorage.getItem('alttp-broadcast-gomode-sound') === 'true';
    SETTINGS.gomodeSoundData    = localStorage.getItem('alttp-broadcast-gomode-sound-data') || '';
    var sc = localStorage.getItem('alttp-broadcast-spark-colors');
    if (sc) try { SETTINGS.sparkColors = JSON.parse(sc); } catch(e2) {}
    // Spark lines are Max-only — always disabled in this build
    SETTINGS.gomodeSparksEnabled = false;
    SETTINGS.animBg          = localStorage.getItem('alttp-broadcast-anim-bg')            || SETTINGS.animBg;
    // 'rain' shipped briefly in v1.1.17 and was replaced by Lightning; migrate
    // anyone who had it selected so they don't silently land on a blank bg.
    if (SETTINGS.animBg === 'rain') SETTINGS.animBg = 'lightning';
    SETTINGS.animBgImage     = localStorage.getItem('alttp-broadcast-anim-bg-image')      || '';
    try {
      var _rp = JSON.parse(localStorage.getItem('alttp-broadcast-anim-random-pool') || 'null');
      if (_rp && typeof _rp === 'object') SETTINGS.animRandomPool = { stars: !!_rp.stars, starburst: !!_rp.starburst, matrix: !!_rp.matrix, triforce: (_rp.triforce === undefined ? true : !!_rp.triforce), lightning: (_rp.lightning === undefined ? true : !!_rp.lightning), image: !!_rp.image };
    } catch(e) {}
    try {
      var _rw = JSON.parse(localStorage.getItem('alttp-broadcast-anim-random-weights') || 'null');
      if (_rw && typeof _rw === 'object') SETTINGS.animRandomWeights = _rw;
    } catch(e) {}
    var _legacyPreset = localStorage.getItem('alttp-broadcast-anim-color-preset');
    var _legacyA      = localStorage.getItem('alttp-broadcast-anim-color-a');
    var _legacyB      = localStorage.getItem('alttp-broadcast-anim-color-b');
    SETTINGS.animColorPreset = _legacyPreset || SETTINGS.animColorPreset;
    SETTINGS.animColorA      = _legacyA      || SETTINGS.animColorA;
    SETTINGS.animColorB      = _legacyB      || SETTINGS.animColorB;

    // Per-animation colour themes.
    SETTINGS.animColors = _defaultAnimColors();
    var _acRaw = localStorage.getItem('alttp-broadcast-anim-colors');
    if (_acRaw) {
      try {
        var _ac = JSON.parse(_acRaw);
        if (_ac && typeof _ac === 'object') {
          for (var _ai = 0; _ai < ANIM_COLOR_KEYS.length; _ai++) {
            var _k = ANIM_COLOR_KEYS[_ai], _e = _ac[_k];
            if (_e && typeof _e === 'object' && _e.a && _e.b) {
              SETTINGS.animColors[_k] = { preset: _e.preset || 'custom', a: _e.a, b: _e.b };
            }
          }
        }
      } catch (e2) {}
    } else if (_legacyA && _legacyB) {
      // Upgrading from the single-colour build: the one colour the player had
      // chosen becomes the theme for every animation, so nothing looks
      // different until they deliberately change one.
      for (var _mi = 0; _mi < ANIM_COLOR_KEYS.length; _mi++) {
        SETTINGS.animColors[ANIM_COLOR_KEYS[_mi]] =
          { preset: _legacyPreset || 'custom', a: _legacyA, b: _legacyB };
      }
    }
    // Make the live values match whichever animation is selected.
    if (ANIM_COLOR_KEYS.indexOf(SETTINGS.animBg) !== -1) applyAnimColorsFor(SETTINGS.animBg);
  } catch (e) {}
  // URL bg overrides stored bg
  var p = new URLSearchParams(window.location.search);
  var urlBg = p.get('bg');
  if (urlBg) SETTINGS.bg = urlBg;
  // Fall back to black if "image" is selected but we have no stored image
  if (SETTINGS.bg === 'image' && !SETTINGS.bgImage) SETTINGS.bg = 'black';
}

function saveSettings() {
  try {
    localStorage.setItem('alttp-broadcast-bg',             SETTINGS.bg);
    localStorage.setItem('alttp-broadcast-fill-enabled',   SETTINGS.fillEnabled ? 'true' : 'false');
    localStorage.setItem('alttp-broadcast-fill-color',     SETTINGS.fillColor);
    localStorage.setItem('alttp-broadcast-fill-custom',    SETTINGS.fillCustom);
    localStorage.setItem('alttp-broadcast-fill-color-2',   SETTINGS.fillColor2);
    localStorage.setItem('alttp-broadcast-fill-custom-2',  SETTINGS.fillCustom2);
    localStorage.setItem('alttp-broadcast-fill-effect',    SETTINGS.fillEffect);
    localStorage.setItem('alttp-broadcast-chests-color',   SETTINGS.chestsColor);
    localStorage.setItem('alttp-broadcast-chests-custom',  SETTINGS.chestsCustom);
    localStorage.setItem('alttp-broadcast-complete-color', SETTINGS.completeColor);
    localStorage.setItem('alttp-broadcast-complete-custom',SETTINGS.completeCustom);
    localStorage.setItem('alttp-broadcast-show-map',        SETTINGS.showMap       ? 'true' : 'false');
    localStorage.setItem('alttp-broadcast-show-compass',    SETTINGS.showCompass   ? 'true' : 'false');
    localStorage.setItem('alttp-broadcast-show-smallkeys',  SETTINGS.showSmallKeys ? 'true' : 'false');
    localStorage.setItem('alttp-broadcast-show-bigkey',     SETTINGS.showBigKey    ? 'true' : 'false');
    localStorage.setItem('alttp-broadcast-show-chests',     SETTINGS.showChests    ? 'true' : 'false');
    localStorage.setItem('alttp-broadcast-dungeon-fill',    SETTINGS.dungeonFillEnabled ? 'true' : 'false');
    localStorage.setItem('alttp-broadcast-dungeon-box',     SETTINGS.dungeonBoxEnabled  ? 'true' : 'false');
    localStorage.setItem('alttp-broadcast-view-style',      SETTINGS.viewStyle);
    localStorage.setItem('alttp-broadcast-item-anim',        SETTINGS.itemAnimEnabled    ? 'true' : 'false');
    localStorage.setItem('alttp-broadcast-anim-label',      SETTINGS.animShowLabel      ? 'true' : 'false');
    localStorage.setItem('alttp-broadcast-map-anim',        SETTINGS.mapAnimEnabled     ? 'true' : 'false');
    localStorage.setItem('alttp-broadcast-compass-anim',    SETTINGS.compassAnimEnabled ? 'true' : 'false');
    localStorage.setItem('alttp-broadcast-bigkey-anim',     SETTINGS.bigKeyAnimEnabled  ? 'true' : 'false');
    localStorage.setItem('alttp-broadcast-gomode-sound',    SETTINGS.gomodeSoundEnabled ? 'true' : 'false');
    localStorage.setItem('alttp-broadcast-spark-colors',   JSON.stringify(SETTINGS.sparkColors));
    localStorage.setItem('alttp-broadcast-gomode-sparks',  SETTINGS.gomodeSparksEnabled ? 'true' : 'false');
    localStorage.setItem('alttp-broadcast-anim-bg',            SETTINGS.animBg);
    localStorage.setItem('alttp-broadcast-anim-random-pool',   JSON.stringify(SETTINGS.animRandomPool || {}));
    localStorage.setItem('alttp-broadcast-anim-random-weights', JSON.stringify(SETTINGS.animRandomWeights || {}));
    localStorage.setItem('alttp-broadcast-anim-color-preset', SETTINGS.animColorPreset);
    localStorage.setItem('alttp-broadcast-anim-color-a',      SETTINGS.animColorA);
    localStorage.setItem('alttp-broadcast-anim-color-b',      SETTINGS.animColorB);
    localStorage.setItem('alttp-broadcast-anim-colors',       JSON.stringify(SETTINGS.animColors || {}));
  } catch (e) {}
}

// Broadcast a "settings changed" ping so the live view re-applies. Used by the
// settings popout; harmless if no view is listening.
function notifyBcastSettingsChanged() {
  try { new BroadcastChannel('alttp-tracker').postMessage({ type: 'bcast-settings-changed' }); } catch (e) {}
}
