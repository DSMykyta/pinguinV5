// js/generators/generator-highlight/ghl-main.js

/**
 * HIGHLIGHT GENERATOR - Редактор з підсвічуванням заборонених слів
 *
 * Два режими: Текст (plain text з br) і Код (HTML)
 * Використовує існуючі стилі: .highlight-banned-word, .banned-word-tooltip, .chip-error
 */

import { registerPanelInitializer } from '../../panel/panel-right.js';
import { getHighlightDOM } from './ghl-dom.js';
import { initValidator, getValidationRegex, findBannedWordInfo, checkHtmlPatterns, findHtmlPatternInfo } from './ghl-validator.js';
import { debounce } from '../../utils/common-utils.js';
import { showToast } from '../../common/ui-toast.js';

// ============================================================================
// СТАН
// ============================================================================

let currentMode = 'text';

// ============================================================================
// САНІТИЗАЦІЯ HTML - <div> заборонено, все в <p>
// ============================================================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function sanitizeHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Конвертуємо DIV в P
    temp.querySelectorAll('div').forEach(div => {
        const p = document.createElement('p');
        p.innerHTML = div.innerHTML;
        div.parentNode.replaceChild(p, div);
    });

    // Конвертуємо B в STRONG, I в EM
    temp.querySelectorAll('b').forEach(b => {
        const strong = document.createElement('strong');
        strong.innerHTML = b.innerHTML;
        b.parentNode.replaceChild(strong, b);
    });

    temp.querySelectorAll('i').forEach(i => {
        const em = document.createElement('em');
        em.innerHTML = i.innerHTML;
        i.parentNode.replaceChild(em, i);
    });

    // Видаляємо SPAN (залишаємо вміст)
    temp.querySelectorAll('span').forEach(span => {
        const fragment = document.createDocumentFragment();
        while (span.firstChild) {
            fragment.appendChild(span.firstChild);
        }
        span.parentNode.replaceChild(fragment, span);
    });

    // Видаляємо всі атрибути з дозволених тегів
    temp.querySelectorAll('*').forEach(el => {
        // Пропускаємо видалення класу highlight-banned-word
        const isHighlight = el.classList?.contains('highlight-banned-word');
        while (el.attributes && el.attributes.length > 0) {
            el.removeAttribute(el.attributes[0].name);
        }
        if (isHighlight) {
            el.className = 'highlight-banned-word';
        }
    });

    return temp.innerHTML;
}

function sanitizeEditor() {
    const dom = getHighlightDOM();
    if (!dom.editor || currentMode !== 'text') return;

    let changed = false;

    // Конвертуємо DIV в P
    dom.editor.querySelectorAll('div').forEach(div => {
        const p = document.createElement('p');
        p.innerHTML = div.innerHTML;
        div.parentNode.replaceChild(p, div);
        changed = true;
    });

    // Конвертуємо B в STRONG
    dom.editor.querySelectorAll('b').forEach(b => {
        const strong = document.createElement('strong');
        strong.innerHTML = b.innerHTML;
        b.parentNode.replaceChild(strong, b);
        changed = true;
    });

    // Конвертуємо I в EM
    dom.editor.querySelectorAll('i').forEach(i => {
        const em = document.createElement('em');
        em.innerHTML = i.innerHTML;
        i.parentNode.replaceChild(em, i);
        changed = true;
    });

    if (changed) {
        dom.editor.normalize();
    }
}

// ============================================================================
// UNDO/REDO STACK - власна система для обходу проблем contentEditable
// ============================================================================

const undoStack = [];
const redoStack = [];
const MAX_UNDO_STACK = 50;
let lastSavedContent = '';

function saveUndoState() {
    const dom = getHighlightDOM();
    if (!dom.editor) return;

    // Отримуємо чистий HTML без підсвічувань
    const content = getCleanHtml();

    // Не зберігаємо якщо контент не змінився
    if (content === lastSavedContent) return;

    undoStack.push(lastSavedContent);
    lastSavedContent = content;

    // Очищаємо redo при новій дії
    redoStack.length = 0;

    // Обмежуємо розмір стеку
    if (undoStack.length > MAX_UNDO_STACK) {
        undoStack.shift();
    }
}

function undo() {
    if (undoStack.length === 0) return;

    const dom = getHighlightDOM();
    if (!dom.editor) return;

    const currentContent = getCleanHtml();
    redoStack.push(currentContent);

    const previousContent = undoStack.pop();
    lastSavedContent = previousContent;

    dom.editor.innerHTML = previousContent;
    validateAndHighlight();
}

