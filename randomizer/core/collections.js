// Port of app/Support/{Collection,ItemCollection,LocationCollection,
// ShopCollection,BossCollection,WorldCollection}.php
import { get_random_int, __str, __eq, in_array, count } from './php.js';
import { Item } from './item.js';

function arrayable(items) {
  if (items == null) return [];
  if (items instanceof Collection) return items.values();
  if (Array.isArray(items)) return items.filter((_, i) => i in items);
  if (items instanceof Map) return [...items.values()];
  return Object.values(items);
}

export class Collection {
  constructor(items = []) {
    this.items = new Map();
    if (items instanceof Map) { this.items = new Map(items); return; }
    if (Array.isArray(items)) { items.forEach((v, i) => this.items.set(i, v)); return; }
    if (items instanceof Collection) { this.items = new Map(items.items); return; }
    for (const [k, v] of Object.entries(items)) this.items.set(k, v);
  }

  removeItem(item) {
    for (const [key, v] of this.items) {
      if (v === item) { this.offsetUnset(key); break; }
    }
    return this;
  }

  random() {
    const v = this.values();
    if (this.count() === 0) return null;
    return v[get_random_int(0, this.count() - 1)];
  }

  randomCollection(number = 1) {
    const old = this.values();
    const out = [];
    while (number-- > 0 && old.length > 0) {
      out.push(...old.splice(get_random_int(0, old.length - 1), 1));
    }
    return new this.constructor(out);
  }

  filter(cb = null) {
    const out = new Map();
    for (const [k, v] of this.items) if (cb ? cb(v) : v) out.set(k, v);
    return new this.constructor(out);
  }

  values() { return [...this.items.values()]; }

  diff(items) {
    const bs = new Set(arrayable(items).map(__str));
    const out = new Map();
    for (const [k, v] of this.items) if (!bs.has(__str(v))) out.set(k, v);
    return new this.constructor(out);
  }

  reverse() { return new this.constructor(this.values().reverse()); }

  each(cb) {
    for (const [k, v] of this.items) if (cb(v, k) === false) break;
    return this;
  }

  first() { for (const v of this.items.values()) return v; return false; }
  last() { let l = false; for (const v of this.items.values()) l = v; return l; }
  all() { return this.items; }

  pop() {
    let lastKey;
    for (const k of this.items.keys()) lastKey = k;
    if (lastKey === undefined) return null;
    const v = this.items.get(lastKey);
    this.items.delete(lastKey);
    return v;
  }

  merge(items) { return new this.constructor([...this.values(), ...arrayable(items)]); }
  copy() { return new this.constructor(this.items); }
  reduce(cb, initial = null) { let c = initial; for (const v of this.items.values()) c = cb(c, v); return c; }

  map(cb) {
    const out = {};
    for (const [k, v] of this.items) out[k] = cb(v, k);
    return out;
  }

  keys() { return [...this.items.keys()]; }
  has(key) { const v = this.items.get(key); return v !== undefined && v !== null; }
  contains(item) { return in_array(item, this.values()); }
  toArray() { return this.values(); }
  offsetExists(o) { return this.has(o); }
  offsetGet(o) { return this.items.get(o) ?? null; }
  get(o) { return this.offsetGet(o); }
  offsetSet(o, v) {
    if (o === null) { let n = 0; for (const k of this.items.keys()) if (typeof k === 'number' && k >= n) n = k + 1; o = n; }
    this.items.set(o, v);
  }
  set(o, v) { this.offsetSet(o, v); }
  offsetUnset(o) { this.items.delete(o); }
  count() { return this.items.size; }
  [Symbol.iterator]() { return this.items.values(); }
  entries() { return this.items.entries(); }
}

export class ItemCollection extends Collection {
  constructor(items = []) {
    super();
    this.item_counts = new Map();
    this.string_rep = null;
    this.checks_for_world = 0;
    this.cached_values = [];
    for (const item of arrayable(items)) this.addItem(item);
  }

  setChecksForWorld(id) { this.checks_for_world = id; }

  addItem(item) {
    const name = item.getName();
    this.items.set(name, item);
    this.cached_values.push(item);
    this.item_counts.set(name, (this.item_counts.get(name) || 0) + 1);
    this.string_rep = null;
    return this;
  }

  removeItem(name) {
    if (!this.item_counts.has(name)) return this;
    const c = this.item_counts.get(name) - 1;
    this.item_counts.set(name, c);
    if (c === 0) this.offsetUnset(name);
    for (let i = 0; i < this.cached_values.length; i++) {
      if (this.cached_values[i].getName() === name) { this.cached_values.splice(i, 1); break; }
    }
    return this;
  }

