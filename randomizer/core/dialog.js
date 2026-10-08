// Port of app/Support/Dialog.php and the mb_wordwrap helper (alttp_vt_randomizer, MIT)

// PHP wordwrap() for a single-character break without cut (the only form used)
function phpWordwrap(text, width, brk) {
  const s = text.split('');
  let laststart = 0, lastspace = 0;
  for (let current = 0; current < text.length; current++) {
    const c = text[current];
    if (c === brk) {
      laststart = lastspace = current + 1;
    } else if (c === ' ') {
      if (current - laststart >= width) {
        s[current] = brk;
        laststart = current + 1;
      }
      lastspace = current;
    } else if (current - laststart >= width && laststart !== lastspace) {
      s[lastspace] = brk;
      laststart = lastspace + 1;
    }
  }
  return s.join('');
}

const mbLen = (s) => [...s].length;
const rtrimWs = (s) => s.replace(/[ \t\n\r\0\x0B]+$/, '');
const trimWs = (s) => s.replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, '');
const byteLen = (s) => new TextEncoder().encode(s).length;

export function mb_wordwrap(str, width = 75, brk = '\n') {
  if (mbLen(str) === byteLen(str)) return phpWordwrap(str, width, brk);
  const lines = str.split(brk);
  for (let li = 0; li < lines.length; li++) {
    let line = rtrimWs(lines[li]);
    lines[li] = line;
    if (mbLen(line) <= width) continue;
    const words = line.split(' ');
    line = '';
    let actual = '';
    for (const word of words) {
      if (mbLen(actual + word) <= width) {
        actual += word + ' ';
      } else {
        if (actual !== '') line += rtrimWs(actual) + brk;
        actual = word;
        actual += ' ';
      }
    }
    line += trimWs(actual);
    lines[li] = line;
  }
  return lines.join(brk);
}

const CHARACTERS = {
" ": [
255
],
"≥": [
153
],
"…": [
159
],
"?": [
198
],
"!": [
199
],
",": [
200
],
"-": [
201
],
".": [
205
],
"~": [
206
],
"～": [
206
],
":": [
234
],
"'": [
157
],
"’": [
157
],
"@": [
254,
106
],
">": [
155,
156
],
"%": [
253,
16
],
"^": [
253,
17
],
"=": [
253,
18
],
"↑": [
253,
19
],
"↓": [
253,
20
],
"→": [
253,
21
],
"←": [
253,
22
],
"¼": [
229,
231
],
"½": [
230,
231
],
"¾": [
232,
233
],
"♥": [
234,
235
],
"ᚋ": [
254,
108,
0
],
"ᚌ": [
254,
108,
1
],
"ᚍ": [
254,
108,
2
],
"ᚎ": [
254,
108,
3
],
"あ": [
0
],
"い": [
1
],
"う": [
2
],
"え": [
3
],
"お": [
4
],
"や": [
5
],
"ゆ": [
6
],
"よ": [
7
],
"か": [
8
],
"き": [
9
],
"く": [
10
],
"け": [
11
],
"こ": [
12
],
"わ": [
13
],
"を": [
14
],
"ん": [
15
],
"さ": [
16
],
"し": [
17
],
"す": [
18
],
"せ": [
19
],
"そ": [
20
],
"が": [
21
],
"ぎ": [
22
],
"ぐ": [
23
],
"た": [
24
],
"ち": [
25
],
"つ": [
26
],
"て": [
27
],
"と": [
28
],
"げ": [
29
],
"ご": [
30
],
"ざ": [
31
],
"な": [
32
],
"に": [
33
],
"ぬ": [
34
],
"ね": [
35
],
"の": [
36
],
"じ": [
37
],
"ず": [
38
],
"ぜ": [
39
],
"は": [
40
],
"ひ": [
41
],
"ふ": [
42
],
"へ": [
43
],
"ほ": [
44
],
"ぞ": [
45
],
"だ": [
46
],
"ぢ": [
47
],
"ま": [
48
],
"み": [
49
],
"む": [
50
],
"め": [
51
],
"も": [
52
],
"づ": [
53
],
"で": [
54
],
"ど": [
55
],
"ら": [
56
],
"り": [
57
],
"る": [
58
],
"れ": [
59
],
"ろ": [
60
],
"ば": [
61
],
"び": [
62
],
"ぶ": [
63
],
"べ": [
64
],
"ぼ": [
65
],
"ぱ": [
66
],
"ぴ": [
67
],
"ぷ": [
68
],
"ぺ": [
69
],
"ぽ": [
70
],
"ゃ": [
71
],
"ゅ": [
72
],
"ょ": [
73
],
"っ": [
74
],
"ぁ": [
75
],
"ぃ": [
76
],
"ぅ": [
77
],
"ぇ": [
78
],
"ぉ": [
79
],
"ア": [
80
],
"イ": [
81
],
"ウ": [
82
],
"エ": [
83
],
"オ": [
84
],
"ヤ": [
85
],
"ユ": [
86
],
"ヨ": [
87
],
"カ": [
88
],
"キ": [
89
],
"ク": [
90
],
"ケ": [
91
],
"コ": [
92
],
"ワ": [
93
],
"ヲ": [
94
],
"ン": [
95
],
"サ": [
96
],
"シ": [
97
],
"ス": [
98
],
"セ": [
99
],
"ソ": [
100
],
"ガ": [
101
],
"ギ": [
102
],
"グ": [
103
],
"タ": [
104
],
"チ": [
105
],
"ツ": [
106
],
"テ": [
107
],
"ト": [
108
],
"ゲ": [
109
],
"ゴ": [
110
],
"ザ": [
111
],
"ナ": [
112
],
"ニ": [
113
],
"ヌ": [
114
],
"ネ": [
115
],
"ノ": [
116
],
"ジ": [
117
],
"ズ": [
118
],
"ゼ": [
119
],
"ハ": [
120
],
"ヒ": [
121
],
"フ": [
122
],
"ヘ": [
123
],
"ホ": [
124
],
"ゾ": [
125
],
"ダ": [
126
],
"マ": [
128
],
"ミ": [
129
],
"ム": [
130
],
"メ": [
131
],
"モ": [
132
],
"ヅ": [
133
],
"デ": [
134
],
"ド": [
135
],
"ラ": [
136
],
"リ": [
137
],
"ル": [
138
],
"レ": [
139
],
"ロ": [
140
],
"バ": [
141
],
"ビ": [
142
],
"ブ": [
143
],
"ベ": [
144
],
"ボ": [
145
],
"パ": [
146
],
"ピ": [
147
],
"プ": [
148
],
"ペ": [
149
],
"ポ": [
150
],
"ャ": [
151
],
"ュ": [
152
],
"ョ": [
153
],
"ッ": [
154
],
"ァ": [
155
],
"ィ": [
156
],
"ゥ": [
157
],
"ェ": [
158
],
"ォ": [
159
]
};

