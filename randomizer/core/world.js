// Port of app/World.php (alttp_vt_randomizer, MIT)
import { ItemCollection, LocationCollection, ShopCollection } from './collections.js';
import { Item } from './item.js';
import { Location } from './location.js';
import { Region } from './region.js';
import { Rom } from './rom.js';
import { Shop, PrizePack, Sprite } from './shop.js';
import { config as globalConfig } from './config.js';
import { get_random_int, fy_shuffle, floor, min, count, __values, hash_array } from './php.js';
import { getPlayThrough } from './playthrough.js';

export class World {
  static max_world = 1;

  constructor(id = 0, config = {}) {
    // Subclasses build their regions with this.id / this.config already set
    // (PHP sets those before calling the parent constructor).
    this.id = id;
    this.config_ = { difficulty: 'normal', logic: 'NoGlitches', goal: 'ganon', ...config };
    this.regions = this.buildRegions();

    this.id = id;
    this.config_ = { difficulty: 'normal', logic: 'NoGlitches', goal: 'ganon', ...config };
    this.seed = { id: 1, hash: 'local', hashArray() { return hash_array(this.id); } };
    this.collectable_locations = null;
    this.texts = {};
    this.credits = {};
    this.collected_locations = new Map();
    this.override_patch = null;
    this.spoiler = {};

    this.pre_collected_items = new ItemCollection();
    this.equipped_region = new Region(this);
    this.locations = new LocationCollection();
    this.shops = new ShopCollection();

    this.prizepacks = new Map([
      ['0', new PrizePack('0', 8)], ['1', new PrizePack('1', 8)], ['2', new PrizePack('2', 8)],
      ['3', new PrizePack('3', 8)], ['4', new PrizePack('4', 8)], ['5', new PrizePack('5', 8)],
      ['6', new PrizePack('6', 8)], ['pull', new PrizePack('pull', 3)], ['crab', new PrizePack('crab', 2)],
      ['stun', new PrizePack('stun', 1)], ['fish', new PrizePack('fish', 1)],
    ]);

    for (const region of Object.values(this.regions)) {
      if (this.config('logic') !== 'NoLogic') region.initalize();
      this.locations = this.locations.merge(region.getLocations());
      this.shops = this.shops.merge(region.getShops());
    }
    this.locations.setChecksForWorld(this.id);

    this.win_condition = (collected) => {
      collected.setChecksForWorld(this.id);
      return collected.has('Triforce')
        || (this.regions['North East Light World'].canEnter(this.locations, collected)
          && (this.config('goal', 'ganon') == 'triforce-hunt' && collected.has('TriforcePiece', this.config('item.Goal.Required'))));
    };

    const c = this.config_;
    let free_item_text = this.config('rom.freeItemText', 0x00);
    let free_item_menu = this.config('rom.freeItemMenu', 0x00);
    switch (this.config('dungeonItems')) {
      case 'full':
        c['region.wildBigKeys'] = true;
        free_item_text |= 0x18;
        free_item_menu |= 0x02;
      // falls through
      case 'mcs':
        c['region.wildKeys'] = true;
        free_item_text |= 0x11;
        free_item_menu |= 0x01;
      // falls through
      case 'mc':
        c['region.wildMaps'] = true;
        c['rom.mapOnPickup'] = true;
        c['region.wildCompasses'] = true;
        c['rom.dungeonCount'] = 'pickup';
        free_item_text |= 0x16;
        free_item_menu |= 0x0C;
    }

    const glitched = ['HybridMajorGlitches', 'MajorGlitches', 'NoLogic'].includes(this.config('logic', 'NoGlitches'))
      || this.config('canOneFrameClipUW', false);
    if (glitched) free_item_menu |= 0x10;

    c['rom.freeItemText'] = free_item_text;
    c['rom.freeItemMenu'] = free_item_menu;

    const wild_keys = this.config('region.wildKeys', false);
    const wild_big_keys = this.config('region.wildBigKeys', false);
    const wild_compasses = this.config('region.wildCompasses', false);
    const wild_maps = this.config('region.wildMaps', false);

    c['rom.vanillaKeys'] = this.config('rom.vanillaKeys', (!wild_keys && glitched));
    c['rom.vanillaBigKeys'] = this.config('rom.vanillaBigKeys', (!wild_big_keys && glitched));
    c['rom.vanillaCompasses'] = this.config('rom.vanillaCompasses', (!wild_compasses && glitched));
    c['rom.vanillaMaps'] = this.config('rom.vanillaMaps', (!wild_maps && glitched));

    for (const k of ['Sword', 'Armor', 'Shield', 'Bow', 'BossHeartContainer', 'PieceOfHeart']) {
      if (this.config(`item.overflow.count.${k}`, null) === '') delete c[`item.overflow.count.${k}`];
    }

    switch (this.config('item.pool')) {
      case 'superexpert':
        Object.assign(c, {
          'item.overflow.count.Sword': 2, 'item.overflow.count.Armor': 0, 'item.overflow.count.Shield': 0,
          'item.overflow.count.Bow': 1, 'item.overflow.count.BossHeartContainer': 0,
          'item.overflow.count.PieceOfHeart': 0, 'shops.HardMode': true,
        });
        break;
      case 'expert':
        Object.assign(c, {
          'item.overflow.count.Sword': 2, 'item.overflow.count.Armor': 0, 'item.overflow.count.Shield': 1,
          'item.overflow.count.Bow': 1, 'item.overflow.count.BossHeartContainer': 2,
          'item.overflow.count.PieceOfHeart': 8, 'shops.HardMode': true,
        });
        break;
      case 'hard':
        Object.assign(c, {
          'item.overflow.count.Sword': 3, 'item.overflow.count.Armor': 0, 'item.overflow.count.Shield': 2,
          'item.overflow.count.Bow': 1, 'item.overflow.count.BossHeartContainer': 6,
          'item.overflow.count.PieceOfHeart': 16, 'shops.HardMode': true,
        });
        break;
      case 'crowd_control':
        Object.assign(c, {
          'item.overflow.count.Sword': 4, 'item.overflow.count.Armor': 1, 'item.overflow.count.Shield': 0,
          'item.overflow.count.Bow': 1, 'item.overflow.count.BossHeartContainer': 1,
          'item.overflow.count.PieceOfHeart': 20, 'item.count.BugCatchingNet': 0, 'item.count.HalfMagic': 0,
          'item.count.CaneOfByrna': 0, 'item.count.Cape': 0, 'item.count.TwentyRupees2': 4,
        });
    }

    switch (this.config('item.functionality')) {
      case 'superexpert':
        Object.assign(c, {
          'rom.CapeMagicUsage.Normal': 0x01, 'rom.CapeMagicUsage.Half': 0x02, 'rom.CapeMagicUsage.Quarter': 0x02,
          'rom.CaneOfByrnaInvulnerability': false, 'rom.PowderedSpriteFairyPrize': 0x79,
          'rom.BottleFill.Health': 0x00, 'rom.BottleFill.Magic': 0x00, 'rom.CatchableFairies': false,
          'rom.CatchableBees': true, 'rom.StunItems': 0x00, 'rom.SilversOnlyAtGanon': true, 'rom.NoFarieDrops': true,
        });
        break;
      case 'expert':
        Object.assign(c, {
          'rom.CapeMagicUsage.Normal': 0x02, 'rom.CapeMagicUsage.Half': 0x04, 'rom.CapeMagicUsage.Quarter': 0x08,
          'rom.CaneOfByrnaInvulnerability': false, 'rom.PowderedSpriteFairyPrize': 0xD8,
          'rom.BottleFill.Health': 0x20, 'rom.BottleFill.Magic': 0x20, 'rom.CatchableFairies': false,
          'rom.CatchableBees': true, 'rom.StunItems': 0x00, 'rom.SilversOnlyAtGanon': true, 'rom.NoFarieDrops': true,
        });
        break;
      case 'hard':
        Object.assign(c, {
          'rom.CapeMagicUsage.Normal': 0x02, 'rom.CapeMagicUsage.Half': 0x04, 'rom.CapeMagicUsage.Quarter': 0x08,
          'rom.CaneOfByrnaInvulnerability': false, 'rom.PowderedSpriteFairyPrize': 0xD8,
          'rom.BottleFill.Health': 0x38, 'rom.BottleFill.Magic': 0x40, 'rom.CatchableFairies': false,
          'rom.CatchableBees': true, 'rom.StunItems': 0x02, 'rom.SilversOnlyAtGanon': true, 'rom.NoFarieDrops': true,
        });
        break;
    }

    c['region.requireBetterBow'] = false;
    c['region.requireBetterSword'] = false;
    if (this.config('itemPlacement') === 'basic') {
      c['region.requireBetterBow'] = true;
      c['region.requireBetterSword'] = true;
    }
    if (this.config('mode.weapons') === 'swordless') {
      c['region.requireBetterBow'] = true;
      c['item.overflow.count.Bow'] = 2;
    }
    if (this.config('itemPlacement') === 'basic') {
      c['region.forceSkullWoodsKey'] = true;
    }
  }

