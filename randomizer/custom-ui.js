// The Customizer fold-out in the Randomizer bar (alttpr.com generator only):
// alttpr.com's Customizer menus, each its own dropdown, plus presets.
// The lists come from the generator (custom.js), loaded the first time the
// fold-out opens or a customized seed is made.

const LS_STATE = 'unified-custom-state';
const LS_ON = 'unified-custom-on';
const LS_PRESETS = 'unified-custom-presets';
const LS_PRESET = 'unified-custom-preset';
// the bar's settings a preset keeps (the generator choice itself is not one)
const BAR_FIELDS = ['r-mode', 'r-goal', 'r-tower', 'r-ganon', 'r-weapons', 'r-placement', 'r-dungeon', 'r-access',
  'r-pool', 'r-func', 'r-hints', 'r-heartbeep', 'r-menuspeed', 'r-quickswap'];
const IMG = 'tracker/items/';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

let C = null;          // custom.js, once loaded
let state = null;      // the customizer's settings
let loading = null;
let say = () => {};    // the bar's status line

async function load() {
  if (C) return C;
  if (!loading) {
    loading = import('./custom.js').then((m) => {
      C = m;
      state = C.normalizeState(lsGet(LS_STATE, null));
      return m;
    });
  }
  return loading;
}

function save() {
  if (!state) return;
  if (!lsSet(LS_STATE, state)) say('Couldn\'t save the customizer settings in this browser (storage is full or blocked).', 'bad');
  if (lsGet(LS_PRESET, '')) { lsSet(LS_PRESET, ''); paintPresets(); }   // edited: no longer exactly the preset
}

export const customizerOn = () => !!$('r-custom-on') && $('r-custom-on').checked;

/** The request for a customized seed, from the bar's own settings. */
export async function customRequest(main) {
  await load();
  return {
    req: C.buildRequest(main, state),
    trackerDungeonItems: (fallback) => C.trackerDungeonItems(state, fallback),
    poolOff: C.poolTotal(state) !== C.catalog().itemSlots,
  };
}

// ── presets ──────────────────────────────────────────────────────────────────
function barFields() {
  const o = {};
  BAR_FIELDS.forEach((id) => { if ($(id)) o[id] = $(id).value; });
  return o;
}
function applyBarFields(fields) {
  for (const [id, v] of Object.entries(fields || {})) {
    const el = $(id);
    if (!el || !BAR_FIELDS.includes(id) || ![...el.options].some((op) => op.value === v)) continue;
    if (el.value !== v) { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }
  }
}
function presets() { const p = lsGet(LS_PRESETS, {}); return p && typeof p === 'object' ? p : {}; }

function paintPresets() {
  const sel = $('r-custom-preset');
  if (!sel) return;
  const cur = lsGet(LS_PRESET, '');
  const names = Object.keys(presets()).sort((a, b) => a.localeCompare(b));
  sel.innerHTML = `<option value="">${names.length ? 'Choose a preset…' : 'No presets saved yet'}</option>`
    + names.map((n) => `<option value="${esc(n)}"${n === cur ? ' selected' : ''}>${esc(n)}</option>`).join('');
  $('r-custom-del').disabled = !cur;
  paintBadge();
}

function paintBadge() {
  const b = $('r-custom-badge');
  if (!b) return;
  const cur = lsGet(LS_PRESET, '');
  b.textContent = customizerOn() ? (cur ? `On · ${cur}` : 'On') : 'Off';
  b.classList.toggle('on', customizerOn());
  document.body.classList.toggle('custom-on', customizerOn());
}

async function applyPreset(p, name) {
  await load();
  state = C.normalizeState(p.custom);
  lsSet(LS_STATE, state);
  applyBarFields(p.fields);
  if (typeof p.useCustomizer === 'boolean') { $('r-custom-on').checked = p.useCustomizer; lsSet(LS_ON, p.useCustomizer); }
  lsSet(LS_PRESET, name || '');
  renderAll();
  paintPresets();
}

