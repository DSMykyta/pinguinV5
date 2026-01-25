// js/generators/generator-highlight/ghl-stats.js

/**
 * STATS - Статистика тексту
 */

import { getHighlightDOM } from './ghl-dom.js';
import { getCurrentMode } from './ghl-mode.js';

/**
 * Отримати plain text з редактора
 */
export function getPlainText() {
    const dom = getHighlightDOM();
    return getCurrentMode() === 'text'
        ? (dom.editor?.textContent || '')
        : (dom.codeEditor?.value || '');
}

/**
 * Оновити статистику
 */
export function updateStats() {
    const text = getPlainText();
    const charCount = text.length;
    const wordCount = (text.match(/\S+/g) || []).length;
    const readingTime = Math.ceil(wordCount / 200) || 0;

    const charEl = document.getElementById('ghl-char-count');
    const wordEl = document.getElementById('ghl-word-count');
    const timeEl = document.getElementById('ghl-reading-time');

    if (charEl) charEl.textContent = charCount;
    if (wordEl) wordEl.textContent = wordCount;
    if (timeEl) timeEl.textContent = readingTime;
}
