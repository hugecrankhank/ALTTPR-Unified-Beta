// Port of app/Randomizer.php and app/Filler/RandomAssumed.php (alttp_vt_randomizer, MIT)
import { ItemCollection, LocationCollection, WorldCollection } from './collections.js';
import { Item } from './item.js';
import { Boss } from './boss.js';
import { Location } from './location.js';
import { Shop, Sprite, Droppable } from './shop.js';
import { HintService } from './hints.js';
import {
  get_random_int, fy_shuffle, Arr, array_pop, array_push, array_shift, array_unshift, array_diff, array_filter,
  array_merge, count, in_array, array_search, __eq, sprintf, __values, __entries, array_splice,
} from './php.js';
import strings from '../data/strings.js';

export class Randomizer {
  static LOGIC = 31;

  constructor(worlds) {
    for (const world of worlds) {
      if (world.getPreCollectedItems().count() === 0) {
        world.setPreCollectedItems(new ItemCollection([
          Item.get('BossHeartContainer', world),
          Item.get('BossHeartContainer', world),
          Item.get('BossHeartContainer', world),
          Item.get('BombUpgrade10', world),
          Item.get('ArrowUpgrade10', world),
          Item.get('ArrowUpgrade10', world),
          Item.get('ArrowUpgrade10', world),
        ]));
      }
    }
    this.worlds = worlds;
    this.advancement_items = [];
    this.trash_items = [];
    this.nice_items = [];
    this.dungeon_items = [];
  }

  randomize() {
    const filler = new RandomAssumed(this.worlds);
    for (const world of this.worlds) this.prepareWorld(world);
    filler.fill(this.dungeon_items, this.advancement_items, this.nice_items, this.trash_items);
    for (const world of this.worlds) {
      this.setTexts(world);
      this.randomizeCredits(world);
    }
    new HintService(this.worlds, this.advancement_items).applyHints();
  }