  buildRegions() { return {}; }

  static factory(type = 'standard', config = {}) {
    config = { ...config, 'mode.state': type };
    const W = World.types;
    switch (type) {
      case 'open': return new W.Open(World.max_world++, config);
      case 'inverted': return new W.Inverted(World.max_world++, config);
      case 'retro': return new W.Retro(World.max_world++, config);
      case 'standard':
      default: return new W.Standard(World.max_world++, config);
    }
  }

  getPreCollectedItems() { return this.pre_collected_items; }

  setPreCollectedItems(items) {
    this.pre_collected_items = items;
    this.pre_collected_items.setChecksForWorld(this.id);
    return this;
  }

  addPreCollectedItem(item) { this.pre_collected_items.addItem(item); return this; }

  copy() {
    const copy = new this.constructor(this.id, { ...this.config_ });
    copy.locations.setChecksForWorld(this.id);
    for (const [name, location] of this.locations.entries()) {
      copy.locations.get(name).setItem(location.getItem());
    }
    for (const [name, shop] of this.shops.entries()) {
      copy.shops.set(name, shop.copy());
    }
    const boss_locations = [
      ['Eastern Palace', ''], ['Desert Palace', ''], ['Tower of Hera', ''], ['Palace of Darkness', ''],
      ['Swamp Palace', ''], ['Skull Woods', ''], ['Thieves Town', ''], ['Ice Palace', ''], ['Misery Mire', ''],
      ['Turtle Rock', ''], ['Ganons Tower', 'bottom'], ['Ganons Tower', 'middle'], ['Ganons Tower', 'top'],
    ];
    for (const [r, l] of boss_locations) {
      copy.getRegion(r).setBoss(this.getRegion(r).getBoss(l), l);
    }
    copy.setPreCollectedItems(this.pre_collected_items.copy());
    return copy;
  }

