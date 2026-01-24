// js/generators/generator-highlight/ghl-main.js

/**
 * HIGHLIGHT GENERATOR - Редактор з підсвічуванням заборонених слів
 *
 * Два режими: Текст (plain text з br) і Код (HTML)
 * Використовує існуючі стилі: .banned-word-highlight, .banned-word-tooltip, .chip-error
 */

import { registerPanelInitializer } from '../../panel/panel-right.js';
import { getHighlightDOM } from './ghl-dom.js';
import { initValidator, getValidationRegex, findBannedWordInfo } from './ghl-validator.js';
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
// ФОРМАТУВАННЯ - чисті теги без стилів
// ============================================================================

function execFormat(command, value = null) {
    if (currentMode !== 'text') return;
    const dom = getHighlightDOM();
    dom.editor?.focus();
    document.execCommand(command, false, value);
    updateToolbarState();
}

function updateToolbarState() {
    if (currentMode !== 'text') return;
    const dom = getHighlightDOM();

    dom.btnBold?.classList.toggle('active', document.queryCommandState('bold'));
    dom.btnItalic?.classList.toggle('active', document.queryCommandState('italic'));

    try {
        const block = document.queryCommandValue('formatBlock').toLowerCase();
        dom.btnH2?.classList.toggle('active', block === 'h2');
        dom.btnH3?.classList.toggle('active', block === 'h3');
    } catch (e) {}

    dom.btnList?.classList.toggle('active', document.queryCommandState('insertUnorderedList'));
}

function setupToolbar() {
    const dom = getHighlightDOM();

    dom.btnBold?.addEventListener('click', () => execFormat('bold'));
    dom.btnItalic?.addEventListener('click', () => execFormat('italic'));
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

function validateOnly() {
    const dom = getHighlightDOM();
    const text = getPlainText();
    const regex = getValidationRegex();

    const wordCounts = new Map();
    let totalCount = 0;

    if (regex && text) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
            if (match[1]) {
                const word = match[1].toLowerCase();
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
                totalCount++;
            }
        }
    }

    displayResults(wordCounts, totalCount, dom);
}

function validateAndHighlight() {
    validateOnly();
    applyHighlights();
}

function displayResults(wordCounts, totalCount, dom) {
    if (!dom.validationResults) return;

    if (totalCount > 0) {
        const sortedEntries = Array.from(wordCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        const chips = sortedEntries.map(([word, count]) =>
            `<span class="chip chip-error" data-banned-word="${word}">${word} (${count})</span>`
        ).join(' ');

        dom.validationResults.innerHTML = chips;
        dom.validationResults.classList.add('has-errors');

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

    // Нормалізація вставленого тексту - тільки plain text
    dom.editor.addEventListener('paste', (e) => {
        e.preventDefault();
        let text = (e.clipboardData || window.clipboardData).getData('text/plain');
        // Нормалізуємо переноси рядків
        text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
        document.execCommand('insertText', false, text);
        setTimeout(debouncedValidateAndHighlight, 50);
    });

    // Обробка клавіш
    dom.editor.addEventListener('keydown', (e) => {
        // Enter - створюємо <br> замість <div>
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.execCommand('insertLineBreak');
        }
        // Ctrl+B для жирного
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            execFormat('bold');
        }
        // Ctrl+I для курсиву
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
            e.preventDefault();
            execFormat('italic');
        }
    });

    dom.codeEditor?.addEventListener('input', debounce(validateOnly, 300));

    validateAndHighlight();
    console.log('✅ Highlight Generator ініціалізовано');
}

registerPanelInitializer('aside-highlight', initHighlightGenerator);