  prepareWorld(world) {
    if (world.config('goal') == 'completionist' && world.config('accessibility') != 'locations') {
      world.setItemAccessibility('locations');
    }

    switch (world.config('goal')) {
      case 'pedestal':
        world.getLocation('Master Sword Pedestal').setItem(Item.get('Triforce', world));
        break;
      case 'ganon': case 'fast_ganon': case 'dungeons': case 'ganonhunt': case 'completionist':
        world.getLocation('Ganon').setItem(Item.get('Triforce', world));
        break;
    }

    let dungeon_items = world.getDungeonPool();
    let advancement_items = world.getAdvancementItems();
    let nice_items = world.getNiceItems();
    let trash_items = world.getItemPool();

    if (['MajorGlitches', 'HybridMajorGlitches', 'OverworldGlitches', 'NoLogic'].includes(world.config('logic')) && world.config('difficulty') !== 'custom') {
      world.addPreCollectedItem(Item.get('PegasusBoots', world));
      for (const [key, item] of __entries(advancement_items)) {
        if (__eq(item, Item.get('PegasusBoots', world))) {
          delete advancement_items[key];
          array_push(trash_items, Item.get('TwentyRupees', world));
          break;
        }
      }
    }

    if (world.config('mode.state') != 'standard') {
      world.addPreCollectedItem(Item.get('RescueZelda', world));
    }

    this.setShops(world);
    this.setMedallions(world);
    this.placeBosses(world);
    this.fillPrizes(world);
    this.setFountains(world);
    this.shufflePrizePacks(world);

    const locations = world.getLocations().filter((l) => !(l instanceof Location.Prize) && !(l instanceof Location.Medallion));

    locations.get('Pyramid Fairy - Bow').setItem(world.config('region.pyramidBowUpgrade', false)
      ? Item.get('BowAndSilverArrows', world) : Item.get('BowAndArrows', world));

    if (world.config('region.bossesHaveItem', false) || !world.config('region.bossHeartsInPool', true)) {
      const boss_item = !world.config('region.bossHeartsInPool', true)
        ? Item.get('BossHeartContainer', world)
        : Item.get(world.config('region.bossesHaveItem'), world);
      for (const n of ['Desert Palace - Boss', 'Eastern Palace - Boss', 'Ice Palace - Boss', 'Misery Mire - Boss',
        'Palace of Darkness - Boss', 'Skull Woods - Boss', 'Swamp Palace - Boss', "Thieves' Town - Boss",
        'Turtle Rock - Boss', 'Tower of Hera - Boss']) {
        locations.get(n).setItem(boss_item);
      }
    }

    const nice_items_swords = [];
    const nice_items_bottles = [];
    const nice_items_health = [];
    const nice_items_armors = [];
    for (const [key, item] of __entries(advancement_items)) {
      if (__eq(item, Item.get('SilverArrowUpgrade', world))) {
        nice_items.push(item);
        delete advancement_items[key];
        continue;
      }
      if (item instanceof Item.Sword) {
        nice_items_swords.push(item);
        delete advancement_items[key];
        continue;
      }
      if (item instanceof Item.Bottle) {
        nice_items_bottles.push(item);
        delete advancement_items[key];
        continue;
      }
    }
    for (const [key, item] of __entries(nice_items)) {
      if (item instanceof Item.Sword) {
        delete nice_items[key];
        nice_items_swords.push(item);
      }
      if (item instanceof Item.Upgrade.Health) {
        delete nice_items[key];
        nice_items_health.push(item);
      }
      if (item instanceof Item.Armor) {
        delete nice_items[key];
        nice_items_armors.push(item);
      }
    }
    for (const [key, item] of __entries(trash_items)) {
      if (item instanceof Item.Upgrade.Health) {
        delete trash_items[key];
        nice_items_health.push(item);
      }
    }

    if (world.config('itemPlacement') === 'basic') {
      advancement_items = array_merge(advancement_items, nice_items_health);
      advancement_items = array_merge(advancement_items, nice_items_armors);
    } else {
      nice_items = array_merge(nice_items, nice_items_health);
      nice_items = array_merge(nice_items, nice_items_armors);
    }

    if (world.config('mode.weapons') === 'swordless') {
      for (const _ of nice_items_swords) nice_items.push(Item.get('TwentyRupees2', world));
      let world_items = world.collectItems();
      if (!world_items.merge(advancement_items).has('ProgressiveBow', 2)) {
        world_items = world_items.values();
        if (!in_array(Item.get('SilverArrowUpgrade', world), world_items)
          && !in_array(Item.get('BowAndSilverArrows', world), world_items)) {
          if (array_search(Item.get('SilverArrowUpgrade', world), nice_items) === false && world.config('difficulty') !== 'custom') {
            advancement_items.push(Item.get('SilverArrowUpgrade', world));
          }
        }
      }
    } else if (world.config('mode.weapons') === 'vanilla') {
      const uncle_sword = Item.get('UncleSword', world).setTarget(array_pop(nice_items_swords));
      world.getLocation("Link's Uncle").setItem(uncle_sword);
      for (const loc of ['Pyramid Fairy - Left', 'Blacksmith']) {
        world.getLocation(loc).setItem(array_pop(nice_items_swords));
      }
      if (!world.getLocation('Master Sword Pedestal').hasItem(Item.get('Triforce', world))) {
        world.getLocation('Master Sword Pedestal').setItem(array_pop(nice_items_swords));
      } else {
        array_pop(nice_items_swords);
        array_push(trash_items, Item.get('TwentyRupees', world));
      }
    } else {
      if (count(nice_items_swords)) {
        const uncle_sword = Item.get('UncleSword', world).setTarget(array_pop(nice_items_swords));
        if (world.config('mode.weapons') === 'assured') {
          world.addPreCollectedItem(uncle_sword);
          array_push(trash_items, Item.get('FiftyRupees', world));
        } else {
          array_push(advancement_items, uncle_sword);
        }
      }
      if (count(nice_items_swords)) array_push(advancement_items, array_pop(nice_items_swords));
      if (world.config('region.requireBetterSword', false) && count(nice_items_swords)) {
        array_push(advancement_items, array_pop(nice_items_swords));
      }
      if (count(nice_items_swords)) {
        if (world.config('region.takeAnys', false)) {
          array_pop(nice_items_swords);
          array_push(trash_items, Item.get('TwentyRupees', world));
        }
      }
      nice_items = array_merge(nice_items, nice_items_swords);
    }

    if (count(nice_items_bottles)) array_push(advancement_items, array_pop(nice_items_bottles));
    nice_items = array_merge(nice_items, nice_items_bottles);

    if (world.config('rom.rupeeBow', false)) {
      const repl = [];
      for (const [key, item] of __entries(trash_items)) {
        if (item instanceof Item.Arrow || item instanceof Item.Upgrade.Arrow) {
          delete trash_items[key];
          repl.push(Item.get('FiveRupees', world));
        }
      }
      trash_items = array_merge(trash_items, repl);
    }

    if (world.config('region.forceSkullWoodsKey', false)) {
      for (const [key, item] of __entries(dungeon_items)) {
        if (item === Item.get('KeyD3', world)) {
          delete dungeon_items[key];
          locations.get('Skull Woods - Pinball Room').setItem(item);
          break;
        }
      }
    }

    const moveWild = (pred) => {
      for (const [key, item] of __entries(dungeon_items)) {
        if (pred(item)) {
          delete dungeon_items[key];
          advancement_items.push(item);
        }
      }
    };
    if (world.config('region.wildBigKeys', false)) moveWild((i) => i instanceof Item.BigKey);
    if (world.config('region.wildKeys', false)) {
      moveWild((i) => i instanceof Item.Key && (world.config('mode.state') !== 'standard'
        || !__eq(i, Item.get('KeyH2', world)) || world.config('logic') === 'NoLogic'));
    }
    if (world.config('region.wildMaps', false)) moveWild((i) => i instanceof Item.Map);
    if (world.config('region.wildCompasses', false)) moveWild((i) => i instanceof Item.Compass);

    this.dungeon_items = array_merge(this.dungeon_items, dungeon_items);
    this.advancement_items = fy_shuffle(array_merge(this.advancement_items, advancement_items));
    this.nice_items = fy_shuffle(array_merge(this.nice_items, nice_items));
    this.trash_items = fy_shuffle(array_merge(this.trash_items, trash_items));
  }

