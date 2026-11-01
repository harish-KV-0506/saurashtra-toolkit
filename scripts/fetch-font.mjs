#!/usr/bin/env node
// Downloads Noto Sans Saurashtra (SIL Open Font License) from Google Fonts into fonts/ so the
// deployed site serves the font itself instead of depending on Google at runtime.
// The CI workflow runs this before deploying and carries on if it fails (the page also loads the
// font from Google Fonts directly, so nothing breaks). Run it by hand any time: `node scripts/fetch-font.mjs`

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSS_URL = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Saurashtra&display=swap';
// A modern user agent makes Google return woff2 files.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/** Picks the woff2 URL of the @font-face block that covers the Saurashtra range (U+A880). */
export function pickFontUrl(css) {
  // Google writes "/* subset-name */ @font-face { ... }", so each comment belongs to the block after it.
  const blocks = [...css.matchAll(/(?:\/\*\s*([\w-]+)\s*\*\/\s*)?@font-face\s*\{([^}]*)\}/g)]
    .map((m) => ({ name: m[1] || '', body: m[2] }));
  const block = blocks.find((b) => /unicode-range:[^;]*U\+A88/i.test(b.body) || b.name === 'saurashtra') || blocks[0];
  const m = block && block.body.match(/url\((https:[^)]+)\)/);
  return m ? m[1] : null;
}

async function main() {
  const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text();
  const url = pickFontUrl(css);
  if (!url) throw new Error('No font URL found in the Google Fonts response');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font download failed (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(join(root, 'fonts'), { recursive: true });
  writeFileSync(join(root, 'fonts', 'NotoSansSaurashtra.woff2'), buf);
  console.log(`Saved fonts/NotoSansSaurashtra.woff2 (${buf.length} bytes)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => { console.error(`fetch-font: ${err.message}`); process.exit(1); });
}
