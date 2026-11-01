# Saurashtra Toolkit

A free, open-source website for the Saurashtra language. It runs entirely in the browser, works offline as an installable app (PWA), and needs no server.

- **Type**: phonetic typing (`kaiso` becomes Saurashtra script as you type) plus an on-screen keyboard
- **Convert**: Latin ↔ Saurashtra script ↔ Tamil script, with notes about what each conversion loses
- **Dictionary**: searchable by Saurashtra (script or loose Latin spelling), Tamil or English
- **Lookup**: simple Tamil ↔ Saurashtra word lookup

## Run it locally
```
npm start
```
Open http://localhost:8080. (Use http, not a double-clicked file, because ES modules and the service worker need it.)

## Publish on GitHub Pages
1. Create a new GitHub repository (for example `saurashtra-toolkit`) and push this folder to the `main` branch.
2. In the repository go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push again (or run the workflow from the Actions tab). The site appears at `https://YOUR-USERNAME.github.io/saurashtra-toolkit/`.

The "Suggest a word" and "Report" links find your repository address automatically on GitHub Pages. For any other host, edit `FALLBACK_REPO` in `js/config.js`.

## How it works
```
index.html, css/, js/     the website (plain ES modules, no build step needed to run)
js/tables.js              every letter, once: Saurashtra, Tamil, Latin spellings
js/translit.js            parse text to a neutral form, render it in another script
js/dict.js                dictionary search (loose phonetic matching)
js/ime.js                 phonetic typing inside a text box
data/dictionary.csv       the word list people edit
scripts/                  CSV validation and build, dev server, font fetch, site build
tests/                    node --test
```
Unicode block: Saurashtra U+A880–U+A8DF. Convert tab limits: Tamil has no aspirated or voiced letters, so converting to Tamil loses detail; converting from Tamil picks the most common reading.

## Data status
The 16 starter dictionary entries are **unverified placeholders** (marked *Draft* in the app). They must be replaced or confirmed by Saurashtra speakers before the dictionary is presented as reliable. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence
Code: MIT. Dictionary data: CC BY-SA 4.0 (see `DATA-LICENSE.md`).
