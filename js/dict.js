// Dictionary loading and search. Pure functions (no DOM) so they can be tested in Node.

import { convert, detectScript } from './translit.js';

/**
 * Loose phonetic key for matching typed Latin: drops diacritics, doubled letters, aspiration
 * and the k/kh, t/th ... distinctions people rarely type consistently.
 *   "Paani" -> "pani"   "bhaat" -> "bat"   "ṭhāl" -> "tal"
 */
export function skeleton(input) {
  let t = String(input).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  t = t.replace(/[^a-z0-9 ]+/g, '');
  t = t.replace(/([kgcjtdpb])h+/g, '$1').replace(/sh+/g, 's');
  t = t.replace(/w/g, 'v');
  t = t.replace(/([aeiou])\1+/g, '$1');
  t = t.replace(/([b-df-hj-np-tv-z])\1+/g, '$1');
  return t.replace(/\s+/g, ' ').trim();
}

const norm = (s) => String(s).normalize('NFC').toLowerCase().trim();

/** Prepare raw JSON entries for searching. */
export function buildIndex(raw) {
  const entries = (raw.entries || raw).map((e) => ({
    ...e,
    en: e.en || [],
    ta: e.ta || [],
    _sk: skeleton(e.rom || ''),
    _en: (e.en || []).map(norm),
    _ta: (e.ta || []).map(norm),
  }));
  return { entries, updated: raw.generated || null };
}

export async function loadDictionary(url = 'data/dictionary.json') {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Could not load dictionary (${res.status})`);
  return buildIndex(await res.json());
}

function scoreText(haystacks, q, exact = 100, prefix = 70, within = 40) {
  let best = 0;
  for (const h of haystacks) {
    if (!h) continue;
    if (h === q) return exact;
    if (h.startsWith(q)) best = Math.max(best, prefix);
    else if (h.split(/[\s,;/()-]+/).some((w) => w === q)) best = Math.max(best, prefix - 10);
    else if (h.includes(q)) best = Math.max(best, within);
  }
  return best;
}

/**
 * Search the dictionary.
 *   query: Saurashtra script, Latin, Tamil script or English
 *   fields: which sides to match - 'sa' (Saurashtra word), 'ta' (Tamil gloss), 'en' (English gloss)
 */
export function search(index, query, { fields = ['sa', 'ta', 'en'], pos = '', status = '', limit = 200 } = {}) {
  const q0 = String(query || '').trim();
  const filter = (e) => (!pos || e.pos === pos) && (!status || e.status === status);
  if (!q0) {
    return index.entries.filter(filter).slice(0, limit).map((entry) => ({ entry, score: 0, via: '' }));
  }
  const script = detectScript(q0);
  const out = [];
  for (const entry of index.entries) {
    if (!filter(entry)) continue;
    let score = 0;
    let via = '';
    const take = (s, v) => { if (s > score) { score = s; via = v; } };

    if (script === 'saurashtra' && fields.includes('sa')) {
      const qsk = skeleton(convert(q0, 'saurashtra', 'latin'));
      if (qsk) take(scoreText([entry._sk], qsk), 'sa');
    } else if (script === 'tamil') {
      const q = norm(q0);
      if (fields.includes('ta')) take(scoreText(entry._ta, q), 'ta');
    } else {
      const q = norm(q0);
      if (fields.includes('sa')) {
        const qsk = skeleton(q0);
        if (qsk) take(scoreText([entry._sk], qsk), 'sa');
      }
      if (fields.includes('en')) take(scoreText(entry._en, q, 90, 60, 30), 'en');
    }
    if (score > 0) out.push({ entry, score, via });
  }
  out.sort((a, b) => b.score - a.score || a.entry.rom.localeCompare(b.entry.rom));
  return out.slice(0, limit);
}

/** Word lookup. direction: 'ta-sa' (Tamil or English in, Saurashtra out) or 'sa-ta'. */
export function lookup(index, query, direction) {
  const fields = direction === 'sa-ta' ? ['sa'] : ['ta', 'en'];
  return search(index, query, { fields, limit: 20 });
}

export function distinct(index, key) {
  return [...new Set(index.entries.map((e) => e[key]).filter(Boolean))].sort();
}