function savePreset() {
  const input = $('r-custom-name');
  const name = input.value.trim().slice(0, 60);
  if (!name) { say('Type a name for the preset first.', 'bad'); input.focus(); return; }
  const all = presets();
  const over = name in all;
  all[name] = { v: 1, savedAt: new Date().toISOString(), useCustomizer: customizerOn(), fields: barFields(), custom: state };
  if (!lsSet(LS_PRESETS, all)) { say('Couldn\'t save the preset: this browser\'s storage is full or blocked.', 'bad'); return; }
  lsSet(LS_PRESET, name);
  input.value = '';
  paintPresets();
  say(`${over ? 'Updated' : 'Saved'} preset "${name}". Pick it from Presets any time to roll seeds with these settings.`, 'ok');
}

function deletePreset() {
  const name = $('r-custom-preset').value;
  if (!name) return;
  if (!window.confirm(`Delete the preset "${name}"?`)) return;
  const all = presets();
  delete all[name];
  lsSet(LS_PRESETS, all);
  lsSet(LS_PRESET, '');
  paintPresets();
  say(`Deleted preset "${name}".`, 'ok');
}

function downloadJson(obj, name) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function exportPresets() {
  const name = $('r-custom-preset').value;
  const all = presets();
  if (name && all[name]) {
    downloadJson({ alttprUnifiedPresets: 1, presets: { [name]: all[name] } }, `${name.replace(/[^\w\- ]+/g, '_')}-preset.json`);
  } else {
    const cur = { v: 1, savedAt: new Date().toISOString(), useCustomizer: customizerOn(), fields: barFields(), custom: state };
    downloadJson({ alttprUnifiedPresets: 1, presets: { ...all, 'Current settings': cur } }, 'alttpr-unified-presets.json');
  }
}

async function importFile(file) {
  await load();
  let json;
  try { json = JSON.parse(await file.text()); } catch (e) { say('That file isn\'t a preset or customizer settings file.', 'bad'); return; }
  const base = file.name.replace(/(-settings|-preset)?\.json$/i, '') || 'Imported';
  if (json && json.alttprUnifiedPresets && json.presets && typeof json.presets === 'object') {
    const all = presets();
    const names = Object.keys(json.presets).filter((n) => json.presets[n] && json.presets[n].custom);
    names.forEach((n) => { all[n] = json.presets[n]; });
    lsSet(LS_PRESETS, all);
    if (names.length === 1) await applyPreset(all[names[0]], names[0]);
    else paintPresets();
    say(names.length ? `Imported ${names.length} preset${names.length === 1 ? '' : 's'}${names.length === 1 ? ` ("${names[0]}") and switched to it` : ''}.` : 'No presets in that file.', names.length ? 'ok' : 'bad');
    return;
  }
  const fromSite = C.fromAlttprSave(json);
  if (fromSite) {
    let name = base, i = 2;
    const all = presets();
    while (all[name]) name = `${base} (${i++})`;
    all[name] = { v: 1, savedAt: new Date().toISOString(), useCustomizer: true, fields: fromSite.fields, custom: fromSite.state };
    lsSet(LS_PRESETS, all);
    await applyPreset(all[name], name);
    say(`Imported alttpr.com customizer settings as the preset "${name}".`, 'ok');
    return;
  }
  say('That file isn\'t a preset or an alttpr.com customizer save file.', 'bad');
}

async function resetAll() {
  if (!window.confirm('Reset every customizer menu to alttpr.com\'s defaults? Saved presets are kept.')) return;
  await load();
  state = C.defaultState();
  lsSet(LS_STATE, state);
  lsSet(LS_PRESET, '');
  renderAll();
  paintPresets();
  say('Customizer reset to the defaults.', 'ok');
}

// ── the menus ────────────────────────────────────────────────────────────────
const SECTIONS = [
  ['settings', 'Settings', 'prizes, dungeon items outside dungeons, timer, limits'],
  ['logic', 'Logic', 'glitches the logic may expect'],
  ['equipment', 'Starting Equipment', 'items, hearts and rupees Link starts with'],
  ['pool', 'Item Pool', 'how many of each item'],
  ['locations', 'Locations', 'put a chosen item in a chosen spot'],
  ['droppool', 'Prize Pack Pool', 'what enemies can drop'],
  ['packs', 'Prize Packs', 'each drop pack, slot by slot'],
  ['details', 'Game Details', 'name and notes for the spoiler'],
];