function redo() {
    if (redoStack.length === 0) return;

    const dom = getHighlightDOM();
    if (!dom.editor) return;

    const currentContent = getCleanHtml();
    undoStack.push(currentContent);

    const nextContent = redoStack.pop();
    lastSavedContent = nextContent;

    dom.editor.innerHTML = nextContent;
    validateAndHighlight();
}

function getCleanHtml() {
    const dom = getHighlightDOM();
    if (!dom.editor) return '';

    const clone = dom.editor.cloneNode(true);
    clone.querySelectorAll('.highlight-banned-word').forEach(el => {
        const text = document.createTextNode(el.textContent);
        el.parentNode.replaceChild(text, el);
    });
    return clone.innerHTML;
}

// ============================================================================
// ЗБЕРЕЖЕННЯ/ВІДНОВЛЕННЯ КУРСОРА
// ============================================================================

function saveCaretPosition(element) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.startContainer, range.startOffset);

    return {
        start: preCaretRange.toString().length,
        end: preCaretRange.toString().length + range.toString().length
    };
}

function restoreCaretPosition(element, position) {
    if (!position) return;

    const selection = window.getSelection();
    const range = document.createRange();

    let charIndex = 0;
    const nodeStack = [element];
    let node, foundStart = false, foundEnd = false;

    while (!foundEnd && (node = nodeStack.pop())) {
        if (node.nodeType === Node.TEXT_NODE) {
            const nextCharIndex = charIndex + node.length;

            if (!foundStart && position.start >= charIndex && position.start <= nextCharIndex) {
                range.setStart(node, position.start - charIndex);
                foundStart = true;
            }

            if (foundStart && position.end >= charIndex && position.end <= nextCharIndex) {
                range.setEnd(node, position.end - charIndex);
                foundEnd = true;
            }

            charIndex = nextCharIndex;
        } else {
            let i = node.childNodes.length;
            while (i--) {
                nodeStack.push(node.childNodes[i]);
            }
        }
    }

    if (foundStart) {
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

// ============================================================================
// TOOLTIP (використовує існуючі стилі з tooltip.css)
// ============================================================================

let tooltipElement = null;

function getTooltipElement() {
    if (!tooltipElement) {
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'banned-word-tooltip';
        document.body.appendChild(tooltipElement);
    }
    return tooltipElement;
}

function showTooltip(target, wordInfo) {
    if (!wordInfo) return;

    const tooltip = getTooltipElement();
    let content = '';

    if (wordInfo.group_name_ua) {
        content += `<div class="tooltip-title">${wordInfo.group_name_ua}</div>`;
    }
    if (wordInfo.banned_explaine) {
        content += `<div class="tooltip-description">${wordInfo.banned_explaine}</div>`;
    }
    if (wordInfo.banned_hint) {
        content += `<div class="tooltip-hint"><strong>Рекомендація:</strong> ${wordInfo.banned_hint}</div>`;
    }

    if (!content) return;

    tooltip.innerHTML = content;
    tooltip.classList.remove('visible');

    const rect = target.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left;

    // Тимчасово показуємо для вимірювання
    tooltip.style.cssText = `position: fixed; visibility: hidden; display: block;`;
    const tooltipRect = tooltip.getBoundingClientRect();

    // Перевіряємо межі екрану
    if (top + tooltipRect.height > window.innerHeight) {
        top = rect.top - tooltipRect.height - 8;
    }
    if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 10;
    }
    if (left < 10) left = 10;

    // Встановлюємо позицію і показуємо
    tooltip.style.cssText = `position: fixed; top: ${top}px; left: ${left}px;`;
    tooltip.classList.add('visible');
}

function hideTooltip() {
    if (tooltipElement) {
        tooltipElement.classList.remove('visible');
    }
}

// ============================================================================
// ПЕРЕМИКАННЯ РЕЖИМІВ
// ============================================================================

function switchToTextMode() {
    const dom = getHighlightDOM();
    if (currentMode === 'text') return;

    dom.editor.innerHTML = dom.codeEditor.value;
    dom.editor.style.display = '';
    dom.codeEditor.style.display = 'none';

    enableFormatButtons(true);
    currentMode = 'text';

    // Скидаємо стек undo для нового режиму
    lastSavedContent = dom.editor.innerHTML;
    undoStack.length = 0;
    redoStack.length = 0;

    validateAndHighlight();
}

function switchToCodeMode() {
    const dom = getHighlightDOM();
    if (currentMode === 'code') return;

    clearHighlights();
    dom.codeEditor.value = dom.editor.innerHTML;

    dom.editor.style.display = 'none';
    dom.codeEditor.style.display = '';

    enableFormatButtons(false);
    currentMode = 'code';
    validateOnly();
}

function enableFormatButtons(enabled) {
    const dom = getHighlightDOM();
    [dom.btnBold, dom.btnItalic, dom.btnH2, dom.btnH3, dom.btnList].forEach(btn => {
        if (btn) {
            btn.disabled = !enabled;
            btn.classList.toggle('text-disabled', !enabled);
        }
    });
}

// ============================================================================
// ФОРМАТУВАННЯ - семантичні теги: <strong>, <em>, <h2>, <h3>, <ul>/<li>
// ============================================================================

function wrapSelection(tagName) {
    if (currentMode !== 'text') return;
    const dom = getHighlightDOM();
    dom.editor?.focus();

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    // Зберігаємо стан для undo
    saveUndoState();

    const range = selection.getRangeAt(0);

    // Знаходимо батьківський тег - перевіряємо і anchorNode і focusNode
    let node = selection.anchorNode;
    if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
    }
    const parentTag = node?.closest?.(tagName);

    if (parentTag && dom.editor.contains(parentTag)) {
        // Знімаємо тег - витягуємо вміст
        const parent = parentTag.parentNode;

        // Зберігаємо позицію для курсора
        const textContent = parentTag.textContent;

        // Замінюємо тег на його вміст
        while (parentTag.firstChild) {
            parent.insertBefore(parentTag.firstChild, parentTag);
        }
        parent.removeChild(parentTag);
        parent.normalize();
    } else if (!range.collapsed) {
        // Додаємо тег тільки якщо є виділений текст
        const wrapper = document.createElement(tagName);
        wrapper.appendChild(range.extractContents());
        range.insertNode(wrapper);

        // Виділяємо обгорнутий текст
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(wrapper);
        selection.addRange(newRange);
    }

    updateToolbarState();
}

