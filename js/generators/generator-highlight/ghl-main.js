// js/generators/generator-highlight/ghl-main.js

/**
 * HIGHLIGHT GENERATOR - Редактор з підсвічуванням заборонених слів
 *
 * Два режими: Текст (plain text з br) і Код (HTML)
 * Використовує існуючі стилі: .banned-word-highlight, .banned-word-tooltip, .chip-error
 */

import { registerPanelInitializer } from '../../panel/panel-right.js';
import { getHighlightDOM } from './ghl-dom.js';
import { initValidator, getValidationRegex, findBannedWordInfo, checkHtmlPatterns, findHtmlPatternInfo } from './ghl-validator.js';
import { debounce } from '../../utils/common-utils.js';

// ============================================================================
// СТАН
// ============================================================================

let currentMode = 'text';

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

    const rect = target.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left;

    tooltip.style.display = 'block';
    tooltip.style.opacity = '0';

    const tooltipRect = tooltip.getBoundingClientRect();

    if (top + tooltipRect.height > window.innerHeight) {
        top = rect.top - tooltipRect.height - 8;
    }
    if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 10;
    }
    if (left < 10) left = 10;

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
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

    dom.btnModeText?.classList.add('active');
    dom.btnModeCode?.classList.remove('active');

    enableFormatButtons(true);
    currentMode = 'text';
    validateAndHighlight();
}

function switchToCodeMode() {
    const dom = getHighlightDOM();
    if (currentMode === 'code') return;

    clearHighlights();
    dom.codeEditor.value = dom.editor.innerHTML;

    dom.editor.style.display = 'none';
    dom.codeEditor.style.display = '';

    dom.btnModeText?.classList.remove('active');
    dom.btnModeCode?.classList.add('active');

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

    const range = selection.getRangeAt(0);

    // Перевіряємо, чи вже обгорнуто цим тегом
    const parentTag = range.commonAncestorContainer.parentElement?.closest(tagName);
    if (parentTag && dom.editor.contains(parentTag)) {
        // Знімаємо тег - витягуємо вміст
        const fragment = document.createDocumentFragment();
        while (parentTag.firstChild) {
            fragment.appendChild(parentTag.firstChild);
        }
        parentTag.parentNode.replaceChild(fragment, parentTag);
    } else {
        // Додаємо тег
        const wrapper = document.createElement(tagName);
        wrapper.appendChild(range.extractContents());
        range.insertNode(wrapper);
        selection.selectAllChildren(wrapper);
    }

    updateToolbarState();
}

function execFormat(command, value = null) {
    if (currentMode !== 'text') return;
    const dom = getHighlightDOM();
    dom.editor?.focus();
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

    dom.btnModeText?.addEventListener('click', switchToTextMode);
    dom.btnModeCode?.addEventListener('click', switchToCodeMode);

    dom.toolbar?.addEventListener('mousedown', (e) => {
        if (e.target.closest('.btn-icon')) e.preventDefault();
    });

    dom.editor?.addEventListener('keyup', updateToolbarState);
    dom.editor?.addEventListener('mouseup', updateToolbarState);
}