  filter(cb = null) { return new ItemCollection(this.values().filter((v) => (cb ? cb(v) : v))); }
  values() { return this.cached_values.slice(); }

  diff(items) {
    if (!count(items)) return this.copy();
    if (!(items instanceof ItemCollection)) {
      // parent::diff on name-keyed items (unused in practice)
      return super.diff(items);
    }
    const diffed = this.copy();
    for (const [name, amount] of [...diffed.item_counts]) {
      if (items.item_counts.has(name)) {
        const other = items.item_counts.get(name);
        if (other < amount) diffed.item_counts.set(name, amount - other);
        else diffed.offsetUnset(name);
      }
    }
    return diffed;
  }

  each(cb) {
    for (const [key, item] of this.items) {
      const n = this.item_counts.get(key);
      for (let i = 0; i < n; i++) if (cb(item, key) === false) break;
    }
    return this;
  }

  merge(items) {
    if (!count(items)) return this.copy();
    if (!(items instanceof ItemCollection)) return this.merge(new ItemCollection(items));
    const merged = this.copy();
    items.each((item) => { merged.addItem(item); });
    return merged;
  }

  copy() {
    const n = new ItemCollection();
    n.items = new Map(this.items);
    n.item_counts = new Map(this.item_counts);
    n.checks_for_world = this.checks_for_world;
    n.cached_values = this.cached_values.slice();
    return n;
  }

  reduce(cb, initial = null) { let c = initial; for (const v of this.cached_values) c = cb(c, v); return c; }
  map(cb) { return this.cached_values.map((v) => cb(v)); }

  has(key, at_least = 1) {
    key = `${key}:${this.checks_for_world}`;
    if (at_least === 0) return true;
    if (at_least == null || at_least === false) return false;
    if (this.item_counts.get(`ShopKey:${this.checks_for_world}`) && key.startsWith('Key')) return true;
    return (this.item_counts.get(key) ?? 0) >= at_least;
  }

  manyKeys() {
    for (const k of [...this.item_counts.keys()]) if (k.startsWith('Key')) this.item_counts.set(k, 10);
    return this;
  }

  toArray() { return this.values(); }
  count() { let s = 0; for (const v of this.item_counts.values()) s += v; return s; }
  [Symbol.iterator]() { return this.cached_values.slice()[Symbol.iterator](); }
  entries() { return this.cached_values.entries(); }

  offsetUnset(o) { this.item_counts.delete(o); this.items.delete(o); }

  heartCount(initial = 3.0) {
    let c = initial;
    for (const heart of this.filter((i) => i instanceof Item.Upgrade.Health)) {
      c += heart.getName() == 'PieceOfHeart' ? .25 : 1;
    }
    return c;
  }

  canLiftRocks() { return this.has('PowerGlove') || this.has('ProgressiveGlove') || this.has('TitansMitt'); }
  canLiftDarkRocks() { return this.has('TitansMitt') || this.has('ProgressiveGlove', 2); }
  canLightTorches() { return this.has('FireRod') || this.has('Lamp'); }

  canMeltThings(world) {
    return this.has('FireRod')
      || (this.has('Bombos') && (world.config('mode.weapons') === 'swordless' || this.hasSword()));
  }

  canFly(world) {
    return this.has('OcarinaActive') || (this.has('OcarinaInactive') && this.canActivateOcarina(world));
  }

  canActivateOcarina(world) {
    if (world.constructor.isInverted) {
      return this.has('MoonPearl')
        && (this.has('DefeatAgahnim')
          || (((this.has('Hammer') && this.canLiftRocks()) || this.canLiftDarkRocks())));
    }
    return true;
  }

  canSpinSpeed() { return this.has('PegasusBoots') && (this.hasSword() || this.has('Hookshot')); }

  canAcquireFairy(world = null) {
    if (world !== null && !world.config('rom.CatchableFairies', true)) return false;
    return true;
  }

  canBunnyRevive(world = null) {
    let r = this.hasABottle() && this.has('BugCatchingNet');
    if (world !== null) r = r && this.canAcquireFairy(world);
    return r;
  }

