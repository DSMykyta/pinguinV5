/**
 * PINGUIN NEXT — EDITOR STATS VIEW
 * Optional DOM projection. No imports from mirror or toolbar.
 */
import { getTextStats } from './text-stats.js';

export function mountStats({ container, editor, locale = 'uk' }) {
  const node = document.createElement('div');
  node.className = 'pg-rich-text-editor__stats';
  node.setAttribute('aria-label', 'Статистика тексту');
  const sync = () => {
    const { characters, words, readingMinutes } = getTextStats(editor.getText(), locale);
    node.textContent = `${characters} символів · ${words} слів · ${readingMinutes} хв читання`;
  };
  container.append(node);
  editor.on('update', sync);
  sync();
  return { dispose() { editor.off('update', sync); node.remove(); } };
}
