# Convert Kara's frontend settings.yaml / presets.yaml / generator-settings.yaml
# (base generator) into a JS module for the app. Strings kept as written (BaseLoader).
import json, sys, yaml
src, out = sys.argv[1], sys.argv[2]
S = yaml.load(open(f'{src}/settings.yaml'), Loader=yaml.BaseLoader)
G = yaml.load(open(f'{src}/generator-settings.yaml'), Loader=yaml.BaseLoader)['base']
P = yaml.load(open(f'{src}/presets.yaml'), Loader=yaml.BaseLoader)['base']
settings = []
for k in G:
    d = S[k]
    vals = d.get('values', {})
    order = d.get('order') or list(vals.keys())
    vs = []
    for v in order:
        info = vals.get(v) or {}
        vs.append([str(v), str(info.get('display', v)), str(info.get('tip', '')).strip()])
    settings.append({'key': k, 'label': d['display'], 'def': str(d.get('default')), 'tip': str(d.get('tip', '')).strip(), 'values': vs})
# hints: yaml booleans in the source (false/true); the site sends off/on
for s in settings:
    if s['key'] == 'hints':
        s['values'] = [['off', 'Off', ''], ['on', 'On', '']]
        s['def'] = 'off'
presets = []
for name, p in P.items():
    p = dict(p)
    label = p.pop('display', name)
    presets.append({'id': name, 'label': label, 'settings': {k: str(v) for k, v in p.items()}})
with open(out, 'w') as f:
    f.write('// Generated from Kara\'s alttpr.gwaa.kiwi settings (alttpr-frontend src/data, base generator)\n')
    f.write('// by tools/kara-data.py. Labels, help text, defaults and presets are hers.\n')
    j = lambda x: json.dumps(x, ensure_ascii=False)
    f.write('export const SETTINGS = [\n' + ''.join('  ' + j(x) + ',\n' for x in settings) + '];\n\n')
    f.write('export const PRESETS = [\n' + ''.join('  ' + j(x) + ',\n' for x in presets) + '];\n')
print(len(settings), 'settings', len(presets), 'presets')
