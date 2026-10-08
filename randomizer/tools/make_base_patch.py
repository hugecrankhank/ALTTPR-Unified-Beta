#!/usr/bin/env python3
"""Build data/base-patch.bin from z3randomizer without needing a game ROM.

The base patch is assembled onto three dummy 1 MB "ROMs" (all 0x00, all 0xFF,
random bytes). Bytes that come out identical regardless of input are the bytes
the assembler writes; everything else is left untouched. The script refuses to
build if any written byte depends on the input ROM.

Format: b"Z3BP", u32 record count, then per record u32 offset, u32 length, bytes.
"""
import os, random, struct, subprocess, sys, tempfile

z3 = sys.argv[1]            # z3randomizer checkout (commit dcb0a2b for build 2024-02-18)
out = sys.argv[2]           # output path for base-patch.bin
asar = os.path.join(z3, 'bin', 'linux', 'asar')

tmp = tempfile.mkdtemp()
fills = {
    'zero': bytes(0x100000),
    'ff': b'\xff' * 0x100000,
    'rnd': bytes(random.Random(1).getrandbits(8) for _ in range(0x100000)),
}
roms = {}
for name, data in fills.items():
    path = os.path.join(tmp, name + '.sfc')
    open(path, 'wb').write(data)
    subprocess.run([asar, '--no-title-check', '--fix-checksum=off', 'LTTP_RND_GeneralBugfixes.asm', path],
                   cwd=z3, check=True, stdout=subprocess.DEVNULL)
    roms[name] = open(path, 'rb').read()
z, f, r = roms['zero'], roms['ff'], roms['rnd']
assert len(z) == len(f) == len(r) == 0x200000

def written(i):
    return z[i] == f[i] and not (i >= 0x100000 and z[i] == 0)

bad = [i for i in range(len(z)) if written(i) and r[i] != z[i]]
if bad:
    sys.exit(f'{len(bad)} written bytes depend on the input ROM, e.g. {hex(bad[0])}')

recs, i = [], 0
while i < len(z):
    if not written(i):
        i += 1
        continue
    j = i
    while j < len(z) and written(j):
        j += 1
    recs.append((i, z[i:j]))
    i = j
blob = bytearray(b'Z3BP') + struct.pack('<I', len(recs))
for off, data in recs:
    blob += struct.pack('<II', off, len(data)) + data
open(out, 'wb').write(blob)
print(f'{len(recs)} records, {sum(len(d) for _, d in recs)} bytes -> {out}')
