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

// Read visible document text with consistent semantic boundaries in both modes.
// textContent glues neighbouring block elements together; innerText depends on layout.
const BLOCKS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'blockquote', 'li', 'ul', 'ol', 'pre', 'hr']);

export function getEditorDocumentText(root) {
  const parts = [];
  let endsInBreak = false;

  function append(value) {
    if (!value) return;
    parts.push(value);
    endsInBreak = value.endsWith('\n');
  }
  function boundary() {
    if (parts.length && !endsInBreak) append('\n');
  }
  function walk(node, preformatted = false) {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.nodeValue ?? '';
      append(preformatted ? value : value.replace(/[\t\r\n\f ]+/gu, ' '));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.localName.toLowerCase();
    if (tag === 'br' || tag === 'hr') {
      boundary();
      return;
    }
    const isBlock = BLOCKS.has(tag);
    if (isBlock) boundary();
    for (const child of node.childNodes) walk(child, preformatted || tag === 'pre');
    if (isBlock) boundary();
  }

  for (const child of root.childNodes) walk(child);
  return parts.join('').replace(/ *\n */gu, '\n').replace(/\n{2,}/gu, '\n').trim();
}

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
