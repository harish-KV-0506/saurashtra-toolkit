import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convert, convertDetailed, detectScript, parseLatin, parseSaurashtra, parseTamil,
  renderSaurashtra, renderLatin, renderTamil,
} from '../js/translit.js';
import { VOWELS, CONSONANTS, MARKS } from '../js/tables.js';

const u = (...cps) => String.fromCodePoint(...cps);
const toSa = (s, o) => convert(s, 'latin', 'saurashtra', o);

/* ---------- Unicode code points (checked against the Saurashtra block chart) ---------- */

test('letters map to the right Saurashtra code points', () => {
  assert.equal(toSa('ka'), u(0xA892));
  assert.equal(toSa('kha'), u(0xA893));
  assert.equal(toSa('a'), u(0xA882));
  assert.equal(toSa('ai'), u(0xA88E));
  assert.equal(toSa('au'), u(0xA891));
  assert.equal(toSa('ha'), u(0xA8B2));
  assert.equal(toSa('sha'), u(0xA8AF));
  assert.equal(toSa('sa'), u(0xA8B1));
});

test('vowel signs attach after the consonant', () => {
  assert.equal(toSa('kaa'), u(0xA892, 0xA8B5));
  assert.equal(toSa('ki'), u(0xA892, 0xA8B6));
  assert.equal(toSa('kai'), u(0xA892, 0xA8C0));
  assert.equal(toSa('kau'), u(0xA892, 0xA8C3));
  assert.equal(toSa('koo'), u(0xA892, 0xA8C2));
});

test('a consonant without a vowel takes a virama', () => {
  assert.equal(toSa('k'), u(0xA892, 0xA8C4));
  assert.equal(toSa('kta'), u(0xA892, 0xA8C4, 0xA8A1));
  assert.equal(toSa('ram'), u(0xA8AC, 0xA8AA, 0xA8C4));
});

test('underscore breaks a syllable', () => {
  assert.equal(toSa('k_a'), u(0xA892, 0xA8C4, 0xA882));   // k + virama, then independent A
  assert.equal(toSa('ka_i'), u(0xA892, 0xA884));          // ka, then independent I
  assert.equal(toSa('k_ha'), u(0xA892, 0xA8C4, 0xA8B2));  // k + ha, not kha
});

test('marks, digits and dandas', () => {
  assert.equal(toSa('kaH', { precise: true }), u(0xA892, 0xA881));
  assert.equal(toSa('kaH'), u(0xA892, 0xA8B2, 0xA8C4), 'simple mode lower-cases, so H is just ha');
  assert.equal(toSa('kaM', { precise: true }), u(0xA892, 0xA880));
  assert.equal(toSa('ka.h'), u(0xA892, 0xA881));
  assert.equal(toSa('ka.m'), u(0xA892, 0xA880));
  assert.equal(toSa('kam~'), u(0xA892, 0xA8C5));
  assert.equal(toSa('2024'), u(0xA8D2, 0xA8D0, 0xA8D2, 0xA8D4));
  assert.equal(toSa('2024', { digits: false }), '2024');
  assert.equal(toSa('ka|'), u(0xA892, 0xA8CE));
  assert.equal(toSa('ka||'), u(0xA892, 0xA8CF));
});

test('precise mode: capitals are retroflex, simple mode ignores case', () => {
  assert.equal(toSa('Ta', { precise: true }), u(0xA89C));
  assert.equal(toSa('ta', { precise: true }), u(0xA8A1));
  assert.equal(toSa('Ta'), u(0xA8A1));
  assert.equal(toSa('N^a', { precise: true }), u(0xA896));
  assert.equal(toSa('Sha', { precise: true }), u(0xA8B0));
  assert.equal(toSa('La', { precise: true }), u(0xA8B3));
  assert.equal(toSa('kA', { precise: true }), u(0xA892, 0xA8B5));
  assert.equal(toSa('KAA'), u(0xA892, 0xA8B5), 'simple mode lower-cases everything');
});