// ============================================================================
// ПІДСВІЧУВАННЯ (використовує .banned-word-highlight з input.css)
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
    dom.editor.querySelectorAll('.banned-word-highlight').forEach(el => {
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
            span.className = 'banned-word-highlight';
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
        if (node.classList?.contains('banned-word-highlight')) return;
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

    dom.editor.querySelectorAll('.banned-word-highlight').forEach(el => {
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
        // Тимчасово видаляємо підсвічування для отримання чистого HTML
        const clone = dom.editor.cloneNode(true);
        clone.querySelectorAll('.banned-word-highlight').forEach(el => {
            const text = document.createTextNode(el.textContent);
            el.parentNode.replaceChild(text, el);
        });
        return clone.innerHTML;
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
// TOOLTIP ДЛЯ ПІДСВІЧЕНИХ СЛІВ
// ============================================================================

function setupEditorTooltips() {
    const dom = getHighlightDOM();
    if (!dom.editor) return;

    dom.editor.addEventListener('mouseover', (e) => {
        const highlight = e.target.closest('.banned-word-highlight');
        if (highlight) {
            const wordInfo = findBannedWordInfo(highlight.textContent.toLowerCase());
            if (wordInfo) showTooltip(highlight, wordInfo);
        }
    });

    dom.editor.addEventListener('mouseout', (e) => {
        if (e.target.closest('.banned-word-highlight')) hideTooltip();
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

    // Валідація і підсвічування в реальному часі
    const debouncedValidateAndHighlight = debounce(validateAndHighlight, 500);

    dom.editor.addEventListener('input', debouncedValidateAndHighlight);

    // Копіювання з HTML розміткою (без .banned-word-highlight)
    dom.editor.addEventListener('copy', (e) => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();

        // Видаляємо підсвічування з копії
        const temp = document.createElement('div');
        temp.appendChild(fragment);
        temp.querySelectorAll('.banned-word-highlight').forEach(el => {
            const text = document.createTextNode(el.textContent);
            el.parentNode.replaceChild(text, el);
        });

        const html = temp.innerHTML;
        const plainText = temp.textContent;

        e.preventDefault();
        e.clipboardData.setData('text/html', html);
        e.clipboardData.setData('text/plain', plainText);
    });

    // Вставка з підтримкою HTML розмітки
    dom.editor.addEventListener('paste', (e) => {
        e.preventDefault();
        const clipboardData = e.clipboardData || window.clipboardData;

        // Спочатку пробуємо HTML
        let html = clipboardData.getData('text/html');

        if (html) {
            // Очищаємо HTML від зайвих атрибутів та стилів
            const temp = document.createElement('div');
            temp.innerHTML = html;

            // Видаляємо всі style, class та інші атрибути, залишаємо тільки чисті теги
            temp.querySelectorAll('*').forEach(el => {
                // Дозволені теги
                const allowedTags = ['P', 'STRONG', 'EM', 'H2', 'H3', 'UL', 'OL', 'LI', 'BR'];
                if (!allowedTags.includes(el.tagName)) {
                    // Замінюємо недозволений тег на span без атрибутів
                    if (el.tagName === 'B') {
                        const strong = document.createElement('strong');
                        strong.innerHTML = el.innerHTML;
                        el.parentNode.replaceChild(strong, el);
                    } else if (el.tagName === 'I') {
                        const em = document.createElement('em');
                        em.innerHTML = el.innerHTML;
                        el.parentNode.replaceChild(em, el);
                    } else if (el.tagName === 'DIV') {
                        const p = document.createElement('p');
                        p.innerHTML = el.innerHTML;
                        el.parentNode.replaceChild(p, el);
                    }
                }
                // Видаляємо всі атрибути
                while (el.attributes.length > 0) {
                    el.removeAttribute(el.attributes[0].name);
                }
            });

            document.execCommand('insertHTML', false, temp.innerHTML);
        } else {
            // Якщо немає HTML, вставляємо plain text
            let text = clipboardData.getData('text/plain');
            text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
            document.execCommand('insertText', false, text);
        }

        setTimeout(debouncedValidateAndHighlight, 50);
    });

    // Обробка клавіш
    dom.editor.addEventListener('keydown', (e) => {
        // Enter - створюємо <p> (стандартна поведінка formatBlock)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.execCommand('insertParagraph');
        }
        // Shift+Enter - <br>
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            document.execCommand('insertLineBreak');
        }
        // Ctrl+B для жирного (<strong>)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            wrapSelection('strong');
        }
        // Ctrl+I для курсиву (<em>)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
            e.preventDefault();
            wrapSelection('em');
        }
    });

    dom.codeEditor?.addEventListener('input', debounce(validateOnly, 300));

    validateAndHighlight();
    console.log('✅ Highlight Generator ініціалізовано');
}

registerPanelInitializer('aside-highlight', initHighlightGenerator);
