// js/generators/generator-text/gte-stats.js
import { getTextDOM } from './gte-dom.js';

export function initStats() {
    const dom = getTextDOM();
    if (!dom.inputMarkup) return;

    const charCountEl = document.getElementById('gte-char-count');
    const wordCountEl = document.getElementById('gte-word-count');
    const readingTimeEl = document.getElementById('gte-reading-time');

    function updateStats() {
        const text = dom.inputMarkup.value || '';
        const wordCount = (text.match(/\S+/g) || []).length;

        if (charCountEl) charCountEl.textContent = text.length;
        if (wordCountEl) wordCountEl.textContent = wordCount;
        if (readingTimeEl) readingTimeEl.textContent = Math.ceil(wordCount / 200) || 1;
    }

    dom.inputMarkup.addEventListener('input', updateStats);
    updateStats(); // Початковий підрахунок
}