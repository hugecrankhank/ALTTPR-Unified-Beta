// Small PHP-compatibility layer so the ported randomizer code can keep the
// same shape (and, crucially, the same order of operations) as the original
// PHP. JS arrays stand in for PHP lists (holes = unset elements), Maps and
// plain objects stand in for string-keyed PHP arrays.

import { getRandomInt } from './rng.js';

export const get_random_int = getRandomInt;

// ── iteration ───────────────────────────────────────────────────────────────
export function* __values(x) {
  if (x == null) return;
  if (Array.isArray(x)) {
    for (let i = 0; i < x.length; i++) if (i in x) yield x[i];
    return;
  }
  if (x instanceof Map) { yield* x.values(); return; }
  if (typeof x[Symbol.iterator] === 'function') { yield* x; return; }
  for (const k of Object.keys(x)) yield x[k];
}

export function* __entries(x) {
  if (x == null) return;
  if (Array.isArray(x)) {
    for (let i = 0; i < x.length; i++) if (i in x) yield [i, x[i]];
    return;
  }
  if (x instanceof Map) { yield* x.entries(); return; }
  if (typeof x.entries === 'function' && typeof x.count === 'function') { yield* x.entries(); return; }
  for (const k of Object.keys(x)) yield [k, x[k]];
}

export function values(x) { return [...__values(x)]; }

// ── counting / membership ────────────────────────────────────────────────────
export function count(x) {
  if (x == null) return 0;
  if (typeof x.count === 'function') return x.count();
  if (Array.isArray(x)) {
    let n = 0;
    for (let i = 0; i < x.length; i++) if (i in x) n++;
    return n;
  }
  if (x instanceof Map) return x.size;
  return Object.keys(x).length;
}

// PHP loose equality for the value kinds this code base compares.
export function __eq(a, b) {
  if (a === b) return true;
  if (a == null || b == null) {
    const o = a == null ? b : a;
    if (o == null) return true;
    if (typeof o === 'boolean') return !o;
    if (typeof o === 'number') return o === 0;
    if (typeof o === 'string') return o === '';
    if (Array.isArray(o)) return count(o) === 0;
    return false;
  }
  const ta = typeof a, tb = typeof b;
  if (ta === 'object' && tb === 'object') {
    if (typeof a.__phpEquals === 'function') return a.__phpEquals(b);
    if (Array.isArray(a) && Array.isArray(b)) {
      if (count(a) !== count(b)) return false;
      for (const [k, v] of __entries(a)) if (!(k in b) || !__eq(v, b[k])) return false;
      return true;
    }
    return false;
  }
  if (ta === 'object' || tb === 'object') return false;
  if (ta === 'boolean' || tb === 'boolean') return !!a === !!b;
  if (ta === 'number' && tb === 'string') return b.trim() !== '' && !isNaN(Number(b)) ? a === Number(b) : String(a) === b;
  if (ta === 'string' && tb === 'number') return __eq(b, a);
  if (ta === 'string' && tb === 'string') {
    if (a !== '' && b !== '' && !isNaN(Number(a)) && !isNaN(Number(b))) return Number(a) === Number(b);
    return false;
  }
  return a == b;
}

export function in_array(needle, haystack, strict = false) {
  for (const v of __values(haystack)) {
    if (strict ? v === needle : __eq(v, needle)) return true;
  }
  return false;
}

export function array_search(needle, haystack, strict = false) {
  for (const [k, v] of __entries(haystack)) {
    if (strict ? v === needle : __eq(v, needle)) return k;
  }
  return false;
}

// PHP's string cast, used by array_diff/array_intersect/array_unique.
export function __str(v) {
  if (v == null || v === false) return '';
  if (v === true) return '1';
  if (typeof v === 'object' && typeof v.toString === 'function') return v.toString();
  return String(v);
}

// ── array construction / transformation ──────────────────────────────────────
const isList = (x) => Array.isArray(x);

export function array_merge(...arrs) {
  if (arrs.every(isList)) {
    const out = [];
    for (const a of arrs) for (const v of __values(a)) out.push(v);
    return out;
  }
  // assoc (string keys only in this code base): later keys override in place
  const out = {};
  for (const a of arrs) {
    for (const [k, v] of __entries(a)) {
      if (typeof k === 'number' || /^(0|[1-9]\d*)$/.test(k)) throw new Error('array_merge: numeric key in assoc merge');
      out[k] = v;
    }
  }
  return out;
}