test('diacritic input works in both modes', () => {
  assert.equal(toSa('ṭa'), u(0xA89C));
  assert.equal(toSa('ṭā'), u(0xA89C, 0xA8B5));
  assert.equal(toSa('śa'), u(0xA8AF));
  assert.equal(toSa('ṣa'), u(0xA8B0));
  assert.equal(toSa('ñ'.concat('a')), u(0xA89B));
  assert.equal(toSa('Ṭa'), u(0xA89C), 'upper-case diacritic letters fold to lower case');
});

test('longest match wins: kh, ch, chh, sh', () => {
  assert.equal(toSa('kha'), u(0xA893));
  assert.equal(toSa('chha'), u(0xA898));
  assert.equal(toSa('cha'), u(0xA897));
  assert.equal(toSa('shha'), u(0xA8B0));
});

test('unknown characters and spaces pass through', () => {
  assert.equal(toSa('ka, ki!'), u(0xA892) + ', ' + u(0xA892, 0xA8B6) + '!');
  assert.equal(toSa(''), '');
});

/* ---------- Saurashtra -> Latin ---------- */

test('Saurashtra to simple Latin', () => {
  assert.equal(convert(u(0xA892, 0xA8B5), 'saurashtra', 'latin'), 'kaa');
  assert.equal(convert(u(0xA892, 0xA8C4), 'saurashtra', 'latin'), 'k');
  assert.equal(convert(u(0xA89C), 'saurashtra', 'latin'), 'ta');
});

test('Saurashtra to ascii and iso keep retroflex', () => {
  assert.equal(convert(u(0xA89C, 0xA8B5), 'saurashtra', 'latin', { style: 'ascii' }), 'Taa');
  assert.equal(convert(u(0xA89C, 0xA8B5), 'saurashtra', 'latin', { style: 'iso' }), 'ṭā');
});

test('ambiguous neighbours get a separator', () => {
  // k + virama + ha must not read back as kha
  assert.equal(convert(u(0xA892, 0xA8C4, 0xA8B2), 'saurashtra', 'latin'), 'k_ha');
  // ka followed by independent AI must not read back as kai
  assert.equal(convert(u(0xA892, 0xA88E), 'saurashtra', 'latin'), 'ka_ai');
  // s + virama + ha
  assert.equal(convert(u(0xA8B1, 0xA8C4, 0xA8B2), 'saurashtra', 'latin'), 's_ha');
});

test('digits and dandas convert back', () => {
  assert.equal(convert(u(0xA8D1, 0xA8D2), 'saurashtra', 'latin'), '12');
  assert.equal(convert(u(0xA8CE, 0xA8CF), 'saurashtra', 'latin'), '|||');
});

test('haaru has no mapping and is preserved', () => {
  const haaru = u(0xA8B4);
  assert.equal(convert(u(0xA892, haaru.codePointAt(0)), 'saurashtra', 'latin'), 'ka' + haaru);
  assert.ok(convertDetailed('x', 'saurashtra', 'latin').warnings.length > 0);
});

/* ---------- Tamil ---------- */

test('Tamil to Saurashtra', () => {
  assert.equal(convert('கா', 'tamil', 'saurashtra'), u(0xA892, 0xA8B5));
  assert.equal(convert('க்', 'tamil', 'saurashtra'), u(0xA892, 0xA8C4));
  assert.equal(convert('கொ', 'tamil', 'saurashtra'), u(0xA892, 0xA8C1));
  assert.equal(convert('கொ', 'tamil', 'saurashtra'), u(0xA892, 0xA8C1), 'decomposed o is normalised');
  assert.equal(convert('வணக்கம்', 'tamil', 'latin'), 'vanakkam');
  assert.equal(convert('௨௦', 'tamil', 'saurashtra'), u(0xA8D2, 0xA8D0));
});

test('Saurashtra to Tamil collapses aspirates and voicing, with a warning', () => {
  const r = convertDetailed(u(0xA893, 0xA8B5), 'saurashtra', 'tamil');
  assert.equal(r.text, 'கா');
  assert.ok(r.warnings.length > 0);
  assert.equal(convert(u(0xA8AF), 'saurashtra', 'tamil'), 'ஶ');
  assert.equal(convert(u(0xA892, 0xA8C4), 'saurashtra', 'tamil'), 'க்');
  assert.equal(convert(u(0xA892, 0xA8C1), 'saurashtra', 'tamil'), 'கொ');
});

