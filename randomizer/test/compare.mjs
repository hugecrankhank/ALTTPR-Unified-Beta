// Compare the JS port against the reference PHP randomizer (deterministic PRNG).
// usage: node test/compare.mjs '<settings json>' <seed> [more seeds...]
import { execFileSync } from 'node:child_process';
import { generate } from '../generate.js';

const settings = JSON.parse(process.argv[2] || '{}');
const seeds = process.argv.slice(3).map(Number);
if (!seeds.length) seeds.push(1);

function bytesOf(patch) {
  const m = new Map();
  for (const w of patch) for (const [off, bytes] of Object.entries(w)) bytes.forEach((b, i) => m.set(Number(off) + i, b));
  return m;
}
function canon(x) {
  if (Array.isArray(x)) return x.map(canon);
  if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])]));
  return x;
}
function diffObj(a, b, path = '', out = []) {
  if (out.length > 8) return out;
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) { out.push(`${path}: ${JSON.stringify(a)?.slice(0,80)} != ${JSON.stringify(b)?.slice(0,80)}`); return out; }
  if (a && typeof a === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) diffObj(a[k], b[k], path + '.' + k, out);
    return out;
  }
  if (a !== b && !(a == b && typeof a !== 'object')) out.push(`${path}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
  return out;
}

let fails = 0;
for (const seed of seeds) {
  let php;
  try {
    php = JSON.parse(execFileSync('php', [new URL('../tools/oracle/gen.php', import.meta.url).pathname, JSON.stringify(settings), String(seed)], { maxBuffer: 1 << 28 }).toString());
  } catch (e) {
    const perr = String(e.stderr || e).match(/Uncaught (?:Exception|Error|ValueError): ([^\n]*?) in \//)?.[1] || String(e.stderr || e).slice(0, 200);
    let jerr = null;
    try { generate(settings, seed, { stamp: false }); } catch (je) { jerr = je.message; }
    const same = jerr !== null && (jerr === perr || jerr.split(':')[0] === perr.split(':')[0]);
    console.log(`seed ${seed}: ${same ? 'MATCH (both fail)' : 'DIFF'} php error "${perr}" js error "${jerr}"`);
    if (!same) fails++;
    continue;
  }
  let js;
  try { js = generate(settings, seed, { stamp: false }); } catch (e) { console.log(`seed ${seed}: JS error`, e.stack.split('\n').slice(0, 6).join('\n')); fails++; continue; }
  const pb = bytesOf(php.patch), jb = bytesOf(js.patch);
  const diffs = [];
  for (const [o, b] of pb) if (jb.get(o) !== b) diffs.push(o);
  for (const [o] of jb) if (!pb.has(o)) diffs.push(o);
  const sp = diffObj(canon(php.spoiler), canon(js.spoiler));
  const ok = !diffs.length && !sp.length && php.rng_calls === js.rng_calls && php.winnable === js.winnable;
  if (!ok) fails++;
  console.log(`seed ${seed}: ${ok ? 'MATCH' : 'DIFF'} rng php=${php.rng_calls} js=${js.rng_calls} bytes=${pb.size}/${jb.size} byteDiffs=${diffs.length} spoilerDiffs=${sp.length} winnable=${php.winnable}/${js.winnable} time php=${php.ms}ms js=${js.ms}ms`);
  if (diffs.length) console.log('  first byte diffs:', diffs.slice(0, 10).map((o) => `0x${o.toString(16)} php=${pb.get(o)} js=${jb.get(o)}`).join(', '));
  if (sp.length) console.log('  spoiler:', sp.slice(0, 8).join('\n    '));
}
process.exit(fails ? 1 : 0);
