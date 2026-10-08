// Port of app/Shop.php, app/Shop/*.php, app/Drops/*.php and the droppable
// part of app/Sprite.php
import { LocationCollection } from './collections.js';
import { Location } from './location.js';

export class Shop {
  constructor(name, config, shopkeeper, room_id, door_id, region, writes = {}) {
    this.name = name;
    this.config = config;
    this.shopkeeper = shopkeeper;
    this.room_id = room_id;
    this.door_id = door_id;
    this.region = region;
    this.writes = writes;
    this.requirement_callback = null;
    this.active = false;
    this.inventory = new Map();
  }

  getName() { return this.name; }

  getBytes(sram_offset = 0x00) {
    const r = this.room_id ?? 0;
    return [r & 0xFF, (r >> 8) & 0xFF, this.door_id, 0x00, (this.config & 0xFC) + this.inventory.size, this.shopkeeper, sram_offset];
  }

  writeExtraData(rom) {
    for (const [address, bytes] of Object.entries(this.writes)) rom.write(Number(address), bytes);
    return this;
  }

  setActive(active) { this.active = active; return this; }
  getActive() { return this.active; }

  setShopkeeper(shopkeeper) {
    switch (shopkeeper) {
      case 'old_man': this.shopkeeper = 0xE2; break;
      case 'old_woman': this.shopkeeper = 0xE3; break;
      case 'dark_shopkepper': this.shopkeeper = 0xC1; break;
      case 'shopkeeper':
      default: this.shopkeeper = 0xA0;
    }
    return this;
  }

  clearInventory() { this.inventory = new Map(); return this; }

  addInventory(slot, item, price, max = 0, replacement = null, replacement_price = 0) {
    this.inventory.set(slot, {
      id: item.getBytes()[0],
      item,
      price,
      max,
      replace_id: replacement === null ? 0xFF : replacement.getBytes()[0],
      replacement_item: replacement,
      replace_price: replacement_price,
    });
    return this;
  }

  getInventory() { return this.inventory; }

  getLocations() {
    const locations = [];
    for (const [slot, record] of this.inventory) {
      let location = new Location(`${this.name} - ${slot}`, [], null, this.region).setItem(record.item);
      if (this.requirement_callback) location.setRequirements(this.requirement_callback);
      locations.push(location);
      if (record.replacement_item) {
        location = new Location(`${this.name} - ${slot}.2`, [], null, this.region).setItem(record.replacement_item);
        if (this.requirement_callback) location.setRequirements(this.requirement_callback);
        locations.push(location);
      }
    }
    return new LocationCollection(locations);
  }

  canAccess(items, locations = null) {
    const locs = locations ?? this.region.getWorld().getLocations();
    if (!this.region.canEnter(locs, items)) return false;
    if (!this.requirement_callback || this.requirement_callback(locations ?? this.region.getWorld().getLocations(), items)) return true;
    return false;
  }

  setRequirements(cb) { this.requirement_callback = cb; return this; }
  getRegion() { return this.region; }

  copy() {
    const c = new this.constructor(this.name, this.config, this.shopkeeper, this.room_id, this.door_id, this.region, this.writes);
    c.inventory = new Map(this.inventory);
    c.requirement_callback = this.requirement_callback;
    return c;
  }

  toString() { return this.name; }
}

Shop.TakeAny = class TakeAny extends Shop {};
Shop.Upgrade = class Upgrade extends Shop {};

// ── drops ────────────────────────────────────────────────────────────────────
export class Droppable {
  constructor(name, bytes) { this.name = name; this.bytes = bytes; }
  getName() { return this.name; }
  getBytes() { return this.bytes; }
}

const DROPPABLES = new Map([
  ['Bee', [0x79]], ['BeeGood', [0xB2]], ['Heart', [0xD8]], ['RupeeGreen', [0xD9]], ['RupeeBlue', [0xDA]],
  ['RupeeRed', [0xDB]], ['BombRefill1', [0xDC]], ['BombRefill4', [0xDD]], ['BombRefill8', [0xDE]],
  ['MagicRefillSmall', [0xDF]], ['MagicRefillFull', [0xE0]], ['ArrowRefill5', [0xE1]], ['ArrowRefill10', [0xE2]],
  ['Fairy', [0xE3]],
].map(([n, b]) => [n, new Droppable(n, b)]));

export const Sprite = {
  get(name) {
    const s = DROPPABLES.get(name);
    if (!s) throw new Error('Unknown Sprite: ' + name);
    return s;
  },
  Droppable,
};

export class PrizePackSlot {
  constructor(sprite = null) { this.drop = sprite; }
  getDrop() { return this.drop; }
  setDrop(sprite) { this.drop = sprite; return this; }
  isFilled() { return this.drop !== null; }
}

export class PrizePack {
  constructor(name, slots) {
    this.name = name;
    this.drops = [];
    for (let i = 0; i < slots; i++) this.drops.push(new PrizePackSlot());
  }
  getName() { return this.name; }
  getDrops() { return this.drops; }
  getEmptyDrops() { return this.drops.filter((s) => !s.isFilled()); }
}