function execFormat(command, value = null) {
    if (currentMode !== 'text') return;
    const dom = getHighlightDOM();
    dom.editor?.focus();

    // Зберігаємо стан для undo
    saveUndoState();

    document.execCommand(command, false, value);
    updateToolbarState();
}

function isInsideTag(tagName) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;

    const dom = getHighlightDOM();
    let node = selection.anchorNode;

    while (node && node !== dom.editor) {
        if (node.nodeName?.toLowerCase() === tagName.toLowerCase()) return true;
        node = node.parentNode;
    }
    return false;
}

function updateToolbarState() {
    if (currentMode !== 'text') return;
    const dom = getHighlightDOM();

    dom.btnBold?.classList.toggle('active', isInsideTag('strong'));
    dom.btnItalic?.classList.toggle('active', isInsideTag('em'));

    try {
        const block = document.queryCommandValue('formatBlock').toLowerCase();
        dom.btnH2?.classList.toggle('active', block === 'h2');
        dom.btnH3?.classList.toggle('active', block === 'h3');
    } catch (e) {}

    dom.btnList?.classList.toggle('active', document.queryCommandState('insertUnorderedList'));
}

function setupToolbar() {
    const dom = getHighlightDOM();

    dom.btnBold?.addEventListener('click', () => wrapSelection('strong'));
    dom.btnItalic?.addEventListener('click', () => wrapSelection('em'));
    dom.btnH2?.addEventListener('click', () => execFormat('formatBlock', '<h2>'));
    dom.btnH3?.addEventListener('click', () => execFormat('formatBlock', '<h3>'));
    dom.btnList?.addEventListener('click', () => execFormat('insertUnorderedList'));

    // Radio buttons для перемикання режимів
    dom.btnModeText?.addEventListener('change', () => {
        if (dom.btnModeText.checked) switchToTextMode();
    });
    dom.btnModeCode?.addEventListener('change', () => {
        if (dom.btnModeCode.checked) switchToCodeMode();
    });

    dom.toolbar?.addEventListener('mousedown', (e) => {
        if (e.target.closest('.btn-icon')) e.preventDefault();
    });

    dom.editor?.addEventListener('keyup', updateToolbarState);
    dom.editor?.addEventListener('mouseup', updateToolbarState);
}

