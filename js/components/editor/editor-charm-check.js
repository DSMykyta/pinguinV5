// js/components/editor/editor-charm-check.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ✨ ШАРМ [check] — Валідація заборонених слів + HTML патерни                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Підсвічує заборонені слова + перевіряє HTML структуру.                  ║
 * ║  Активується тільки якщо config.validation = true.                       ║
 * ║  Можна видалити — редактор працюватиме без валідації.                    ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { debounce } from '../../utils/common-utils.js';

// ============================================================================
// HTML ПАТЕРНИ (попередження — жовті чіпи)
// ============================================================================

const HTML_PATTERNS = [
    {
        id: 'li-lowercase',
        regex: /<li>\s*([а-яїієґёa-z])/g,
        name: '‹li› з маленької букви',
        description: 'Текст після тегу ‹li› має починатися з великої літери.',
        hint: 'Змініть першу літеру після ‹li› на велику.'
    },
    {
        id: 'text-without-tag',
        regex: /<\/(?:p|h[1-6]|ul|ol|li|blockquote|div)>\s*([А-ЯЇІЄҐЁа-яїієґёA-Za-z])/g,
        name: 'Текст без тегу',
        description: 'Після закриваючого блочного тегу текст має бути обгорнутий у відповідний тег (‹p›, ‹h3› тощо).',
        hint: 'Додайте відкриваючий тег перед текстом, наприклад ‹p›.'
    }
];

