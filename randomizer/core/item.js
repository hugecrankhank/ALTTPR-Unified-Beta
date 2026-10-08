// Port of app/Item.php, app/ItemAlias.php and app/Item/*.php
import { ItemCollection } from './collections.js';
import { __eq } from './php.js';
import { lang } from './lang.js';

function bytesKey(bytes) {
  // stand-in for PHP serialize($bytes): only uniqueness/equality matters
  return JSON.stringify(Object.entries(bytes));
}

export class Item {
  static items = new Map();
  static worlds = new Map();

  static get(name, world) {
    const items = this.all(world);
    const worldName = `${name}:${world.id}`;
    const hit = items.items.get(worldName);
    if (hit !== undefined) return hit;
    return this.getNice(name, world);
  }

  static getNice(name, world) {
    const items = this.all(world);
    for (const item of items.values()) {
      if (item.getNiceName() == name) return item;
    }
    throw new Error('Unknown Item: ' + name);
  }

  static clearCache() {
    Item.items = new Map();
    Item.worlds = new Map();
  }

  static all(world) {
    const cached = Item.items.get(world.id);
    if (cached) return cached;
    Item.worlds.set(world.id, world);
    const I = Item, w = world;
    const med = (b0, b1, t, m) => Object.assign([b0, b1], { t0: t[0], t1: t[1], t2: t[2], m0: m[0], m1: m[1], m2: m[2] });
    const coll = new ItemCollection([
      new I('Nothing', [0x5A], w),
      new I.Sword('L1Sword', [0x49], w),
      new I.Sword('L1SwordAndShield', [0x00], w),
      new I.Sword('L2Sword', [0x01], w),
      new I.Sword('MasterSword', [0x50], w),
      new I.Sword('L3Sword', [0x02], w),
      new I.Sword('L4Sword', [0x03], w),
      new I.Shield('BlueShield', [0x04], w),
      new I.Shield('RedShield', [0x05], w),
      new I.Shield('MirrorShield', [0x06], w),
      new I('FireRod', [0x07], w),
      new I('IceRod', [0x08], w),
      new I('Hammer', [0x09], w),
      new I('Hookshot', [0x0A], w),
      new I.Bow('Bow', [0x0B], w),
      new I('Boomerang', [0x0C], w),
      new I('Powder', [0x0D], w),
      new I.BottleContents('Bee', [0x0E], w),
      new I.Medallion('Bombos', med(0x0f, 0x00, [0x31, 0x90, 0x00], [0x31, 0x80, 0x00]), w),
      new I.Medallion('Ether', med(0x10, 0x01, [0x31, 0x98, 0x00], [0x13, 0x9F, 0xF1]), w),
      new I.Medallion('Quake', med(0x11, 0x02, [0x14, 0xEF, 0xC4], [0x31, 0x88, 0x00]), w),
      new I('Lamp', [0x12], w),
      new I('Shovel', [0x13], w),
      new I('OcarinaInactive', [0x14], w),
      new I('CaneOfSomaria', [0x15], w),
      new I.Bottle('Bottle', [0x16], w),
      new I.Upgrade.Health('PieceOfHeart', [0x17], w, .25),
      new I('CaneOfByrna', [0x18], w),
      new I('Cape', [0x19], w),
      new I('MagicMirror', [0x1A], w),
      new I('PowerGlove', [0x1B], w),
      new I('TitansMitt', [0x1C], w),
      new I('BookOfMudora', [0x1D], w),
      new I('Flippers', [0x1E], w),
      new I('MoonPearl', [0x1F], w),
      new I.Crystal('Crystal', [0x20], w),
      new I('BugCatchingNet', [0x21], w),
      new I.Armor('BlueMail', [0x22], w),
      new I.Armor('RedMail', [0x23], w),
      new I.Key('Key', [0x24], w),
      new I.Compass('Compass', [0x25], w),
      new I.Upgrade.Health('HeartContainerNoAnimation', [0x26], w, 1),
      new I('Bomb', [0x27], w),
      new I('ThreeBombs', [0x28], w),
      new I('Mushroom', [0x29], w),
      new I('RedBoomerang', [0x2A], w),
      new I.Bottle('BottleWithRedPotion', [0x2B], w),
      new I.Bottle('BottleWithGreenPotion', [0x2C], w),
      new I.Bottle('BottleWithBluePotion', [0x2D], w),
      new I.BottleContents('RedPotion', [0x2E], w),
      new I.BottleContents('GreenPotion', [0x2F], w),
      new I.BottleContents('BluePotion', [0x30], w),
      new I('TenBombs', [0x31], w),
      new I.BigKey('BigKey', [0x32], w),
      new I.Map('Map', [0x33], w),
      new I('OneRupee', [0x34], w),
      new I('FiveRupees', [0x35], w),
      new I('TwentyRupees', [0x36], w),
      new I.Pendant('PendantOfCourage', [0x37, 0x04, 0x38, 0x62, 0x00, 0x69, 0x37], w),
      new I.Pendant('PendantOfWisdom', [0x38, 0x01, 0x32, 0x60, 0x00, 0x69, 0x38], w),
      new I.Pendant('PendantOfPower', [0x39, 0x02, 0x34, 0x60, 0x00, 0x69, 0x39], w),
      new I.Bow('BowAndArrows', [0x3A], w),
      new I.Bow('BowAndSilverArrows', [0x3B], w),
      new I.Bottle('BottleWithBee', [0x3C], w),
      new I.Bottle('BottleWithFairy', [0x3D], w),
      new I.Upgrade.Health('BossHeartContainer', [0x3E], w, 1),
      new I.Upgrade.Health('HeartContainer', [0x3F], w, 1),
      new I('OneHundredRupees', [0x40], w),
      new I('FiftyRupees', [0x41], w),
      new I('Heart', [0x42], w),
      new I.Arrow('Arrow', [0x43], w),
      new I.Arrow('TenArrows', [0x44], w),
      new I('SmallMagic', [0x45], w),
      new I('ThreeHundredRupees', [0x46], w),
      new I('TwentyRupees2', [0x47], w),
      new I.Bottle('BottleWithGoldBee', [0x48], w),
      new I('OcarinaActive', [0x4A], w),
      new I('PegasusBoots', [0x4B], w),
      new I.Upgrade.Bomb('BombUpgrade5', [0x51], w),
      new I.Upgrade.Bomb('BombUpgrade10', [0x52], w),
      new I.Upgrade.Bomb('BombUpgrade50', [0x4C], w),
      new I.Upgrade.Arrow('ArrowUpgrade5', [0x53], w),
      new I.Upgrade.Arrow('ArrowUpgrade10', [0x54], w),
      new I.Upgrade.Arrow('ArrowUpgrade70', [0x4D], w),
      new I.Upgrade.Magic('HalfMagic', [0x4E], w),
      new I.Upgrade.Magic('QuarterMagic', [0x4F], w),
      new I.Programmable('Programmable1', [0x55], w),
      new I.Programmable('Programmable2', [0x56], w),
      new I.Programmable('Programmable3', [0x57], w),
      new I('SilverArrowUpgrade', [0x58], w),
      new I('Rupoor', [0x59], w),
      new I('RedClock', [0x5B], w),
      new I('BlueClock', [0x5C], w),
      new I('GreenClock', [0x5D], w),
      new I.Sword('ProgressiveSword', [0x5E], w),
      new I.Shield('ProgressiveShield', [0x5F], w),
      new I.Armor('ProgressiveArmor', [0x60], w),
      new I('ProgressiveGlove', [0x61], w),
      new I('singleRNG', [0x62], w),
      new I('multiRNG', [0x63], w),
      new I.Bow('ProgressiveBow', [0x64], w),
      new I.Bow('ProgressiveBowAlternate', [0x65], w),
      new I.Event('Triforce', [0x6A], w),
      new I('PowerStar', [0x6B], w),
      new I('TriforcePiece', [0x6C], w),
      new I.Map('MapLW', [0x70], w),
      new I.Map('MapDW', [0x71], w),
      new I.Map('MapA2', [0x72], w),
      new I.Map('MapD7', [0x73], w),
      new I.Map('MapD4', [0x74], w),
      new I.Map('MapP3', [0x75], w),
      new I.Map('MapD5', [0x76], w),
      new I.Map('MapD3', [0x77], w),
      new I.Map('MapD6', [0x78], w),
      new I.Map('MapD1', [0x79], w),
      new I.Map('MapD2', [0x7A], w),
      new I.Map('MapA1', [0x7B], w),
      new I.Map('MapP2', [0x7C], w),
      new I.Map('MapP1', [0x7D], w),
      new I.Map('MapH1', [0x7E], w),
      new I.Map('MapH2', [0x7F], w),
      new I.Compass('CompassA2', [0x82], w),
      new I.Compass('CompassD7', [0x83], w),
      new I.Compass('CompassD4', [0x84], w),
      new I.Compass('CompassP3', [0x85], w),
      new I.Compass('CompassD5', [0x86], w),
      new I.Compass('CompassD3', [0x87], w),
      new I.Compass('CompassD6', [0x88], w),
      new I.Compass('CompassD1', [0x89], w),
      new I.Compass('CompassD2', [0x8A], w),
      new I.Compass('CompassA1', [0x8B], w),
      new I.Compass('CompassP2', [0x8C], w),
      new I.Compass('CompassP1', [0x8D], w),
      new I.Compass('CompassH1', [0x8E], w),
      new I.Compass('CompassH2', [0x8F], w),
      new I.BigKey('BigKeyA2', [0x92], w),
      new I.BigKey('BigKeyD7', [0x93], w),
      new I.BigKey('BigKeyD4', [0x94], w),
      new I.BigKey('BigKeyP3', [0x95], w),
      new I.BigKey('BigKeyD5', [0x96], w),
      new I.BigKey('BigKeyD3', [0x97], w),
      new I.BigKey('BigKeyD6', [0x98], w),
      new I.BigKey('BigKeyD1', [0x99], w),
      new I.BigKey('BigKeyD2', [0x9A], w),
      new I.BigKey('BigKeyA1', [0x9B], w),
      new I.BigKey('BigKeyP2', [0x9C], w),
      new I.BigKey('BigKeyP1', [0x9D], w),
      new I.BigKey('BigKeyH1', [0x9E], w),
      new I.BigKey('BigKeyH2', [0x9F], w),
      new I.Key('KeyH2', [0xA0], w),
      new I.Key('KeyH1', [0xA1], w),
      new I.Key('KeyP1', [0xA2], w),
      new I.Key('KeyP2', [0xA3], w),
      new I.Key('KeyA1', [0xA4], w),
      new I.Key('KeyD2', [0xA5], w),
      new I.Key('KeyD1', [0xA6], w),
      new I.Key('KeyD6', [0xA7], w),
      new I.Key('KeyD3', [0xA8], w),
      new I.Key('KeyD5', [0xA9], w),
      new I.Key('KeyP3', [0xAA], w),
      new I.Key('KeyD4', [0xAB], w),
      new I.Key('KeyD7', [0xAC], w),
      new I.Key('KeyA2', [0xAD], w),
      new I.Key('KeyGK', [0xAF], w),
      new I.Crystal('Crystal1', [null, 0x02, 0x34, 0x64, 0x40, 0x7F, 0x20], w),
      new I.Crystal('Crystal2', [null, 0x10, 0x34, 0x64, 0x40, 0x79, 0x20], w),
      new I.Crystal('Crystal3', [null, 0x40, 0x34, 0x64, 0x40, 0x6C, 0x20], w),
      new I.Crystal('Crystal4', [null, 0x20, 0x34, 0x64, 0x40, 0x6D, 0x20], w),
      new I.Crystal('Crystal5', [null, 0x04, 0x32, 0x64, 0x40, 0x6E, 0x20], w),
      new I.Crystal('Crystal6', [null, 0x01, 0x32, 0x64, 0x40, 0x6F, 0x20], w),
      new I.Crystal('Crystal7', [null, 0x08, 0x34, 0x64, 0x40, 0x7C, 0x20], w),
      new I.Event('RescueZelda', [null], w),
      new I.Event('DefeatAgahnim', [null], w),
      new I.Event('BigRedBomb', [null], w),
      new I.Event('DefeatAgahnim2', [null], w),
      new I.Event('DefeatGanon', [null], w),
    ]);
    Item.items.set(world.id, coll);

    // Logical aliases
    coll.addItem(new ItemAlias('UncleSword', 'ProgressiveSword', world));
    coll.addItem(new ItemAlias('ShopKey', 'KeyGK', world));
    coll.addItem(new ItemAlias('ShopArrow', 'Arrow', world));
    coll.setChecksForWorld(world.id);
    return coll;
  }

