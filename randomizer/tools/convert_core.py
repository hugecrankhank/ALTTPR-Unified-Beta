#!/usr/bin/env python3
"""Convert Rom.php, Text.php and InitialSram.php to JS modules with targeted fixes."""
import re, subprocess

import os
HERE = os.path.dirname(os.path.abspath(__file__))
VT = os.environ.get('VT_DIR', os.path.join(HERE, '..', '..', '..', 'alttp_vt_randomizer'))
CORE = os.path.join(HERE, '..', 'core')
CONV = os.path.join(HERE, 'php2js.php')

def conv(path):
    js = subprocess.run(['php', CONV, f'{VT}/app/{path}'], capture_output=True, text=True, check=True).stdout
    js = js.split('__IMPORTS__', 1)[1]
    # root classes: run property initialisers first, like PHP does
    m = re.search(r'export class \w+ \{', js)
    if m and '__init_props()' in js:
        c = re.search(r'\n    constructor\(([^)]*)\) \{( let [^;]*;)?', js)
        if c:
            js = js[:c.end()] + '\n        this.__init_props();' + js[c.end():]
        else:
            js = js.replace(m.group(0), m.group(0) + '\n    constructor() { this.__init_props(); }', 1)
    return js

PHP_EXPORTS = re.findall(r'export (?:function\*?|const) (\w+)', open(f'{CORE}/php.js').read())
def php_imports(js):
    used = [n for n in PHP_EXPORTS if re.search(r'(?<![\w])(?<![\w\])\]]\.)' + re.escape(n) + r'\(', js) or (n in ('Arr',) and 'Arr.' in js)]
    return "import { " + ", ".join(used) + " } from './php.js';\n" if used else ''

def method_span(js, name):
    """Return (start, end) of a class method by name (start at indentation)."""
    m = re.search(r'\n(    (?:static )?' + re.escape(name) + r'\([^)]*\) \{)', js)
    if not m:
        raise KeyError(name)
    i = js.index('{', m.start(1))
    depth = 0
    for j in range(i, len(js)):
        if js[j] == '{': depth += 1
        elif js[j] == '}':
            depth -= 1
            if depth == 0:
                return m.start(1), j + 1
    raise ValueError(name)

def replace_method(js, name, new):
    a, b = method_span(js, name)
    return js[:a] + new.strip('\n') + js[b:]

def remove_method(js, name):
    a, b = method_span(js, name)
    return js[:a] + js[b:]

# ── InitialSram ──────────────────────────────────────────────────────────────
js = conv('Support/InitialSram.php')
js = re.sub(r'this\.(SRAM_SIZE|ROOM_DATA|OVERWORLD_DATA)\b', r'InitialSram.\1', js)
js = js.replace('array_fill(0, InitialSram.SRAM_SIZE, 0)', 'new Array(InitialSram.SRAM_SIZE).fill(0)')
js = replace_method(js, 'setStartingTimer', '''
    setStartingTimer(seconds) {
        const v = (Number(seconds) * 60) >>> 0;
        this.initial_sram_bytes[0x454] = v & 0xFF;
        this.initial_sram_bytes[0x455] = (v >>> 8) & 0xFF;
        this.initial_sram_bytes[0x456] = (v >>> 16) & 0xFF;
        this.initial_sram_bytes[0x457] = (v >>> 24) & 0xFF;
    }''')
hdr = "// Converted from app/Support/InitialSram.php (alttp_vt_randomizer, MIT)\n" + php_imports(js)
open(f'{CORE}/initial-sram.js', 'w').write(hdr + js.strip() + '\n')

# ── Text ─────────────────────────────────────────────────────────────────────
js = conv('Text.php')
js = js.replace('this.text_array = this.translation();', 'this.text_array = this[translation]();')
js = js.replace('this.converter = new Dialog;', 'this.converter = new Dialog();')
js = js.replace('if (!array_key_exists(id, this.text_array)) {', 'if (!Object.prototype.hasOwnProperty.call(this.text_array, id)) {')
js = replace_method(js, 'getByteArray', '''
    getByteArray(pad = false) {
        const data = [].concat(...Object.values(this.text_array));
        if (data.length > 0x7355) {
            throw new Error("Too BIG");
        }
        if (pad) {
            while (data.length < 0x7355) data.push(0xFF);
        }
        return data;
    }''')
hdr = "// Converted from app/Text.php (alttp_vt_randomizer, MIT)\nimport { Dialog } from './dialog.js';\n" + php_imports(js)
open(f'{CORE}/text.js', 'w').write(hdr + js.strip() + '\n')

# ── Rom ──────────────────────────────────────────────────────────────────────
js = conv('Rom.php')
for name in ['saveBuild', 'getJsonPatchLocation', 'resize', 'checkMD5', 'getMD5', 'applyPatchFile', 'save', '__destruct']:
    js = remove_method(js, name)
