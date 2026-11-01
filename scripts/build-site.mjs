#!/usr/bin/env node
// Copies only the files the website needs into dist/ and stamps the service worker with a build id.
// GitHub Pages publishes dist/. Run `npm run build`, then open dist/ through any static server.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const build = (process.env.GITHUB_SHA || String(Date.now())).slice(0, 12);

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

for (const p of ['index.html', 'manifest.webmanifest', 'css', 'js', 'icons', 'fonts']) {
  if (existsSync(join(root, p))) cpSync(join(root, p), join(dist, p), { recursive: true });
}
mkdirSync(join(dist, 'data'), { recursive: true });
cpSync(join(root, 'data', 'dictionary.json'), join(dist, 'data', 'dictionary.json'));
cpSync(join(root, 'data', 'dictionary.csv'), join(dist, 'data', 'dictionary.csv')); // people can download the raw list

writeFileSync(join(dist, 'sw.js'), readFileSync(join(root, 'sw.js'), 'utf8').replace('__BUILD__', build));
writeFileSync(join(dist, '.nojekyll'), '');
console.log(`Built site into dist/ (build ${build})`);