export function array_values(a) { return values(a); }
export function array_keys(a) { return [...__entries(a)].map(([k]) => k); }

export function array_filter(a, cb) {
  if (Array.isArray(a)) {
    const out = [];
    for (let i = 0; i < a.length; i++) {
      if (!(i in a)) continue;
      if (cb ? cb(a[i]) : a[i]) out[i] = a[i];
    }
    return out;
  }
  const out = {};
  for (const [k, v] of __entries(a)) if (cb ? cb(v) : v) out[k] = v;
  return out;
}

export function array_map(cb, a) {
  if (Array.isArray(a)) {
    const out = [];
    for (let i = 0; i < a.length; i++) if (i in a) out[i] = cb(a[i]);
    return out;
  }
  const out = {};
  for (const [k, v] of __entries(a)) out[k] = cb(v);
  return out;
}

export function array_pop(a) {
  for (let i = a.length - 1; i >= 0; i--) {
    if (i in a) { const v = a[i]; a.length = i; return v; }
  }
  a.length = 0;
  return null;
}

export function array_push(a, ...vs) {
  for (const v of vs) a.push(v);
  return count(a);
}

// PHP array_shift / array_unshift reindex numeric keys.
export function array_shift(a) {
  if (!count(a)) return null;
  const vals = values(a);
  const v = vals.shift();
  a.length = 0;
  for (const x of vals) a.push(x);
  return v;
}

export function array_unshift(a, ...vs) {
  const vals = values(a);
  a.length = 0;
  for (const x of vs) a.push(x);
  for (const x of vals) a.push(x);
  return a.length;
}

export function array_splice(a, offset, length, replacement = []) {
  const vals = values(a);
  const removed = length === undefined ? vals.splice(offset) : vals.splice(offset, length, ...replacement);
  a.length = 0;
  for (const x of vals) a.push(x);
  return removed;
}

export function array_slice(a, offset, length = null) {
  const vals = values(a);
  if (offset < 0) offset = Math.max(0, vals.length + offset);
  return length === null ? vals.slice(offset) : vals.slice(offset, offset + length);
}

export function array_reverse(a) { return values(a).reverse(); }

export function array_pad(a, size, v) {
  const vals = values(a);
  while (vals.length < size) vals.push(v);
  return vals;
}

export function array_sum(a) { let s = 0; for (const v of __values(a)) s += Number(v); return s; }

export function array_diff(a, b) {
  const bs = new Set(values(b).map(__str));
  if (Array.isArray(a)) {
    const out = [];
    for (let i = 0; i < a.length; i++) if (i in a && !bs.has(__str(a[i]))) out[i] = a[i];
    return out;
  }
  const out = {};
  for (const [k, v] of __entries(a)) if (!bs.has(__str(v))) out[k] = v;
  return out;
}

export function array_intersect(a, b) {
  const bs = new Set(values(b).map(__str));
  if (Array.isArray(a)) {
    const out = [];
    for (let i = 0; i < a.length; i++) if (i in a && bs.has(__str(a[i]))) out[i] = a[i];
    return out;
  }
  const out = {};
  for (const [k, v] of __entries(a)) if (bs.has(__str(v))) out[k] = v;
  return out;
}

export function implode(glue, a) { return values(a).map(__str).join(glue); }
export function explode(sep, s) { return String(s).split(sep); }

// ── math ─────────────────────────────────────────────────────────────────────
export const floor = Math.floor;
export const abs = Math.abs;
export function min(...a) { if (a.length === 1 && typeof a[0] === 'object') a = values(a[0]); return Math.min(...a.map(Number)); }
export function max(...a) { if (a.length === 1 && typeof a[0] === 'object') a = values(a[0]); return Math.max(...a.map(Number)); }
export function intdiv(a, b) { return Math.trunc(a / b); }
export function bindec(s) { return parseInt(s, 2); }
export function count_set_bits(v) { let n = 0; while (v) { n += v & 1; v >>>= 1; } return n; }