  getGanonsTowerJunkFillRange() {
    const c = this.config_;
    if (c.logic === 'NoLogic'
      || (c['mode.state'] !== 'inverted' && ['OverworldGlitches', 'HybridMajorGlitches', 'MajorGlitches'].includes(c.logic))) {
      return [0, 0];
    }
    if (c.goal == 'triforce-hunt' || c.goal == 'pedestal') {
      return [floor(15 * this.config('crystals.tower') / 7), floor(25 * this.config('crystals.tower') / 7)];
    }
    return [0, floor(15 * this.config('crystals.tower') / 7)];
  }

  getWinCondition() { return this.win_condition; }
  checkWinCondition(collected = null) { return this.getWinCondition()(this.collectItems(collected)); }

  config(key, def = null) {
    if (!Object.prototype.hasOwnProperty.call(this.config_, key)) {
      this.config_[key] = globalConfig(`alttp.goals.${this.config_.goal}.${key}`,
        globalConfig(`alttp.${key}`,
          globalConfig(`logic.${this.config_.logic}.${key}`,
            globalConfig(key, null))));
    }
    const v = this.config_[key];
    return v ?? def;
  }

  getRegion(name) { return this.regions[name]; }
  getRegions() { return this.regions; }
  getLocations() { return this.locations; }
  getPrizePacks() { return this.prizepacks; }

  getCollectableLocations() {
    if (this.collectable_locations === null) {
      this.collectable_locations = this.locations.filter((l) => !(l instanceof Location.Medallion)
        && !(l instanceof Location.Fountain)
        && !(this.collected_locations.get(l.getName()) ?? false))
        .merge(this.shops.getLocations());
    }
    return this.collectable_locations;
  }

  getTotalItemCount() {
    return this.locations.filter((l) => !(l instanceof Location.Prize) && !(l instanceof Location.Fountain)
      && !(l instanceof Location.Medallion) && !(l instanceof Location.Trade)).count();
  }

  collectItems(collected = null) {
    let my_items = collected ?? new ItemCollection();
    my_items = my_items.merge(this.pre_collected_items);
    my_items.setChecksForWorld(this.id);
    let available = this.getCollectableLocations().filter((l) => l.hasItem());
    let found;
    do {
      const search = available.filter((l) => !(this.collected_locations.get(l.getName()) ?? false) && l.canAccess(my_items));
      for (const l of search) this.collected_locations.set(l.getName(), true);
      available = available.diff(search);
      found = search.getItems();
      my_items = my_items.merge(found);
    } while (found.count() > 0);
    return my_items;
  }

  collectOtherItems(collected) {
    let my_items = collected ?? new ItemCollection(this.pre_collected_items);
    my_items.setChecksForWorld(this.id);
    let found_all = new ItemCollection();
    let available = this.getCollectableLocations();
    let found;
    do {
      const search = available.filter((l) => l.hasItem()
        && !(this.collected_locations.get(l.getName()) ?? false) && l.canAccess(my_items));
      for (const l of search) this.collected_locations.set(l.getName(), true);
      available = available.diff(search);
      found = search.getItems();
      my_items = my_items.merge(found);
      found_all = found_all.merge(found);
    } while (found.count() > 0);
    return found_all;
  }