  canShootArrows(world, min_level = 1) {
    switch (min_level) {
      case 2:
        return this.has('BowAndSilverArrows')
          || (this.has('ProgressiveBow', 2) && (!world.config('rom.rupeeBow', false) || this.has('ShopArrow')))
          || (this.has('SilverArrowUpgrade')
            && (this.has('Bow') || this.has('BowAndArrows') || this.has('ProgressiveBow')));
      case 1:
      default:
        return ((this.has('Bow') || this.has('ProgressiveBow'))
          && (!world.config('rom.rupeeBow', false) || this.has('ShopArrow') || this.has('SilverArrowUpgrade')))
          || this.has('BowAndArrows')
          || this.has('BowAndSilverArrows');
    }
  }

  canBlockLasers() { return this.has('MirrorShield') || this.has('ProgressiveShield', 3); }

  canExtendMagic(world = null, bars = 2.0) {
    let mod = 1.0;
    if (world !== null) {
      mod = world.config('rom.BottleFill.Magic', 0x80) / 0x80;
      if (mod > 1) mod = 1.0;
    }
    const base = this.has('QuarterMagic') ? 4 : (this.has('HalfMagic') ? 2 : 1);
    const bottle = base * this.bottleCount() * mod;
    return (base + bottle) >= bars;
  }

  glitchedLinkInDarkWorld() { return this.has('MoonPearl') || this.hasABottle(); }

  hasHealth(minimum) {
    return this.filter((i) => i instanceof Item.Upgrade.Health).reduce((c, i) => c + i.power, 0) >= minimum;
  }

  canKillEscapeThings(world) {
    return this.has('UncleSword')
      || this.has('CaneOfSomaria')
      || (this.has('TenBombs') && world.config('enemizer.enemyHealth', 'default') == 'default')
      || (this.has('CaneOfByrna') && world.config('enemizer.enemyHealth', 'default') == 'default')
      || this.canShootArrows(world)
      || this.has('Hammer')
      || this.has('FireRod')
      || world.config('ignoreCanKillEscapeThings', false);
  }

  canKillMostThings(world, enemies = 5) {
    return this.hasSword()
      || this.has('CaneOfSomaria')
      || (this.canBombThings() && enemies < 6 && world.config('enemizer.enemyHealth', 'default') == 'default')
      || (this.has('CaneOfByrna') && (enemies < 6 || this.canExtendMagic())
        && world.config('enemizer.enemyHealth', 'default') == 'default')
      || this.canShootArrows(world)
      || this.has('Hammer')
      || this.has('FireRod');
  }

  canBombThings() { return true; }

  canGetGoodBee() {
    return this.has('BugCatchingNet') && this.hasABottle()
      && (this.has('PegasusBoots') || (this.hasSword() && this.has('Quake')));
  }

  hasSword(min_level = 1) {
    switch (min_level) {
      case 4:
        return this.has('ProgressiveSword', 4)
          || (this.has('UncleSword') && this.has('ProgressiveSword', 3))
          || this.has('L4Sword');
      case 3:
        return this.has('ProgressiveSword', 3)
          || (this.has('UncleSword') && this.has('ProgressiveSword', 2))
          || this.has('L3Sword')
          || this.has('L4Sword');
      case 2:
        return this.has('ProgressiveSword', 2)
          || (this.has('UncleSword') && this.has('ProgressiveSword'))
          || this.has('L2Sword') || this.has('MasterSword') || this.has('L3Sword') || this.has('L4Sword');
      case 1:
      default:
        return this.has('ProgressiveSword') || this.has('UncleSword') || this.has('L1Sword')
          || this.has('L1SwordAndShield') || this.has('L2Sword') || this.has('MasterSword')
          || this.has('L3Sword') || this.has('L4Sword');
    }
  }

  hasArmor(min_level = 1) {
    if (min_level === 2) return this.has('ProgressiveArmor', 2) || this.has('RedMail');
    return this.has('ProgressiveArmor') || this.has('BlueMail') || this.has('RedMail');
  }

  hasBottle(at_least = 1) { return this.bottleCount() >= at_least; }
  bottleCount() { return this.filter((i) => i instanceof Item.Bottle).count(); }

  hasABottle() {
    return this.has('BottleWithBee') || this.has('BottleWithFairy') || this.has('BottleWithRedPotion')
      || this.has('BottleWithGreenPotion') || this.has('BottleWithBluePotion') || this.has('Bottle')
      || this.has('BottleWithGoldBee');
  }

  toString() {
    if (this.string_rep === null) this.string_rep = this.reduce((c, i) => c + i.getName(), '');
    return this.string_rep;
  }
}

