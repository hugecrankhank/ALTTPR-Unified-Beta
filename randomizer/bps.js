// BPS patches (the format alttpr.com's base patches use): source ROM + patch
// -> target ROM. https://www.romhacking.net/documents/746/

let CRC_TABLE = null;
export function crc32(bytes) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Apply a BPS patch. Throws with a readable reason if the patch is damaged
 * or meant for a different source file (unless checkSource is false).
 */
export function applyBps(source, patch, { checkSource = true } = {}) {
  source = source instanceof Uint8Array ? source : new Uint8Array(source);
  patch = patch instanceof Uint8Array ? patch : new Uint8Array(patch);
  if (patch.length < 19 || String.fromCharCode(patch[0], patch[1], patch[2], patch[3]) !== 'BPS1') {
    throw new Error('That base patch isn\'t a BPS file.');
  }
  const end = patch.length - 12;
  const dv = new DataView(patch.buffer, patch.byteOffset, patch.byteLength);
  const srcCrc = dv.getUint32(end, true), dstCrc = dv.getUint32(end + 4, true), patchCrc = dv.getUint32(end + 8, true);
  if (crc32(patch.subarray(0, end + 8)) !== patchCrc) throw new Error('The base patch is damaged (checksum).');
  if (checkSource && crc32(source) !== srcCrc) {
    throw new Error('The base patch is for a different ROM than your base ROM.');
  }
  let i = 4;
  const num = () => {
    let data = 0, shift = 1;
    for (;;) {
      if (i >= end) throw new Error('The base patch is damaged (truncated).');
      const x = patch[i++];
      data += (x & 0x7F) * shift;
      if (x & 0x80) return data;
      shift *= 128;
      data += shift;
    }
  };
  const srcSize = num(), dstSize = num(), metaSize = num();
  i += metaSize;
  if (checkSource && srcSize !== source.length) throw new Error('The base patch is for a different ROM size.');
  const out = new Uint8Array(dstSize);
  let outPos = 0, srcRel = 0, dstRel = 0;
  while (i < end) {
    const d = num(), cmd = d & 3, len = Math.floor(d / 4) + 1;
    if (outPos + len > dstSize) throw new Error('The base patch is damaged (overflow).');
    if (cmd === 0) {            // SourceRead
      for (let k = 0; k < len; k++) out[outPos + k] = source[outPos + k] || 0;
      outPos += len;
    } else if (cmd === 1) {     // TargetRead
      out.set(patch.subarray(i, i + len), outPos);
      i += len; outPos += len;
    } else {
      const o = num(), off = (o & 1 ? -1 : 1) * Math.floor(o / 2);
      if (cmd === 2) {          // SourceCopy
        srcRel += off;
        for (let k = 0; k < len; k++) out[outPos++] = source[srcRel++] || 0;
      } else {                  // TargetCopy (may overlap: byte by byte)
        dstRel += off;
        for (let k = 0; k < len; k++) out[outPos++] = out[dstRel++];
      }
    }
  }
  if (crc32(out) !== dstCrc && checkSource) throw new Error('The patched ROM didn\'t come out right (checksum).');
  return out;
}