  getCollectedLocationsCount() { return this.collected_locations.size; }
  getCollectedLocations() { return this.collected_locations; }
  resetCollectedLocations() { this.collected_locations = new Map(); }

  getLocationSpheres() {
    let sphere = 0;
    const location_sphere = { 0: new LocationCollection() };
    let my_items = this.pre_collected_items;
    let i = 0;
    for (const item of my_items) {
      const location = new Location(`Equipment Slot ${++i}`, [], null, this.equipped_region);
      location.setItem(item);
      location_sphere[0].addItem(location);
    }
    let found_locations = new LocationCollection();
    let found;
    do {
      sphere++;
      const fl = found_locations, mi = my_items;
      const available = this.getCollectableLocations().filter((l) => l.hasItem()
        && !fl.contains(l) && l.canAccess(mi));
      location_sphere[sphere] = available;
      found = available.getItems();
      found_locations = found_locations.merge(available);
      my_items = my_items.merge(found);
    } while (found.count() > 0);
    return location_sphere;
  }

  getLocation(name) { return this.locations.get(name); }
  getEmptyLocations() { return this.locations.filter((l) => !l.hasItem()); }
  getLocationsWithItem(item = null) { return this.locations.locationsWithItem(item); }
  getRegionsWithItem(item = null) { return this.getLocationsWithItem(item).getRegions(); }

  setDrop(pack, ind, drop) { this.prizepacks.get(String(pack)).getDrops()[ind].setDrop(drop); }

  getAllDrops() {
    let drops = [];
    for (const pack of this.prizepacks.values()) drops = drops.concat(pack.getDrops());
    return drops;
  }

  getEmptyDropSlots() {
    let drops = [];
    for (const pack of this.prizepacks.values()) drops = drops.concat(pack.getEmptyDrops());
    return drops;
  }

  getShops() { return this.shops; }
  getShop(name) { return this.shops.get(name); }

  poolFrom(key, bottleStrict = false) {
    const items = [];
    for (const [item_name, cnt] of Object.entries(this.config(key))) {
      const loop = min(this.config('item.count.' + item_name, cnt), 216);
      for (let i = 0; i < loop; ++i) {
        items.push(item_name == 'BottleWithRandom' ? this.getBottle() : Item.get(item_name, this));
      }
    }
    return items;
  }

  getAdvancementItems() { return this.poolFrom('item.advancement'); }
  getNiceItems() { return this.poolFrom('item.nice'); }
  getItemPool() { return this.poolFrom('item.junk'); }
  getDungeonPool() { return this.poolFrom('item.dungeon', true); }

  getDropsPool() {
    const drops = [];
    for (const [sprite_name, cnt] of Object.entries(this.config('item.drop'))) {
      const loop = min(this.config('drop.count.' + sprite_name, cnt), 63);
      for (let i = 0; i < loop; ++i) drops.push(Sprite.get(sprite_name));
    }
    return fy_shuffle(drops);
  }

  getBottle(filled = false) {
    const bottles = [
      Item.get('Bottle', this), Item.get('BottleWithRedPotion', this), Item.get('BottleWithGreenPotion', this),
      Item.get('BottleWithBluePotion', this), Item.get('BottleWithBee', this), Item.get('BottleWithGoldBee', this),
      Item.get('BottleWithFairy', this),
    ];
    return bottles[get_random_int(filled ? 1 : 0, bottles.length - (this.config('rom.CatchableFairies', true) ? 1 : 2))];
  }

  setSpoiler(spoiler) { this.spoiler = spoiler; }

