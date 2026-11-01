import { VOWELS, CONSONANTS, MARKS, SA } from './tables.js';
import { convert, convertDetailed, detectScript } from './translit.js';
import { loadDictionary, search, lookup, distinct } from './dict.js';
import { attachPhonetic, insertAtCaret, backspace } from './ime.js';
import { repoUrl, issueUrl } from './config.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const store = {
  get(k, d = '') { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage can be blocked */ } },
};

/* ---------- small helpers ---------- */

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

async function copyText(text) {
  if (!text) return toast('Nothing to copy yet');
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch { return toast('Copy failed. Select the text and copy it by hand.'); }
    ta.remove();
  }
  toast('Copied');
}

function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  kids.flat().forEach((c) => c != null && node.append(c));
  return node;
}

/* ---------- theme ---------- */

function initTheme() {
  const root = document.documentElement;
  $('#theme-btn').addEventListener('click', () => {
    const dark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    store.set('sk-theme', root.dataset.theme);
  });
}

/* ---------- tabs ---------- */

const TABS = ['type', 'convert', 'dict', 'lookup', 'about'];

function initTabs() {
  const show = (name, focus = false) => {
    if (!TABS.includes(name)) name = 'type';
    TABS.forEach((t) => {
      const on = t === name;
      const tab = $(`#tab-${t}`);
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      $(`#panel-${t}`).hidden = !on;
      if (on && focus) tab.focus();
    });
    if (location.hash !== `#${name}`) history.replaceState(null, '', `#${name}`);
  };
  $$('.tabs [role=tab]').forEach((tab) => {
    tab.addEventListener('click', () => show(tab.dataset.tab));
    tab.addEventListener('keydown', (e) => {
      const i = TABS.indexOf(tab.dataset.tab);
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      show(TABS[(next + TABS.length) % TABS.length], true);
    });
  });
  addEventListener('hashchange', () => show(location.hash.slice(1)));
  show(location.hash.slice(1));
  return show;
}

/* ---------- keyboard + type tab ---------- */

function buildKeyboard(textarea, ime, getStyle) {
  const kb = $('#keyboard');
  const key = (glyph, hint, label, cls = '') => el('button', {
    type: 'button', class: `key ${cls}`, 'aria-label': label, title: label,
    onclick: () => { ime.reset(); insertAtCaret(textarea, glyph); },
  }, el('span', { class: 'glyph script', lang: 'saz', text: cls.includes('sign') ? `◌${glyph}` : glyph }),
  el('span', { class: 'kh', text: hint }));

  const group = (title, keys) => kb.append(el('div', { class: 'kgroup' },
    el('h3', { text: title }), el('div', { class: 'kgrid' }, keys)));

  group('Vowels', VOWELS.map((v) => key(v.sa, v.out.ascii, `Vowel ${v.out.iso}`)));
  group('Vowel signs (after a consonant)', VOWELS.filter((v) => v.sg).map((v) => key(v.sg, v.out.ascii, `Vowel sign ${v.out.iso}`, 'sign')));
  group('Consonants', CONSONANTS.map((c) => key(c.sa, c.out.ascii, `${c.out.iso}a`)));
  group('Signs and punctuation', [
    ...MARKS.map((m) => key(m.sa, m.out.ascii, m.id)),
    key(SA.virama, '_', 'Virama (removes the vowel)', 'sign'),
    key(SA.haaru, '', 'Consonant sign haaru', 'sign'),
    key(SA.danda, '|', 'Danda'),
    key(SA.doubleDanda, '||', 'Double danda'),
  ]);
  group('Digits', Array.from({ length: 10 }, (_, i) => key(String.fromCodePoint(SA.digitBase + i), String(i), `Digit ${i}`)));
}

function initType() {
  const out = $('#type-out');
  const optPhonetic = $('#opt-phonetic');
  const optPrecise = $('#opt-precise');
  const optDigits = $('#opt-digits');
  const options = () => ({ enabled: optPhonetic.checked, precise: optPrecise.checked, digits: optDigits.checked });

  out.value = store.get('sk-draft');
  for (const [box, key, dflt] of [[optPhonetic, 'sk-phon', '1'], [optPrecise, 'sk-prec', '1'], [optDigits, 'sk-dig', '1']]) {
    box.checked = store.get(key, dflt) === '1';
    box.addEventListener('change', () => { store.set(key, box.checked ? '1' : '0'); updateHint(); });
  }

  const ime = attachPhonetic(out, options, () => store.set('sk-draft', out.value));
  out.addEventListener('input', () => store.set('sk-draft', out.value));
  buildKeyboard(out, ime);

  function updateHint() {
    const o = options();
    const ex = convert('kaiso', 'latin', 'saurashtra', o);
    $('#type-hint').textContent = o.enabled
      ? `Type “kaiso” to get ${ex}. Backspace removes one Latin letter at a time. Use _ to keep letters apart (k_ha).`
      : 'Phonetic typing is off. Use the on-screen keyboard below, or paste Saurashtra text.';
  }
  updateHint();

  $('#btn-copy-type').addEventListener('click', () => copyText(out.value));
  $('#btn-clear-type').addEventListener('click', () => { out.value = ''; store.set('sk-draft', ''); ime.reset(); out.focus(); });
  $('#btn-bksp').addEventListener('click', () => { ime.reset(); backspace(out); });
}