  placeBosses(world) {
    const boss_locations = [
      ['Ganons Tower', 'top'], ['Ganons Tower', 'middle'], ['Tower of Hera', ''], ['Skull Woods', ''],
      ['Eastern Palace', ''], ['Desert Palace', ''], ['Palace of Darkness', ''], ['Swamp Palace', ''],
      ['Thieves Town', ''], ['Ice Palace', ''], ['Misery Mire', ''], ['Turtle Rock', ''], ['Ganons Tower', 'bottom'],
    ];
    if (world.config('mode.weapons') == 'swordless') {
      boss_locations.splice(9, 1);
      world.getRegion('Ice Palace').setBoss(Boss.get('Kholdstare', world));
    }
    const placeable = Boss.all(world).filter((boss) => {
      if (world.config('mode.weapons') == 'swordless' && boss.getName() == 'Kholdstare') return false;
      return !['Agahnim', 'Agahnim2', 'Ganon'].includes(boss.getName());
    });

    const placeFrom = (bosses) => {
      for (const [r, l] of boss_locations) {
        let boss = array_shift(bosses);
        while (!world.getRegion(r).canPlaceBoss(boss, l)) {
          array_push(bosses, boss);
          boss = array_shift(bosses);
        }
        world.getRegion(r).setBoss(boss, l);
      }
    };

    switch (world.config('enemizer.bossShuffle')) {
      case 'random':
        for (const [r, l] of boss_locations) {
          let boss;
          do { boss = Boss.all(world).random(); } while (!world.getRegion(r).canPlaceBoss(boss, l));
          world.getRegion(r).setBoss(boss, l);
        }
        break;
      case 'full':
        placeFrom(fy_shuffle(array_merge(placeable.values(), placeable.randomCollection(3).values())));
        break;
      case 'simple':
        placeFrom(fy_shuffle(array_merge(placeable.values(), [
          Boss.get('Armos Knights', world), Boss.get('Lanmolas', world), Boss.get('Moldorm', world),
        ])));
        break;
      case 'none':
      default:
        world.getRegion('Eastern Palace').setBoss(Boss.get('Armos Knights', world));
        world.getRegion('Desert Palace').setBoss(Boss.get('Lanmolas', world));
        world.getRegion('Tower of Hera').setBoss(Boss.get('Moldorm', world));
        world.getRegion('Palace of Darkness').setBoss(Boss.get('Helmasaur King', world));
        world.getRegion('Swamp Palace').setBoss(Boss.get('Arrghus', world));
        world.getRegion('Skull Woods').setBoss(Boss.get('Mothula', world));
        world.getRegion('Thieves Town').setBoss(Boss.get('Blind', world));
        world.getRegion('Ice Palace').setBoss(Boss.get('Kholdstare', world));
        world.getRegion('Misery Mire').setBoss(Boss.get('Vitreous', world));
        world.getRegion('Turtle Rock').setBoss(Boss.get('Trinexx', world));
        world.getRegion('Ganons Tower').setBoss(Boss.get('Armos Knights', world), 'bottom');
        world.getRegion('Ganons Tower').setBoss(Boss.get('Lanmolas', world), 'middle');
        world.getRegion('Ganons Tower').setBoss(Boss.get('Moldorm', world), 'top');
    }
    world.getRegion('Hyrule Castle Tower').setBoss(Boss.get('Agahnim', world));
    world.getRegion('Ganons Tower').setBoss(Boss.get('Agahnim2', world));
    return this;
  }