// ── strings ──────────────────────────────────────────────────────────────────
export function strtolower(s) { return String(s).toLowerCase(); }
export function strtoupper(s) { return String(s).toUpperCase(); }
export function ucfirst(s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }
export function strlen(s) { return new TextEncoder().encode(String(s)).length; }
export function mb_strlen(s) { return [...String(s)].length; }
export function substr(s, start, len) {
  s = String(s);
  if (start < 0) start = Math.max(0, s.length + start);
  if (len === undefined || len === null) return s.substr(start);
  if (len < 0) return s.substring(start, s.length + len);
  return s.substr(start, len);
}
export function mb_substr(s, start, len) {
  const a = [...String(s)];
  if (start < 0) start = Math.max(0, a.length + start);
  return (len == null ? a.slice(start) : a.slice(start, start + len)).join('');
}
export function trim(s, chars) {
  if (chars === undefined) return String(s).replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, '');
  const c = chars.replace(/[\]\\^-]/g, '\\$&');
  return String(s).replace(new RegExp(`^[${c}]+|[${c}]+$`, 'g'), '');
}
export function rtrim(s) { return String(s).replace(/[ \t\n\r\0\x0B]+$/g, ''); }
export function str_replace(search, replace, subject) {
  if (Array.isArray(search)) {
    let s = String(subject);
    search.forEach((x, i) => { s = s.split(x).join(Array.isArray(replace) ? (replace[i] ?? '') : replace); });
    return s;
  }
  return String(subject).split(search).join(replace);
}
export function str_pad(s, len, pad = ' ', type = 'right') {
  s = String(s);
  while (s.length < len) s = type === 'left' ? pad + s : s + pad;
  return s.slice(0, Math.max(len, String(s).length));
}
export function str_split(s, n = 1) {
  s = String(s); const out = [];
  for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
  return out;
}
export function strpos(h, n) { const i = String(h).indexOf(n); return i < 0 ? false : i; }
export function ord(s) { return new TextEncoder().encode(String(s))[0] ?? 0; }

// sprintf for the formats this code uses: %s %d %02X %X %x %b %08b
export function sprintf(fmt, ...args) {
  let ai = 0;
  return String(fmt).replace(/%(%|(0?)(\d*)([sdxXbu]))/g, (m, all, zero, width, conv) => {
    if (all === '%') return '%';
    let v = args[ai++];
    let s;
    switch (conv) {
      case 's': s = __str(v); break;
      case 'd': case 'u': s = String(Math.trunc(Number(v) || 0)); break;
      case 'x': s = (Number(v) >>> 0).toString(16); break;
      case 'X': s = (Number(v) >>> 0).toString(16).toUpperCase(); break;
      case 'b': s = (Number(v) >>> 0).toString(2); break;
    }
    if (width) s = s.padStart(Number(width), zero ? '0' : ' ');
    return s;
  });
}

export const vsprintf = (fmt, args) => sprintf(fmt, ...args);

// ── type helpers ─────────────────────────────────────────────────────────────
export function is_array(x) { return Array.isArray(x) || (x !== null && typeof x === 'object' && x.constructor === Object); }
export function is_string(x) { return typeof x === 'string'; }
export function php_empty(x) {
  return x == null || x === false || x === 0 || x === '' || x === '0' || (Array.isArray(x) && count(x) === 0)
    || (x && x.constructor === Object && Object.keys(x).length === 0);
}
export function __int(x) { if (typeof x === 'boolean') return x ? 1 : 0; return Math.trunc(Number(x)) || 0; }

// ── address helpers (app/Helpers/number.php) ─────────────────────────────────
export function pc_to_snes(address) {
  return ((address << 1) & 0x7F0000) | (address & 0x7FFF) | 0x8000;
}
export function snes_to_pc(address) {
  return ((address & 0x7F0000) >> 1) | (address & 0x7FFF);
}

// ── shuffles (app/Helpers/array.php) ─────────────────────────────────────────
export function mt_shuffle(array) {
  array = values(array);
  let out = [];
  while (array.length) {
    const pull = get_random_int(0, array.length - 1);
    out = out.concat(array.splice(pull, 1));
  }
  return out;
}

export function fy_shuffle(array) {
  const a = values(array);
  for (let i = a.length - 1; i >= 0; --i) {
    const r = get_random_int(0, i);
    [a[i], a[r]] = [a[r], a[i]];
  }
  return a;
}

export function hash_array(id) {
  let ret = 0;
  id = (id * 99371) % 33554431;
  for (let i = 0; i < 25; ++i) {
    ret += ((id >> i) & 1) << (((i % 5) + 1) * 5 - Math.floor(i / 5));
  }
  return [(ret >> 20) & 0x1F, (ret >> 15) & 0x1F, (ret >> 10) & 0x1F, (ret >> 5) & 0x1F, ret & 0x1F];
}

// Illuminate\Support\Arr subset
export const Arr = {
  first(a, cb = null, def = null) {
    for (const [k, v] of __entries(a)) if (!cb || cb(v, k)) return v;
    return def;
  },
};