// a "?" beside a setting: its help shows under it on a tap (hover text alone doesn't work on touch screens)
const q = (help) => (help ? `<button type="button" class="cz-q" data-help="${esc(help)}" aria-label="What does this do?" aria-expanded="false">?</button>` : '');

function toggleRow(key, label, help, on, disabled = false) {
  return `<div class="cz-cell"><label class="cz-toggle" title="${esc(help || '')}"><input type="checkbox" data-k="${esc(key)}"${on ? ' checked' : ''}${disabled ? ' disabled' : ''}>`
    + `<span class="cz-switch" aria-hidden="true"></span><span>${esc(label)}</span></label>${q(help)}</div>`;
}
const fieldLabel = (label, help) => `<span class="cz-flbl">${esc(label)}${q(help)}</span>`;

function showHelp(btn) {
  const cell = btn.closest('.cz-cell, .cz-f');
  const grid = cell && cell.parentElement;
  if (!grid) return;
  const open = grid.querySelector('.cz-help');
  const was = open && open.czFor === btn;
  if (open) { open.czFor.setAttribute('aria-expanded', 'false'); open.remove(); }
  if (was) return;
  const p = document.createElement('p');
  p.className = 'cz-help';
  p.textContent = btn.dataset.help;
  p.czFor = btn;
  btn.setAttribute('aria-expanded', 'true');
  // under the row the setting is on (the grid wraps), so it reads next to it
  const cells = [...grid.children].filter((c) => c !== p);
  const top = cell.offsetTop;
  let after = cell;
  for (const c of cells) if (c.offsetTop === top) after = c;
  after.after(p);
}

function renderSettings(el) {
  const s = state.settings;
  el.innerHTML = `<div class="cz-grid">${C.SETTINGS.map((o) => toggleRow(o.key, o.label, o.help, !!s[o.key])).join('')}</div>`
    + `<div class="cz-grid cz-fields">${C.SELECTS.map((o) => `<label class="cz-f" title="${esc(o.help)}">${fieldLabel(o.label, o.help)}<select data-k="${o.key}">`
      + o.options.map(([v, n]) => `<option value="${v}"${s[o.key] === v ? ' selected' : ''}>${esc(n)}</option>`).join('') + '</select></label>').join('')}`
    + C.NUMBERS.map((o) => `<label class="cz-f" title="${esc(o.help)}">${fieldLabel(o.label, o.help)}<input type="number" inputmode="${o.neg ? 'text' : 'numeric'}" step="1"`
      + `${o.neg ? '' : ' min="0"'}${o.max ? ` max="${o.max}"` : ''} placeholder="${esc(o.unit)}" data-k="${o.key}" value="${esc(s[o.key] ?? '')}"></label>`).join('')
    + '</div><p class="cz-hint">Tap ? (or point at a setting) for what it does. Empty boxes keep the game\'s normal value.</p>';
  el.oninput = el.onchange = (e) => {
    const t = e.target, k = t.dataset.k;
    if (!k) return;
    state.settings[k] = t.type === 'checkbox' ? t.checked : t.value;
    save();
  };
}

function renderLogic(el) {
  const off = state.noLogic;
  el.innerHTML = `<div class="cz-grid">${toggleRow('__nologic', 'Disable all logic checks', C.NO_LOGIC_HELP, off)}`
    + `<label class="cz-f" title="${esc(C.LOGIC_FIX_HELP)}">${fieldLabel('Glitches Required ROM "Fixes"', C.LOGIC_FIX_HELP)}<select data-k="rom.logicMode">`
    + C.LOGIC_MODES.map(([v, n]) => `<option value="${v}"${state.settings['rom.logicMode'] === v ? ' selected' : ''}>${esc(n)}</option>`).join('')
    + '</select></label></div>'
    + `<div class="cz-grid">${C.GLITCHES.map(([k, n, h]) => toggleRow(k, n, h, !!state.glitches[k], off)).join('')}</div>`;
  el.onchange = (e) => {
    const t = e.target, k = t.dataset.k;
    if (!k) return;
    if (k === '__nologic') { state.noLogic = t.checked; save(); renderLogic(el); return; }
    if (k === 'rom.logicMode') state.settings[k] = t.value;
    else state.glitches[k] = t.checked;
    save();
  };
}