  fillPrizes(world, attempts = 5) {
    const prize_locations = world.getLocations().filter((l) => l instanceof Location.Prize).randomCollection(15);
    const crystal_locations = prize_locations.filter((l) => l instanceof Location.Prize.Crystal);
    const pendant_locations = prize_locations.filter((l) => l instanceof Location.Prize.Pendant);

    if (!world.config('prize.shuffleCrystals', true)) {
      crystal_locations.get('Palace of Darkness - Prize').setItem(Item.get('Crystal1', world));
      crystal_locations.get('Swamp Palace - Prize').setItem(Item.get('Crystal2', world));
      crystal_locations.get('Skull Woods - Prize').setItem(Item.get('Crystal3', world));
      crystal_locations.get("Thieves' Town - Prize").setItem(Item.get('Crystal4', world));
      crystal_locations.get('Ice Palace - Prize').setItem(Item.get('Crystal5', world));
      crystal_locations.get('Misery Mire - Prize').setItem(Item.get('Crystal6', world));
      crystal_locations.get('Turtle Rock - Prize').setItem(Item.get('Crystal7', world));
    }
    if (!world.config('prize.shufflePendants', true)) {
      pendant_locations.get('Eastern Palace - Prize').setItem(Item.get('PendantOfCourage', world));
      pendant_locations.get('Desert Palace - Prize').setItem(Item.get('PendantOfPower', world));
      pendant_locations.get('Tower of Hera - Prize').setItem(Item.get('PendantOfWisdom', world));
    }

    const placed = prize_locations.getItems();
    const remaining = fy_shuffle(array_diff([
      Item.get('Crystal1', world), Item.get('Crystal2', world), Item.get('Crystal3', world), Item.get('Crystal4', world),
      Item.get('Crystal5', world), Item.get('Crystal6', world), Item.get('Crystal7', world),
      Item.get('PendantOfCourage', world), Item.get('PendantOfPower', world), Item.get('PendantOfWisdom', world),
    ], placed.values()));

    let place_prizes = world.config('prize.crossWorld', true)
      ? remaining
      : array_filter(remaining, (i) => i instanceof Item.Crystal);

    let place_prize, assumed_items;
    const tryFill = (empty_locations, label) => {
      for (const location of empty_locations) {
        const total = count(place_prizes);
        for (let i = 0; i < total; ++i) {
          place_prize = array_pop(place_prizes);
          world.resetCollectedLocations();
          assumed_items = world.collectItems(new ItemCollection(array_merge(
            world.getDungeonPool(), world.getAdvancementItems(), place_prizes,
          )));
          assumed_items.setChecksForWorld(world.id);
          if (location.canAccess(assumed_items)) break;
          array_unshift(place_prizes, place_prize);
        }
        if (total == count(place_prizes)) continue;
        if (place_prize === undefined || place_prize === null) continue;
        if (assumed_items === undefined || assumed_items === null) continue;

        location.setItem(place_prize);
        if (!world.checkWinCondition(assumed_items)) {
          if (attempts > 0) {
            empty_locations.each((l) => { l.setItem(); });
            return 'retry';
          }
          throw new Error('Cannot Place Prize: ' + location.getName());
        }
      }
      return 'ok';
    };

    const empty_crystal = crystal_locations.getEmptyLocations();
    if (tryFill(empty_crystal) === 'retry') return this.fillPrizes(world, attempts - 1);
    if (crystal_locations.getEmptyLocations().count()) {
      if (attempts > 0) {
        empty_crystal.each((l) => { l.setItem(); });
        return this.fillPrizes(world, attempts - 1);
      }
      throw new Error('Cannot Place Prize: ' + crystal_locations.getEmptyLocations().first().getName());
    }

    place_prizes = world.config('prize.crossWorld', true)
      ? place_prizes
      : array_filter(remaining, (i) => i instanceof Item.Pendant);

    const empty_pendant = pendant_locations.getEmptyLocations();
    if (tryFill(empty_pendant) === 'retry') return this.fillPrizes(world, attempts - 1);
    if (pendant_locations.getEmptyLocations().count()) {
      if (attempts > 0) {
        empty_pendant.each((l) => { l.setItem(); });
        return this.fillPrizes(world, attempts - 1);
      }
      throw new Error('Cannot Place Prize: ' + pendant_locations.getEmptyLocations().first().getName());
    }
    return this;
  }

