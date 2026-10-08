#!/usr/bin/env python3
"""Convert app/Region/**/*.php to ES modules under randomizer/regions/."""
import re, subprocess, sys

import os
HERE = os.path.dirname(os.path.abspath(__file__))
VT = os.environ.get('VT_DIR', os.path.join(HERE, '..', '..', '..', 'alttp_vt_randomizer'))
OUT = os.path.join(HERE, '..', 'regions')
CONV = os.path.join(HERE, 'php2js.php')

PHP_HELPERS = ['count', 'in_array', 'array_merge', 'sprintf', 'min', 'max', 'floor', 'array_pop', 'array_push',
               'array_shift', 'array_unshift', 'array_values', 'array_filter', 'array_slice', 'array_map', 'is_array',
               'fy_shuffle', 'get_random_int', 'snes_to_pc', '__entries', '__values', '__eq', 'Arr', 'php_empty']

def convert(php_path):
    src = open(php_path).read()
    ns = re.search(r'^namespace ([\w\\]+);', src, re.M).group(1)
    uses = re.findall(r'^use ([\w\\]+)(?: as (\w+))?;', src, re.M)
    js = subprocess.run(['php', CONV, php_path], capture_output=True, text=True, check=True).stdout
    js = js.split('__IMPORTS__', 1)[1]

    rel = os.path.relpath(php_path, VT + '/app/Region')  # e.g. Standard/LightWorld/NorthEast.php
    depth = rel.count('/')
    up = '../' * (depth + 1)
    header = [f"// Converted from app/Region/{rel} (alttp_vt_randomizer, MIT)"]
    core_names = ['Item', 'Location', 'Region', 'Boss', 'Shop', 'LocationCollection', 'ShopCollection', 'ItemCollection']

    # parent class: Region.Standard.X.Y
    m = re.search(r'export class (\w+) extends Region\.([\w.]+) \{', js)
    if m:
        parent_path = m.group(2).split('.')
        alias = 'Parent_' + '_'.join(parent_path)
        target = os.path.relpath(os.path.join(OUT, *parent_path) + '.js', os.path.dirname(os.path.join(OUT, rel)))
        if not target.startswith('.'):
            target = './' + target
        header.append(f"import {{ {parent_path[-1]} as {alias} }} from '{target}';")
        js = js.replace(m.group(0), f'export class {m.group(1)} extends {alias} {{')

    # item comparisons -> PHP loose equality
    js = re.sub(r'(\b\w+) == (Item\.get\([^()]*\))', r'__eq(\1, \2)', js)
    js = re.sub(r'(\b\w+) != (Item\.get\([^()]*\))', r'!__eq(\1, \2)', js)

    used = [h for h in PHP_HELPERS if re.search(r'(?<![\w])(?<![\w\])\]]\.)' + re.escape(h) + r'\b', js)]
    header.append(f"import {{ {', '.join(core_names + used)} }} from '{up}core/index.js';")
    for full, alias in uses:
        short = full.split('\\')[-1]
        name = alias or short
        if full == 'ALttP\\Location\\Medallion':
            header.append(f"const {name} = Location.Medallion;")
    # Medallion addresses mix list and named keys
    js = js.replace('{null /*FIXME-noKey*/, 0x180023 /*FIXME-noKey*/, "t0": 0x5020, "t1": 0x50FF, "t2": 0x51DE\n}',
                    'Object.assign([null, 0x180023], {t0: 0x5020, t1: 0x50FF, t2: 0x51DE})')
    js = js.replace('{null /*FIXME-noKey*/, 0x180022 /*FIXME-noKey*/, "m0": 0x4FF2, "m1": 0x50D1, "m2": 0x51B0\n}',
                    'Object.assign([null, 0x180022], {m0: 0x4FF2, m1: 0x50D1, m2: 0x51B0})')
    js = re.sub(r'\n{3,}', '\n\n', js).strip() + '\n'
    out_path = os.path.join(OUT, rel[:-4] + '.js')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    open(out_path, 'w').write('\n'.join(header) + '\n\n' + js)
    return out_path

if __name__ == '__main__':
    files = sys.argv[1:] or [os.path.join(dp, f) for dp, _, fs in os.walk(VT + '/app/Region') for f in fs if f.endswith('.php')]
    for f in sorted(files):
        print(convert(f))