function equipLabel(e, v) {
  if (!e.max) return `${e.label}${v ? '' : ' (off)'}`;
  return `${e.label}: ${e.names ? e.names[v] : v}`;
}
function renderEquipment(el) {
  const eq = state.equipment;
  const cell = (e) => {
    const v = eq[e.key];
    const on = e.max ? v > 0 : !!v;
    const lv = e.max && e.max > 1 && v > 0 ? `<b>${v}</b>` : '';
    return `<button type="button" class="cz-eq${on || e.key === 'ProgressiveArmor' ? ' on' : ''}" data-eq="${e.key}" title="${esc(equipLabel(e, v))}"`
      + ` aria-label="${esc(equipLabel(e, v))}"><img alt="" src="${IMG}${e.img(e.max ? v : on)}">${lv}</button>`;
  };
  const prize = ([k, n, img]) => `<button type="button" class="cz-eq${eq[k] ? ' on' : ''}" data-eq="${k}" title="${esc(n)}${eq[k] ? '' : ' (off)'}" aria-label="${esc(n)}${eq[k] ? '' : ' (off)'}">`
    + `<img alt="" src="${IMG}${img}${eq[k] ? 1 : 0}.png"></button>`;
  el.innerHTML = `<div class="cz-eq-grid">${C.EQUIPMENT.map(cell).join('')}</div>`
    + `<div class="cz-grid cz-fields"><label class="cz-f">Hearts <span id="cz-hearts-n">${eq.BossHeartContainer}</span>`
    + `<input type="range" min="1" max="20" step="1" data-k="BossHeartContainer" value="${eq.BossHeartContainer}"></label>`
    + `<label class="cz-f">Rupees<input type="number" min="0" max="9999" step="1" inputmode="numeric" data-k="Rupees" value="${esc(eq.Rupees || 0)}"></label></div>`
    + `<div class="cz-sub">Pendants and crystals already collected</div><div class="cz-eq-grid">${C.EQUIPMENT_PRIZES.map(prize).join('')}</div>`
    + '<p class="cz-hint">Tap an item to add it; tap again for its next level (sword, bow, bottles…). Shift-click or right-click goes back a level.</p>';
  const step = (key, back) => {
    const e = C.EQUIPMENT.find((x) => x.key === key);
    if (e && e.max) {
      let v = (Number(eq[key]) || 0) + (back ? -1 : 1);
      if (v > e.max) v = 0; if (v < 0) v = e.max;
      eq[key] = v;
    } else eq[key] = !eq[key];
    save();
    renderEquipment(el);
    const b = el.querySelector(`[data-eq="${key}"]`); if (b) b.focus();
  };
  el.onclick = (ev) => { const b = ev.target.closest('[data-eq]'); if (b) step(b.dataset.eq, ev.shiftKey); };
  el.oncontextmenu = (ev) => { const b = ev.target.closest('[data-eq]'); if (b) { ev.preventDefault(); step(b.dataset.eq, true); } };
  el.oninput = (ev) => {
    const t = ev.target;
    if (t.dataset.k === 'BossHeartContainer') { eq.BossHeartContainer = Number(t.value); $('cz-hearts-n').textContent = t.value; save(); }
    if (t.dataset.k === 'Rupees') { eq.Rupees = Math.max(0, Math.min(9999, Math.floor(Number(t.value) || 0))); save(); }
  };
}

function placedOf() {
  // how many of each pool item sit in a chosen location
  const n = {};
  for (const l of C.catalog().locations) {
    const v = state.locations[l.name];
    if (l.kind === 'items' && v) { const k = C.poolKey(v); n[k] = (n[k] || 0) + 1; }
  }
  return n;
}

