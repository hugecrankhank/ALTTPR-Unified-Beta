// Deterministic PRNG: mulberry32 with rejection sampling for ranges.
// Every random decision in the randomizer goes through getRandomInt, so a
// seed number reproduces the exact same game. (The reference PHP harness
// used to verify this port uses the identical generator.)

let state = 0;
let calls = 0;

export function seedRng(seed) {
  state = seed >>> 0;
  calls = 0;
}

export function rngCalls() { return calls; }

function next32() {
  state = (state + 0x6D2B79F5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
  t = (t ^ ((t + Math.imul(t ^ (t >>> 7), t | 61)) >>> 0)) >>> 0;
  return (t ^ (t >>> 14)) >>> 0;
}

export function getRandomInt(min = 0, max = 0x7FFFFFFF) {
  min = Math.trunc(Number(min)); max = Math.trunc(Number(max));
  if (min > max) throw new RangeError('get_random_int(): Argument #1 ($min) must be less than or equal to argument #2 ($max)');
  calls++;
  const range = max - min + 1;
  const limit = Math.floor(0x100000000 / range) * range;
  let r;
  do { r = next32(); } while (r >= limit);
  return min + (r % range);
}

// A fresh random seed for "random" generation (not part of the seeded stream).
export function randomSeed() {
  const a = new Uint32Array(1);
  (globalThis.crypto || require('crypto').webcrypto).getRandomValues(a);
  return a[0] >>> 0;
}
