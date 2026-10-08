// Port of app/Region.php
import { ShopCollection } from './collections.js';
import { Item } from './item.js';
import { __eq, in_array } from './php.js';

export class Region {
  __init_props() {
    this.locations = null;
    this.shops = null;
    this.can_enter = null;
    this.can_complete = null;
    this.name = 'Unknown';
    this.prize_location = null;
    this.world = null;
    this.region_items = [];
    this.boss = null;
    this.map_reveal = 0x0000;
  }

  constructor(world) {
    this.__init_props();
    this.world = world;
    this.shops = new ShopCollection();
    this.region_items = this.region_items.map((name) => Item.get(name, world));
  }

  getWorld() { return this.world; }
  getName() { return this.name; }
  getBoss(level) { return this.boss; }
  setBoss(boss, level = null) { this.boss = boss; return this; }

  canPlaceBoss(boss, level = 'top') {
    if (this.name != 'Ice Palace' && this.world.config('mode.weapons') == 'swordless' && boss.getName() == 'Kholdstare') {
      return false;
    }
    return !['Agahnim', 'Agahnim2', 'Ganon'].includes(boss.getName());
  }

  getMapReveal() { return this.map_reveal; }

  setPrizeLocation(location) {
    this.prize_location = location;
    this.prize_location.setRegion(this);
    if (this.can_complete) this.prize_location.setRequirements(this.can_complete);
    return this;
  }

  getPrizeLocation() { return this.prize_location; }

  getPrize() {
    if (this.prize_location == null || !this.prize_location.hasItem()) return null;
    return this.prize_location.getItem();
  }

  hasPrize(item = null) {
    if (this.prize_location == null || !this.prize_location.hasItem()) return false;
    return this.prize_location.hasItem(item);
  }

  initalize() { return this; }

  canComplete(locations, items) {
    if (this.can_complete) return this.can_complete(locations, items);
    return true;
  }

  canEnter(locations, items) {
    if (this.can_enter) return this.can_enter(locations, items);
    return true;
  }

  canFill(item) {
    const from = item.getWorld();
    if (((!from.config('region.wildKeys', false) && item instanceof Item.Key)
      || (!from.config('region.wildBigKeys', false) && item instanceof Item.BigKey)
      || (__eq(item, Item.get('KeyH2', from)) && from.config('mode.state') == 'standard' && from.config('logic') !== 'NoLogic')
      || (!from.config('region.wildMaps', false) && item instanceof Item.Map)
      || (!from.config('region.wildCompasses', false) && item instanceof Item.Compass))
      && !in_array(item, this.region_items)) {
      return false;
    }
    return true;
  }

  isRegionItem(item) { return in_array(item, this.region_items); }
  getLocations() { return this.locations; }
  getLocation(name) { return this.locations.get(name); }
  getEmptyLocations() { return this.locations.filter((l) => !l.hasItem()); }
  locationsWithItem(item = null) { return this.locations.locationsWithItem(item); }
  getShops() { return this.shops; }
  getShop(name) { return this.shops.get(name); }
}