function paintPoolTotal() {
  const el = $('cz-pool-total');
  if (!el) return;
  const total = C.poolTotal(state), slots = C.catalog().itemSlots;
  el.textContent = `${total} / ${slots}`;
  el.classList.toggle('bad', total !== slots);
  el.title = total === slots ? 'Every item location gets an item' : (total > slots
    ? `${total - slots} more items than locations: some won't be placed`
    : `${slots - total} fewer items than locations: the rest get filler`);
}

function renderPool(el) {
  const placed = placedOf();
  el.innerHTML = `<div class="cz-head"><span>Item Pool <b id="cz-pool-total"></b></span>`
    + '<input type="search" class="cz-search" placeholder="Search items" aria-label="Search items">'
    + '<button type="button" data-act="defaults">Default counts</button></div>'
    + '<div class="cz-table" role="table"><div class="cz-tr cz-th" role="row"><span>Random</span><span>Placed</span><span>Item</span></div>'
    + C.catalog().items.map((i) => `<div class="cz-tr" role="row" data-name="${esc(i.name.toLowerCase())}"><span><input type="number" min="0" max="216" step="1" inputmode="numeric"`
      + ` data-item="${i.value}" value="${state.items[i.value] ?? 0}" aria-label="${esc(i.name)} count"></span><span>${placed[i.value] || 0}</span><span>${esc(i.name)}</span></div>`).join('')
    + '</div>';
  paintPoolTotal();
  el.oninput = (e) => {
    const t = e.target;
    if (t.classList.contains('cz-search')) { filterRows(el, t.value); return; }
    if (!t.dataset.item) return;
    state.items[t.dataset.item] = Math.max(0, Math.min(216, Math.floor(Number(t.value) || 0)));
    save();
    paintPoolTotal();
  };
  el.onclick = (e) => {
    if (e.target.dataset.act !== 'defaults') return;
    C.catalog().items.forEach((i) => { state.items[i.value] = i.count; });
    // keep the ones already placed out of the random pool, as when they were placed
    const p = placedOf();
    for (const [k, n] of Object.entries(p)) if (k in state.items) state.items[k] = Math.max(0, state.items[k] - n);
    save();
    renderPool(el);
  };
}

function filterRows(el, q) {
  q = q.trim().toLowerCase();
  el.querySelectorAll('.cz-tr[data-name]').forEach((r) => { r.hidden = !!q && !r.dataset.name.includes(q); });
}

function optionsFor(kind) {
  const c = C.catalog();
  const list = kind === 'prizes' ? c.prizes : kind === 'bottles' ? c.bottles : kind === 'medallions' ? c.medallions : c.items;
  return [{ value: '', name: 'Random' }, ...list];
}
const itemName = (kind, v) => (optionsFor(kind).find((o) => o.value === v) || { name: v }).name;

