import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { skeleton, buildIndex, search, lookup } from '../js/dict.js';
import { buildEntries, parseCsv } from '../scripts/build-dictionary.mjs';
import { convert } from '../js/translit.js';

const csv = readFileSync(new URL('../data/dictionary.csv', import.meta.url), 'utf8');
const { entries, errors } = buildEntries(csv);
const index = buildIndex({ entries });

test('the shipped dictionary.csv has no validation errors', () => {
  assert.deepEqual(errors, []);
  assert.ok(entries.length >= 10);
});

test('the committed dictionary.json is up to date with the CSV', () => {
  const json = JSON.parse(readFileSync(new URL('../data/dictionary.json', import.meta.url), 'utf8'));
  assert.deepEqual(json.entries, entries, 'run `npm run build:data` and commit data/dictionary.json');
});

test('CSV parser handles quotes, commas and CRLF', () => {
  const rows = parseCsv('a,b\r\n"x, y","say ""hi"""\r\n');
  assert.deepEqual(rows, [['a', 'b'], ['x, y', 'say "hi"']]);
});

test('validation catches bad rows', () => {
  const bad = 'latin,en,ta,pos,status,contributor,notes\n,water,,noun,draft,,\npaani,water,,thing,draft,,\npaani,water,,noun,maybe,,\n';
  assert.equal(buildEntries(bad).errors.length, 3);
  const dup = 'latin,en,ta,pos,status\npaani,water,,noun,draft\npaani,water,,noun,draft\n';
  assert.match(buildEntries(dup).errors[0], /duplicate/);
});

test('every entry has script text that converts back to its romanisation', () => {
  for (const e of entries) {
    assert.match(e.sa, /^[ꢀ-꣟]+$/);
    assert.equal(convert(e.sa, 'saurashtra', 'latin'), e.rom);
  }
});

test('skeleton ignores length, aspiration, diacritics and doubling', () => {
  assert.equal(skeleton('Paani'), 'pani');
  assert.equal(skeleton('pāṇī'), 'pani');
  assert.equal(skeleton('bhaat'), 'bat');
  assert.equal(skeleton('chhatri'), 'catri');
  assert.equal(skeleton('kk'), 'k');
});

test('search finds Saurashtra words typed loosely in Latin', () => {
  const r = search(index, 'pani');
  assert.equal(r[0].entry.latin, 'paani');
  assert.equal(search(index, 'PAANI')[0].entry.latin, 'paani');
});

test('search accepts Saurashtra script, Tamil and English', () => {
  const paani = entries.find((e) => e.latin === 'paani');
  assert.equal(search(index, paani.sa)[0].entry.latin, 'paani');
  assert.equal(search(index, 'தண்ணீர்')[0].entry.latin, 'paani');
  assert.equal(search(index, 'water')[0].entry.latin, 'paani');
  assert.equal(search(index, 'wat')[0].entry.latin, 'paani');
});

test('lookup respects direction', () => {
  assert.equal(lookup(index, 'வீடு', 'ta-sa')[0].entry.latin, 'ghar');
  assert.equal(lookup(index, 'house', 'ta-sa')[0].entry.latin, 'ghar');
  assert.equal(lookup(index, 'ghar', 'sa-ta')[0].entry.ta[0], 'வீடு');
  assert.equal(lookup(index, 'வீடு', 'sa-ta').length, 0, 'Tamil text is not searched as a Saurashtra word');
  assert.equal(lookup(index, 'zzzz', 'ta-sa').length, 0);
});

test('filters by part of speech and status', () => {
  assert.ok(search(index, '', { pos: 'phrase' }).every((r) => r.entry.pos === 'phrase'));
  assert.equal(search(index, '', { status: 'verified' }).length, entries.filter((e) => e.status === 'verified').length);
});