export class LocationCollection extends Collection {
  constructor(items = []) {
    super();
    this.checks_for_world = 0;
    for (const item of arrayable(items)) this.addItem(item);
  }

  setChecksForWorld(id) { this.checks_for_world = id; }
  addItem(item) { this.items.set(item.getName(), item); return this; }
  removeItem(key) { this.items.delete(`${key}:${this.checks_for_world}`); return this; }

  getEmptyLocations() { return this.filter((l) => !l.hasItem()); }
  getNonEmptyLocations() { return this.filter((l) => l.hasItem()); }

  getHint() {
    // ported below (needs lang + shuffles), see hints.js
    return locationCollectionHint(this);
  }

  itemInLocations(item, locations, cnt = 1) {
    for (const location of locations) {
      if (this.items.get(`${location}:${this.checks_for_world}`).hasItem(item)) cnt--;
    }
    return cnt < 1;
  }

  getItems(world = null) {
    const items = [];
    for (const location of this.items.values()) {
      const item = location.getItem();
      if (item !== null && (world === null || item.getWorld().id === world.id)) items.push(item);
    }
    return new ItemCollection(items);
  }

  getRegions() {
    const regions = [];
    for (const location of this.items.values()) {
      if (!regions.includes(location.getRegion())) regions.push(location.getRegion());
    }
    return regions;
  }

  locationsWithItem(item = null) { return this.filter((l) => l.hasItem(item)); }
  canAccess(items) { return this.filter((l) => l.canAccess(items)); }

  randomCollection(number = 1) {
    const r = super.randomCollection(number);
    r.checks_for_world = this.checks_for_world;
    return r;
  }

  filter(cb = null) {
    const out = [];
    for (const v of this.items.values()) if (cb ? cb(v) : v) out.push(v);
    const f = new LocationCollection(out);
    f.checks_for_world = this.checks_for_world;
    return f;
  }

  diff(items) {
    const d = super.diff(items);
    d.checks_for_world = this.checks_for_world;
    return d;
  }

  reverse() {
    const r = super.reverse();
    r.checks_for_world = this.checks_for_world;
    return r;
  }

  merge(items) {
    const m = super.merge(items);
    m.checks_for_world = this.checks_for_world;
    return m;
  }

  copy() {
    const c = super.copy();
    c.checks_for_world = this.checks_for_world;
    return c;
  }

  offsetGet(offset) {
    offset = String(offset).split(`:${this.checks_for_world}`).join('');
    return this.items.get(`${offset}:${this.checks_for_world}`) ?? null;
  }
}

// set by hints.js to avoid a circular import with lang/shuffle helpers
let locationCollectionHint = () => null;
export function setLocationCollectionHint(fn) { locationCollectionHint = fn; }

export class ShopCollection extends Collection {
  constructor(items = []) {
    super();
    for (const item of arrayable(items)) this.addItem(item);
  }
  addItem(item) { this.items.set(item.getName(), item); return this; }

  getItems(world = null) {
    return this.reduce((locs, shop) => locs.merge(shop.getLocations()), new LocationCollection()).getItems(world);
  }

  getLocations() {
    return this.reduce((locs, shop) => locs.merge(shop.getLocations()), new LocationCollection());
  }
}

export class BossCollection extends Collection {
  constructor(items = []) {
    super();
    for (const item of arrayable(items)) this.addItem(item);
  }
  addItem(item) { this.items.set(item.getName(), item); return this; }
  canBeat(items) { return this.filter((b) => b.canBeat(items)); }
}

export class WorldCollection {
  constructor(worlds) {
    this.worlds = new Map();
    for (const w of worlds) this.worlds.set(w.id, w);
  }

  isWinnable() {
    for (const w of this.worlds.values()) w.resetCollectedLocations();
    let found = 0;
    let assumed = new ItemCollection();
    for (const w of this.worlds.values()) assumed = assumed.merge(w.getPreCollectedItems());
    for (;;) {
      let current = 0;
      for (const w of this.worlds.values()) {
        assumed = assumed.merge(w.collectOtherItems(assumed));
        current += w.getCollectedLocationsCount();
      }
      if (found == current) break;
      found = current;
    }
    for (const w of this.worlds.values()) if (!w.getWinCondition()(assumed)) return false;
    return true;
  }

  first() { for (const w of this.worlds.values()) return w; return null; }
  get(id) { return this.worlds.get(id); }

  checkWinCondition(items) {
    for (const w of this.worlds.values()) if (!w.getWinCondition()(items)) return false;
    return true;
  }

  count() { return this.worlds.size; }
}