// ============================================================================
// ПІДСВІЧУВАННЯ (використовує .highlight-banned-word з input.css)
// ============================================================================

function getPlainText() {
    const dom = getHighlightDOM();
    return currentMode === 'text' ? (dom.editor?.textContent || '') : (dom.codeEditor?.value || '');
}

function applyHighlights() {
    if (currentMode !== 'text') return;

    const dom = getHighlightDOM();
    if (!dom.editor) return;

    const regex = getValidationRegex();
    if (!regex) return;

    // Зберігаємо позицію курсора
    const caretPos = saveCaretPosition(dom.editor);

    // Видаляємо старі підсвічування
    dom.editor.querySelectorAll('.highlight-banned-word').forEach(el => {
        const text = document.createTextNode(el.textContent);
        el.parentNode.replaceChild(text, el);
    });
    dom.editor.normalize();

    // Застосовуємо нові
    highlightTextNodes(dom.editor, regex);

    // Відновлюємо курсор
    restoreCaretPosition(dom.editor, caretPos);
}

function highlightTextNodes(node, regex) {
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        // Пропускаємо порожні текстові ноди
        if (!text || !text.trim()) return;

        regex.lastIndex = 0;
        const matches = [...text.matchAll(regex)];
        if (matches.length === 0) return;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        for (const match of matches) {
            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            }

            const span = document.createElement('span');
            span.className = 'highlight-banned-word';
            span.textContent = match[0];
            fragment.appendChild(span);

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        node.parentNode.replaceChild(fragment, node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Пропускаємо підсвічені елементи та BR теги
        if (node.classList?.contains('highlight-banned-word')) return;
        if (node.tagName === 'BR') return;

        const children = Array.from(node.childNodes);
        for (const child of children) {
            highlightTextNodes(child, regex);
        }
    }
}

function clearHighlights() {
    const dom = getHighlightDOM();
    if (!dom.editor) return;

    dom.editor.querySelectorAll('.highlight-banned-word').forEach(el => {
        const text = document.createTextNode(el.textContent);
        el.parentNode.replaceChild(text, el);
    });
    dom.editor.normalize();
}

// ============================================================================
// ВАЛІДАЦІЯ
// ============================================================================

function getHtmlContent() {
    const dom = getHighlightDOM();
    if (currentMode === 'text') {
        return getCleanHtml();
    }
    return dom.codeEditor?.value || '';
}

function validateOnly() {
    const dom = getHighlightDOM();
    const text = getPlainText();
    const html = getHtmlContent();
    const regex = getValidationRegex();

    // Перевірка заборонених слів
    const wordCounts = new Map();
    let bannedCount = 0;

    if (regex && text) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
            if (match[1]) {
                const word = match[1].toLowerCase();
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
                bannedCount++;
            }
        }
    }

    // Перевірка HTML патернів
    const htmlResults = checkHtmlPatterns(html);

    displayResults(wordCounts, bannedCount, htmlResults, dom);
    updateStats();
}

function validateAndHighlight() {
    validateOnly();
    applyHighlights();
}