js = replace_method(js, 'constructor', '''
    constructor() {
        this.__init_props();
        this.data = new Uint8Array(Rom.SIZE);
        this.written = new Uint8Array(Rom.SIZE);
        this.credits = new Credits();
        this.text = new Text();
        this.text.removeUnwanted();
        this.initial_sram = new InitialSram();
    }''')
js = replace_method(js, 'updateChecksum', '''
    updateChecksum() {
        let sum = 0x1FE;
        for (let i = 0; i < Rom.SIZE; i++) {
            if (i >= 0x7FDC && i < 0x7FE0) continue;
            sum += this.data[i];
        }
        const checksum = sum & 0xFFFF;
        const inverse = checksum ^ 0xFFFF;
        this.write(0x7FDC, pack("S*", inverse, checksum));
        return this;
    }''')
js = replace_method(js, 'applyPatch', '''
    applyPatch(patch) {
        for (const part of patch) {
            for (const [address, data] of Object.entries(part)) {
                this.write(Number(address), data, false);
            }
        }
        return this;
    }''')
js = replace_method(js, 'rummageTable', '''
    rummageTable() {
        throw new Error("tournament rummage table not supported");
    }''')
js = replace_method(js, 'write', '''
    // data: binary string (from pack) or array of byte values
    write(offset, data, log = true) {
        offset = Number(offset);
        if (typeof data === 'string') {
            for (let i = 0; i < data.length; i++) {
                const b = data.charCodeAt(i);
                if (b > 0xFF) throw new Error('non-binary string written to ROM');
                this.data[offset + i] = b;
                this.written[offset + i] = 1;
            }
        } else {
            for (let i = 0; i < data.length; i++) {
                this.data[offset + i] = Number(data[i]) & 0xFF;
                this.written[offset + i] = 1;
            }
        }
        return this;
    }''')
js = replace_method(js, 'getWriteLog', '''
    // merged write log as [{offset: [bytes...]}, ...] (like patch_merge_minify)
    getWriteLog() {
        const out = [];
        let i = 0;
        while (i < Rom.SIZE) {
            if (!this.written[i]) { i++; continue; }
            const start = i;
            while (i < Rom.SIZE && this.written[i]) i++;
            out.push({ [start]: Array.from(this.data.subarray(start, i)) });
        }
        return out;
    }''')
js = replace_method(js, 'read', '''
    read(offset, length = 1) {
        if (length === 1) return this.data[offset];
        return Array.from(this.data.subarray(offset, offset + length));
    }''')
js = replace_method(js, 'readByte', '''
    readByte(offset) {
        return this.data[offset] ?? 0x00;
    }''')
js = js.replace('this.tmp_file = null;\n', '')
js = js.replace('this.rom = null;\n', '')
js = js.replace(') ?: "")', ') || "")')
js = re.sub(r'array_values\(unpack\("C\*", (pack\("S", [^()]*(?:\([^()]*\))?[^()]*\))\)\)', r'bytesOf(\1)', js)
js = js.replace('setPlandomizerAuthor(name) {\n        this.write(0x180220, substr(name, 0, 31));',
                'setPlandomizerAuthor(name) {\n        this.write(0x180220, utf8bytes(name).slice(0, 31));')
js = js.replace('this.write(0x7FC0, substr(seed, 0, 21));', 'this.write(0x7FC0, utf8bytes(seed).slice(0, 21));')
hdr = """// Converted from app/Rom.php (alttp_vt_randomizer, MIT)
import { Credits } from './credits.js';
import { Text } from './text.js';
import { InitialSram } from './initial-sram.js';
import { Shop } from './shop.js';
__PHPIMPORTS__
// PHP pack() for the formats used here; returns a binary string.
export function pack(fmt, ...args) {
    const code = fmt[0];
    const vals = fmt.endsWith('*') ? args : args.slice(0, 1);
    let s = '';
    for (let v of vals) {
        v = Math.trunc(Number(v)) || 0;
        switch (code) {
            case 'C': case 'c': s += String.fromCharCode(v & 0xFF); break;
            case 'S': case 'v': case 's': s += String.fromCharCode(v & 0xFF, (v >> 8) & 0xFF); break;
            case 'n': s += String.fromCharCode((v >> 8) & 0xFF, v & 0xFF); break;
            case 'L': case 'V': case 'l':
                s += String.fromCharCode(v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF); break;
            case 'N': s += String.fromCharCode((v >>> 24) & 0xFF, (v >>> 16) & 0xFF, (v >>> 8) & 0xFF, v & 0xFF); break;
            default: throw new Error('pack: unsupported format ' + fmt);
        }
    }
    return s;
}
const bytesOf = (bin) => Array.from(bin, (c) => c.charCodeAt(0));
const utf8bytes = (s) => [...new TextEncoder().encode(String(s))];
function base64_decode(b64) {
    const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('latin1');
    return bin;
}
"""
hdr = hdr.replace('__PHPIMPORTS__', php_imports(js))
open(f'{CORE}/rom.js', 'w').write(hdr + js.strip() + '\n')
print('ok')