  setMedallions(world) {
    const meds = [Item.get('Ether', world), Item.get('Bombos', world), Item.get('Quake', world)];
    for (const loc of world.getRegion('Medallions').getLocations()) {
      if (loc.hasItem()) continue;
      loc.setItem(meds[get_random_int(0, 2)]);
    }
  }

  setFountains(world) {
    for (const f of world.getRegion('Fountains').getLocations()) {
      if (f.hasItem()) continue;
      f.setItem(world.getBottle(true));
    }
  }

  setShops(world) {
    const shops = world.getShops();
    shops.filter((s) => !(s instanceof Shop.TakeAny)).each((s) => { s.setActive(true); });

    if (world.config('shops.HardMode', false)) world.getShop('Capacity Upgrade').clearInventory();
    const shield_replacement = Item.get(world.config('item.overflow.replacement.Shield', 'TwentyRupees2'), world);
    if (world.config('item.overflow.count.Shield', 3) < 2) {
      world.getShop('Dark World Forest Shop').addInventory(0, shield_replacement, 500);
    }
    if (world.config('item.overflow.count.Shield', 3) < 1) {
      world.getShop('Dark World Potion Shop').addInventory(1, shield_replacement, 50);
      world.getShop('Dark World Lumberjack Hut Shop').addInventory(1, shield_replacement, 50);
      world.getShop('Dark World Outcasts Shop').addInventory(1, shield_replacement, 50);
      world.getShop('Dark World Lake Hylia Shop').addInventory(1, shield_replacement, 50);
    }

    if (!world.config('rom.genericKeys', false) && !world.config('rom.rupeeBow', false) && !world.config('region.takeAnys', false)) {
      return;
    }

    if (world.config('region.takeAnys', false)) {
      shops.filter((s) => s instanceof Shop.TakeAny).randomCollection(4).each((s) => {
        s.setActive(true);
        s.setShopkeeper('old_man');
        s.addInventory(0, Item.get('BluePotion', world), 0);
        s.addInventory(1, Item.get('BossHeartContainer', world), 0);
      });
      const old_man = shops.filter((s) => s instanceof Shop.TakeAny && !s.getActive()).random();
      old_man.setActive(true);
      old_man.setShopkeeper('old_man');
      old_man.addInventory(0, ['swordless', 'vanilla'].includes(world.config('mode.weapons'))
        ? Item.get('ThreeHundredRupees', world) : Item.get('ProgressiveSword', world), 0);
    }

    shops.filter((s) => !(s instanceof Shop.TakeAny) && !(s instanceof Shop.Upgrade)
      && (!world.constructor.isInverted || s.getName() != 'Dark World Lake Hylia Shop'))
      .randomCollection(5).each((s) => {
        s.setActive(true);
        if (world.config('rom.rupeeBow', false)) s.addInventory(0, Item.get('ShopArrow', world), 80);
        if (world.config('rom.genericKeys', false)) s.addInventory(1, Item.get('ShopKey', world), 100);
        s.addInventory(2, Item.get('TenBombs', world), 50);
      });

    if (world.config('rom.rupeeBow', false)) {
      const dw = world.getShop('Dark World Forest Shop');
      dw.setActive(true);
      for (const [slot, data] of [...dw.getInventory()]) {
        if (data.item instanceof Item.Arrow) dw.addInventory(Number(slot), Item.get('ShopArrow', world), 80);
      }
      if (world.config('shops.HardMode', false)) {
        world.getShop('Capacity Upgrade').clearInventory();
      } else {
        world.getShop('Capacity Upgrade').clearInventory().addInventory(0, Item.get('BombUpgrade5', world), 100, 7);
      }
    }
  }

