/**
 * PINGUIN NEXT — TEXT STATISTICS
 * Pure functions; no dependency on editor, DOM, Shell or other features.
 */
export function countWords(value, locale = 'uk') {
  const text = String(value ?? '');
  if (!text.trim()) return 0;
  if (typeof Intl.Segmenter === 'function') {
    return [...new Intl.Segmenter(locale, { granularity: 'word' }).segment(text)]
      .filter(part => part.isWordLike).length;
  }
  return text.trim().split(/\s+/u).length;
}

export function getTextStats(value, locale = 'uk') {
  const text = String(value ?? '');
  const words = countWords(text, locale);
  return {
    characters: [...text].length,
    words,
    readingMinutes: words === 0 ? 0 : Math.max(1, Math.ceil(words / 200)),
  };
}