/* ---------- convert tab ---------- */

const SCRIPT_NAME = { latin: 'Latin letters', saurashtra: 'Saurashtra script', tamil: 'Tamil script' };

function initConvert() {
  const from = $('#cv-from'), to = $('#cv-to'), input = $('#cv-in'), output = $('#cv-out');
  const precise = $('#cv-precise'), digits = $('#cv-digits'), style = $('#cv-style');

  function run() {
    const f = from.value, t = to.value;
    $('#wrap-precise').hidden = f !== 'latin';
    $('#wrap-style').hidden = t !== 'latin';
    $('#wrap-digits').hidden = t !== 'saurashtra';
    output.lang = t === 'saurashtra' ? 'saz' : t === 'tamil' ? 'ta' : 'en';
    output.classList.toggle('script', t === 'saurashtra');
    input.classList.toggle('script', f === 'saurashtra');
    input.lang = f === 'saurashtra' ? 'saz' : f === 'tamil' ? 'ta' : 'en';

    const { text, warnings } = convertDetailed(input.value, f, t, {
      precise: precise.checked, digits: digits.checked, style: style.value,
    });
    output.value = text;

    const notes = $('#cv-notes');
    notes.replaceChildren(...(input.value ? warnings : []).map((w) => el('li', { text: w })));

    const seen = input.value.trim() ? detectScript(input.value) : f;
    const hint = $('#cv-detect');
    if (seen !== f) {
      hint.hidden = false;
      hint.replaceChildren(`This looks like ${SCRIPT_NAME[seen]}. `, el('button', {
        class: 'linkish', type: 'button',
        onclick: () => { from.value = seen; if (to.value === seen) to.value = f; run(); },
      }, `Convert from ${SCRIPT_NAME[seen]}`));
    } else hint.hidden = true;
    store.set('sk-conv', JSON.stringify({ f, t, s: style.value, p: precise.checked, d: digits.checked }));
  }

  try {
    const s = JSON.parse(store.get('sk-conv', '{}'));
    if (s.f) from.value = s.f; if (s.t) to.value = s.t; if (s.s) style.value = s.s;
    precise.checked = !!s.p; if (s.d === false) digits.checked = false;
  } catch { /* ignore a corrupt saved setting */ }

  [from, to, precise, digits, style].forEach((n) => n.addEventListener('change', () => {
    if (from.value === to.value) {
      const other = n === from ? to : from;
      other.value = Object.keys(SCRIPT_NAME).find((s) => s !== n.value);
    }
    run();
  }));
  input.addEventListener('input', run);
  $('#cv-swap').addEventListener('click', () => {
    const f = from.value;
    from.value = to.value; to.value = f;
    input.value = output.value;
    run();
  });
  $('#cv-copy').addEventListener('click', () => copyText(output.value));
  $$('.chip[data-example]').forEach((c) => c.addEventListener('click', () => {
    from.value = 'latin'; if (to.value === 'latin') to.value = 'saurashtra';
    input.value = c.dataset.example; run(); input.focus();
  }));
  run();
}

/* ---------- dictionary + lookup ---------- */

const STATUS_LABEL = { draft: 'Draft', verified: 'Verified' };

function entryCard(entry) {
  return el('article', { class: 'entry' },
    el('div', { class: 'e-main' },
      el('div', { class: 'e-sa script', lang: 'saz', text: entry.sa }),
      el('div', { class: 'e-rom' }, el('strong', { text: entry.rom }), el('span', { class: 'pos', text: entry.pos })),
      el('div', { class: 'e-mean' }, el('span', { text: entry.en.join('; ') }),
        entry.ta.length ? el('span', { class: 'ta', lang: 'ta', text: entry.ta.join('; ') }) : null),
      entry.notes && entry.status === 'verified' ? el('div', { class: 'e-note', text: entry.notes }) : null,
    ),
    el('div', { class: 'e-side' },
      el('span', { class: `badge ${entry.status}`, text: STATUS_LABEL[entry.status] || entry.status, title: entry.status === 'draft' ? 'Not yet confirmed by a Saurashtra speaker' : 'Confirmed' }),
      el('button', { class: 'btn small', type: 'button', onclick: () => copyText(entry.sa), 'aria-label': `Copy ${entry.rom} in Saurashtra script` }, 'Copy'),
      el('a', { class: 'small-link', target: '_blank', rel: 'noopener', href: issueUrl('word-correction.yml', `Correction: ${entry.rom}`), text: 'Report' }),
    ),
  );
}

