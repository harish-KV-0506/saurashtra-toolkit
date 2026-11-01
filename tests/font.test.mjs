import test from 'node:test';
import assert from 'node:assert/strict';
import { pickFontUrl } from '../scripts/fetch-font.mjs';

test('pickFontUrl chooses the block covering the Saurashtra range', () => {
  const css = `/* latin */\n@font-face { src: url(https://fonts.gstatic.com/a-latin.woff2) format('woff2'); unicode-range: U+0000-00FF; }\n/* saurashtra */\n@font-face { src: url(https://fonts.gstatic.com/b-saur.woff2) format('woff2'); unicode-range: U+A880-A8DF; }`;
  assert.equal(pickFontUrl(css), 'https://fonts.gstatic.com/b-saur.woff2');
  assert.equal(pickFontUrl('nothing here'), null);
});