  getSpoiler(meta = {}) {
    if (this.config('entrances') === 'none') {
      if (count(this.pre_collected_items)) {
        let i = 0;
        for (const item of this.pre_collected_items) {
          if (item instanceof Item.Upgrade.Arrow || item instanceof Item.Upgrade.Bomb || item instanceof Item.Event) continue;
          (this.spoiler.Equipped ??= {})[`Equipment Slot ${++i}`] = item.getTarget().getName();
        }
      }
      for (const region of Object.values(this.getRegions())) {
        const name = region.getName();
        this.spoiler[name] ??= {};
        region.getLocations().each((location) => {
          if (location instanceof Location.Prize.Event || location instanceof Location.Trade) return;
          if (location.hasItem()) {
            const item = location.getItem();
            this.spoiler[name][location.getName()] = this.config('rom.genericKeys', false) && item instanceof Item.Key
              ? 'Key' : item.getTarget().getName();
          } else {
            this.spoiler[name][location.getName()] = 'Nothing';
          }
        });
      }
      for (const shop of this.getShops()) {
        if (shop.getActive()) {
          const shop_data = { location: shop.getName(), type: shop instanceof Shop.TakeAny ? 'Take Any' : 'Shop' };
          for (const [slot, item] of shop.getInventory()) {
            shop_data[`item_${slot}`] = { item: item.item.getName(), price: item.price };
          }
          (this.spoiler.Shops ??= []).push(shop_data);
        }
      }
      this.spoiler.playthrough = getPlayThrough(this);
    }

    this.spoiler.meta = {
      ...(this.spoiler.meta ?? {}), ...meta,
      item_placement: this.config('itemPlacement'),
      item_pool: this.config('item.pool'),
      item_functionality: this.config('item.functionality'),
      dungeon_items: this.config('dungeonItems'),
      logic: this.config('logic'),
      accessibility: this.config('accessibility'),
      rom_mode: this.config('rom.logicMode', this.config('logic')),
      goal: this.config('goal'),
      build: Rom.BUILD,
      mode: this.config('mode.state'),
      weapons: this.config('mode.weapons'),
      world_id: this.id,
      crystals_ganon: this.config('crystals.ganon'),
      crystals_tower: this.config('crystals.tower'),
      tournament: this.config('tournament', false),
      size: 2,
      hints: this.config('spoil.Hints'),
      spoilers: this.config('spoilers', 'off'),
      allow_quickswap: this.config('allow_quickswap', true),
      pseudoboots: this.config('pseudoboots', false),
      'enemizer.boss_shuffle': this.config('enemizer.bossShuffle'),
      'enemizer.enemy_shuffle': this.config('enemizer.enemyShuffle'),
      'enemizer.enemy_damage': this.config('enemizer.enemyDamage'),
      'enemizer.enemy_health': this.config('enemizer.enemyHealth'),
      'enemizer.pot_shuffle': this.config('enemizer.potShuffle'),
    };

    const b = (r, l = '') => this.getRegion(r).getBoss(l).getName();
    this.spoiler.Bosses = {
      'Eastern Palace': b('Eastern Palace'),
      'Desert Palace': b('Desert Palace'),
      'Tower Of Hera': b('Tower of Hera'),
      'Hyrule Castle': 'Agahnim',
      'Palace Of Darkness': b('Palace of Darkness'),
      'Swamp Palace': b('Swamp Palace'),
      'Skull Woods': b('Skull Woods'),
      'Thieves Town': b('Thieves Town'),
      'Ice Palace': b('Ice Palace'),
      'Misery Mire': b('Misery Mire'),
      'Turtle Rock': b('Turtle Rock'),
      'Ganons Tower Basement': b('Ganons Tower', 'bottom'),
      'Ganons Tower Middle': b('Ganons Tower', 'middle'),
      'Ganons Tower Top': b('Ganons Tower', 'top'),
      'Ganons Tower': 'Agahnim 2',
      Ganon: 'Ganon',
    };
    return this.spoiler;
  }

  setText(key, value) { this.texts[key] = value; }
  setCredit(key, value) { this.credits[key] = value; }
  setItemAccessibility(a) { this.config_.accessibility = a; }

