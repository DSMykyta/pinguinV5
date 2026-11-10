/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — RICH TEXT STATISTICS                                                                 ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Pure model + optional status projection; unrelated to toolbar or mirror.               ║
 * ║ ЗАЛЕЖНОСТІ: Стандартні API платформи; зовнішніх імпортів немає.                                     ║
 * ║ ПУБЛІЧНИЙ API: getEditorTextStats(), mountEditorStats()                                             ║
 * ║ ПРИНЦИП: Ізольована поведінка, без зв'язків між features.                                           ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

export function getEditorTextStats(text) {
  const input = String(text ?? '');
  const wordCount = typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter('uk', { granularity: 'word' }).segment(input)].filter(part => part.isWordLike).length
    : input.trim() ? input.trim().split(/\s+/u).length : 0;
  return { characters: [...input].length, words: wordCount };
}

export function mountEditorStats({ host, controls }) {
  const element = document.createElement('div');
  element.className = 'pg-rich-text-editor__stats';
  element.setAttribute('aria-label', 'Статистика тексту');
  const sync = () => {
    const { characters, words } = getEditorTextStats(controls.getText());
    element.textContent = `${characters} символів · ${words} слів`;
  };
  host.append(element);
  const unsubscribe = controls.subscribe(sync);
  sync();
  return { dispose() { unsubscribe(); element.remove(); } };
}