function displayResults(wordCounts, bannedCount, htmlResults, dom) {
    if (!dom.validationResults) return;

    const totalCount = bannedCount + htmlResults.totalCount;

    if (totalCount > 0) {
        const chips = [];

        // СПОЧАТКУ: HTML патерни (жовті чіпи)
        for (const [patternId, data] of htmlResults.patternCounts.entries()) {
            chips.push(`<span class="chip chip-warning" data-html-pattern="${patternId}">${data.pattern.name} (${data.count})</span>`);
        }

        // ПОТІМ: Заборонені слова (червоні чіпи)
        const sortedEntries = Array.from(wordCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        for (const [word, count] of sortedEntries) {
            chips.push(`<span class="chip chip-error" data-banned-word="${word}">${word} (${count})</span>`);
        }

        dom.validationResults.innerHTML = chips.join(' ');
        dom.validationResults.classList.add('has-errors');

        // Tooltip для HTML патернів (жовті чіпи)
        dom.validationResults.querySelectorAll('.chip-warning[data-html-pattern]').forEach(chip => {
            chip.addEventListener('mouseenter', (e) => {
                const patternInfo = findHtmlPatternInfo(e.target.dataset.htmlPattern);
                if (patternInfo) showTooltip(e.target, patternInfo);
            });
            chip.addEventListener('mouseleave', hideTooltip);
        });

        // Tooltip для заборонених слів (червоні чіпи)
        dom.validationResults.querySelectorAll('.chip-error[data-banned-word]').forEach(chip => {
            chip.addEventListener('mouseenter', (e) => {
                const wordInfo = findBannedWordInfo(e.target.dataset.bannedWord);
                if (wordInfo) showTooltip(e.target, wordInfo);
            });
            chip.addEventListener('mouseleave', hideTooltip);
        });
    } else {
        dom.validationResults.innerHTML = '';
        dom.validationResults.classList.remove('has-errors');
    }
}

// ============================================================================
// СТАТИСТИКА
// ============================================================================

function updateStats() {
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

// ============================================================================
// ПОШУК І ЗАМІНА
// ============================================================================

function findAndReplaceAll() {
    const dom = getHighlightDOM();
    const findText = dom.findInput?.value;
    if (!findText) return;

    const replaceText = dom.replaceInput?.value || '';

    // Зберігаємо для undo
    saveUndoState();

    if (currentMode === 'text') {
        // Для WYSIWYG режиму
        clearHighlights();
        let html = dom.editor.innerHTML;

        // Екрануємо спецсимволи для RegExp
        const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedFind, 'g');
        const count = (html.match(regex) || []).length;

        if (count === 0) {
            showToast(`Текст "${findText}" не знайдено`, 'info');
            return;
        }

        html = html.split(findText).join(replaceText);
        dom.editor.innerHTML = html;

        // Оновлюємо lastSavedContent після заміни
        lastSavedContent = getCleanHtml();

        validateAndHighlight();
        showToast(`Замінено "${findText}" на "${replaceText}" (${count} разів)`, 'success');

        // Повертаємо фокус на редактор щоб Ctrl+Z працював
        dom.editor.focus();
    } else {
        // Для режиму коду
        const text = dom.codeEditor.value;
        const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedFind, 'g');
        const count = (text.match(regex) || []).length;

        if (count === 0) {
            showToast(`Текст "${findText}" не знайдено`, 'info');
            return;
        }

        dom.codeEditor.value = text.split(findText).join(replaceText);
        validateOnly();
        showToast(`Замінено "${findText}" на "${replaceText}" (${count} разів)`, 'success');

        // Повертаємо фокус на редактор коду
        dom.codeEditor.focus();
    }
}

// ============================================================================
// RESET
// ============================================================================

function resetEditor() {
    const dom = getHighlightDOM();
    const reloadBtn = document.getElementById('reload-section-highlight');
    const icon = reloadBtn?.querySelector('span');

    // Анімація СТАРТ
    if (reloadBtn) {
        reloadBtn.disabled = true;
        reloadBtn.style.color = 'var(--color-primary)';
        icon?.classList.add('is-spinning');
    }

    // Очищаємо редактори
    if (dom.editor) dom.editor.innerHTML = '';
    if (dom.codeEditor) dom.codeEditor.value = '';
    if (dom.findInput) dom.findInput.value = '';
    if (dom.replaceInput) dom.replaceInput.value = '';

    // Скидаємо валідацію
    if (dom.validationResults) {
        dom.validationResults.innerHTML = '';
        dom.validationResults.classList.remove('has-errors');
    }

    // Скидаємо стеки undo/redo
    undoStack.length = 0;
    redoStack.length = 0;
    lastSavedContent = '';

    // Оновлюємо статистику
    updateStats();

    // Анімація СТОП
    setTimeout(() => {
        if (reloadBtn) {
            reloadBtn.disabled = false;
            reloadBtn.style.color = '';
            icon?.classList.remove('is-spinning');
        }
    }, 300);
}

// ============================================================================
// TOOLTIP ДЛЯ ПІДСВІЧЕНИХ СЛІВ
// ============================================================================

function setupEditorTooltips() {
    const dom = getHighlightDOM();
    if (!dom.editor) return;

    dom.editor.addEventListener('mouseover', (e) => {
        const highlight = e.target.closest('.highlight-banned-word');
        if (highlight) {
            const wordInfo = findBannedWordInfo(highlight.textContent.toLowerCase());
            if (wordInfo) showTooltip(highlight, wordInfo);
        }
    });

    dom.editor.addEventListener('mouseout', (e) => {
        if (e.target.closest('.highlight-banned-word')) hideTooltip();
    });
}

// ============================================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================================

