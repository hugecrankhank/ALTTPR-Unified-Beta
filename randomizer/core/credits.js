// Port of app/Support/Credits.php (alttp_vt_randomizer, MIT)
// Credits text is ASCII; strings are treated byte-wise like the PHP original.

const SCENES = () => ({
  castle: [
    { type: 'small', x: 5, y: 19, text: 'The return of the King' },
    { type: 'large', x: 9, y: 23, text: 'Hyrule Castle' },
  ],
  sanctuary: [
    { type: 'small', x: 8, y: 19, text: 'The loyal priest' },
    { type: 'large', x: 11, y: 23, text: 'Sanctuary' },
  ],
  kakariko: [
    { type: 'small', x: 4, y: 19, text: "Sahasralah's Homecoming" },
    { type: 'large', x: 9, y: 23, text: 'Kakariko Town' },
  ],
  desert: [
    { type: 'small', x: 4, y: 19, text: 'vultures rule the desert' },
    { type: 'large', x: 9, y: 23, text: 'Desert Palace' },
  ],
  hera: [
    { type: 'small', x: 4, y: 19, text: 'the bully makes a friend' },
    { type: 'large', x: 9, y: 23, text: 'Mountain Tower' },
  ],
  house: [
    { type: 'small', x: 6, y: 19, text: 'your uncle recovers' },
    { type: 'large', x: 11, y: 23, text: 'Your House' },
  ],
  zora: [
    { type: 'small', x: 6, y: 19, text: 'finger webs for sale' },
    { type: 'large', x: 8, y: 23, text: "Zora's Waterfall" },
  ],
  witch: [
    { type: 'small', x: 4, y: 19, text: 'the witch and assistant' },
    { type: 'large', x: 11, y: 23, text: 'Magic Shop' },
  ],
  lumberjacks: [
    { type: 'small', x: 8, y: 19, text: 'twin lumberjacks' },
    { type: 'large', x: 9, y: 23, text: "Woodsmen's Hut" },
  ],
  grove: [
    { type: 'small', x: 4, y: 19, text: 'ocarina boy plays again' },
    { type: 'large', x: 9, y: 23, text: 'Haunted Grove' },
  ],
  well: [
    { type: 'small', x: 4, y: 19, text: 'venus, queen of faeries' },
    { type: 'large', x: 10, y: 23, text: 'Wishing Well' },
  ],
  smithy: [
    { type: 'small', x: 4, y: 19, text: 'the dwarven swordsmiths' },
    { type: 'large', x: 12, y: 23, text: 'Smithery' },
  ],
  kakariko2: [
    { type: 'small', x: 6, y: 19, text: 'the bug-catching kid' },
    { type: 'large', x: 9, y: 23, text: 'Kakariko Town' },
  ],
  bridge: [
    { type: 'small', x: 8, y: 19, text: 'the lost old man' },
    { type: 'large', x: 9, y: 23, text: 'Death Mountain' },
  ],
  woods: [
    { type: 'small', x: 8, y: 19, text: 'the forest thief' },
    { type: 'large', x: 11, y: 23, text: 'Lost Woods' },
  ],
  pedestal: [
    { type: 'small', x: 6, y: 19, text: 'and the master sword' },
    { type: 'small_alt', x: 8, y: 21, text: 'sleeps again...' },
    { type: 'large', x: 12, y: 23, text: 'Forever!' },
  ],
});

// work on UTF-8 bytes like PHP's byte-oriented string functions
const toBytes = (s) => [...new TextEncoder().encode(s)];
const isLower = (b) => b >= 0x61 && b <= 0x7A;
const lowerBytes = (s) => toBytes(s).map((b) => (b >= 0x41 && b <= 0x5A ? b + 0x20 : b));

export class Credits {
  constructor() { this.scenes = SCENES(); }

  updateCreditLine(scene, line, text, align = 'center') {
    if (!this.scenes[scene] || !this.scenes[scene][line]) return false;
    const bytes = toBytes(text).slice(0, 32);
    text = new TextDecoder('latin1').decode(Uint8Array.from(bytes)); // keep byte semantics
    const rec = this.scenes[scene][line];
    rec.text = text;
    rec.bytes = bytes;
    switch (align) {
      case 'left': rec.x = 0; break;
      case 'right': rec.x = Math.max(0, 32 - bytes.length); break;
      default: rec.x = Math.max(0, Math.floor((32 - bytes.length) / 2));
    }
  }