  randomizeCredits(world) {
    const pick = (a) => Arr.first(fy_shuffle(a));
    world.setCredit('castle', pick(['the return of the king', 'fellowship of the ring', 'the two towers']));
    world.setCredit('sanctuary', pick(['the loyal priest', 'read a book', 'sits in own pew', 'heal plz']));
    const name = pick([
      'sahasralah', 'sabotaging', 'sacahuista', 'sacahuiste', 'saccharase', 'saccharide', 'saccharify',
      'saccharine', 'saccharins', 'sacerdotal', 'sackcloths', 'salmonella', 'saltarelli', 'saltarello',
      'saltations', 'saltbushes', 'saltcellar', 'saltshaker', 'salubrious', 'sandgrouse', 'sandlotter',
      'sandstorms', 'sandwiched', 'sauerkraut', 'schipperke', 'schismatic', 'schizocarp', 'schmalzier',
      'schmeering', 'schmoosing', 'shibboleth', 'shovelnose', 'sahananana', 'sarararara', 'salamander',
      'sharshalah', 'shahabadoo', 'sassafrass', 'saddlebags', 'sandalwood', 'shagadelic', 'sandcastle',
      'saltpeters', 'shabbiness', 'shlrshlrsh', 'sassyralph', 'sallyacorn', 'sahasrahbot', 'sasharalla',
    ]);
    world.setCredit('kakariko', `${name}'s homecoming`);
    world.setCredit('lumberjacks', pick(['twin lumberjacks', 'fresh flapjacks', 'two woodchoppers', 'double lumberman',
      'lumberclones', 'woodfellas', 'dos axes']));
    switch (get_random_int(0, 1)) {
      case 1: world.setCredit('smithy', 'the dwarven breadsmiths'); break;
    }
    world.setCredit('bridge', pick(['the lost old man', 'gary the old man', 'Your ad here']));
    world.setCredit('woods', pick(['the forest thief', 'dancing pickles', 'flying vultures']));
    world.setCredit('well', pick(['venus. queen of faeries', 'Venus was her name', "I'm your Venus",
      "Yeah, baby, she's got it", "Venus, I'm your fire", 'Venus, At your desire', 'Venus Love Chain',
      'Venus Crescent Beam']));
    return this;
  }

