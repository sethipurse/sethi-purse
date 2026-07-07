// Shared tokenizer/normalizer for search & intent matching — one function
// used everywhere a customer query is split into words, so a Hindi/Punjabi
// voice transcript (Devanagari/Gurmukhi) is never silently stripped to
// nothing by an English-only [a-z0-9] split.
// Devanagari (Hindi): U+0900-097F | Gurmukhi (Punjabi): U+0A00-0A7F
const WORD_CHAR_CLASS = 'a-z0-9\\u0900-\\u097F\\u0A00-\\u0A7F';
const SPLIT_RE = new RegExp(`[^${WORD_CHAR_CLASS}]+`, 'i');
// Punctuation seen across scripts: Devanagari danda/double-danda (।॥),
// Latin ?/!/,/quotes, common curly quotes.
const PUNCTUATION_RE = /[।॥?!,‘’“”'".]+/g;

// Indic words are often short after splitting (e.g. "है", "है" is 1 char and
// gets dropped, but "बैग"/"पर्स" are 2-3 chars) — length >= 2, not the 3 an
// English-only tokenizer would use.
export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(SPLIT_RE)
    .filter((t) => t.length >= 2);
}

export function normalizeQuery(text) {
  return String(text || '')
    .toLowerCase()
    .replace(PUNCTUATION_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