function renderLocations(el) {
  const c = C.catalog();
  el.innerHTML = '<div class="cz-head"><select class="cz-region" aria-label="Region"><option value="">All Regions</option>'
    + c.regions.map((r) => `<option>${esc(r)}</option>`).join('') + '</select>'
    + '<input type="search" class="cz-search" placeholder="Search locations or items" aria-label="Search locations">'
    + '<label class="cz-mini"><input type="checkbox" class="cz-only-set"> Placed only</label>'
    + '<button type="button" data-act="clear">All random</button></div>'
    + '<div class="cz-table cz-locs" role="table"><div class="cz-tr cz-th" role="row"><span>Region</span><span>Location</span><span>Item</span></div>'
    + c.locations.map((l) => {
      const v = state.locations[l.name] || '';
      return `<div class="cz-tr" role="row" data-region="${esc(l.region)}" data-name="${esc(`${l.name} ${v ? itemName(l.kind, v) : ''}`.toLowerCase())}"${v ? ' data-set=""' : ''}>`
        + `<span>${esc(l.region)}</span><span>${esc(l.name)}</span><span class="cz-pick">`
        + `<select data-loc="${esc(l.name)}" data-kind="${l.kind}" aria-label="Item at ${esc(l.name)}"><option value="${esc(v)}">${esc(v ? itemName(l.kind, v) : 'Random')}</option></select>`
        + `<button type="button" class="cz-x" data-clear="${esc(l.name)}" aria-label="Back to random"${v ? '' : ' hidden'}>&times;</button></span></div>`;
    }).join('') + '</div>'
    + '<p class="cz-hint">An item placed here comes out of the Item Pool\'s random count, as on alttpr.com. Prize spots take pendants and crystals; medallion and fairy-bottle spots their own items.</p>';
  const filter = () => {
    const region = el.querySelector('.cz-region').value, q = el.querySelector('.cz-search').value.trim().toLowerCase();
    const onlySet = el.querySelector('.cz-only-set').checked;
    el.querySelectorAll('.cz-tr[data-region]').forEach((r) => {
      r.hidden = (!!region && r.dataset.region !== region) || (!!q && !r.dataset.name.includes(q)) || (onlySet && !r.hasAttribute('data-set'));
    });
  };
  // the full item list goes into a dropdown only when it's opened (230 × 134 options is a lot for a phone)
  const fill = (sel) => {
    if (sel.dataset.filled) return;
    const cur = sel.value;
    sel.innerHTML = optionsFor(sel.dataset.kind).map((o) => `<option value="${esc(o.value)}"${o.value === cur ? ' selected' : ''}>${esc(o.name)}</option>`).join('');
    sel.dataset.filled = '1';
  };
  if (!el.czFill) {
    el.czFill = (e) => { const s = e.target.closest && e.target.closest('select[data-loc]'); if (s && el.czFillOne) el.czFillOne(s); };
    el.addEventListener('pointerdown', el.czFill, true);
    el.addEventListener('focusin', el.czFill);
    el.addEventListener('keydown', el.czFill, true);
  }
  el.czFillOne = fill;
  el.oninput = (e) => { if (e.target.classList.contains('cz-search')) filter(); };
  el.onchange = (e) => {
    const t = e.target;
    if (t.classList.contains('cz-region') || t.classList.contains('cz-only-set')) { filter(); return; }
    if (t.dataset.loc) setLocation(el, t.dataset.loc, t.value);
  };
  el.onclick = (e) => {
    const x = e.target.closest('[data-clear]');
    if (x) { setLocation(el, x.dataset.clear, ''); return; }
    if (e.target.dataset.act === 'clear') {
      if (!Object.keys(state.locations).length) return;
      if (!window.confirm('Put every location back to random?')) return;
      Object.keys(state.locations).forEach((n) => setLocation(null, n, ''));
      renderLocations(el);
    }
  };
}

// placing an item in an item location takes one out of the random pool (and
// clearing it puts it back), the same bookkeeping as alttpr.com's customizer
function setLocation(el, name, value) {
  const loc = C.catalog().locations.find((l) => l.name === name);
  if (!loc) return;
  const prev = state.locations[name] || '';
  if (prev === value) return;
  if (loc.kind === 'items') {
    state.neg = state.neg || {};
    if (prev) {
      const k = C.poolKey(prev);
      if (state.neg[k] > 0) state.neg[k]--; else if (k in state.items) state.items[k] = (Number(state.items[k]) || 0) + 1;
    }
    if (value) {
      const k = C.poolKey(value);
      if ((Number(state.items[k]) || 0) > 0) state.items[k]--; else state.neg[k] = (state.neg[k] || 0) + 1;
    }
  }
  if (value) state.locations[name] = value; else delete state.locations[name];
  save();
  if (el) {
    const row = [...el.querySelectorAll('select[data-loc]')].find((s) => s.dataset.loc === name);
    if (row) {
      const tr = row.closest('.cz-tr');
      if (!value) { row.innerHTML = '<option value="">Random</option>'; delete row.dataset.filled; }
      tr.toggleAttribute('data-set', !!value);
      tr.dataset.name = `${name} ${value ? itemName(loc.kind, value) : ''}`.toLowerCase();
      tr.querySelector('.cz-x').hidden = !value;
    }
  }
  const pool = document.querySelector('#cz-sec-pool[open] .cz-body');
  if (pool) renderPool(pool);
}

