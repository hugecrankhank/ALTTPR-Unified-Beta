// Runs seed generation off the main thread.
import { generate } from './generate.js';

self.onmessage = (e) => {
  const { id, settings, seed, stamp } = e.data;
  try {
    const res = generate(settings, seed, { stamp });
    self.postMessage({ id, ok: true, result: { winnable: res.winnable, seed: res.seed, hash: res.hash, ms: res.ms, patch: res.patch, spoiler: res.spoiler } });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.message || err) });
  }
};