const COMMANDS = {
  '{SPEED0}': [0xFC, 0x00], '{SPEED2}': [0xFC, 0x02], '{SPEED6}': [0xFC, 0x06],
  '{PAUSE1}': [0xFE, 0x78, 0x01], '{PAUSE3}': [0xFE, 0x78, 0x03], '{PAUSE5}': [0xFE, 0x78, 0x05],
  '{PAUSE7}': [0xFE, 0x78, 0x07], '{PAUSE9}': [0xFE, 0x78, 0x09], '{INPUT}': [0xFA],
  '{CHOICE}': [0xFE, 0x68], '{ITEMSELECT}': [0xFE, 0x69], '{CHOICE2}': [0xFE, 0x71], '{CHOICE3}': [0xFE, 0x72],
  '{C:GREEN}': [0xFE, 0x77, 0x07], '{C:YELLOW}': [0xFE, 0x77, 0x02], '{HARP}': [0xFE, 0x79, 0x2D],
  '{MENU}': [0xFE, 0x6D, 0x00], '{BOTTOM}': [0xFE, 0x6D, 0x01], '{NOBORDER}': [0xFE, 0x6B, 0x02],
  '{CHANGEPIC}': [0xFE, 0x67, 0xFE, 0x67], '{CHANGEMUSIC}': [0xFE, 0x67],
  '{IBOX}': [0xFE, 0x6B, 0x02, 0xFE, 0x77, 0x07, 0xFC, 0x03, 0xF7],
};

export class Dialog {
  charToHex(c) {
    if (/\d/.test(c)) return [Number(c) + 0xA0];
    if (/[A-Z]/.test(c)) return [c.charCodeAt(0) - 65 + 0xAA];
    if (/[a-z]/.test(c)) return [c.charCodeAt(0) + 0x6F];
    return CHARACTERS[c] ?? [0xFF];
  }

  convertDialogCompressed(string, pause = true, max_bytes = 2046, wrap = 19) {
    let pad_out = false;
    let out = [0xFB];
    let lines = String(string).split('\n');
    if (wrap > 0) {
      let nl = [];
      for (const line of lines) nl = nl.concat(mb_wordwrap(line, wrap, '\n').split('\n'));
      lines = nl;
    }
    let i = 0;
    let line_count = (String(lines[lines.length - 1] ?? '').slice(0, 1) === '{') ? lines.length - 1 : lines.length;
    for (const line of lines) {
      let chars = [...line].slice(0, 19);
      if (chars[0] === '{') {
        const cmd = trimWs(line);
        if (cmd === '{NOTEXT}') return [0xFB, 0xFE, 0x6E, 0x00, 0xFE, 0x6B, 0x04];
        if (cmd === '{INTRO}') {
          pad_out = true;
          out = out.concat([0xFE, 0x6E, 0x00, 0xFE, 0x77, 0x07, 0xFC, 0x03, 0xFE, 0x6B, 0x02, 0xFE, 0x67]);
        } else if (COMMANDS[cmd]) {
          out = out.concat(COMMANDS[cmd]);
        }
        line_count--;
        if (out.length > max_bytes) throw new Error('command overflowed byte length');
        continue;
      }
      switch (i) {
        case 0: break;
        case 1: out.push(0xF8); break;
        default:
          if (i >= 3 && i < lines.length) out.push(0xF6);
          else out.push(0xF9);
      }
      if (pad_out && i < 3) while (chars.length < 19) chars.push(' ');
      for (const c of chars) out = out.concat(this.charToHex(c));
      i++;
      if (pause && i % 3 === 0 && line_count > i) out.push(0xFA);
    }
    if (out.length > max_bytes) return out.slice(0, max_bytes);
    return out;
  }
}
