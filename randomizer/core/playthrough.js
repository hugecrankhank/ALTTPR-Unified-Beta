// Port of app/Services/PlaythroughService.php (alttp_vt_randomizer, MIT)
import { Item } from './item.js';
import { Location } from './location.js';
import { LocationCollection } from './collections.js';
import { in_array, count } from './php.js';

export function getPlayThrough(world, walkthrough = true) {
  const shadow = world.copy();
  const junk = ['BlueShield', 'Boomerang', 'MirrorShield', 'RedBoomerang', 'RedShield', 'BombUpgrade5',
    'BombUpgrade10', 'BombUpgrade50', 'ArrowUpgrade5', 'ArrowUpgrade10', 'ArrowUpgrade70', 'RedPotion', 'Bee',
    'TenArrows', 'Bomb', 'ThreeBombs', 'OneRupee', 'FiveRupees', 'TwentyRupees', 'FiftyRupees', 'OneHundredRupees',
    'ThreeHundredRupees', 'Heart', 'Rupoor'].map((n) => Item.get(n, world));

  shadow.getLocations().each((location) => {
    const it = location.getItem();
    if (it && in_array(it, junk)) location.setItem();
  });

  const spheres = shadow.getLocationSpheres();
  const sphereKeys = Object.keys(spheres).map(Number).sort((a, b) => a - b);
  const collectable = new LocationCollection(sphereKeys.flatMap((k) => spheres[k].values()));
  const required = new LocationCollection();
  const required_sphere = new Map();
  const origItem = (l) => world.getCollectableLocations().get(l.getName()).getItem();

  for (const level of [...sphereKeys].reverse()) {
    if (level == 0) continue;
    for (const location of spheres[level]) {
      const pulled = location.getItem();
      if (pulled === null) continue;
      location.setItem();
      if ((!world.config('region.wildMaps', false) && pulled instanceof Item.Map)
        || (!world.config('region.wildCompasses', false) && pulled instanceof Item.Compass)
        || in_array(pulled, junk)) {
        continue;
      }
      if (!shadow.getWinCondition()(collectable.getItems(shadow).copy())) {
        location.setItem(origItem(location));
        required.addItem(location);
        if (!required_sphere.has(level)) required_sphere.set(level, []);
        required_sphere.get(level).push(location);
        continue;
      }

      const checks = [...required_sphere.keys()].reverse();
      for (const check of checks) {
        if (check == level || required.has(location.getName())) continue;
        for (const [higher, locs] of required_sphere) {
          if (higher < check) continue;
          for (const hl of locs) hl.setItem();
        }
        let readded = false;
        outer: for (const [higher, locs] of required_sphere) {
          if (higher != check) continue;
          for (const hl of locs) {
            const temp = hl.getItem();
            hl.setItem();
            const current = collectable.getItems(shadow).copy();
            if (!hl.canAccess(current, world.getLocations())) {
              location.setItem(origItem(location));
              required.addItem(location);
              if (!required_sphere.has(level)) required_sphere.set(level, []);
              required_sphere.get(level).push(location);
              readded = true;
              break outer;
            }
            hl.setItem(temp);
          }
        }
        // PHP "break 2" leaves both inner loops but continues with the "put back" step below
        for (const hl of required) hl.setItem(origItem(hl));
        if (readded) { /* continue checking remaining spheres */ }
      }
    }
  }

  if (!walkthrough) return required.values();

  let my_items = shadow.getPreCollectedItems();
  const order = [];
  const rounds = new Map();
  let chain = 1;
  let found;
  do {
    if (rounds.get(chain)?.length) chain++;
    rounds.set(chain, []);
    const mi = my_items;
    const available = shadow.getCollectableLocations().filter((l) => !order.includes(l) && l.canAccess(mi, world.getLocations()));
    found = available.getItems();
    available.each((location) => {
      const item = location.getItem();
      if (order.includes(location) || !location.hasItem()) return;
      order.push(location);
      if (((world.config('rom.genericKeys', false) || !world.config('region.wildKeys', false)) && item instanceof Item.Key)
        || item instanceof Item.Map || item instanceof Item.Compass
        || item === Item.get('RescueZelda', world)) {
        return;
      }
      rounds.get(chain).push(location);
    });
    my_items = my_items.merge(found);
  } while (found.count() > 0);

  const ret = { longest_item_chain: rounds.size };
  if (count(shadow.getPreCollectedItems())) {
    let i = 0;
    for (const item of shadow.getPreCollectedItems()) {
      if (item instanceof Item.Upgrade.Arrow || item instanceof Item.Upgrade.Bomb
        || item instanceof Item.Upgrade.Health || item instanceof Item.Event) continue;
      ((ret[0] ??= {}).Equipped ??= {})[`Equipment Slot ${++i}`] = item.getName();
    }
  }
  for (const [round, locs] of rounds) {
    const ls = locs.filter((l) => !(l instanceof Location.Trade));
    if (!ls.length) ret.longest_item_chain--;
    for (const l of ls) {
      ((ret[round] ??= {})[l.getRegion().getName()] ??= {})[l.getName()] = l.getItem().getName();
    }
  }
  let visited = null;
  for (const v of Object.values(ret)) visited = (v !== null && typeof v === 'object') ? (visited ?? 0) + count(v) : visited;
  ret.regions_visited = visited;
  return ret;
}
