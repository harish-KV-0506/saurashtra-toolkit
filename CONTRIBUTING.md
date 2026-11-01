# Contributing

The most valuable contribution is **words**. You do not need to code.

## Add or fix dictionary words
1. Open [`data/dictionary.csv`](data/dictionary.csv) on GitHub and click the pencil icon (or use the "Suggest a word" issue form on the site).
2. Add a row. Columns: `latin,en,ta,pos,status,contributor,notes`
   - `latin`: the Saurashtra word in Latin letters. Capitals are retroflex (`T D N L Sh`), `aa ii uu ee oo` are long vowels. The Saurashtra script is generated automatically. See the About tab for the full typing guide.
   - `en`, `ta`: meanings. Separate several with `;`.
   - `pos`: `noun`, `verb`, `adjective`, `adverb`, `pronoun`, `numeral`, `phrase` or `other`.
   - `status`: `draft` if you are unsure, `verified` once a Saurashtra speaker has confirmed it.
3. Run `npm run build:data` and commit the updated `data/dictionary.json` too (CI checks they match).

The 16 starter entries are all `draft` placeholders and need to be checked by speakers.

## Code
```
npm start         # local site at http://localhost:8080
npm test          # engine, dictionary and CSV tests
npm run build     # builds dist/ exactly as the deploy does
```
No dependencies are needed. Changes to `js/tables.js` or `js/translit.js` must keep the round-trip tests in `tests/` passing.