  setTexts(world) {
    const pick = (a) => Arr.first(fy_shuffle(a));

    if (world.constructor.isStandard) {
      const boots_location = world.getLocationsWithItem(Item.get('PegasusBoots', world)).first();
      if (world.config('spoil.BootsLocation', false)) {
        let t;
        if (world.getPreCollectedItems().has('PegasusBoots')) {
          t = 'Lonk! Boots\nare on\nyour feet.';
        } else if (!boots_location) {
          t = "I couldn't\nfind the Boots\ntoday.\nRIP me.";
        } else {
          t = 'Lonk! Boots\nare in the\n' + boots_location.getRegion().getName();
          switch (boots_location.getName()) {
            case "Link's House:" + world.id: t = "Lonk!\nYou'll never\nfind the boots."; break;
            case 'Maze Race:' + world.id: t = 'Boots at race?\nSeed confirmed\nimpossible.'; break;
            case "Link's Uncle:" + world.id: t = 'Ganon offered\nme the Boots.\nTime to run!'; break;
          }
        }
        world.setText('uncle_leaving_text', t);
        world.setText('sign_east_of_links_house', t);
      } else {
        world.setText('uncle_leaving_text', pick(strings.uncle));
      }
    } else {
      world.setText('uncle_leaving_text', pick(strings.uncle));
    }

    const gp = world.getLocationsWithItem(Item.get('PendantOfCourage', world)).first();
    world.setText('sahasrahla_bring_courage', 'Want something\nfor free? Go\nearn the green\npendant in\n'
      + gp.getRegion().getName() + "\nand I'll give\nyou something.");

    const c5 = world.getLocationsWithItem(Item.get('Crystal5', world)).first();
    const c6 = world.getLocationsWithItem(Item.get('Crystal6', world)).first();
    world.setText('bomb_shop', 'bring me the\ncrystals from\n' + c5.getRegion().getName() + '\nand\n'
      + c6.getRegion().getName() + '\nso I can make\na big bomb!');

    world.setText('blind_by_the_light', pick(strings.blind));
    world.setText('kakariko_tavern_fisherman', pick(strings.tavern_man));
    world.setText('ganon_fall_in', pick(strings.ganon_1));
    world.setText('ganon_phase_3_alt', 'Got wax in\nyour ears?\nI cannot die!');

    let silver = world.getLocationsWithItem(Item.get('SilverArrowUpgrade', world)).first();
    if (!silver) silver = world.getLocationsWithItem(Item.get('BowAndSilverArrows', world)).first();

    const bows = world.getLocationsWithItem(Item.get('ProgressiveBow', world)).randomCollection(2);
    const arrowsIn = (loc) => (loc.getRegion().getName() === 'Ganons Tower'
      ? 'Did you find\nthe arrows in\nMy tower?' : 'Did you find\nthe arrows in\n' + loc.getRegion().getName());

    if (bows.count() >= 2 && world.config('item.overflow.count.Bow', 2) >= 2) {
      const first = bows.pop();
      world.setText('ganon_phase_3_no_silvers', arrowsIn(first));
      first.setItem(new Item.Bow('ProgressiveBow', [0x65], world));
      const second = bows.pop();
      world.setText('ganon_phase_3_no_silvers_alt', arrowsIn(second));
    } else if (silver) {
      world.setText('ganon_phase_3_no_silvers', arrowsIn(silver));
      world.setText('ganon_phase_3_no_silvers_alt', arrowsIn(silver));
    } else {
      let fake = pick(strings.ganon_phase_3_no_silvers);
      if (world.config('item.pool', 'normal') === 'crowd_control') fake = "Chat said no\nto Silvers.\nIt's over Hero";
      world.setText('ganon_phase_3_no_silvers', fake);
      world.setText('ganon_phase_3_no_silvers_alt', fake);
    }

    if (world.config('crystals.tower') < 7) {
      const ts = world.config('crystals.tower') == 1 ? 'You need %d crystal to enter.' : 'You need %d crystals to enter.';
      world.setText('sign_ganons_tower', sprintf(ts, world.config('crystals.tower')));
    }

    let singular, plural;
    switch (world.config('goal')) {
      case 'ganon':
        singular = 'To beat Ganon you must collect %d Crystal and defeat his minion at the top of his tower.';
        plural = 'To beat Ganon you must collect %d Crystals and defeat his minion at the top of his tower.';
        break;
      default:
        singular = 'You need %d Crystal to beat Ganon.';
        plural = 'You need %d Crystals to beat Ganon.';
    }
    const ganon_string = world.config('crystals.ganon') == 1 ? singular : plural;
    const dingus = 'You think you\nare ready to\nface me?\n\nI will not die\n\nunless you\ncomplete your\ngoals. Dingus!';

    switch (world.config('goal')) {
      case 'ganon':
      case 'fast_ganon':
        world.setText('sign_ganon', sprintf(ganon_string, world.config('crystals.ganon')));
        world.setText('ganon_fall_in_alt', dingus);
        break;
      case 'ganonhunt':
        world.setText('sign_ganon', sprintf('To beat Ganon you must collect %d Triforce Pieces.', world.config('item.Goal.Required')));
        world.setText('ganon_fall_in_alt', dingus);
        break;
      case 'pedestal':
        world.setText('ganon_fall_in_alt', 'You cannot\nkill me. You\nshould go for\nyour real goal\nIt\'s on the\npedestal.\n\nYou dingus!\n');
        world.setText('sign_ganon', 'You need to get to the pedestal... Dingus!');
        break;
      case 'triforce-hunt':
        world.setText('ganon_fall_in_alt', 'So you thought\nyou could come\nhere and beat\nme? I have\nhidden the\nTriforce\npieces well.\nWithout them,\nyou can\'t win!');
        world.setText('sign_ganon', 'Go find the Triforce pieces... Dingus!');
        world.setText('murahdahla', sprintf('Hello @. I\nam Murahdahla, brother of\nSahasrahla and Aginah. Behold the power of\ninvisibility.\n\n\n\n… … …\n\nWait! you can see me? I knew I should have\nhidden in  a hollow tree. If you bring\n%d triforce pieces, I can reassemble it.', world.config('item.Goal.Required')));
        break;
      case 'dungeons':
        world.setText('sign_ganon', "You need to defeat all of Ganon's bosses.");
        world.setText('ganon_fall_in_alt', dingus);
        break;
      case 'completionist':
        world.setText('sign_ganon', 'You need to collect EVERY item and defeat EVERY boss.');
      // falls through
      default:
        world.setText('ganon_fall_in_alt', dingus);
    }

    world.setText('end_triforce', '{NOBORDER}\n' + pick(strings.triforce));
    return this;
  }

