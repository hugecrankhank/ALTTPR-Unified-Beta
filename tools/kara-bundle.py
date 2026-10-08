#!/usr/bin/env python3
"""Pack Kara's generator (randomizer/kara/alttpr-python) into the zip the
browser unpacks (randomizer/kara/generator.zip). Entries are sorted and dated
the same every time, so the same source always gives the same zip.

    python3 tools/kara-bundle.py
"""
import os, zipfile

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'randomizer', 'kara')
SRC = os.path.join(ROOT, 'alttpr-python')
OUT = os.path.join(ROOT, 'generator.zip')
SKIP_DIRS = {'__pycache__', 'gui'}

files = []
for d, dirs, names in os.walk(SRC):
    dirs[:] = sorted(x for x in dirs if x not in SKIP_DIRS)
    for n in sorted(names):
        files.append(os.path.join(d, n))
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for f in sorted(files):
        info = zipfile.ZipInfo(os.path.relpath(f, SRC).replace(os.sep, '/'), date_time=(2020, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        with open(f, 'rb') as fh:
            z.writestr(info, fh.read())
print(f'{OUT}: {len(files)} files, {os.path.getsize(OUT)} bytes')
