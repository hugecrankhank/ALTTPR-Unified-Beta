// Port of app/Boss.php
import { BossCollection, LocationCollection } from './collections.js';

export class Boss {
  static items = new Map();

  static get(name, world) {
    const b = this.all(world).items.get(name);
    if (b !== undefined) return b;
    throw new Error('Unknown Boss: ' + name);
  }

  static clearCache() { Boss.items = new Map(); }

  static all(world) {
    const hit = Boss.items.get(world.id);
    if (hit) return hit;
    const w = world;
    const coll = new BossCollection([
      new Boss('Armos Knights', 'Armos', (l, items) => items.hasSword() || items.has('Hammer') || items.canShootArrows(w)
        || items.has('Boomerang') || items.has('RedBoomerang')
        || (items.canExtendMagic(w, 4) && (items.has('FireRod') || items.has('IceRod')))
        || (items.canExtendMagic(w, 2) && (items.has('CaneOfByrna') || items.has('CaneOfSomaria')))),
      new Boss('Lanmolas', 'Lanmola', (l, items) => items.hasSword() || items.has('Hammer')
        || items.canShootArrows(w) || items.has('FireRod') || items.has('IceRod')
        || items.has('CaneOfByrna') || items.has('CaneOfSomaria')),
      new Boss('Moldorm', 'Moldorm', (l, items) => items.hasSword() || items.has('Hammer')),
      new Boss('Agahnim', 'Agahnim', (l, items) => items.hasSword() || items.has('Hammer') || items.has('BugCatchingNet')),
      new Boss('Helmasaur King', 'Helmasaur', (l, items) => (items.canBombThings() || items.has('Hammer'))
        && (items.hasSword(2) || items.canShootArrows(w)
          || (w.config('itemPlacement') !== 'basic' && items.hasSword()))),
      new Boss('Arrghus', 'Arrghus', (l, items) => (w.config('itemPlacement') !== 'basic' || w.config('mode.weapons') === 'swordless' || items.hasSword(2))
        && items.has('Hookshot') && (items.has('Hammer') || items.hasSword()
          || ((items.canExtendMagic(w, 2) || items.canShootArrows(w)) && (items.has('FireRod') || items.has('IceRod'))))),
      new Boss('Mothula', 'Mothula', (l, items) => (w.config('itemPlacement') !== 'basic' || items.hasSword(2) || (items.canExtendMagic(w, 2) && items.has('FireRod')))
        && (items.hasSword() || items.has('Hammer')
          || (items.canExtendMagic(w, 2) && (items.has('FireRod') || items.has('CaneOfSomaria') || items.has('CaneOfByrna')))
          || items.canGetGoodBee())),
      new Boss('Blind', 'Blind', (l, items) => (w.config('itemPlacement') !== 'basic' || w.config('mode.weapons') === 'swordless' || (items.hasSword() && (items.has('Cape') || items.has('CaneOfByrna'))))
        && (items.hasSword() || items.has('Hammer') || items.has('CaneOfSomaria') || items.has('CaneOfByrna'))),
      new Boss('Kholdstare', 'Kholdstare', (l, items) => (w.config('itemPlacement') !== 'basic' || items.hasSword(2) || (items.canExtendMagic(w, 3) && items.has('FireRod'))
        || (items.has('Bombos') && (w.config('mode.weapons') === 'swordless' || items.hasSword()) && items.canExtendMagic(w, 2) && items.has('FireRod')))
        && items.canMeltThings(w) && (items.has('Hammer') || items.hasSword()
          || (items.canExtendMagic(w, 3) && items.has('FireRod'))
          || (items.canExtendMagic(w, 2) && items.has('FireRod') && items.has('Bombos') && w.config('mode.weapons') === 'swordless'))),
      new Boss('Vitreous', 'Vitreous', (l, items) => (w.config('itemPlacement') !== 'basic' || items.hasSword(2) || items.canShootArrows(w))
        && (items.has('Hammer') || items.hasSword() || items.canShootArrows(w))),
      new Boss('Trinexx', 'Trinexx', (l, items) => items.has('FireRod') && items.has('IceRod')
        && (w.config('itemPlacement') !== 'basic' || w.config('mode.weapons') === 'swordless' || items.hasSword(3) || (items.canExtendMagic(w, 2) && items.hasSword(2)))
        && (items.hasSword(3) || items.has('Hammer')
          || (items.canExtendMagic(w, 2) && items.hasSword(2))
          || (items.canExtendMagic(w, 4) && items.hasSword()))),
      new Boss('Agahnim2', 'Agahnim2', (l, items) => items.hasSword() || items.has('Hammer') || items.has('BugCatchingNet')),
    ]);
    Boss.items.set(world.id, coll);
    return coll;
  }

  constructor(name, ename = null, can_beat = null) {
    this.name = name;
    this.enemizer_name = ename ?? name;
    this.can_beat = can_beat;
  }

  getName() { return this.name; }
  getEName() { return this.enemizer_name; }

  canBeat(items, locations = null) {
    if (this.can_beat === null || this.can_beat(locations ?? new LocationCollection(), items)) return true;
    return false;
  }
}
