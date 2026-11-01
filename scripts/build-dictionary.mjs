#!/usr/bin/env node
// Builds data/dictionary.json from data/dictionary.csv.
//   node scripts/build-dictionary.mjs           write the JSON
//   node scripts/build-dictionary.mjs --check   validate only, fail on errors (used by CI)
//
// CSV columns: latin,en,ta,pos,status,contributor,notes
//   latin        Saurashtra word in Latin letters, "precise" scheme (capital T D N L Sh = retroflex)
//   en, ta       meanings; separate several with ";"
//   pos          noun | verb | adjective | adverb | pronoun | numeral | phrase | other
//   status       draft | verified
// The Saurashtra-script form and the simple romanisation are generated here, never typed by hand.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { convert } from '../js/translit.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSV = join(root, 'data', 'dictionary.csv');
const OUT = join(root, 'data', 'dictionary.json');
const POS = new Set(['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'numeral', 'phrase', 'other']);
const STATUS = new Set(['draft', 'verified']);
const check = process.argv.includes('--check');

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, CRLF. */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

const list = (s) => s.split(';').map((x) => x.trim()).filter(Boolean);

export function buildEntries(csvText) {
  const [header, ...rows] = parseCsv(csvText);
  const cols = header.map((h) => h.trim());
  const errors = [];
  const entries = [];
  const seen = new Set();
  rows.forEach((cells, i) => {
    const line = i + 2;
    const r = Object.fromEntries(cols.map((c, j) => [c, (cells[j] ?? '').trim()]));
    const where = `dictionary.csv line ${line}${r.latin ? ` (${r.latin})` : ''}`;
    if (!r.latin) return errors.push(`${where}: "latin" is empty`);
    if (!/^[A-Za-z~^.À-ɏḀ-ỿ_]+$/.test(r.latin)) errors.push(`${where}: "latin" has unexpected characters`);
    if (!r.en && !r.ta) errors.push(`${where}: needs at least one meaning in "en" or "ta"`);
    if (!POS.has(r.pos)) errors.push(`${where}: pos "${r.pos}" must be one of ${[...POS].join(', ')}`);
    if (!STATUS.has(r.status)) errors.push(`${where}: status "${r.status}" must be draft or verified`);
    const key = `${r.latin}|${r.pos}`;
    if (seen.has(key)) errors.push(`${where}: duplicate of an earlier ${r.pos} entry`);
    seen.add(key);

    const sa = convert(r.latin, 'latin', 'saurashtra', { precise: true, digits: true });
    entries.push({
      id: entries.length + 1,
      sa,
      latin: r.latin,
      rom: convert(sa, 'saurashtra', 'latin', { style: 'simple' }),
      en: list(r.en),
      ta: list(r.ta),
      pos: r.pos,
      status: r.status,
      ...(r.contributor ? { contributor: r.contributor } : {}),
      ...(r.notes ? { notes: r.notes } : {}),
    });
  });
  entries.sort((a, b) => a.rom.localeCompare(b.rom));
  entries.forEach((e, i) => { e.id = i + 1; });
  return { entries, errors };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { entries, errors } = buildEntries(readFileSync(CSV, 'utf8'));
  if (errors.length) {
    console.error(`\n${errors.length} problem(s) in data/dictionary.csv:\n - ${errors.join('\n - ')}\n`);
    process.exit(1);
  }
  if (check) {
    console.log(`dictionary.csv OK: ${entries.length} entries`);
  } else {
    const payload = { generated: new Date().toISOString().slice(0, 10), count: entries.length, entries };
    writeFileSync(OUT, JSON.stringify(payload, null, 1) + '\n');
    console.log(`Wrote ${entries.length} entries to data/dictionary.json`);
  }
}