async function initDictionary() {
  const list = $('#dict-list'), q = $('#dict-q'), pos = $('#dict-pos'), status = $('#dict-status');
  const lkResults = $('#lk-results'), lkQ = $('#lk-q'), lkFallback = $('#lk-fallback');
  let index;
  try {
    index = await loadDictionary();
  } catch (err) {
    list.replaceChildren(el('p', { class: 'notice', text: `The dictionary could not be loaded. ${err.message}` }));
    lkResults.replaceChildren(el('p', { class: 'notice', text: 'The dictionary could not be loaded.' }));
    return;
  }

  distinct(index, 'pos').forEach((p) => pos.append(el('option', { value: p, text: p })));
  const drafts = index.entries.filter((e) => e.status === 'draft').length;
  const banner = $('#dict-banner');
  if (drafts) {
    banner.hidden = false;
    banner.textContent = `${drafts} of ${index.entries.length} entries are drafts that a Saurashtra speaker still needs to confirm. Please correct them on GitHub.`;
  }

  const renderDict = () => {
    const rows = search(index, q.value, { pos: pos.value, status: status.value });
    $('#dict-count').textContent = `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`;
    list.replaceChildren(...(rows.length
      ? rows.map((r) => entryCard(r.entry))
      : [el('p', { class: 'empty', text: q.value ? 'No match. Try fewer letters, or search in Tamil or English.' : 'No entries yet.' })]));
  };
  [q, pos, status].forEach((n) => n.addEventListener('input', renderDict));
  renderDict();

  // Lookup
  let dir = 'ta-sa';
  const renderLookup = () => {
    const text = lkQ.value.trim();
    lkFallback.hidden = true;
    if (!text) {
      lkResults.replaceChildren(el('p', { class: 'empty', text: dir === 'ta-sa' ? 'Type a Tamil or English word to find its Saurashtra form.' : 'Type a Saurashtra word, in script or Latin letters, to find its Tamil meaning.' }));
      return;
    }
    const rows = lookup(index, text, dir);
    lkResults.replaceChildren(...rows.map((r) => entryCard(r.entry)));
    if (!rows.length) {
      lkResults.replaceChildren(el('p', { class: 'empty', text: 'This word is not in the dictionary yet.' }));
      const kids = [];
      const script = detectScript(text);
      if (dir === 'ta-sa' && script === 'tamil') {
        kids.push(el('h3', { text: 'Spelled out in Saurashtra script' }),
          el('p', { class: 'script lk-big', lang: 'saz', text: convert(text, 'tamil', 'saurashtra') }),
          el('p', { class: 'hint', text: 'This is only the Tamil letters rewritten in Saurashtra script. It is not a translation.' }));
      } else if (dir === 'sa-ta' && script !== 'tamil') {
        const sa = script === 'latin' ? convert(text, 'latin', 'saurashtra') : text;
        kids.push(el('h3', { text: 'Spelled out in Tamil script' }),
          el('p', { class: 'lk-big', lang: 'ta', text: convert(sa, 'saurashtra', 'tamil') }),
          el('p', { class: 'hint', text: 'This is only the letters rewritten in Tamil script. It is not a translation.' }));
      }
      kids.push(el('p', {}, el('a', { target: '_blank', rel: 'noopener', href: issueUrl('word-suggestion.yml', `New word: ${text}`), text: 'Suggest this word on GitHub' })));
      lkFallback.replaceChildren(...kids);
      lkFallback.hidden = false;
    }
  };
  lkQ.addEventListener('input', renderLookup);
  $$('.seg button').forEach((b) => b.addEventListener('click', () => {
    dir = b.dataset.dir;
    $$('.seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    lkQ.placeholder = dir === 'ta-sa' ? 'Type a Tamil or English word' : 'Type a Saurashtra word (script or Latin letters)';
    renderLookup();
  }));
  renderLookup();
}

/* ---------- about / links ---------- */

function initAbout() {
  const g = (id, latin, opts = {}) => { $(`#${id}`).textContent = convert(latin, 'latin', 'saurashtra', { precise: true, ...opts }); };
  g('g-vowels', 'ka kaa ki kii ku kuu ke kee kai ko koo kau');
  g('g-virama', 'k');
  g('g-asp', 'kha gha chha jha tha dha pha bha');
  g('g-retro', 'Ta Tha Da Dha Na La Sha');
  g('g-nasal', 'N^a ~na');
  g('g-marks', 'ka.m ka.h kam~');
  $('#g-break').textContent = `${convert('k_ha', 'latin', 'saurashtra')}  ${convert('ka_i', 'latin', 'saurashtra')}`;
  $('#g-digits').textContent = convert('0123456789', 'latin', 'saurashtra') + ' ' + SA.danda;

  const repo = repoUrl();
  ['#link-repo', '#link-repo-foot'].forEach((s) => { $(s).href = repo; });
  $('#link-issues').href = issueUrl('word-suggestion.yml');
  $('#link-suggest').href = issueUrl('word-suggestion.yml');
  $('#hero-script').textContent = convert('sauraaShTra', 'latin', 'saurashtra', { precise: true });
}

/* ---------- start ---------- */

initTheme();
initTabs();
initAbout();
initType();
initConvert();
initDictionary();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
