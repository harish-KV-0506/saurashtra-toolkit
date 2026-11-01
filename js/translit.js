// Transliteration engine: Latin <-> Saurashtra <-> Tamil.
//
// Text is parsed into a neutral list of "items", then rendered into the target script:
//   { kind: 'cons',  c: <consonant id>, v: <vowel id> | 'a' (inherent) | null (virama) }
//   { kind: 'vowel', v: <vowel id> }               independent vowel
//   { kind: 'mark',  m: 'anusvara' | 'visarga' | 'candra' }
//   { kind: 'digit', d: '0'..'9' }   { kind: 'danda', n: 1 | 2 }   { kind: 'other', s: <text> }

import {
  VOWELS, CONSONANTS, MARKS, SA, TA, BY_ID, SA_PARSE, TA_PARSE,
} from './tables.js';

const DEFAULTS = { precise: false, digits: true, style: 'simple' };

/* ------------------------------------------------------------------ */
/* Script detection                                                    */
/* ------------------------------------------------------------------ */

export const isSaurashtra = (ch) => /[ꢀ-꣟]/.test(ch);
export const isTamil = (ch) => /[஀-௿]/.test(ch);

/** Returns 'saurashtra' | 'tamil' | 'latin' for the dominant script of `text`. */
export function detectScript(text) {
  let sa = 0, ta = 0, la = 0;
  for (const ch of text) {
    if (isSaurashtra(ch)) sa++;
    else if (isTamil(ch)) ta++;
    else if (/\p{L}/u.test(ch)) la++;
  }
  if (sa >= ta && sa >= la && sa > 0) return 'saurashtra';
  if (ta >= la && ta > 0) return 'tamil';
  return 'latin';
}

/* ------------------------------------------------------------------ */
/* Latin tokenizer                                                     */
/* ------------------------------------------------------------------ */

const indexCache = new Map();

/**
 * Token index for a Latin scheme. In non-precise mode input is lower-cased, so tokens that
 * contain capitals (T, N, Sh, ...) are unreachable and left out.
 */
function latinIndex(precise) {
  const key = precise ? 'precise' : 'simple';
  if (indexCache.has(key)) return indexCache.get(key);
  const map = new Map();
  let max = 1;
  const add = (tok, entry) => {
    if (!precise && tok !== tok.toLowerCase()) return;
    if (!map.has(tok)) map.set(tok, entry);
    max = Math.max(max, tok.length);
  };
  for (const v of VOWELS) v.tok.forEach((t) => add(t, { type: 'vowel', id: v.id }));
  for (const c of CONSONANTS) c.tok.forEach((t) => add(t, { type: 'cons', id: c.id }));
  for (const m of MARKS) m.tok.forEach((t) => add(t, { type: 'mark', id: m.id }));
  add('||', { type: 'danda', n: 2 });
  add('|', { type: 'danda', n: 1 });
  const index = { map, max };
  indexCache.set(key, index);
  return index;
}

