// js/common/editor/editor-validation.js

/**
 * 🔌 ПЛАГІН — Валідація заборонених слів
 *
 * Можна видалити — редактор працюватиме без валідації.
 * Активується тільки якщо config.validation = true
 */

import { debounce } from '../../utils/common-utils.js';

export function init(state) {
    // Пропустити якщо валідація вимкнена
    if (!state.config.validation) return;

    let validationRegex = null;
    let bannedWordsData = [];

    // Завантажити заборонені слова
    loadBannedWords();

    async function loadBannedWords() {
        try {
            const module = await import('../../banned-words/banned-words-data.js');
            await module.loadBannedWords();
            bannedWordsData = module.getBannedWords();
            buildRegex();
            validate();
        } catch (e) {
            console.warn('[Editor Validation] Banned words module not available');
        }
    }

    function buildRegex() {
        if (!bannedWordsData || bannedWordsData.length === 0) {
            validationRegex = null;
            return;
        }

        const words = bannedWordsData.map(item => item.word).filter(w => w);
        if (words.length === 0) {
            validationRegex = null;
            return;
        }

        const escapedWords = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        validationRegex = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');
    }

    function validate() {
        const text = state.getPlainText();
        const wordCounts = new Map();
        let count = 0;

        if (validationRegex && text) {
            validationRegex.lastIndex = 0;
            let match;
            while ((match = validationRegex.exec(text)) !== null) {
                if (match[1]) {
                    const word = match[1].toLowerCase();
                    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
                    count++;
                }
            }
        }

        displayResults(wordCounts, count);

        if (state.currentMode === 'text') {
            applyHighlights();
        }
    }

    function displayResults(wordCounts, count) {
        const container = state.dom.validationResults;
        if (!container) return;

        if (count > 0) {
            const chips = [];
            const sorted = Array.from(wordCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

            for (const [word, cnt] of sorted) {
                chips.push(`<span class="chip chip-error" data-word="${word}">${word} (${cnt})</span>`);
            }

            container.innerHTML = chips.join(' ');
            container.classList.add('has-errors');
        } else {
            container.innerHTML = '';
            container.classList.remove('has-errors');
        }
    }

    function applyHighlights() {
        if (!state.dom.editor || !validationRegex) return;

        clearHighlights();

        const walker = document.createTreeWalker(state.dom.editor, NodeFilter.SHOW_TEXT);
        const textNodes = [];

        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }

        textNodes.forEach(textNode => {
            const text = textNode.textContent;
            validationRegex.lastIndex = 0;

            const matches = [];
            let match;
            while ((match = validationRegex.exec(text)) !== null) {
                matches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    word: match[0]
                });
            }

            if (matches.length === 0) return;

            const fragment = document.createDocumentFragment();
            let lastIndex = 0;

            matches.forEach(m => {
                if (m.start > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, m.start)));
                }

                const span = document.createElement('span');
                span.className = 'highlight-error';
                span.textContent = m.word;
                fragment.appendChild(span);

                lastIndex = m.end;
            });

            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }

            textNode.parentNode.replaceChild(fragment, textNode);
        });
    }

    function clearHighlights() {
        state.dom.editor?.querySelectorAll('.highlight-error, .highlight-warning').forEach(el => {
            const parent = el.parentNode;
            while (el.firstChild) {
                parent.insertBefore(el.firstChild, el);
            }
            parent.removeChild(el);
        });
        state.dom.editor?.normalize();
    }

    // Реєструємо валідацію на хук
    const debouncedValidate = debounce(validate, 500);
    state.registerHook('onValidate', debouncedValidate);
    state.registerHook('onInput', debouncedValidate);
    state.registerHook('onModeChange', validate);
}