function paintDropTotal() {
  const el = $('cz-drop-total');
  if (!el) return;
  const t = C.dropTotal(state);
  el.textContent = `${t} / ${C.DROP_TOTAL}`;
  el.classList.toggle('bad', t !== C.DROP_TOTAL);
  el.title = t === C.DROP_TOTAL ? 'Every drop slot is filled' : 'The pool should fill exactly 63 drop slots';
}

function placedDrops() {
  const n = {};
  Object.values(state.packs).forEach((slots) => slots.forEach((v) => { if (v && v !== 'auto_fill') n[v] = (n[v] || 0) + 1; }));
  return n;
}

function renderDropPool(el) {
  const placed = placedDrops();
  el.innerHTML = '<div class="cz-head"><span>Drop Pool <b id="cz-drop-total"></b></span><button type="button" data-act="defaults">Default counts</button></div>'
    + '<div class="cz-table" role="table"><div class="cz-tr cz-th" role="row"><span>Random</span><span>Placed</span><span>Drop</span></div>'
    + C.catalog().drops.map((d) => `<div class="cz-tr" role="row"><span><input type="number" min="0" max="63" step="1" inputmode="numeric" data-drop="${d.value}"`
      + ` value="${state.drops[d.value] ?? 0}" aria-label="${esc(d.name)} count"></span><span>${placed[d.value] || 0}</span><span>${esc(d.name)}</span></div>`).join('')
    + '</div>';
  paintDropTotal();
  el.oninput = (e) => {
    const t = e.target;
    if (!t.dataset.drop) return;
    state.drops[t.dataset.drop] = Math.max(0, Math.min(63, Math.floor(Number(t.value) || 0)));
    save();
    paintDropTotal();
  };
  el.onclick = (e) => {
    if (e.target.dataset.act !== 'defaults') return;
    C.catalog().drops.forEach((d) => { state.drops[d.value] = Math.max(0, d.count - (placedDrops()[d.value] || 0)); });
    save();
    renderDropPool(el);
  };
}

function renderPacks(el) {
  const opts = (v) => `<option value="auto_fill"${v === 'auto_fill' ? ' selected' : ''}>Random</option>`
    + C.DROPS.map(([d, n]) => `<option value="${d}"${v === d ? ' selected' : ''}>${esc(n)}</option>`).join('');
  el.innerHTML = C.PACKS.map(([p]) => `<div class="cz-pack"><span class="cz-pack-name">${esc(C.PACK_LABELS[p] || `Pack ${p}`)}</span><div class="cz-pack-slots">`
    + state.packs[p].map((v, i) => `<select data-pack="${p}" data-slot="${i}" aria-label="${esc(C.PACK_LABELS[p] || `Pack ${p}`)} slot ${i + 1}">${opts(v)}</select>`).join('')
    + '</div></div>').join('')
    + '<p class="cz-hint">Pull: the three tree pulls. Crab: what a crab drops. Stun: stunning an enemy. Fish: the fish you return to the water. A chosen drop comes out of the Prize Pack Pool.</p>';
  el.onchange = (e) => {
    const t = e.target;
    if (t.dataset.pack == null) return;
    const prev = state.packs[t.dataset.pack][t.dataset.slot];
    state.dropNeg = state.dropNeg || {};
    if (prev && prev !== 'auto_fill') {
      if (state.dropNeg[prev] > 0) state.dropNeg[prev]--; else state.drops[prev] = (Number(state.drops[prev]) || 0) + 1;
    }
    if (t.value !== 'auto_fill') {
      if ((Number(state.drops[t.value]) || 0) > 0) state.drops[t.value]--; else state.dropNeg[t.value] = (state.dropNeg[t.value] || 0) + 1;
    }
    state.packs[t.dataset.pack][t.dataset.slot] = t.value;
    save();
    const pool = document.querySelector('#cz-sec-droppool[open] .cz-body');
    if (pool) renderDropPool(pool);
  };
}