function tokenizeLatin(str, index) {
  const out = [];
  let i = 0;
  while (i < str.length) {
    let hit = null;
    for (let len = Math.min(index.max, str.length - i); len > 0; len--) {
      const s = str.substr(i, len);
      const e = index.map.get(s);
      if (e) { hit = { ...e, text: s }; break; }
    }
    if (hit) { out.push(hit); i += hit.text.length; continue; }
    const ch = str[i];
    if (ch === '_') out.push({ type: 'break', text: ch });
    else if (ch >= '0' && ch <= '9') out.push({ type: 'digit', text: ch });
    else out.push({ type: 'other', text: ch });
    i++;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Parsers: text -> items                                              */
/* ------------------------------------------------------------------ */

export function parseLatin(text, opts = {}) {
  const { precise } = { ...DEFAULTS, ...opts };
  const norm = text.normalize('NFC');
  const toks = tokenizeLatin(precise ? norm : norm.toLowerCase(), latinIndex(!!precise));
  const items = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    switch (t.type) {
      case 'cons': {
        const next = toks[i + 1];
        if (next && next.type === 'vowel') { items.push({ kind: 'cons', c: t.id, v: next.id }); i++; }
        else items.push({ kind: 'cons', c: t.id, v: null }); // '_' or anything else closes the syllable
        break;
      }
      case 'vowel': items.push({ kind: 'vowel', v: t.id }); break;
      case 'mark': items.push({ kind: 'mark', m: t.id }); break;
      case 'digit': items.push({ kind: 'digit', d: t.text }); break;
      case 'danda': items.push({ kind: 'danda', n: t.n }); break;
      case 'break': break;
      default: items.push({ kind: 'other', s: t.text });
    }
  }
  return items;
}

export function parseSaurashtra(text) {
  const items = [];
  for (const ch of text.normalize('NFC')) {
    const last = items[items.length - 1];
    const cp = ch.codePointAt(0);
    if (SA_PARSE.cons.has(ch)) items.push({ kind: 'cons', c: SA_PARSE.cons.get(ch), v: 'a' });
    else if (SA_PARSE.vowel.has(ch)) items.push({ kind: 'vowel', v: SA_PARSE.vowel.get(ch) });
    else if (SA_PARSE.mark.has(ch)) items.push({ kind: 'mark', m: SA_PARSE.mark.get(ch) });
    else if (SA_PARSE.sign.has(ch)) {
      if (last && last.kind === 'cons' && last.v === 'a') last.v = SA_PARSE.sign.get(ch);
      else items.push({ kind: 'other', s: ch });
    } else if (ch === SA.virama) {
      if (last && last.kind === 'cons' && last.v === 'a') last.v = null;
      else items.push({ kind: 'other', s: ch });
    } else if (ch === SA.danda) items.push({ kind: 'danda', n: 1 });
    else if (ch === SA.doubleDanda) items.push({ kind: 'danda', n: 2 });
    else if (cp >= SA.digitBase && cp <= SA.digitBase + 9) items.push({ kind: 'digit', d: String(cp - SA.digitBase) });
    else items.push({ kind: 'other', s: ch });
  }
  return items;
}

export function parseTamil(text) {
  const items = [];
  for (const ch of text.normalize('NFC')) {
    const last = items[items.length - 1];
    const cp = ch.codePointAt(0);
    if (TA_PARSE.cons.has(ch)) items.push({ kind: 'cons', c: TA_PARSE.cons.get(ch), v: 'a' });
    else if (TA_PARSE.vowel.has(ch)) items.push({ kind: 'vowel', v: TA_PARSE.vowel.get(ch) });
    else if (TA_PARSE.sign.has(ch)) {
      if (last && last.kind === 'cons' && last.v === 'a') last.v = TA_PARSE.sign.get(ch);
      else items.push({ kind: 'other', s: ch });
    } else if (ch === TA.pulli) {
      if (last && last.kind === 'cons' && last.v === 'a') last.v = null;
      else items.push({ kind: 'other', s: ch });
    } else if (ch === 'ஃ') items.push({ kind: 'mark', m: 'visarga' });
    else if (cp >= 0x0BE6 && cp <= 0x0BEF) items.push({ kind: 'digit', d: String(cp - 0x0BE6) });
    else items.push({ kind: 'other', s: ch });
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* Renderers: items -> text                                            */
/* ------------------------------------------------------------------ */

export function renderSaurashtra(items, opts = {}) {
  const { digits } = { ...DEFAULTS, ...opts };
  let out = '';
  for (const it of items) {
    switch (it.kind) {
      case 'cons':
        out += BY_ID.cons[it.c].sa;
        if (it.v === null) out += SA.virama;
        else if (it.v !== 'a') out += BY_ID.vowel[it.v].sg;
        break;
      case 'vowel': out += BY_ID.vowel[it.v].sa; break;
      case 'mark': out += BY_ID.mark[it.m].sa; break;
      case 'digit': out += digits ? String.fromCodePoint(SA.digitBase + Number(it.d)) : it.d; break;
      case 'danda': out += it.n === 2 ? SA.doubleDanda : SA.danda; break;
      default: out += it.s;
    }
  }
  return out;
}

export function renderTamil(items) {
  let out = '';
  for (const it of items) {
    switch (it.kind) {
      case 'cons': {
        const base = BY_ID.cons[it.c].ta;
        if (it.v === 'a') out += base;
        else if (it.v === null) out += base + TA.pulli;
        else out += base + BY_ID.vowel[it.v].ts;
        break;
      }
      case 'vowel': out += BY_ID.vowel[it.v].ta; break;
      case 'mark': out += BY_ID.mark[it.m].ta; break;
      case 'digit': out += it.d; break;
      case 'danda': out += it.n === 2 ? '||' : '|'; break;
      default: out += it.s;
    }
  }
  return out;
}

/** True if writing `next` right after `prev` would be read back as a different token. */
function needsSeparator(prev, next, index) {
  const joined = prev + next;
  for (let len = Math.min(index.max, joined.length); len > 0; len--) {
    if (index.map.has(joined.substr(0, len))) return len !== prev.length;
  }
  return false;
}

/**
 * Latin output in one of three styles:
 *   simple  lowercase ASCII, retroflex not marked (lossy, easy to read and type)
 *   ascii   case-sensitive ASCII (T D N Sh L ...), reads back exactly in "precise" mode
 *   iso     scholarly diacritics (ā ṭ ṇ ś ṣ ...)
 * A "_" is inserted where adjacent letters would otherwise merge (k_h, ka_i).
 */
export function renderLatin(items, opts = {}) {
  const { style } = { ...DEFAULTS, ...opts };
  const index = latinIndex(style !== 'simple');
  const parts = []; // pieces of the output; consecutive 'tok' pieces get separator checks
  const tok = (s) => parts.push({ t: 'tok', s });
  const raw = (s) => parts.push({ t: 'raw', s });
  let prevItem = null;
  for (const it of items) {
    switch (it.kind) {
      case 'cons':
        tok(BY_ID.cons[it.c].out[style]);
        if (it.v === 'a') tok(BY_ID.vowel.a.out[style]);
        else if (it.v !== null) tok(BY_ID.vowel[it.v].out[style]);
        break;
      case 'vowel':
        // a bare consonant (virama) followed by an independent vowel would read back as consonant + vowel sign
        if (prevItem && prevItem.kind === 'cons' && prevItem.v === null) raw('_');
        tok(BY_ID.vowel[it.v].out[style]);
        break;
      case 'mark': tok(BY_ID.mark[it.m].out[style]); break;
      case 'digit': raw(it.d); break;
      case 'danda': raw(it.n === 2 ? '||' : '|'); break;
      default: raw(it.s);
    }
    prevItem = it;
  }
  let out = '';
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const prev = parts[i - 1];
    if (p.t === 'tok' && prev && prev.t === 'tok' && needsSeparator(prev.s, p.s, index)) out += '_';
    out += p.s;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

const PARSERS = { latin: parseLatin, saurashtra: parseSaurashtra, tamil: parseTamil };
const RENDERERS = { latin: renderLatin, saurashtra: renderSaurashtra, tamil: renderTamil };

export const SCRIPTS = ['latin', 'saurashtra', 'tamil'];

/** Honest notes about what a conversion cannot preserve. */
export function warningsFor(from, to) {
  const w = [];
  if (to === 'tamil' && from !== 'tamil') {
    w.push('Tamil script has no separate letters for aspirated or voiced sounds, so k / kh / g / gh all become க, t / th / d / dh become த, and so on. Tamil has no anusvara or candrabindu either (both become ம்).');
  }
  if (from === 'tamil' && to !== 'tamil') {
    w.push('One Tamil letter stands for several Saurashtra sounds, so the most common reading is chosen (க → ka, ச → ca, ட → ṭa, த → ta, ப → pa). Check the result and correct aspirated or voiced letters by hand.');
  }
  if (to === 'latin' && from === 'saurashtra') {
    w.push('Haaru (ꢴ) has no Latin spelling and is left unchanged.');
  }
  return w;
}

/**
 * Convert `text` between 'latin', 'saurashtra' and 'tamil'.
 * opts: precise (capitals mean retroflex, Latin input only), digits (use Saurashtra digits),
 *       style ('simple' | 'ascii' | 'iso', Latin output only).
 */
export function convertDetailed(text, from, to, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  if (!PARSERS[from] || !RENDERERS[to]) throw new Error(`Unsupported conversion ${from} -> ${to}`);
  const out = from === to ? text : RENDERERS[to](PARSERS[from](text, o), o);
  return { text: out, warnings: warningsFor(from, to) };
}

export const convert = (text, from, to, opts) => convertDetailed(text, from, to, opts).text;
