// Minimal .zip reader for MSU-1 packs. Nothing is unpacked up front: stored
// files are just slices of the zip, and compressed ones are inflated by the
// browser (DecompressionStream) only when that song is about to play, so a
// pack of several hundred MB doesn't have to sit in memory all at once.

const u8 = async (blob, start, len) => new Uint8Array(await blob.slice(start, start + len).arrayBuffer());

/** Lists a zip's files: [{ path, method, csize, size, local }] (local = header offset). */
export async function listZip(zip) {
  // End of central directory: in the last 64 KB + 22 bytes
  const tailStart = Math.max(0, zip.size - 65558);
  const tail = await u8(zip, tailStart, zip.size - tailStart);
  let e = -1;
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tail[i] === 0x50 && tail[i + 1] === 0x4b && tail[i + 2] === 5 && tail[i + 3] === 6) { e = i; break; }
  }
  if (e < 0) throw new Error('That file isn\'t a .zip (or it\'s damaged).');
  const dv = new DataView(tail.buffer, tail.byteOffset);
  let count = dv.getUint16(e + 10, true);
  let cdSize = dv.getUint32(e + 12, true);
  let cdOff = dv.getUint32(e + 16, true);
  // Zip64 (packs over 4 GB, or made by some tools)
  if (cdOff === 0xFFFFFFFF || count === 0xFFFF) {
    const l = e - 20;
    if (l >= 0 && dv.getUint32(l, true) === 0x07064b50) {
      const z64 = Number(dv.getBigUint64(l + 8, true));
      const r = new DataView((await u8(zip, z64, 56)).buffer);
      count = Number(r.getBigUint64(32, true));
      cdSize = Number(r.getBigUint64(40, true));
      cdOff = Number(r.getBigUint64(48, true));
    }
  }
  const cd = await u8(zip, cdOff, cdSize);
  const c = new DataView(cd.buffer, cd.byteOffset);
  const dec = new TextDecoder();
  const out = [];
  for (let p = 0, n = 0; n < count && p + 46 <= cd.length; n++) {
    if (c.getUint32(p, true) !== 0x02014b50) break;
    const method = c.getUint16(p + 10, true);
    let csize = c.getUint32(p + 20, true), size = c.getUint32(p + 24, true);
    const nl = c.getUint16(p + 28, true), xl = c.getUint16(p + 30, true), cl = c.getUint16(p + 32, true);
    let local = c.getUint32(p + 42, true);
    const path = dec.decode(cd.subarray(p + 46, p + 46 + nl));
    // zip64 sizes/offset live in extra field 0x0001, in this order, only when maxed out
    for (let x = p + 46 + nl, end = x + xl; x + 4 <= end;) {
      const id = c.getUint16(x, true), len = c.getUint16(x + 2, true);
      if (id === 1) {
        let q = x + 4;
        if (size === 0xFFFFFFFF) { size = Number(c.getBigUint64(q, true)); q += 8; }
        if (csize === 0xFFFFFFFF) { csize = Number(c.getBigUint64(q, true)); q += 8; }
        if (local === 0xFFFFFFFF) { local = Number(c.getBigUint64(q, true)); }
      }
      x += 4 + len;
    }
    if (!path.endsWith('/')) out.push({ path, method, csize, size, local });
    p += 46 + nl + xl + cl;
  }
  return out;
}

/** One file from the zip, as a Blob. */
export async function zipEntryBlob(zip, ent) {
  const h = new DataView((await u8(zip, ent.local, 30)).buffer);
  if (h.getUint32(0, true) !== 0x04034b50) throw new Error('damaged .zip');
  const start = ent.local + 30 + h.getUint16(26, true) + h.getUint16(28, true);
  const raw = zip.slice(start, start + ent.csize);
  if (ent.method === 0) return raw;
  if (ent.method !== 8) throw new Error('This .zip uses a compression the browser can\'t open. Re-zip it with normal (Deflate) compression.');
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser can\'t unzip. Update it, or choose the .pcm files instead.');
  return new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
}