  constructor(name, bytes, world) {
    this.name = name;
    this.nice_name = 'item.' + name;
    this.bytes = bytes;
    this.world = world;
  }

  getTarget() { return this; }
  setTarget(item) { return new ItemAlias(this.getName(), item.getName(), this.world); }
  getRawName() { return this.name; }
  getName() { return this.name + ':' + this.world.id; }
  getNiceName() { const f = lang(this.nice_name); return typeof f === 'string' ? f : ''; }
  getI18nName() { return this.nice_name; }
  getBytes() { return this.bytes; }
  setWorld(world) { this.world = world; return this; }
  getWorld() { return this.world; }
  toString() { return this.name + bytesKey(this.bytes); }

  // PHP `==` between two Item objects: same class and equal properties.
  __phpEquals(o) {
    if (!(o instanceof Item) || o.constructor !== this.constructor) return false;
    if (this.name !== o.name || this.world !== o.world || this.power !== o.power) return false;
    if (bytesKey(this.bytes) !== bytesKey(o.bytes)) return false;
    if (this.target !== undefined || o.target !== undefined) return __eq(this.target, o.target);
    return true;
  }
}

export class ItemAlias extends Item {
  constructor(name, target, world) {
    super(name, [], world);
    this.name = name;
    this.target = Item.get(target, world);
  }
  getTarget() { return this.target; }
  setTarget(item) { this.target = item; return this; }
  getName() { return this.name + ':' + this.world.id; }
  getNiceName() { return this.target.getNiceName(); }
  getBytes() { return this.target.getBytes(); }
  toString() { return this.name + bytesKey(this.target.getBytes()); }
}

const sub = (n) => ({ [n]: class extends Item {} })[n];
Item.Armor = sub('Armor');
Item.Arrow = sub('Arrow');
Item.BigKey = sub('BigKey');
Item.Bottle = sub('Bottle');
Item.BottleContents = sub('BottleContents');
Item.Bow = sub('Bow');
Item.Compass = sub('Compass');
Item.Crystal = sub('Crystal');
Item.Egg = sub('Egg');
Item.Event = sub('Event');
Item.Key = sub('Key');
Item.Map = sub('Map');
Item.Medallion = sub('Medallion');
Item.Pendant = sub('Pendant');
Item.Programmable = sub('Programmable');
Item.Shield = sub('Shield');
Item.Sword = sub('Sword');
Item.Upgrade = {
  Arrow: sub('Arrow'),
  Bomb: sub('Bomb'),
  Magic: sub('Magic'),
  Health: class Health extends Item {
    constructor(name, bytes, world, power) {
      super(name, bytes, world);
      this.power = power;
    }
  },
};