async function initHighlightGenerator() {
    const dom = getHighlightDOM();
    if (!dom.editor) return;

    await initValidator();
    setupToolbar();
    setupEditorTooltips();

    // Ініціалізуємо lastSavedContent
    lastSavedContent = dom.editor.innerHTML;

    // Дебаунсовані функції
    const debouncedValidateAndHighlight = debounce(validateAndHighlight, 500);
    const debouncedSaveUndo = debounce(saveUndoState, 300);
    const debouncedSanitize = debounce(sanitizeEditor, 100);

    dom.editor.addEventListener('input', () => {
        debouncedSanitize(); // Конвертуємо div->p, b->strong, i->em
        debouncedSaveUndo();
        debouncedValidateAndHighlight();
    });

    // Reset кнопка
    const reloadBtn = document.getElementById('reload-section-highlight');
    reloadBtn?.addEventListener('click', resetEditor);

    // Find and Replace
    dom.replaceAllBtn?.addEventListener('click', findAndReplaceAll);

    // Ctrl+C - копіюємо HTML код як plain text (теги видно при вставці)
    dom.editor.addEventListener('copy', (e) => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();

        // Видаляємо підсвічування з копії
        const temp = document.createElement('div');
        temp.appendChild(fragment);
        temp.querySelectorAll('.highlight-banned-word').forEach(el => {
            const text = document.createTextNode(el.textContent);
            el.parentNode.replaceChild(text, el);
        });

        const htmlCode = temp.innerHTML; // HTML код як текст

        e.preventDefault();
        // Копіюємо HTML код як plain text - щоб при вставці в інші програми були видні теги
        e.clipboardData.setData('text/plain', htmlCode);
        showToast('Скопійовано HTML код', 'success');
    });

    // Вставка з підтримкою HTML розмітки
    dom.editor.addEventListener('paste', (e) => {
        e.preventDefault();

        // Зберігаємо для undo
        saveUndoState();

        const clipboardData = e.clipboardData || window.clipboardData;
        let text = clipboardData.getData('text/plain');

        // Детекція HTML в plain text (коли копіюють код з редактора)
        const looksLikeHtml = /<(p|strong|em|h[1-6]|ul|ol|li|br|div|span|b|i)[^>]*>/i.test(text);

        if (looksLikeHtml) {
            // Вставляємо як HTML - sanitize спочатку
            const sanitized = sanitizeHtml(text);
            document.execCommand('insertHTML', false, sanitized);
        } else {
            // Звичайний plain text - огортаємо рядки в <p>
            text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
            const lines = text.split('\n');
            const html = lines
                .map(line => line.trim() ? `<p>${escapeHtml(line)}</p>` : '')
                .filter(Boolean)
                .join('');

            if (html) {
                document.execCommand('insertHTML', false, html);
            }
        }

        // Санітизуємо весь контент після вставки
        setTimeout(() => {
            sanitizeEditor();
            debouncedValidateAndHighlight();
        }, 50);
    });

    // Обробка клавіш
    dom.editor.addEventListener('keydown', (e) => {
        // Ctrl+Z - Undo
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undo();
            return;
        }
        // Ctrl+Y або Ctrl+Shift+Z - Redo
        if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
            e.preventDefault();
            redo();
            return;
        }
        // Enter - створюємо <p>
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveUndoState();
            document.execCommand('insertParagraph');
            // Санітизуємо після створення параграфу (браузер може створити div)
            setTimeout(sanitizeEditor, 0);
        }
        // Shift+Enter - <br>
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            saveUndoState();
            document.execCommand('insertLineBreak');
        }
        // Ctrl+B для жирного (<strong>)
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            wrapSelection('strong');
        }
        // Ctrl+I для курсиву (<em>)
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'i') {
            e.preventDefault();
            wrapSelection('em');
        }
        // Ctrl+Shift+C - копіювати тільки текст без розмітки
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
            e.preventDefault();
            const selection = window.getSelection();
            if (selection.rangeCount) {
                const plainText = selection.toString();
                navigator.clipboard.writeText(plainText).then(() => {
                    showToast('Скопійовано текст (без HTML)', 'success');
                });
            }
        }
    });

    dom.codeEditor?.addEventListener('input', debounce(validateOnly, 300));

    validateAndHighlight();
    console.log('✅ Highlight Generator ініціалізовано');
}

registerPanelInitializer('aside-highlight', initHighlightGenerator);
