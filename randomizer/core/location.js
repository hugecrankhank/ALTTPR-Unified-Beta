// Port of app/Location.php and the simple app/Location/* subclasses.
// The text-heavy subclasses (Pedestal, Uncle, Zora, ...) live in
// locations-special.js.
import { Item } from './item.js';
import { __eq, in_array, fy_shuffle, ucfirst, Arr, is_array } from './php.js';
import { lang } from './lang.js';

export class Location {
  constructor(name, address, bytes, region, requirement_callback = null) {
    this.name = name;
    this.address = address;
    this.bytes = bytes == null ? [] : (Array.isArray(bytes) ? bytes : [bytes]);
    this.region = region;
    this.requirement_callback = requirement_callback;
    this.fill_callback = null;
    this.always_callback = null;
    this.item = null;
  }

  fill(item, items) {
    const old = this.item;
    this.setItem(item);
    if (this.canFill(item, items)) return true;
    this.setItem(old);
    return false;
  }

  canFill(item, items, check_access = true) {
    items.setChecksForWorld(this.region.getWorld().id);
    const old = this.item;
    this.setItem(item);
    const fillable = (this.always_callback && this.always_callback(item, items))
      || (this.region.canFill(item)
        && (!this.fill_callback || this.fill_callback(item, this.region.getWorld().getLocations(), items))
        && (!check_access || this.canAccess(items)));
    this.setItem(old);
    return !!fillable;
  }

  canAccess(items, locations = null) {
    locations = locations ?? this.region.getWorld().getLocations();
    items.setChecksForWorld(this.region.getWorld().id);
    if (!this.region.canEnter(locations, items)) return false;
    if (!this.requirement_callback || this.requirement_callback(locations, items)) return true;
    return false;
  }

  setRequirements(cb) { this.requirement_callback = cb; return this; }
  setFillRules(cb) { this.fill_callback = cb; return this; }
  setAlwaysAllow(cb) { this.always_callback = cb; return this; }
  setItem(item = null) { this.item = item; return this; }

  hasItem(item = null) {
    return item ? __eq(this.item, item) : this.item !== null;
  }

  getItem() { return this.item; }

  getHint() {
    if (!this.item) return null;
    const world = this.region.getWorld();
    const item = (world.config('rom.genericKeys', false) && this.item instanceof Item.Key)
      ? Item.get('KeyGK', world) : this.item;
    let item_name = lang('hint.item.' + item.getTarget().getRawName());
    if (is_array(item_name)) item_name = Arr.first(fy_shuffle(item_name));
    let location_name = lang('hint.location.' + this.name);
    if (is_array(location_name)) location_name = Arr.first(fy_shuffle(location_name));
    return ucfirst(`${item_name} ${location_name}`);
  }

  writeItem(rom, item = null) {
    if (item) this.setItem(item);
    if (!this.item) throw new Error('No Item set to be written');
    const world = this.region.getWorld();
    let it = this.item;

    if (world.config('rom.vanillaKeys', false) && it instanceof Item.Key && this.region.isRegionItem(it)
      && (!in_array(this.name, ["Secret Passage", "Link's Uncle"]) || !__eq(it, Item.get('KeyH2', world)))) {
      it = Item.get('Key', world);
    }
    if (world.config('rom.vanillaBigKeys', false) && it instanceof Item.BigKey && this.region.isRegionItem(it)) {
      it = Item.get('BigKey', world);
    }
    if (world.config('rom.vanillaMaps', false) && it instanceof Item.Map && this.region.isRegionItem(it)
      && (!in_array(this.name, ["Secret Passage", "Link's Uncle"]) || !__eq(it, Item.get('MapH2', world)))) {
      it = Item.get('Map', world);
    }
    if (world.config('rom.vanillaCompasses', false) && it instanceof Item.Compass && this.region.isRegionItem(it)) {
      it = Item.get('Compass', world);
    }
    if (world.config('rom.genericKeys', false) && it instanceof Item.Key) {
      it = Item.get('KeyGK', world);
    }

    const item_bytes = it.getBytes();
    for (const key of Object.keys(this.address)) {
      const address = this.address[key];
      const b = item_bytes[key];
      if (b === undefined || b === null || address === undefined || address === null) continue;
      rom.write(address, [b & 0xFF]);
    }
    return this;
  }

  getName() { return this.name + ':' + this.region.getWorld().id; }
  getAddress() { return this.address; }
  setRegion(region) { this.region = region; return this; }
  getRegion() { return this.region; }
  toString() { return this.name; }
}

const sub = (base, n) => ({ [n]: class extends base {} })[n];

Location.Chest = sub(Location, 'Chest');
Location.BigChest = sub(Location.Chest, 'BigChest');
Location.Dash = sub(Location, 'Dash');
Location.Dig = sub(Location, 'Dig');
Location.Drop = sub(Location, 'Drop');
Location.Fountain = sub(Location, 'Fountain');
Location.Npc = sub(Location, 'Npc');
Location.Standing = sub(Location, 'Standing');
Location.Trade = sub(Location, 'Trade');

Location.Medallion = class Medallion extends Location {
  setItem(item = null) {
    if (!(item instanceof Item.Medallion) && item !== null) {
      throw new Error('Trying to set non-Medallion in a Medallion Location');
    }
    this.item = item;
    return this;
  }
};

Location.Prize = class Prize extends Location {
  setItem(item = null) {
    if (!(item instanceof Item.Pendant) && !(item instanceof Item.Crystal) && item !== null) {
      throw new Error('Trying to set non-Pendant/Crystal in a Prize Location: ' + this.getName() + ' item ' + item.getName());
    }
    this.item = item;
    return this;
  }

  writeItem(rom, item = null) {
    super.writeItem(rom, item);
    const addrs = this.region.music_addresses;
    if (addrs != null && Array.isArray(addrs)) {
      let music;
      if (this.region.getWorld().config('rom.mapOnPickup', false)) {
        music = Arr.first(fy_shuffle([0x11, 0x16]));
      } else {
        music = this.getItem() instanceof Item.Pendant ? 0x11 : 0x16;
      }
      for (const address of addrs) rom.write(address, [music]);
    }
    return this;
  }
};

Location.Prize.Crystal = sub(Location.Prize, 'Crystal');
Location.Prize.Pendant = sub(Location.Prize, 'Pendant');
Location.Prize.Event = class Event extends Location.Prize {
  setItem(item = null) {
    if (!(item instanceof Item.Event) && item !== null) {
      throw new Error('Trying to set non-Event in an Event Prize Location');
    }
    this.item = item;
    return this;
  }
};

Location.Standing.HeraBasement = class HeraBasement extends Location {
  writeItem(rom, item = null) {
    super.writeItem(rom, item);
    const w = this.region.getWorld();
    rom.write(0x4E3BB, [(this.hasItem(Item.get('Key', w)) || this.hasItem(Item.get('KeyP3', w))) ? 0xE4 : 0xEB]);
    return this;
  }
};
