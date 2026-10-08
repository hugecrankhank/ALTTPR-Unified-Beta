// The Kara-branch settings in the Randomizer bar: a preset picker and her
// settings as dropdowns, with her help text as tooltips. The main ones sit in
// the bar; the rest are under "More Kara settings".

import { SETTINGS, PRESETS, normalize, presetSettings, presetOf } from './index.js';

const STORE = 'unified-kara-gk-settings';
const WHERE_STORE = 'unified-kara-gk-where';

// Where seeds are made, and (on her server) normal or race. A plain select
// with tooltips, like the settings.
function choice(id, label, tip, options, value, onChange) {
  const l = document.createElement('label');
  l.className = 'f';
  l.append(label);
  l.title = tip;
  const sel = document.createElement('select');
  sel.id = id;
  options.forEach(([v, text, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = text; if (t) o.title = t; sel.appendChild(o); });
  sel.value = value;
  sel.addEventListener('change', onChange);
  l.appendChild(sel);
  return l;
}

const MAIN = ['mode', 'weapons', 'goal', 'crystals_ganon', 'crystals_gt', 'entrance_shuffle', 'door_shuffle',
  'small_keys', 'big_keys', 'boss_shuffle', 'enemy_shuffle', 'hints'];
const MORE = [
  ['Goal', ['bosses_ganon', 'triforce_pieces', 'ganon_item', 'require_ganon_item']],
  ['Dungeons', ['maps', 'compasses', 'prize_shuffle', 'lobbies', 'door_type_mode', 'trap_door_mode', 'extra_keys']],
  ['Entrances', ['overworld_map_dungeons', 'links_house', 'skull_woods', 'linked_drops']],
  ['Items', ['boots', 'flute', 'mirror', 'bombs', 'book', 'dark_rooms', 'follower_shuffle']],
  ['Shuffled locations', ['shop_shuffle', 'drop_shuffle', 'pot_shuffle']],
  ['Overworld', ['overworld_layout', 'overworld_world_layouts', 'overworld_layout_terrain', 'overworld_layout_edges',
    'tile_swap', 'flute_shuffle', 'overworld_map_fog']],
  ['Enemies and damage', ['damage_table_shuffle', 'damage_challenge']],
  ['Display', ['show_loot_map', 'show_loot_hud', 'show_map']],
];

const BY_KEY = Object.fromEntries(SETTINGS.map((s) => [s.key, s]));

function field(def, onChange) {
  const label = document.createElement('label');
  label.className = 'f';
  label.append(def.label);
  const sel = document.createElement('select');
  sel.id = 'rk-' + def.key;
  sel.dataset.key = def.key;
  def.values.forEach(([v, text, tip]) => {
    const o = document.createElement('option');
    o.value = v; o.textContent = text;
    if (tip) o.title = tip;
    sel.appendChild(o);
  });
  const tipFor = () => {
    const v = def.values.find((x) => x[0] === sel.value);
    return [def.tip, v && v[2]].filter(Boolean).join('\n\n');
  };
  sel.addEventListener('change', () => { label.title = tipFor(); onChange(); });
  label.appendChild(sel);
  label._sync = () => { label.title = tipFor(); };
  return label;
}

/**
 * Build the fields. Returns { get(), set(settings), save() }.
 * main: where the preset and main settings go; more: the "More" panel's body.
 */
export function buildUi(main, more) {
  const fields = {};
  let saving = true;

  let saved0 = {};
  try { saved0 = JSON.parse(localStorage.getItem(WHERE_STORE) || '{}') || {}; } catch (e) {}
  const saveWhere = () => {
    try { localStorage.setItem(WHERE_STORE, JSON.stringify({ where: where.querySelector('select').value, race: race.querySelector('select').value })); } catch (e) {}
    race.hidden = where.querySelector('select').value !== 'server';
    if (onWhere) onWhere();
  };
  let onWhere = null;
  const where = choice('rk-where', 'Made by',
    'Kara\'s server: the same seeds her site makes, and race seeds with the spoiler locked on her server. '
    + 'This browser: her generator runs here, no server needed (race links are honor system).',
    [['server', 'Kara\'s server'], ['browser', 'This browser']], saved0.where === 'browser' ? 'browser' : 'server', () => saveWhere());
  const race = choice('rk-race', 'Seed type',
    'Race: made with her race setting; the spoiler stays on her server and nobody can see it.',
    [['normal', 'Normal'], ['race', 'Race']], saved0.race === 'race' ? 'race' : 'normal', () => saveWhere());
  race.hidden = where.querySelector('select').value !== 'server';
  main.append(where, race);

  const presetLabel = document.createElement('label');
  presetLabel.className = 'f';
  presetLabel.append('Preset');
  presetLabel.title = 'Kara\'s presets from alttpr.gwaa.kiwi';
  const preset = document.createElement('select');
  preset.id = 'rk-preset';
  PRESETS.forEach((p) => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.label; preset.appendChild(o); });
  const custom = document.createElement('option');
  custom.value = ''; custom.textContent = 'Custom';
  preset.appendChild(custom);
  presetLabel.appendChild(preset);
  main.appendChild(presetLabel);

  const changed = () => {
    preset.value = presetOf(get());
    if (saving) save();
  };
  MAIN.forEach((k) => { fields[k] = field(BY_KEY[k], changed); main.appendChild(fields[k]); });
  MORE.forEach(([title, keys]) => {
    const g = document.createElement('div');
    g.className = 'group kara-group';
    const h = document.createElement('div');
    h.className = 'kara-group-title';
    h.textContent = title;
    g.appendChild(h);
    keys.forEach((k) => { fields[k] = field(BY_KEY[k], changed); g.appendChild(fields[k]); });
    more.appendChild(g);
  });

  function get() {
    const o = {};
    Object.entries(fields).forEach(([k, l]) => { o[k] = l.querySelector('select').value; });
    return normalize(o);
  }
  function set(settings, { persist = true } = {}) {
    const s = normalize(settings);
    Object.entries(fields).forEach(([k, l]) => { l.querySelector('select').value = s[k]; l._sync(); });
    preset.value = presetOf(s);
    if (persist) save();
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(get())); } catch (e) {}
  }
  preset.addEventListener('change', () => { if (preset.value) set(presetSettings(preset.value)); });

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) {}
  set(saved || presetSettings('default'), { persist: false });
  return {
    get, set, save,
    where: () => where.querySelector('select').value,
    race: () => where.querySelector('select').value === 'server' && race.querySelector('select').value === 'race',
    onWhere(fn) { onWhere = fn; },
    // while a shared seed's settings are showing, don't overwrite the
    // player's own saved choices
    hold(on) { saving = !on; },
  };
}
