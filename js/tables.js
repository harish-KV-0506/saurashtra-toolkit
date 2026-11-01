// Letter tables for Saurashtra (Unicode block U+A880–U+A8DF), Tamil, and the Latin schemes.
//
// Every phoneme has one canonical `id`. All conversions go
//   source script -> list of items (see translit.js) -> target script
// so adding a script means adding one column here, not N*N rules.
//
// Fields
//   sa   Saurashtra letter            sg  Saurashtra vowel sign (dependent form)
//   ta   Tamil letter                 ts  Tamil text appended to a consonant for this vowel
//   tok  Latin input tokens (case-sensitive; upper-case tokens only count in "precise" mode)
//   out  Latin output per style: simple (lowercase ASCII) | ascii (case-sensitive ASCII) | iso (diacritics)

const cp = (n) => String.fromCodePoint(n);

const V = (id, saCp, sgCp, ta, ts, tok, simple, ascii, iso) => ({
  id, sa: cp(saCp), sg: sgCp ? cp(sgCp) : '', ta, ts, tok, out: { simple, ascii, iso },
});
const C = (id, saCp, ta, tok, simple, ascii, iso) => ({
  id, sa: cp(saCp), ta, tok, out: { simple, ascii, iso },
});
const M = (id, saCp, ta, tok, simple, ascii, iso) => ({
  id, sa: cp(saCp), ta, tok, out: { simple, ascii, iso },
});

export const VOWELS = [
  V('a',   0xA882, 0,      'அ', '',    ['a'],                 'a',   'a',   'a'),
  V('aa',  0xA883, 0xA8B5, 'ஆ', 'ா',   ['aa', 'A', 'ā'],      'aa',  'aa',  'ā'),
  V('i',   0xA884, 0xA8B6, 'இ', 'ி',   ['i'],                 'i',   'i',   'i'),
  V('ii',  0xA885, 0xA8B7, 'ஈ', 'ீ',   ['ii', 'I', 'ī'],      'ii',  'ii',  'ī'),
  V('u',   0xA886, 0xA8B8, 'உ', 'ு',   ['u'],                 'u',   'u',   'u'),
  V('uu',  0xA887, 0xA8B9, 'ஊ', 'ூ',   ['uu', 'U', 'ū'],      'uu',  'uu',  'ū'),
  V('rr',  0xA888, 0xA8BA, 'ரு', '்ரு',  ['R^i', 'r^i', 'ṛ'],   'r^i', 'R^i', 'ṛ'),
  V('rrr', 0xA889, 0xA8BB, 'ரூ', '்ரூ', ['R^I', 'r^ii', 'ṝ'],  'r^ii', 'R^I', 'ṝ'),
  V('ll',  0xA88A, 0xA8BC, 'லு', '்லு',  ['L^i', 'l^i'],        'l^i', 'L^i', 'L^i'),
  V('lll', 0xA88B, 0xA8BD, 'லூ', '்லூ', ['L^I', 'l^ii'],       'l^ii', 'L^I', 'L^I'),
  V('e',   0xA88C, 0xA8BE, 'எ', 'ெ',   ['e'],                 'e',   'e',   'e'),
  V('ee',  0xA88D, 0xA8BF, 'ஏ', 'ே',   ['ee', 'E', 'ē'],      'ee',  'ee',  'ē'),
  V('ai',  0xA88E, 0xA8C0, 'ஐ', 'ை',   ['ai'],                'ai',  'ai',  'ai'),
  V('o',   0xA88F, 0xA8C1, 'ஒ', 'ொ',   ['o'],                 'o',   'o',   'o'),
  V('oo',  0xA890, 0xA8C2, 'ஓ', 'ோ',   ['oo', 'O', 'ō'],      'oo',  'oo',  'ō'),
  V('au',  0xA891, 0xA8C3, 'ஔ', 'ௌ',   ['au'],                'au',  'au',  'au'),
];