  writeToRom(rom) {
    for (const [k, v] of Object.entries(this.texts)) rom.setText(k, v);
    for (const [k, v] of Object.entries(this.credits)) rom.setCredit(k, v);

    if (!this.config('multiworld', false)) {
      for (const region of Object.values(this.getRegions())) {
        region.getLocations().getNonEmptyLocations().each((l) => { l.writeItem(rom); });
        region.getLocations().getEmptyLocations().each((l) => {
          l.setItem(Item.get('Nothing', this));
          l.writeItem(rom);
        });
      }
    }

    if (this.config('mode.state') === 'standard') this.setEscapeFills(rom);

    rom.setGoalRequiredCount(this.config('item.Goal.Required', 0) || 0);
    rom.setGoalIcon(this.config('item.Goal.Icon', 'triforce'));

    rom.setCaneOfByrnaSpikeCaveUsage();
    rom.setCapeSpikeCaveUsage();
    rom.setByrnaCaveSpikeDamage(0x08);
    rom.write(0x45C42, [0x04, 0x02, 0x01]);

    rom.setCapeRegularMagicUsage(
      this.config('rom.CapeMagicUsage.Normal', 0x04),
      this.config('rom.CapeMagicUsage.Half', 0x08),
      this.config('rom.CapeMagicUsage.Quarter', 0x10),
    );
    rom.setCaneOfByrnaInvulnerability(this.config('rom.CaneOfByrnaInvulnerability', true));
    rom.setPowderedSpriteFairyPrize(this.config('rom.PowderedSpriteFairyPrize', 0xE3));
    rom.setBottleFills([this.config('rom.BottleFill.Health', 0xA0), this.config('rom.BottleFill.Magic', 0x80)]);
    rom.setCatchableFairies(this.config('rom.CatchableFairies', true));
    rom.setCatchableBees(this.config('rom.CatchableBees', true));
    rom.setStunItems(this.config('rom.StunItems', 0x03));
    rom.setSilversOnlyAtGanon(this.config('rom.SilversOnlyAtGanon', false));
    rom.setRupoorValue(this.config('item.value.Rupoor', 0) || 0);
    rom.setGanonAgahnimRng(this.config('rom.GanonAgRNG', 'table'));
    rom.setTowerCrystalRequirement(this.config('crystals.tower', 7));
    rom.setGanonCrystalRequirement(this.config('crystals.ganon', 7));

    rom.setGenericKeys(this.config('rom.genericKeys', false));
    rom.setupCustomShops(this.getShops());
    rom.setRupeeArrow(this.config('rom.rupeeBow', false));
    rom.setWishingWellChests(true);
    rom.setWishingWellUpgrade(false);
    rom.setHyliaFairyShop(true);
    rom.setRestrictFairyPonds(true);
    const repl = (k) => Item.get(this.config(`item.overflow.replacement.${k}`, 'TwentyRupees2'), this).getBytes()[0];
    rom.setLimitProgressiveSword(this.config('item.overflow.count.Sword', 4), repl('Sword'));
    rom.setLimitProgressiveShield(this.config('item.overflow.count.Shield', 3), repl('Shield'));
    rom.setLimitProgressiveArmor(this.config('item.overflow.count.Armor', 2), repl('Armor'));
    rom.setLimitBottle(this.config('item.overflow.count.Bottle', 4), repl('Bottle'));
    rom.setLimitProgressiveBow(this.config('item.overflow.count.Bow', 2), repl('Bow'));

    rom.setSilversEquip('collection');
    rom.setSubstitutions([
      0x12, 0x01, 0x35, 0xFF,
      0x51, 0x06, 0x52, 0xFF,
      0x53, 0x06, 0x54, 0xFF,
      0x58, 0x01, this.config('rom.rupeeBow', false) ? 0x36 : 0x43, 0xFF,
      0x3E, this.config('item.overflow.count.BossHeartContainer', 10), repl('BossHeartContainer'), 0xFF,
      0x17, this.config('item.overflow.count.PieceOfHeart', 24), repl('PieceOfHeart'), 0xFF,
    ]);

    switch (this.config_.goal) {
      case 'triforce-hunt':
        rom.enableTriforceTurnIn(true);
      // falls through
      case 'pedestal':
        rom.setGanonInvincible('yes');
        break;
      case 'dungeons':
        rom.setGanonInvincible('dungeons');
        break;
      case 'ganonhunt':
        rom.initial_sram.preOpenPyramid();
        rom.setGanonInvincible('triforce_pieces');
        break;
      case 'fast_ganon':
        rom.initial_sram.preOpenPyramid();
        rom.setGanonInvincible('crystals_only');
        break;
      case 'completionist':
        rom.setGanonInvincible('completionist');
        break;
      default:
        rom.setGanonInvincible('crystals_only');
    }

    if (this.config('rom.mapOnPickup', false)) {
      const gp = this.getLocationsWithItem(Item.get('PendantOfCourage', this)).first().getRegion();
      rom.setMapRevealSahasrahla(gp.getMapReveal());
      const c5 = this.getLocationsWithItem(Item.get('Crystal5', this)).first().getRegion();
      const c6 = this.getLocationsWithItem(Item.get('Crystal6', this)).first().getRegion();
      rom.setMapRevealBombShop(c5.getMapReveal() | c6.getMapReveal());
    }

    rom.setMapMode(this.config('rom.mapOnPickup', false));
    rom.setCompassMode(this.config('rom.dungeonCount', 'off'));
    rom.setCompassCountTotals();
    rom.setFreeItemTextMode(this.config('rom.freeItemText', 0x00));
    rom.setFreeItemMenu(this.config('rom.freeItemMenu', 0x00));
    rom.setDiggingGameRng(get_random_int(1, 30));

    rom.writeRNGBlock(() => get_random_int(0, 0x100));

    this.writePrizePacksToRom(rom);

    rom.setPyramidFairyChests(this.config('region.swordsInPool', true));
    rom.setSmithyQuickItemGive(this.config('region.swordsInPool', true));

    rom.setGameState(this.config('mode.state'));
    rom.setSwordlessMode(this.config('mode.weapons') === 'swordless');
    if (this.config('mode.state') !== 'inverted') {
      switch (this.config('rom.logicMode', this.config_.logic)) {
        case 'MajorGlitches': case 'HybridMajorGlitches': case 'NoLogic': case 'OverworldGlitches':
          rom.setLockAgahnimDoorInEscape(false);
          break;
        default:
          rom.setLockAgahnimDoorInEscape(true);
      }
    }

    const uncle = this.getLocation("Link's Uncle");
    if (!(uncle.getItem() instanceof Item.Sword)) rom.removeUnclesSword();
    if (!(uncle.getItem() instanceof Item.Shield) || !uncle.hasItem(Item.get('L1SwordAndShield', this))) {
      rom.removeUnclesShield();
    }

    rom.initial_sram.setStartingEquipment(this.pre_collected_items, this.config_);
    rom.setBallNChainDungeon(0x02);
    rom.setCapacityUpgradeFills([
      this.config('item.value.BombUpgrade5', 50),
      this.config('item.value.BombUpgrade10', 50),
      this.config('item.value.ArrowUpgrade5', 70),
      this.config('item.value.ArrowUpgrade10', 70),
    ]);

    rom.setClockMode(this.config('rom.timerMode', 'off'));
    rom.setBlueClock(this.config('item.value.BlueClock', 0) || 0);
    rom.setRedClock(this.config('item.value.RedClock', 0) || 0);
    rom.setGreenClock(this.config('item.value.GreenClock', 0) || 0);
    rom.initial_sram.setStartingTimer(this.config('rom.timerStart', 0) || 0);

    switch (this.config('rom.logicMode', this.config_.logic)) {
      case 'HybridMajorGlitches': case 'MajorGlitches': case 'NoLogic':
        rom.setSwampWaterLevel(false);
        rom.setPreAgahnimDarkWorldDeathInDungeon(false);
        rom.setSaveAndQuitFromBossRoom(true);
        rom.setWorldOnAgahnimDeath(false);
        rom.setRandomizerSeedType('MajorGlitches');
        rom.setWarningFlags(0b01100000);
        rom.setAllowAccidentalMajorGlitch(true);
        rom.setSQEGFix(false);
        rom.setZeldaMirrorFix(false);
        break;
      case 'OverworldGlitches':
        rom.setPreAgahnimDarkWorldDeathInDungeon(false);
        rom.setSaveAndQuitFromBossRoom(true);
        rom.setWorldOnAgahnimDeath(false);
        rom.setRandomizerSeedType('OverworldGlitches');
        rom.setWarningFlags(0b01000000);
        rom.setAllowAccidentalMajorGlitch(true);
        rom.setSQEGFix(false);
        rom.setZeldaMirrorFix(false);
        break;
      default:
        rom.setSaveAndQuitFromBossRoom(true);
        rom.setWorldOnAgahnimDeath(true);
        rom.setAllowAccidentalMajorGlitch(false);
        rom.setSQEGFix(true);
        rom.setZeldaMirrorFix(true);
    }

    const triforce_hud = ['triforce-hunt', 'ganonhunt'].includes(this.config_.goal) || (this.config('item.Goal.Required', 0) > 0);
    rom.enableHudItemCounter(triforce_hud ? false : this.config('rom.hudItemCounter', this.config('goal', 'ganon') == 'completionist'));

    if (this.config('crystals.tower') === 0) rom.initial_sram.preOpenGanonsTower();

    rom.setGameType('item');
    rom.setMysteryMasking(this.config('spoilers', 'on') === 'mystery');
    rom.setPseudoBoots(this.config('pseudoboots', false));
    rom.enableFastRom(this.config('fastrom', true));

    rom.writeCredits();
    rom.writeText();
    rom.writeInitialSram();
    rom.setTotalItemCount(this.getTotalItemCount());
    return rom;
  }