function renderDetails(el) {
  el.innerHTML = `<div class="cz-grid cz-fields"><label class="cz-f">Name<input type="text" maxlength="100" data-k="name" placeholder="name this" value="${esc(state.name)}"></label>`
    + `<label class="cz-f cz-wide">Notes<textarea rows="3" maxlength="300" data-k="notes" placeholder="game notes">${esc(state.notes)}</textarea></label></div>`
    + '<p class="cz-hint">Shown in the spoiler. World state, goal, crystals, swords, dungeon items, placement, accessibility and hints are the Randomizer bar\'s own settings above (alttpr.com\'s Generate tab).</p>';
  el.oninput = (e) => { const k = e.target.dataset.k; if (k) { state[k] = e.target.value; save(); } };
}

const RENDER = { settings: renderSettings, logic: renderLogic, equipment: renderEquipment, pool: renderPool,
  locations: renderLocations, droppool: renderDropPool, packs: renderPacks, details: renderDetails };

function renderAll() {
  document.querySelectorAll('#r-custom .cz-sec').forEach((d) => {
    const body = d.querySelector('.cz-body');
    if (d.open) RENDER[d.dataset.sec](body); else { body.innerHTML = ''; body.onclick = body.oninput = body.onchange = null; }
  });
}

/** Builds the fold-out. `status` is the bar's status line. */
export function initCustomizer({ status }) {
  say = status || say;
  const box = $('r-custom');
  if (!box) return;
  box.querySelector('.cz-menus').innerHTML = SECTIONS.map(([id, name, hint]) => `<details class="cz-sec" id="cz-sec-${id}" data-sec="${id}">`
    + `<summary><span>${esc(name)}</span><small>${esc(hint)}</small></summary><div class="cz-body"></div></details>`).join('');
  box.querySelectorAll('.cz-sec').forEach((d) => d.addEventListener('toggle', async () => {
    const body = d.querySelector('.cz-body');
    if (!d.open) { body.innerHTML = ''; return; }   // rebuilt fresh when opened again
    body.innerHTML = '<p class="cz-hint">Loading…</p>';
    try { await load(); } catch (e) { body.innerHTML = `<p class="cz-hint bad">Couldn't load the customizer: ${esc(e.message || e)}</p>`; return; }
    if (d.open) RENDER[d.dataset.sec](body);
  }));
  box.addEventListener('click', (e) => {
    const b = e.target.closest('.cz-q');
    if (!b) return;
    e.preventDefault();
    showHelp(b);
  });
  // load the lists when the fold-out opens, so the menus are ready
  box.addEventListener('toggle', () => { if (box.open) load().catch(() => {}); });

  const on = $('r-custom-on');
  on.checked = !!lsGet(LS_ON, false);
  on.addEventListener('change', () => {
    lsSet(LS_ON, on.checked);
    paintBadge();
    if (on.checked) load().catch(() => {});
    say(on.checked ? 'Customizer on: Generate makes a seed with these menus\' settings.' : 'Customizer off: Generate makes a normal seed.', 'ok');
  });
  $('r-custom-preset').addEventListener('change', async (e) => {
    const name = e.target.value;
    $('r-custom-del').disabled = !name;
    if (!name) return;
    const p = presets()[name];
    if (!p) return;
    await applyPreset(p, name);
    say(`Preset "${name}" loaded${p.useCustomizer ? ' (customizer on)' : ''}. Press Generate to roll a seed with it.`, 'ok');
  });
  $('r-custom-save').addEventListener('click', savePreset);
  $('r-custom-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); savePreset(); } });
  $('r-custom-del').addEventListener('click', deletePreset);
  $('r-custom-export').addEventListener('click', async () => { await load(); exportPresets(); });
  $('r-custom-import').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (f) await importFile(f);
  });
  $('r-custom-reset').addEventListener('click', resetAll);
  // changing a bar setting means the selections no longer match the preset exactly
  BAR_FIELDS.forEach((id) => $(id) && $(id).addEventListener('change', (e) => {
    if (e.isTrusted && lsGet(LS_PRESET, '')) { lsSet(LS_PRESET, ''); paintPresets(); }
  }));
  paintPresets();
  if (on.checked) load().catch(() => {});
}
