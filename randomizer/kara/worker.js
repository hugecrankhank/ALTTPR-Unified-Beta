// Runs Kara's generator (alttpr-python, randomizer/kara/alttpr-python) in the
// browser with Pyodide. One worker makes one seed and is then thrown away, so
// every seed starts from a fresh Python, the same as a fresh run of her
// generator on a computer. That, the pinned Pyodide version and the fixed hash
// seed below are what make the same seed number and settings give everyone
// the same game.
//
// Messages in:  { type: 'gen', seed, args }      (after it says 'ready')
// Messages out: { type: 'stage', text } / { type: 'ready' }
//               { type: 'done', seed, patch, spoiler, ms } / { type: 'error', error }

export const PYODIDE_VERSION = '0.27.7';
const LOCAL = new URL('../../pyodide/', import.meta.url).href;
const CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const stage = (text) => postMessage({ type: 'stage', text });

const SETUP = `
import contextlib, io, json, os, sys, types
os.chdir('/gen')
sys.path.insert(0, '/gen')
# Her code imports a BPS library for writing .sfc/.bps files. Here it only
# makes the seed's patch list (--jsonout); the app builds the ROM itself.
_bps = types.ModuleType('bps'); _bps.apply = types.ModuleType('bps.apply'); _bps.io = types.ModuleType('bps.io')
sys.modules.update({'bps': _bps, 'bps.apply': _bps.apply, 'bps.io': _bps.io})

def generate(seed, args_json):
    sys.argv = ['DungeonRandomizer.py', '--jsonout', '--spoiler=json', '--loglevel=error'] + json.loads(args_json)
    from CLI import parse_cli
    from Main import main
    from source.classes.BabelFish import BabelFish
    args = parse_cli(None)
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        main(seed=int(seed), args=args, fish=BabelFish(lang='en'))
    lines = [l for l in out.getvalue().splitlines() if l.startswith('{')]
    if not lines:
        raise RuntimeError('the generator finished without a seed')
    return lines[-1]
`;

async function boot() {
  stage('Starting Python…');
  let mod, indexURL;
  try {
    mod = await import(LOCAL + 'pyodide.mjs');
    indexURL = LOCAL;
  } catch (e) {
    // a copy of the app without the deploy step's download: use the CDN's
    // copy of the same version
    mod = await import(CDN + 'pyodide.mjs');
    indexURL = CDN;
  }
  const py = await mod.loadPyodide({
    indexURL,
    env: { PYTHONHASHSEED: '0', HOME: '/home/pyodide' },
    stdout: () => {}, stderr: () => {},
  });
  await py.loadPackage('pyyaml', { messageCallback: () => {}, errorCallback: () => {} });
  stage('Loading the generator…');
  const res = await fetch(new URL('generator.zip', import.meta.url));
  if (!res.ok) throw new Error(`Couldn't load Kara's generator (${res.status}).`);
  py.unpackArchive(await res.arrayBuffer(), 'zip', { extractDir: '/gen' });
  py.runPython(SETUP);
  return py;
}

const ready = boot();
ready.then(() => postMessage({ type: 'ready' }), (e) => postMessage({ type: 'error', error: String(e && e.message || e) }));

let used = false;
onmessage = async (e) => {
  const m = e.data || {};
  if (m.type !== 'gen') return;
  if (used) { postMessage({ type: 'error', error: 'This generator was already used.' }); return; }
  used = true;
  try {
    const py = await ready;
    stage('Generating seed…');
    const t = performance.now();
    const text = py.globals.get('generate')(m.seed, JSON.stringify(m.args || []));
    const out = JSON.parse(text);
    const key = Object.keys(out).find((k) => k.startsWith('patch_'));
    let spoiler = out.spoiler;
    if (typeof spoiler === 'string') { try { spoiler = JSON.parse(spoiler); } catch (x) {} }
    postMessage({ type: 'done', seed: m.seed, patch: out[key], spoiler, ms: performance.now() - t });
  } catch (err) {
    // a Python error: its last line is the useful part
    const lines = String(err && err.message || err).trim().split('\n').filter(Boolean);
    postMessage({ type: 'error', error: lines[lines.length - 1] || 'the generator failed' });
  }
};
