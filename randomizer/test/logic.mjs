// Compare per-location access logic against the PHP reference.
import { execFileSync } from 'node:child_process';
import { seedRng, getRandomInt } from '../core/rng.js';
import { Item } from '../core/item.js';
import '../core/locations-special.js';
import { Boss } from '../core/boss.js';
import { ItemCollection } from '../core/collections.js';
import { fy_shuffle } from '../core/php.js';
import { World } from '../worlds/index.js';

const req = JSON.parse(process.argv[2] || '{}');
const n = Number(process.argv[3] || 50);
const php = JSON.parse(execFileSync('php', [new URL('../tools/oracle/logic_dump.php', import.meta.url).pathname, JSON.stringify(req), String(n)], { maxBuffer: 1 << 28 }).toString());
Item.clearCache(); Boss.clearCache(); World.max_world = 1;
seedRng(777);
const world = World.factory(req.mode ?? 'open', { logic: 'NoGlitches', itemPlacement: 'advanced', goal: 'ganon', 'crystals.ganon': '7', 'crystals.tower': '7', 'mode.weapons': 'randomized', dungeonItems: 'standard', ...(req.config || {}) });
world.getLocation('Turtle Rock Medallion').setItem(Item.get('Quake', world));
world.getLocation('Misery Mire Medallion').setItem(Item.get('Ether', world));
let pool = [...world.getAdvancementItems(), ...world.getDungeonPool(), ...world.getNiceItems()];
for (const p of ['Crystal1','Crystal2','Crystal3','Crystal4','Crystal5','Crystal6','Crystal7','PendantOfCourage','PendantOfPower','PendantOfWisdom','RescueZelda','DefeatAgahnim','BigRedBomb','DefeatAgahnim2']) pool.push(Item.get(p, world));
const names = [...world.getLocations().items.keys()];
if (JSON.stringify(names) !== JSON.stringify(php.names)) console.log('LOCATION NAME/ORDER MISMATCH', names.length, php.names.length);
const regions = Object.keys(world.getRegions());
let bad = 0;
const badLoc = new Map();
for (let s = 0; s < n; s++) {
  const take = getRandomInt(0, pool.length);
  const items = fy_shuffle(pool).slice(0, take);
  const ic = new ItemCollection(items); ic.setChecksForWorld(world.id);
  let bits = '';
  for (const loc of world.getLocations()) bits += loc.canAccess(ic) ? '1' : '0';
  let r = '';
  for (const reg of Object.values(world.getRegions())) r += reg.canEnter(world.getLocations(), ic) ? '1' : '0';
  const [ptake, pbits, pr, pitems] = php.rows[s];
  if (ptake !== take) { console.log('desync at row', s); break; }
  if (pbits !== bits || pr !== r) {
    bad++;
    for (let i = 0; i < bits.length; i++) if (bits[i] !== pbits[i]) badLoc.set(names[i], (badLoc.get(names[i]) || 0) + 1);
    for (let i = 0; i < r.length; i++) if (r[i] !== pr[i]) badLoc.set('REGION ' + regions[i], (badLoc.get('REGION ' + regions[i]) || 0) + 1);
  }
}
console.log(`${req.mode}: ${n - bad}/${n} item sets identical`);
if (badLoc.size) console.log([...badLoc].sort((a, b) => b[1] - a[1]).slice(0, 20));
