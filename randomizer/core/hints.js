// Port of app/Services/HintService.php and LocationCollection::getHint (alttp_vt_randomizer, MIT)
import { Item } from './item.js';
import { Location } from './location.js';
import { setLocationCollectionHint } from './collections.js';
import { lang } from './lang.js';
import { fy_shuffle, Arr, array_pop, get_random_int, floor, min, count, is_array, in_array, array_filter, values } from './php.js';
import strings from '../data/strings.js';

setLocationCollectionHint((coll) => {
  const prime = coll.locationsWithItem().first();
  const items = coll.getItems().map((item) => {
    if (prime.getRegion().getWorld().config('rom.genericKeys', false) && item instanceof Item.Key) {
      item = Item.get('KeyGK', prime.getRegion().getWorld());
    }
    const n = lang('hint.item.' + item.getTarget().getName());
    return is_array(n) ? Arr.first(fy_shuffle(n)) : n;
  });
  switch (items.length) {
    case 1: return prime.getHint();
    case 0: return null;
  }
  let location_name = lang('hint.location.' + prime.getName());
  if (is_array(location_name)) location_name = Arr.first(location_name);
  const last = items.pop();
  return items.join(', ') + ' and ' + last + ' ' + location_name;
});

export class HintService {
  constructor(worlds, advancement_items) {
    this.worlds = worlds;
    this.advancement_items = advancement_items;
    this.joke_hints = strings.hint;
  }

  applyHints() {
    for (const world of this.worlds) {
      if (world.config('spoil.Hints') !== 'on') {
        world.setText('sign_north_of_links_house', 'Randomizer v31\n\n>    -veetorp');
        continue;
      }

      const tiles = fy_shuffle([
        'telepathic_tile_eastern_palace',
        'telepathic_tile_tower_of_hera_floor_4',
        'telepathic_tile_spectacle_rock',
        'telepathic_tile_swamp_entrance',
        'telepathic_tile_thieves_town_upstairs',
        'telepathic_tile_misery_mire',
        'telepathic_tile_palace_of_darkness',
        'telepathic_tile_desert_bonk_torch_room',
        'telepathic_tile_castle_tower',
        'telepathic_tile_ice_large_room',
        'telepathic_tile_turtle_rock',
        'telepathic_tile_ice_entrace',
        'telepathic_tile_ice_stalfos_knights_room',
        'telepathic_tile_tower_of_hera_entrance',
        'telepathic_tile_south_east_darkworld_cave',
      ]);
      const locations = fy_shuffle([
        'Sahasrahla',
        'Mimic Cave',
        'Catfish',
        'Graveyard Ledge',
        'Purple Chest',
        'Tower of Hera - Big Key Chest',
        'Swamp Palace - Big Chest',
        ['Misery Mire - Big Key Chest', 'Misery Mire - Compass Chest'],
        ['Swamp Palace - Big Key Chest', 'Swamp Palace - West Chest'],
        ['Pyramid Fairy - Left', 'Pyramid Fairy - Right'],
      ]);

      if (world.config('region.wildBigKeys', false)) {
        const gtbk = world.getLocationsWithItem(Item.get('BigKeyA2', world)).first();
        if (gtbk) {
          const tile = array_pop(tiles);
          world.setText(tile, gtbk.getHint());
        }
      }

      const boots = world.getLocationsWithItem(Item.get('PegasusBoots', world)).first();
      if (boots) {
        const tile = array_pop(tiles);
        world.setText(tile, boots.getHint());
      }

      let picks = [];
      for (let i = 0; i < locations.length; i++) picks.push(i);
      for (let i = 0; i < 5; ++i) {
        picks = fy_shuffle(picks);
        const pick = locations[array_pop(picks)];
        let hint;
        if (Array.isArray(pick)) {
          hint = world.getLocations().filter((l) => in_array(l.getName(), pick)).getHint();
        } else {
          hint = world.getLocation(pick).getHint();
        }
        if (!hint) continue;
        const tile = array_pop(tiles);
        world.setText(tile, hint);
      }

      const hintables = this.advancement_items.filter((item) => !(item instanceof Item.Shield)
        && !(item instanceof Item.Key)
        && !(item instanceof Item.Map)
        && !(item instanceof Item.Compass)
        && (world.config('region.wildBigKeys', false) || !(item instanceof Item.BigKey))
        && !(item instanceof Item.Bottle)
        && !(item instanceof Item.Sword)
        && !['TenBombs', 'HalfMagic', 'BugCatchingNet', 'Powder', 'Mushroom'].includes(item.getRawName()));

      let hints = fy_shuffle(hintables).slice(0, min(4, count(tiles)));
      hints = hints.map((item) => world.getLocationsWithItem(item).filter((l) => !(l instanceof Location.Medallion)
        && !(l instanceof Location.Fountain)
        && !(l instanceof Location.Prize)
        && !(l instanceof Location.Trade)).random());
      hints = values(array_filter(hints));

      const with_item = world.getLocationsWithItem().filter((l) => {
        const item = l.getItem();
        return !(l instanceof Location.Medallion)
          && !(l instanceof Location.Fountain)
          && !(l instanceof Location.Prize)
          && !(l instanceof Location.Trade)
          && !(item instanceof Item.Key)
          && !(item instanceof Item.Map)
          && !(item instanceof Item.Compass)
          && (world.config('region.wildBigKeys', false) || !(item instanceof Item.BigKey));
      });

      const nt = count(tiles), nh = hints.length;
      const hint_locations = with_item.randomCollection(get_random_int(Math.trunc(floor((nt - nh) / 2) - 1), nt - nh - 1)).merge(hints);

      for (const tile of values(tiles)) {
        const h = hint_locations.pop();
        const text = (h ? h.getHint() : null) ?? Arr.first(fy_shuffle(this.joke_hints));
        world.setText(tile, text);
      }
    }
  }
}
