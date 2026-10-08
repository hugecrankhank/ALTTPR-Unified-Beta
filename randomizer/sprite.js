// Link sprite support (.zspr and legacy .spr), ported from the alttpr.com
// frontend (resources/js/rom.js in alttp_vt_randomizer, MIT).

const AUTHOR_CHARS = {
  ' ': [0x9F, 0x9F], "'": [0xD9, 0xEC], '.': [0xDC, 0xEF], '/': [0xDB, 0xEE], ':': [0xDD, 0xF0], _: [0xDE, 0xF1],
};
'0123456789'.split('').forEach((c, i) => { AUTHOR_CHARS[c] = [0x53 + i, 0x79 + i]; });
'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((c, i) => { AUTHOR_CHARS[c] = [0x5D + i, 0x83 + i]; });

function readUtf16z(b, i, end) {
  let s = '';
  while (i + 1 < end) {
    const c = b[i] | (b[i + 1] << 8);
    i += 2;
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return [s, i];
}

const u32 = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

/** Check a sprite file and return its details, or throw with a readable reason. */
export function parseSprite(bytes) {
  bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const zspr = String.fromCharCode(...bytes.subarray(0, 4)) === 'ZSPR';
  if (!zspr) {
    if (bytes.length < 0x7078) throw new Error('That isn\'t a Link sprite (.zspr or .spr).');
    return { kind: 'spr', name: '', author: '', authorShort: '', bytes };
  }
  const gfx = u32(bytes, 9);
  const pal = u32(bytes, 15);
  const type = bytes[21] | (bytes[22] << 8);
  if (type !== 1) throw new Error('That .zspr isn\'t a Link sprite.');
  if ((gfx !== 0xFFFFFFFF && gfx + 0x7000 > bytes.length) || pal + 124 > bytes.length) {
    throw new Error('That .zspr file looks damaged or incomplete.');
  }
  const end = gfx === 0xFFFFFFFF ? pal : gfx;
  let i = 0x1D, name, author;
  [name, i] = readUtf16z(bytes, i, end);
  [author, i] = readUtf16z(bytes, i, end);
  let authorShort = '';
  while (i < end && bytes[i] !== 0) authorShort += String.fromCharCode(bytes[i++]);
  return { kind: 'zspr', name, author, authorShort, bytes };
}

/** Write a parsed sprite into a 2 MB randomizer ROM (before the checksum). */
export function applySprite(rom, sprite) {
  const b = sprite.bytes;
  if (sprite.kind === 'spr') {
    rom.set(b.subarray(0, 0x7000), 0x80000);
    rom.set(b.subarray(0x7000, 0x7000 + 120), 0xDD308);
    rom[0xDEDF5] = b[0x7036]; rom[0xDEDF6] = b[0x7037];
    rom[0xDEDF7] = b[0x7054]; rom[0xDEDF8] = b[0x7055];
    return;
  }
  const gfx = u32(b, 9), pal = u32(b, 15);

  // credits line "sprite by ...", only when the ROM has the slot for it
  if (rom[0x118000] === 0x02 && rom[0x118001] === 0x37 && rom[0x11801E] === 0x02 && rom[0x11801F] === 0x37) {
    const s = sprite.authorShort.slice(0, 28).toUpperCase();
    const left = Math.floor((28 - s.length) / 2);
    const text = ' '.repeat(left) + s + ' '.repeat(28 - s.length - left);
    for (let i = 0; i < 28; i++) {
      const [top, bottom] = AUTHOR_CHARS[text[i]] || [0x9F, 0x9F];
      rom[0x118002 + i] = top;
      rom[0x118020 + i] = bottom;
    }
  }
  if (gfx !== 0xFFFFFFFF) rom.set(b.subarray(gfx, gfx + 0x7000), 0x80000);
  rom.set(b.subarray(pal, pal + 120), 0xDD308);
  rom.set(b.subarray(pal + 120, pal + 124), 0xDEDF5);
}

// ── previews ──────────────────────────────────────────────────────────────────
// A sprite's graphics are 896 8x8 tiles (SNES 4 bits per pixel), 16 to a row of
// the sheet; colours come from its first palette (green mail). Link's head,
// facing the camera, is the 16x16 block at the sheet's top (tiles 2-3 of the
// first two rows), the same head alttpr.com's previews show.

const SHEET_TILES = 896;

function spriteColors(b, pal) {
  const cols = [];
  for (let i = 0; i < 15; i++) {
    const v = b[pal + 2 * i] | (b[pal + 2 * i + 1] << 8);
    cols.push([(v & 31) * 255 / 31, ((v >> 5) & 31) * 255 / 31, ((v >> 10) & 31) * 255 / 31]);
  }
  return cols;
}

function drawTile(img, W, g, index, x0, y0, cols) {
  const t = index * 32;
  for (let r = 0; r < 8; r++) {
    const p0 = g[t + 2 * r], p1 = g[t + 2 * r + 1], p2 = g[t + 16 + 2 * r], p3 = g[t + 17 + 2 * r];
    for (let c = 0; c < 8; c++) {
      const s = 7 - c;
      const v = ((p0 >> s) & 1) | (((p1 >> s) & 1) << 1) | (((p2 >> s) & 1) << 2) | (((p3 >> s) & 1) << 3);
      if (!v) continue;
      const o = ((y0 + r) * W + x0 + c) * 4, col = cols[v - 1];
      img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
    }
  }
}

// Graphics and palette offsets, or null when the file only recolours the
// game's own Link (no graphics of its own) or isn't a sprite.
function sheetParts(sprite) {
  const b = sprite.bytes;
  if (sprite.kind === 'spr') return { g: b.subarray(0, 0x7000), cols: spriteColors(b, 0x7000) };
  const gfx = u32(b, 9), pal = u32(b, 15);
  if (gfx === 0xFFFFFFFF || gfx + 0x7000 > b.length) return null;
  return { g: b.subarray(gfx, gfx + 0x7000), cols: spriteColors(b, pal) };
}

/** Draw Link's head (16x16) onto a canvas. False if the file has no graphics. */
export function drawHead(sprite, canvas) {
  const parts = sheetParts(sprite);
  if (!parts) return false;
  canvas.width = 16; canvas.height = 16;
  const ctx = canvas.getContext('2d'), img = ctx.createImageData(16, 16);
  [[2, 0, 0, 0], [3, 0, 8, 0], [2, 1, 0, 8], [3, 1, 8, 8]].forEach(([col, row, x, y]) => {
    drawTile(img, 16, parts.g, row * 16 + col, x, y, parts.cols);
  });
  ctx.putImageData(img, 0, 0);
  return true;
}

/** Draw the whole sprite sheet (128x448). False if the file has no graphics. */
export function drawSheet(sprite, canvas) {
  const parts = sheetParts(sprite);
  if (!parts) return false;
  canvas.width = 128; canvas.height = 448;
  const ctx = canvas.getContext('2d'), img = ctx.createImageData(128, 448);
  for (let i = 0; i < SHEET_TILES; i++) drawTile(img, 128, parts.g, i, (i % 16) * 8, Math.floor(i / 16) * 8, parts.cols);
  ctx.putImageData(img, 0, 0);
  return true;
}