  getBinaryData() {
    const pointers = [];
    let data = [];
    for (const scene of Object.values(this.scenes)) {
      pointers.push(data.length);
      for (const part of scene) {
        switch (part.type) {
          case 'small': data = data.concat(this.getSmallConverted(part)); break;
          case 'small_alt': data = data.concat(this.getSmallAltConverted(part)); break;
          case 'large': data = data.concat(this.getLargeConverted(part)); break;
        }
      }
    }
    pointers.push(data.length);
    return { pointers, data };
  }

  static recBytes(rec) { return rec.bytes ?? toBytes(rec.text); }

  getSmallConverted(rec) {
    const tb = Credits.recBytes(rec);
    let conv = this.convertCredits(tb);
    let data = this.getHeader(rec.x, rec.y, conv.length).concat(conv);
    // apostrophes: everything else -> space, ' -> ,
    const apos = tb.map((b) => (b === 0x27 ? 0x2C : 0x20));
    const aposTrim = trimSpaces(apos);
    if (aposTrim.length) {
      conv = this.convertCredits(aposTrim);
      data = data.concat(this.getHeader(rec.x + apos.indexOf(0x2C), rec.y - 1, conv.length), conv);
    }
    const commas = tb.map((b) => (b === 0x2C ? 0x27 : 0x20));
    const commasTrim = trimSpaces(commas);
    if (commasTrim.length) {
      conv = this.convertCredits(commasTrim);
      data = data.concat(this.getHeader(rec.x + commas.indexOf(0x27), rec.y + 1, conv.length), conv);
    }
    return data;
  }

  getSmallAltConverted(rec) {
    const conv = this.convertAltCredits(Credits.recBytes(rec));
    return this.getHeader(rec.x, rec.y, conv.length).concat(conv);
  }

  getLargeConverted(rec) {
    const tb = Credits.recBytes(rec);
    let conv = this.convertLargeCreditsTop(tb);
    let data = this.getHeader(rec.x, rec.y, conv.length).concat(conv);
    conv = this.convertLargeCreditsBottom(tb);
    data = data.concat(this.getHeader(rec.x, rec.y + 1, conv.length), conv);
    return data;
  }

  getHeader(x, y, length) {
    const v = ((0x6000 | ((y >> 5) << 11) | ((y & 0x1F) << 5) | ((x >> 5) << 10) | (x & 0x1F)) << 16 | (length * 2 - 1)) >>> 0;
    return [(v >>> 24) & 0xFF, (v >>> 16) & 0xFF, (v >>> 8) & 0xFF, v & 0xFF];
  }

  convertLargeCreditsTop(bytes) {
    return lowerOf(bytes).map((c) => {
      if (!isLower(c)) return c === 0x27 ? 0xD9 : c === 0x21 ? 0xE5 : c === 0x5F ? 0xDE : 0x9F;
      return c - 0x4;
    });
  }

  convertLargeCreditsBottom(bytes) {
    return lowerOf(bytes).map((c) => {
      if (!isLower(c)) return c === 0x27 ? 0xEC : c === 0x21 ? 0xF8 : c === 0x5F ? 0xF1 : 0x9F;
      return c + 0x22;
    });
  }

  convertAltCredits(bytes) {
    return lowerOf(bytes).map((c) => (isLower(c) ? c - 0x29 : c === 0x2E ? 0x52 : 0x9F));
  }

  convertCredits(bytes) {
    return lowerOf(bytes).map((c) => {
      if (isLower(c)) return c - 0x47;
      switch (c) {
        case 0x20: return 0x9F;
        case 0x2C: return 0x34;
        case 0x2E: return 0x37;
        case 0x2D: return 0x36;
        case 0x27: return 0x35;
        default: return 0x9F;
      }
    });
  }
}

function lowerOf(bytes) { return bytes.map((b) => (b >= 0x41 && b <= 0x5A ? b + 0x20 : b)); }

// PHP trim() on a byte array that only contains spaces and one marker char
function trimSpaces(bytes) {
  let a = 0, b = bytes.length;
  while (a < b && bytes[a] === 0x20) a++;
  while (b > a && bytes[b - 1] === 0x20) b--;
  return bytes.slice(a, b);
}

export { lowerBytes };