export const CONSONANTS = [
  C('k',  0xA892, 'க', ['k'],                    'k',   'k',   'k'),
  C('kh', 0xA893, 'க', ['kh'],                   'kh',  'kh',  'kh'),
  C('g',  0xA894, 'க', ['g'],                    'g',   'g',   'g'),
  C('gh', 0xA895, 'க', ['gh'],                   'gh',  'gh',  'gh'),
  C('ng', 0xA896, 'ங', ['N^', 'n^', 'ṅ'],        'ng',  'N^',  'ṅ'),
  C('c',  0xA897, 'ச', ['c', 'ch'],              'ch',  'ch',  'c'),
  C('ch', 0xA898, 'ச', ['chh', 'Ch'],            'chh', 'chh', 'chh'),
  C('j',  0xA899, 'ஜ', ['j'],                    'j',   'j',   'j'),
  C('jh', 0xA89A, 'ஜ', ['jh'],                   'jh',  'jh',  'jh'),
  C('ny', 0xA89B, 'ஞ', ['~n', 'ñ'],              'ny',  '~n',  'ñ'),
  C('T',  0xA89C, 'ட', ['T', 'ṭ', '.t'],         't',   'T',   'ṭ'),
  C('Th', 0xA89D, 'ட', ['Th', 'ṭh', '.th'],      'th',  'Th',  'ṭh'),
  C('D',  0xA89E, 'ட', ['D', 'ḍ', '.d'],         'd',   'D',   'ḍ'),
  C('Dh', 0xA89F, 'ட', ['Dh', 'ḍh', '.dh'],      'dh',  'Dh',  'ḍh'),
  C('N',  0xA8A0, 'ண', ['N', 'ṇ', '.n'],         'n',   'N',   'ṇ'),
  C('t',  0xA8A1, 'த', ['t'],                    't',   't',   't'),
  C('th', 0xA8A2, 'த', ['th'],                   'th',  'th',  'th'),
  C('d',  0xA8A3, 'த', ['d'],                    'd',   'd',   'd'),
  C('dh', 0xA8A4, 'த', ['dh'],                   'dh',  'dh',  'dh'),
  C('n',  0xA8A5, 'ந', ['n'],                    'n',   'n',   'n'),
  C('p',  0xA8A6, 'ப', ['p'],                    'p',   'p',   'p'),
  C('ph', 0xA8A7, 'ப', ['ph'],                   'ph',  'ph',  'ph'),
  C('b',  0xA8A8, 'ப', ['b'],                    'b',   'b',   'b'),
  C('bh', 0xA8A9, 'ப', ['bh'],                   'bh',  'bh',  'bh'),
  C('m',  0xA8AA, 'ம', ['m'],                    'm',   'm',   'm'),
  C('y',  0xA8AB, 'ய', ['y'],                    'y',   'y',   'y'),
  C('r',  0xA8AC, 'ர', ['r'],                    'r',   'r',   'r'),
  C('l',  0xA8AD, 'ல', ['l'],                    'l',   'l',   'l'),
  C('v',  0xA8AE, 'வ', ['v', 'w'],               'v',   'v',   'v'),
  C('sh', 0xA8AF, 'ஶ', ['sh', 'ś'],              'sh',  'sh',  'ś'),
  C('Sh', 0xA8B0, 'ஷ', ['Sh', 'ṣ', 'shh', '.s'], 'sh',  'Sh',  'ṣ'),
  C('s',  0xA8B1, 'ஸ', ['s'],                    's',   's',   's'),
  C('h',  0xA8B2, 'ஹ', ['h'],                    'h',   'h',   'h'),
  C('L',  0xA8B3, 'ள', ['L', 'ḷ', '.l'],         'l',   'L',   'ḷ'),
];

// Anusvara, visarga, candrabindu. Tamil has no equivalents; approximations are used.
export const MARKS = [
  M('anusvara', 0xA880, 'ம்', ['M', 'ṃ', '.m'], 'm',  'M',  'ṃ'),
  M('visarga',  0xA881, 'ஃ',  ['H', 'ḥ', '.h'], 'h',  'H',  'ḥ'),
  M('candra',   0xA8C5, 'ம்', ['m~', 'ṁ'],      'm~', 'm~', 'ṁ'),
];

export const SA = {
  virama: cp(0xA8C4),
  haaru: cp(0xA8B4),          // CONSONANT SIGN HAARU: kept as-is, not mapped to other scripts
  danda: cp(0xA8CE),
  doubleDanda: cp(0xA8CF),
  digitBase: 0xA8D0,
};
export const TA = { pulli: '்' };

export const BY_ID = {
  vowel: Object.fromEntries(VOWELS.map((v) => [v.id, v])),
  cons: Object.fromEntries(CONSONANTS.map((c) => [c.id, c])),
  mark: Object.fromEntries(MARKS.map((m) => [m.id, m])),
};

// Lookup maps for parsing the two scripts.
export const SA_PARSE = {
  vowel: new Map(VOWELS.map((v) => [v.sa, v.id])),
  sign: new Map(VOWELS.filter((v) => v.sg).map((v) => [v.sg, v.id])),
  cons: new Map(CONSONANTS.map((c) => [c.sa, c.id])),
  mark: new Map(MARKS.map((m) => [m.sa, m.id])),
};

// Tamil letters are ambiguous (one letter covers k/kh/g/gh ...), so parsing picks a default.
export const TA_CONS_DEFAULT = {
  'க': 'k', 'ங': 'ng', 'ச': 'c', 'ஜ': 'j', 'ஞ': 'ny', 'ட': 'T', 'ண': 'N', 'த': 't', 'ந': 'n',
  'ன': 'n', 'ப': 'p', 'ம': 'm', 'ய': 'y', 'ர': 'r', 'ற': 'r', 'ல': 'l', 'ள': 'L', 'ழ': 'L',
  'வ': 'v', 'ஶ': 'sh', 'ஷ': 'Sh', 'ஸ': 's', 'ஹ': 'h',
};
export const TA_PARSE = {
  vowel: new Map(VOWELS.filter((v) => v.ta.length === 1).map((v) => [v.ta, v.id])),
  // single-character signs only (the Sanskrit r/l vowels have multi-character Tamil spellings)
  sign: new Map(VOWELS.filter((v) => v.ts.length === 1).map((v) => [v.ts, v.id])),
  cons: new Map(Object.entries(TA_CONS_DEFAULT)),
};