export function init(state) {
    // Пропустити якщо валідація вимкнена
    if (!state.config.validation) return;

    let validationRegex = null;
    let bannedWordsData = []; // Повні об'єкти з bannedWordsState

    // Завантажити заборонені слова
    loadBannedWordsData();

    async function loadBannedWordsData() {
        try {
            const { bannedWordsState } = await import('../../pages/banned-words/banned-words-state.js');
            const { loadBannedWords } = await import('../../pages/banned-words/banned-words-data.js');
            await loadBannedWords();

            bannedWordsData = bannedWordsState.bannedWords || [];
            buildRegex();
            validate();
        } catch (e) {
            console.warn('[Editor Validation] Banned words module not available:', e.message);
        }
    }

    function buildRegex() {
        if (!bannedWordsData || bannedWordsData.length === 0) {
            validationRegex = null;
            return;
        }

        // Збираємо всі слова з name_uk_array + name_ru_array
        const allWords = [];
        bannedWordsData.forEach(item => {
            if (item.name_uk_array) allWords.push(...item.name_uk_array);
            if (item.name_ru_array) allWords.push(...item.name_ru_array);
        });

        const uniqueWords = [...new Set(allWords)].filter(Boolean);
        if (uniqueWords.length === 0) {
            validationRegex = null;
            return;
        }

        // Сортуємо за довжиною (довші спершу) для правильного matching
        const escapedWords = uniqueWords
            .sort((a, b) => b.length - a.length)
            .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

        try {
            // Unicode word boundaries для кирилиці
            validationRegex = new RegExp(`(?<!\\p{L})(${escapedWords.join('|')})(?!\\p{L})`, 'giu');
        } catch (error) {
            console.error('[Editor Validation] Помилка RegExp:', error);
            validationRegex = null;
        }
    }

    // ================================================================
    // ПОШУК ІНФОРМАЦІЇ (для tooltip плагіна)
    // ================================================================

    function findBannedWordInfo(word) {
        if (!bannedWordsData || bannedWordsData.length === 0) return null;
        const lowerWord = word.toLowerCase();

        for (const row of bannedWordsData) {
            const ukWords = row.name_uk_array || [];
            const ruWords = row.name_ru_array || [];

            if (ukWords.includes(lowerWord) || ruWords.includes(lowerWord)) {
                return {
                    group_name_ua: row.group_name_ua || '',
                    banned_explaine: row.banned_explaine || '',
                    banned_hint: row.banned_hint || ''
                };
            }
        }
        return null;
    }

    function findHtmlPatternInfo(patternId) {
        const pattern = HTML_PATTERNS.find(p => p.id === patternId);
        if (!pattern) return null;

        return {
            group_name_ua: pattern.name,
            banned_explaine: pattern.description,
            banned_hint: pattern.hint
        };
    }

    // Виставляємо на state для tooltip плагіна
    state.findBannedWordInfo = findBannedWordInfo;
    state.findHtmlPatternInfo = findHtmlPatternInfo;

    // ================================================================
    // HTML ПАТЕРНИ
    // ================================================================

    function checkHtmlPatterns(html) {
        const results = { totalCount: 0, patternCounts: new Map() };
        if (!html || !html.trim()) return results;

        for (const pattern of HTML_PATTERNS) {
            pattern.regex.lastIndex = 0;
            const matches = html.match(pattern.regex);
            if (matches && matches.length > 0) {
                results.patternCounts.set(pattern.id, {
                    count: matches.length,
                    pattern: pattern
                });
                results.totalCount += matches.length;
            }
        }
        return results;
    }

    // ================================================================
    // ВАЛІДАЦІЯ
    // ================================================================

    function getHtmlContent() {
        if (state.currentMode === 'text') {
            return state.getCleanHtml();
        }
        return state.dom.codeEditor?.value || '';
    }

    function validate() {
        const text = state.getPlainText();
        const html = getHtmlContent();
        const wordCounts = new Map();
        let bannedCount = 0;

        if (validationRegex && text) {
            validationRegex.lastIndex = 0;
            let match;
            while ((match = validationRegex.exec(text)) !== null) {
                if (match[1]) {
                    const word = match[1].toLowerCase();
                    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
                    bannedCount++;
                }
            }
        }

        const htmlResults = checkHtmlPatterns(html);
        displayResults(wordCounts, bannedCount, htmlResults);

        if (state.currentMode === 'text') {
            applyHighlights();
        }
    }

    // ================================================================
    // ВІДОБРАЖЕННЯ РЕЗУЛЬТАТІВ
    // ================================================================

    function displayResults(wordCounts, bannedCount, htmlResults) {
        const container = state.dom.validationResults;
        if (!container) return;

        const totalCount = bannedCount + htmlResults.totalCount;

        if (totalCount > 0) {
            const chips = [];

            // HTML патерни (жовті чіпи)
            for (const [patternId, data] of htmlResults.patternCounts.entries()) {
                chips.push(`<span class="chip c-yellow" data-html-pattern="${patternId}">${data.pattern.name} (${data.count})</span>`);
            }

            // Заборонені слова (червоні чіпи з навігацією)
            const sorted = Array.from(wordCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
            for (const [word, cnt] of sorted) {
                chips.push(`<span class="chip c-red" data-banned-word="${word}">${word} (${cnt})</span>`);
            }

            container.innerHTML = chips.join(' ');
            container.classList.add('has-errors');

            // Scroll fade
            setTimeout(() => updateValidationScrollFade(container), 0);
        } else {
            container.innerHTML = '';
            container.classList.remove('has-errors');
            updateValidationScrollFade(container);
        }
    }

    function updateValidationScrollFade(container) {
        if (!container) return;
        const wrapper = container.parentElement;
        if (!wrapper || !wrapper.classList.contains('validation-results-wrapper')) return;

        const hasScrollLeft = container.scrollLeft > 0;
        const hasScrollRight = container.scrollLeft < (container.scrollWidth - container.clientWidth - 1);

        wrapper.classList.toggle('has-scroll-left', hasScrollLeft);
        wrapper.classList.toggle('has-scroll-right', hasScrollRight);
    }

    // Scroll fade на scroll
    state.dom.validationResults?.addEventListener('scroll', () => {
        updateValidationScrollFade(state.dom.validationResults);
    });

    // ================================================================
    // ПІДСВІЧУВАННЯ В РЕДАКТОРІ
    // ================================================================

    function applyHighlights() {
        if (!state.dom.editor || !validationRegex) return;

        // Не модифікуємо DOM якщо є активне виділення
        const sel = window.getSelection();
        if (sel.rangeCount && !sel.getRangeAt(0).collapsed) return;

        // Перевіряємо чи є що робити — якщо нема highlights і нема matches, не чіпаємо DOM
        const hasExisting = state.dom.editor.querySelector('.highlight-error, .highlight-warning');
        const text = state.dom.editor.textContent || '';
        validationRegex.lastIndex = 0;
        const hasMatches = validationRegex.test(text);
        validationRegex.lastIndex = 0;

        if (!hasExisting && !hasMatches) return;

        // Зберігаємо позицію курсора перед зміною DOM
        const editorFocused = state.dom.editor.contains(document.activeElement)
            || document.activeElement === state.dom.editor;
        const caretPos = editorFocused ? saveCaretOffset(state.dom.editor) : null;

        clearHighlights();

        const walker = document.createTreeWalker(state.dom.editor, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }

        textNodes.forEach(textNode => {
            const nodeText = textNode.textContent;
            if (!nodeText || !nodeText.trim()) return;

            validationRegex.lastIndex = 0;
            const matches = [];
            let match;
            while ((match = validationRegex.exec(nodeText)) !== null) {
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
                    fragment.appendChild(document.createTextNode(nodeText.substring(lastIndex, m.start)));
                }
                const span = document.createElement('span');
                span.className = 'highlight-error';
                span.textContent = m.word;
                fragment.appendChild(span);
                lastIndex = m.end;
            });

            if (lastIndex < nodeText.length) {
                fragment.appendChild(document.createTextNode(nodeText.substring(lastIndex)));
            }

            textNode.parentNode.replaceChild(fragment, textNode);
        });

        // Відновлюємо позицію курсора після зміни DOM
        if (caretPos !== null) {
            restoreCaretOffset(state.dom.editor, caretPos);
        }
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

    // ================================================================
    // ЗБЕРЕЖЕННЯ / ВІДНОВЛЕННЯ КУРСОРА
    // ================================================================

    function saveCaretOffset(editor) {
        const sel = window.getSelection();
        if (!sel.rangeCount) return null;

        const range = sel.getRangeAt(0);
        const pre = range.cloneRange();
        pre.selectNodeContents(editor);
        pre.setEnd(range.startContainer, range.startOffset);
        return pre.toString().length;
    }

    function restoreCaretOffset(editor, offset) {
        const sel = window.getSelection();
        const range = document.createRange();
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);

        let charCount = 0;
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const len = node.textContent.length;

            if (charCount + len >= offset) {
                range.setStart(node, Math.min(offset - charCount, len));
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                return;
            }
            charCount += len;
        }
    }

    // ================================================================
    // ХУКИ
    // ================================================================

    const debouncedValidate = debounce(validate, 500);
    state.registerHook('onValidate', debouncedValidate, { plugin: 'validation' });
    state.registerHook('onInput', debouncedValidate, { plugin: 'validation' });
    state.registerHook('onModeChange', validate, { plugin: 'validation' });
}