  setEscapeFills(rom) {
    let uncle_items = new ItemCollection();
    uncle_items.setChecksForWorld(this.id);
    uncle_items = uncle_items.addItem(this.getLocation("Link's Uncle").getItem());

    const ignore = this.config('ignoreCanKillEscapeThings', false);
    this.config_.ignoreCanKillEscapeThings = false;
    if (!uncle_items.canKillEscapeThings(this)) uncle_items = uncle_items.merge(this.getPreCollectedItems());
    this.config_.ignoreCanKillEscapeThings = ignore;

    if (uncle_items.hasSword() || uncle_items.has('Hammer')) {
      rom.setEscapeFills(0b00000000);
      rom.setUncleSpawnRefills(0, 0, 0);
      rom.setZeldaSpawnRefills(0, 0, 0);
      rom.setMantleSpawnRefills(0, 0, 0);
    } else if (uncle_items.has('FireRod') || uncle_items.has('CaneOfSomaria')
      || (uncle_items.has('CaneOfByrna') && this.config('enemizer.enemyHealth', 'default') == 'default')) {
      rom.setEscapeFills(0b00000100);
      rom.setUncleSpawnRefills(this.config('rom.EscapeRefills.Uncle.Magic', 0x80), 0, 0);
      rom.setZeldaSpawnRefills(this.config('rom.EscapeRefills.Zelda.Magic', 0x20), 0, 0);
      rom.setMantleSpawnRefills(this.config('rom.EscapeRefills.Mantle.Magic', 0x20), 0, 0);
      if (this.config('rom.EscapeAssist', false)) rom.setEscapeAssist(0b00000100);
    } else if (uncle_items.canShootArrows(this)) {
      rom.setEscapeFills(0b00000001);
      rom.setUncleSpawnRefills(0, 0, this.config('rom.EscapeRefills.Uncle.Arrows', 70));
      rom.setZeldaSpawnRefills(0, 0, this.config('rom.EscapeRefills.Zelda.Arrows', 10));
      rom.setMantleSpawnRefills(0, 0, this.config('rom.EscapeRefills.Mantle.Arrows', 10));
      if (this.config('rom.EscapeAssist', false)) rom.setEscapeAssist(0b00000001);
    } else if (uncle_items.has('TenBombs') || this.config('logic') !== 'NoLogic') {
      rom.setEscapeFills(0b00000010);
      rom.setUncleSpawnRefills(0, this.config('rom.EscapeRefills.Uncle.Bombs', 50), 0);
      rom.setZeldaSpawnRefills(0, this.config('rom.EscapeRefills.Zelda.Bombs', 3), 0);
      rom.setMantleSpawnRefills(0, this.config('rom.EscapeRefills.Mantle.Bombs', 3), 0);
      if (this.config('rom.EscapeAssist', false)) rom.setEscapeAssist(0b00000010);
    }
  }