test('Latin to Tamil', () => {
  assert.equal(convert('vanakkam', 'latin', 'tamil'), 'வநக்கம்');
  assert.equal(convert('nanri', 'latin', 'tamil'), 'நந்ரி');
});

test('Sanskrit vocalic r in Tamil output', () => {
  assert.equal(convert('kR^i', 'latin', 'tamil', { precise: true }), 'க்ரு');
});

/* ---------- Script detection ---------- */

test('detectScript', () => {
  assert.equal(detectScript('kaiso'), 'latin');
  assert.equal(detectScript(u(0xA892, 0xA8B5)), 'saurashtra');
  assert.equal(detectScript('வணக்கம்'), 'tamil');
  assert.equal(detectScript('123'), 'latin');
});

/* ---------- Property tests: random text must survive a round trip ---------- */

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

function randomItems(r, { tamilSafe = false } = {}) {
  const consonants = tamilSafe
    ? CONSONANTS.filter((c) => ['k', 'ng', 'c', 'j', 'ny', 'T', 'N', 't', 'n', 'p', 'm', 'y', 'r', 'l', 'L', 'v', 'sh', 'Sh', 's', 'h'].includes(c.id))
    : CONSONANTS;
  const vowels = tamilSafe ? VOWELS.filter((v) => !['rr', 'rrr', 'll', 'lll'].includes(v.id)) : VOWELS;
  const items = [];
  const n = 1 + Math.floor(r() * 12);
  for (let i = 0; i < n; i++) {
    const roll = r();
    if (roll < 0.62) {
      const c = pick(r, consonants).id;
      const vRoll = r();
      const v = vRoll < 0.2 ? null : vRoll < 0.5 ? 'a' : pick(r, vowels).id;
      items.push({ kind: 'cons', c, v });
    } else if (roll < 0.82) items.push({ kind: 'vowel', v: pick(r, vowels).id });
    else if (roll < 0.9 && !tamilSafe) items.push({ kind: 'mark', m: pick(r, MARKS).id });
    else if (roll < 0.95) items.push({ kind: 'digit', d: String(Math.floor(r() * 10)) });
    else items.push({ kind: 'other', s: ' ' });
  }
  return items;
}

// Items with the same neighbours collapse when parsed (e.g. cons v:null before a vowel item is
// read back the same way), so compare after one normalising pass.
const norm = (items) => JSON.stringify(items);

test('property: Saurashtra text round-trips through items', () => {
  const r = rng(1234);
  for (let i = 0; i < 2000; i++) {
    const items = randomItems(r);
    const text = renderSaurashtra(items);
    assert.equal(norm(parseSaurashtra(text)), norm(items), `text ${[...text].map((c) => c.codePointAt(0).toString(16))}`);
  }
});

test('property: ascii and iso Latin read back exactly in precise mode', () => {
  const r = rng(99);
  for (const style of ['ascii', 'iso']) {
    for (let i = 0; i < 2000; i++) {
      const items = randomItems(r);
      const latin = renderLatin(items, { style });
      assert.equal(norm(parseLatin(latin, { precise: true })), norm(items), `${style}: ${latin}`);
    }
  }
});

test('property: Tamil-safe text round-trips Tamil -> Saurashtra -> Tamil', () => {
  const r = rng(7);
  for (let i = 0; i < 1500; i++) {
    const items = randomItems(r, { tamilSafe: true });
    const tamil = renderTamil(items);
    const back = renderTamil(parseSaurashtra(convert(tamil, 'tamil', 'saurashtra')));
    assert.equal(back, tamil);
  }
});

test('property: simple Latin output never throws and keeps script round trip for the unambiguous subset', () => {
  const r = rng(5);
  for (let i = 0; i < 1000; i++) {
    const items = randomItems(r);
    assert.doesNotThrow(() => renderLatin(items, { style: 'simple' }));
  }
});
