// Phonetic typing inside a <textarea>: Latin keystrokes turn into Saurashtra script as you type.
//
// The letters of the syllable being typed are kept in a small buffer and re-converted after every
// keystroke, so "k" shows ꢒ + virama, and the next "a" turns it into ꢒ. Backspace removes one
// Latin letter at a time. Anything else (space, arrow keys, a click) ends the syllable.

import { convert } from './translit.js';

const TYPED = /^[A-Za-z0-9~^._|À-ɏḀ-ỿ]$/;

export function attachPhonetic(textarea, getOptions, onChange = () => {}) {
  let buf = '';
  let start = -1;
  let shownLen = 0;

  const reset = () => { buf = ''; start = -1; shownLen = 0; };

  const show = () => {
    const { precise, digits } = getOptions();
    const text = buf ? convert(buf, 'latin', 'saurashtra', { precise, digits }) : '';
    textarea.setRangeText(text, start, start + shownLen, 'end');
    shownLen = text.length;
    onChange();
  };

  textarea.addEventListener('beforeinput', (e) => {
    const opts = getOptions();
    if (!opts.enabled || e.isComposing) return;

    if (e.inputType === 'insertText' && e.data && TYPED.test(e.data)) {
      if (textarea.selectionStart !== textarea.selectionEnd) {
        textarea.setRangeText('', textarea.selectionStart, textarea.selectionEnd, 'end');
        reset();
      }
      const caret = textarea.selectionStart;
      if (start < 0 || caret !== start + shownLen) { reset(); start = caret; }
      buf += e.data;
      show();
      e.preventDefault();
      return;
    }

    if (e.inputType === 'deleteContentBackward' && buf && textarea.selectionStart === textarea.selectionEnd
        && textarea.selectionStart === start + shownLen) {
      buf = buf.slice(0, -1);
      show();
      if (!buf) reset();
      e.preventDefault();
      return;
    }

    reset(); // space, newline, punctuation, paste, delete ...: the syllable is finished
  });

  textarea.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'].includes(e.key)) reset();
  });
  ['mousedown', 'touchstart', 'blur', 'input'].forEach((ev) => textarea.addEventListener(ev, reset));

  return { reset };
}

/** Insert text at the caret (used by the on-screen keyboard). */
export function insertAtCaret(textarea, text) {
  textarea.focus();
  textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end');
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Delete the previous character (a whole code point, so signs and letters go one at a time). */
export function backspace(textarea) {
  textarea.focus();
  const { selectionStart: s, selectionEnd: e, value } = textarea;
  if (s !== e) textarea.setRangeText('', s, e, 'end');
  else if (s > 0) {
    const before = [...value.slice(0, s)];
    const last = before[before.length - 1];
    textarea.setRangeText('', s - last.length, s, 'end');
  }
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}
