// Settings sweep: one-factor variations + random combinations, compared to PHP.
const OPTS = {
  mode: ['standard', 'open', 'inverted', 'retro'],
  goal: ['ganon', 'fast_ganon', 'dungeons', 'pedestal', 'triforce-hunt', 'ganonhunt', 'completionist'],
  dungeon_items: ['standard', 'mc', 'mcs', 'full'],
  item_placement: ['basic', 'advanced'],
  accessibility: ['items', 'locations', 'none'],
  weapons: ['randomized', 'assured', 'vanilla', 'swordless'],
  'item.pool': ['easy', 'normal', 'hard', 'expert'],
  'item.functionality': ['easy', 'normal', 'hard', 'expert'],
  hints: ['on', 'off'],
  'crystals.tower': ['0', '1', '2', '3', '4', '5', '6', '7', 'random'],
  'crystals.ganon': ['0', '1', '2', '3', '4', '5', '6', '7', 'random'],
};
const base = { mode: 'open', goal: 'ganon', dungeon_items: 'standard', item_placement: 'advanced', accessibility: 'items',
  weapons: 'randomized', 'item.pool': 'normal', 'item.functionality': 'normal', hints: 'on', 'crystals.tower': '7', 'crystals.ganon': '7' };
function nest(flat) {
  const o = {};
  for (const [k, v] of Object.entries(flat)) {
    const p = k.split('.');
    let t = o;
    while (p.length > 1) { const s = p.shift(); t = t[s] ??= {}; }
    t[p[0]] = v;
  }
  return o;
}
const jobs = [];
const mode = process.argv[2] || 'one';
const nRandom = Number(process.argv[3] || 50);
if (mode === 'one') {
  for (const [k, vals] of Object.entries(OPTS)) for (const v of vals) jobs.push([{ ...base, [k]: v }, [1000 + jobs.length]]);
} else {
  let x = Number(process.argv[4] || 99);
  const r = (n) => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x % n; };
  for (let i = 0; i < nRandom; i++) {
    const s = {};
    for (const [k, vals] of Object.entries(OPTS)) s[k] = vals[r(vals.length)];
    jobs.push([s, [r(1e9)]]);
  }
}
let ok = 0, bad = 0;
const conc = Number(process.env.CONC || 4);
// simple sequential batches using spawnSync in child processes for parallelism
import { spawn } from 'node:child_process';
function run([flat, seeds]) {
  return new Promise((resolve) => {
    const p = spawn('node', [new URL('./compare.mjs', import.meta.url).pathname, JSON.stringify(nest(flat)), ...seeds.map(String)]);
    let out = '';
    p.stdout.on('data', (d) => out += d); p.stderr.on('data', (d) => out += d);
    p.on('close', (code) => resolve({ flat, out, code }));
  });
}
const results = [];
let next = 0;
await Promise.all(Array.from({ length: conc }, async () => {
  while (next < jobs.length) {
    const j = jobs[next++];
    const r = await run(j);
    if (r.code === 0) ok++; else { bad++; console.log('FAIL', JSON.stringify(r.flat), '\n', r.out.trim()); }
  }
}));
console.log(`done: ${ok} match, ${bad} fail of ${jobs.length}`);