  writePrizePacksToRom(rom) {
    const empty = this.getEmptyDropSlots();
    const pool = this.getDropsPool();
    for (let i = 0; i < empty.length; i++) empty[i].setDrop(pool[i]);

    let drop_bytes = this.getAllDrops().map((p) => p.getDrop().getBytes()[0]);
    const swap = (from, to) => { drop_bytes = drop_bytes.map((b) => { const i = from.indexOf(b); return i < 0 ? b : to[i]; }); };
    if (this.config('rom.NoFarieDrops', false)) swap([0xE0, 0xE3], [0xDF, 0xD8]);
    if (this.config('rom.rupeeBow', false)) {
      swap([0xE1, 0xE2], [0xDA, 0xDB]);
      rom.setOverworldDigPrizes([
        0xB2, 0xD8, 0xD8, 0xD8,
        0xD8, 0xD8, 0xD8, 0xD8, 0xD8,
        0xD9, 0xD9, 0xD9, 0xD9, 0xD9,
        0xDA, 0xDA, 0xDA, 0xDA, 0xDA,
        0xDB, 0xDB, 0xDB, 0xDB, 0xDB,
        0xDC, 0xDC, 0xDC, 0xDC, 0xDC,
        0xDD, 0xDD, 0xDD, 0xDD, 0xDD,
        0xDE, 0xDE, 0xDE, 0xDE, 0xDE,
        0xDF, 0xDF, 0xDF, 0xDF, 0xDF,
        0xE0, 0xE0, 0xE0, 0xE0, 0xE0,
        0xDA, 0xDA, 0xDA, 0xDA, 0xDA,
        0xDB, 0xDB, 0xDB, 0xDB, 0xDB,
        0xE3, 0xE3, 0xE3, 0xE3, 0xE3,
      ]);
    }
    rom.write(0x37A78, drop_bytes.slice(0, 56));
    rom.setPullTreePrizes(drop_bytes[56], drop_bytes[57], drop_bytes[58]);
    rom.setRupeeCrabPrizes(drop_bytes[59], drop_bytes[60]);
    rom.setStunnedSpritePrize(drop_bytes[61]);
    rom.setFishSavePrize(drop_bytes[62]);
  }

  isEnemized() {
    return this.config('enemizer.bossShuffle') != 'none' || this.config('enemizer.enemyShuffle') != 'none'
      || this.config('enemizer.enemyDamage') != 'default' || this.config('enemizer.enemyHealth') != 'default'
      || this.config('enemizer.potShuffle') != 'off';
  }
}