  shufflePrizePacks(world) {
    if (!world.config('customPrizePacks', false)) {
      const packs = fy_shuffle([
        ['Heart', 'Heart', 'Heart', 'Heart', 'RupeeGreen', 'Heart', 'Heart', 'RupeeGreen'],
        ['RupeeBlue', 'RupeeGreen', 'RupeeBlue', 'RupeeRed', 'RupeeBlue', 'RupeeGreen', 'RupeeBlue', 'RupeeBlue'],
        ['MagicRefillFull', 'MagicRefillSmall', 'MagicRefillSmall', 'RupeeBlue', 'MagicRefillFull', 'MagicRefillSmall', 'Heart', 'MagicRefillSmall'],
        ['BombRefill1', 'BombRefill1', 'BombRefill1', 'BombRefill4', 'BombRefill1', 'BombRefill1', 'BombRefill8', 'BombRefill1'],
        ['ArrowRefill5', 'Heart', 'ArrowRefill5', 'ArrowRefill10', 'ArrowRefill5', 'Heart', 'ArrowRefill5', 'ArrowRefill10'],
        ['MagicRefillSmall', 'RupeeGreen', 'Heart', 'ArrowRefill5', 'MagicRefillSmall', 'BombRefill1', 'RupeeGreen', 'Heart'],
        ['Heart', 'Fairy', 'MagicRefillFull', 'RupeeRed', 'BombRefill8', 'Heart', 'RupeeRed', 'ArrowRefill10'],
      ]);
      for (const key of world.getPrizePacks().keys()) {
        if (!['0', '1', '2', '3', '4', '5', '6'].includes(key)) continue;
        for (let i = 0; i < 8; i++) {
          const drop = Sprite.get(packs[Number(key)][i]);
          if (drop instanceof Droppable) world.setDrop(key, i, drop);
        }
      }
    }
  }

  getWorlds() { return this.worlds; }
}

export class RandomAssumed {
  constructor(worlds) { this.worlds = worlds; }

  shuffleLocations(locations) { return locations.randomCollection(locations.count()); }
  shuffleItems(items) { return fy_shuffle(items); }

  fastFillItemsInLocations(fill_items, locations) {
    for (const location of locations) {
      if (location.hasItem()) continue;
      const item = array_pop(fill_items);
      if (!item) break;
      location.setItem(item);
    }
  }

  fill(dungeon, required, nice, extra) {
    let all = new LocationCollection();
    for (const world of this.worlds) all = all.merge(world.getEmptyLocations());

    let order = this.shuffleLocations(all);
    this.fillItemsInLocations(dungeon, order, array_merge(required, nice));

    for (const world of this.worlds) {
      const [lo, hi] = world.getGanonsTowerJunkFillRange();
      const gt = world.getRegion('Ganons Tower').getEmptyLocations().randomCollection(get_random_int(lo, hi));
      extra = this.shuffleItems(extra);
      const trash = array_splice(extra, 0, gt.count());
      this.fastFillItemsInLocations(trash, gt);
    }

    order = order.getEmptyLocations().reverse();
    this.fillItemsInLocations(this.shuffleItems(required), order);
    order = this.shuffleLocations(order.getEmptyLocations());
    this.fastFillItemsInLocations(this.shuffleItems(nice), order);
    this.fastFillItemsInLocations(this.shuffleItems(extra), order.getEmptyLocations());
  }

  fillItemsInLocations(fill_items, locations, base_assumed_items = []) {
    const remaining = new ItemCollection(fill_items);
    if (remaining.count() > locations.getEmptyLocations().count()) {
      throw new Error('Trying to fill more items than available locations.' + remaining.count() + ' ' + locations.getEmptyLocations().count());
    }
    const worlds = new WorldCollection(this.worlds);

    for (const item of fill_items) {
      const starting = remaining.removeItem(item.getName()).merge(base_assumed_items);
      for (const world of this.worlds) world.resetCollectedLocations();

      let found = 0;
      let assumed = starting.copy();
      for (const world of this.worlds) assumed = assumed.merge(world.getPreCollectedItems());
      for (;;) {
        let current = 0;
        for (const world of this.worlds) {
          assumed = assumed.merge(world.collectOtherItems(assumed));
          current += world.getCollectedLocationsCount();
        }
        if (found == current) break;
        found = current;
      }

      const w = item.getWorld();
      const skip = w.config('accessibility') === 'none'
        && (!(item instanceof Item.Key) || w.config('region.wildKeys', false))
        && (!(item instanceof Item.BigKey) || w.config('region.wildBigKeys', false))
        && (!(item instanceof Item.Map) || w.config('region.wildMaps', false))
        && (!(item instanceof Item.Compass) || w.config('region.wildCompasses', false))
        && worlds.checkWinCondition(assumed);

      const fillable = locations.filter((l) => !l.hasItem() && l.canFill(item, assumed, !skip));
      if (fillable.count() == 0) {
        throw new Error(`No Available Locations: "${item.getNiceName()} ${w.id}"`);
      }
      const loc = (item instanceof Item.Compass || item instanceof Item.Map) ? fillable.random() : fillable.first();
      loc.setItem(item);
    }
  }
}
