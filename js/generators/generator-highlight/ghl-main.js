// js/generators/generator-highlight/ghl-main.js

/**
 * HIGHLIGHT GENERATOR - ПОВНОЦІННИЙ WYSIWYG РЕДАКТОР
 *
 * Два режими:
 * - Текст (WYSIWYG) - візуальне редагування
 * - Код (HTML) - редагування HTML коду
 *
 * Підсвічування заборонених слів в обох режимах
 */

import { registerPanelInitializer } from '../../panel/panel-right.js';
import { getHighlightDOM } from './ghl-dom.js';
import { initValidator, getValidationRegex, findBannedWordInfo } from './ghl-validator.js';
import { debounce } from '../../utils/common-utils.js';

// ============================================================================
// СТАН
// ============================================================================

let currentMode = 'text'; // 'text' або 'code'

// ============================================================================
// TOOLTIP
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
    tooltip.style.visibility = 'hidden';
    tooltip.style.display = 'block';

    const tooltipHeight = tooltip.offsetHeight;
    const tooltipWidth = tooltip.offsetWidth;

    let top = rect.bottom + 8;
    let left = rect.left;

    if (top + tooltipHeight > window.innerHeight) {
        top = rect.top - tooltipHeight - 8;
    }
    if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth - 10;
    }
    if (left < 10) {
        left = 10;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.style.visibility = '';
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

    // Синхронізуємо контент: код -> текст
    dom.editor.innerHTML = dom.codeEditor.value;

    // Перемикаємо видимість
    dom.editor.style.display = '';
    dom.codeEditor.style.display = 'none';

    // Оновлюємо кнопки
    dom.btnModeText?.classList.add('active');
    dom.btnModeCode?.classList.remove('active');

    // Вмикаємо кнопки форматування
    enableFormatButtons(true);

    currentMode = 'text';
    validateText();
}

function switchToCodeMode() {
    const dom = getHighlightDOM();
    if (currentMode === 'code') return;

    // Очищаємо підсвічування перед синхронізацією
    clearHighlights();

    // Синхронізуємо контент: текст -> код
    dom.codeEditor.value = dom.editor.innerHTML;

    // Перемикаємо видимість
    dom.editor.style.display = 'none';
    dom.codeEditor.style.display = '';

    // Оновлюємо кнопки
    dom.btnModeText?.classList.remove('active');
    dom.btnModeCode?.classList.add('active');

    // Вимикаємо кнопки форматування
    enableFormatButtons(false);

    currentMode = 'code';
    validateText();
}

function enableFormatButtons(enabled) {
    const dom = getHighlightDOM();
    const buttons = [dom.btnBold, dom.btnItalic, dom.btnH2, dom.btnH3, dom.btnList];

    buttons.forEach(btn => {
        if (btn) {
            btn.disabled = !enabled;
            btn.classList.toggle('text-disabled', !enabled);
        }
    });
}

// ============================================================================
// ФОРМАТУВАННЯ (execCommand) - тільки для режиму тексту
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

    if (dom.btnBold) {
        dom.btnBold.classList.toggle('active', document.queryCommandState('bold'));
    }
    if (dom.btnItalic) {
        dom.btnItalic.classList.toggle('active', document.queryCommandState('italic'));
    }

    try {
        const block = document.queryCommandValue('formatBlock').toLowerCase();
        if (dom.btnH2) dom.btnH2.classList.toggle('active', block === 'h2');
        if (dom.btnH3) dom.btnH3.classList.toggle('active', block === 'h3');
    } catch (e) {}

    if (dom.btnList) {
        dom.btnList.classList.toggle('active', document.queryCommandState('insertUnorderedList'));
    }
}

function setupToolbar() {
    const dom = getHighlightDOM();

    // Кнопки форматування
    dom.btnBold?.addEventListener('click', () => execFormat('bold'));
    dom.btnItalic?.addEventListener('click', () => execFormat('italic'));
    dom.btnH2?.addEventListener('click', () => execFormat('formatBlock', '<h2>'));
    dom.btnH3?.addEventListener('click', () => execFormat('formatBlock', '<h3>'));
    dom.btnList?.addEventListener('click', () => execFormat('insertUnorderedList'));

    // Перемикачі режимів
    dom.btnModeText?.addEventListener('click', switchToTextMode);
    dom.btnModeCode?.addEventListener('click', switchToCodeMode);

    // Не втрачаємо фокус при кліку на тулбар
    dom.toolbar?.addEventListener('mousedown', (e) => {
        if (e.target.closest('.btn-icon')) {
            e.preventDefault();
        }
    });

    // Гарячі клавіші
    dom.editor?.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    execFormat('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    execFormat('italic');
                    break;
            }
        }
    });

    // Оновлюємо стан кнопок
    dom.editor?.addEventListener('keyup', updateToolbarState);
    dom.editor?.addEventListener('mouseup', updateToolbarState);
}

// ============================================================================
// ПІДСВІЧУВАННЯ ЗАБОРОНЕНИХ СЛІВ (тільки для режиму тексту)
// ============================================================================

function getPlainText() {
    const dom = getHighlightDOM();
    if (currentMode === 'text') {
        return dom.editor?.textContent || '';
    } else {
        return dom.codeEditor?.value || '';
    }
}

function applyHighlights() {
    if (currentMode !== 'text') return;

    const dom = getHighlightDOM();
    if (!dom.editor) return;

    const regex = getValidationRegex();
    if (!regex) return;

    // Видаляємо старі mark
    const marks = dom.editor.querySelectorAll('mark.highlight-banned-word');
    marks.forEach(mark => {
        const text = document.createTextNode(mark.textContent);
        mark.parentNode.replaceChild(text, mark);
    });

    dom.editor.normalize();
    highlightTextNodes(dom.editor, regex);
}

function highlightTextNodes(node, regex) {
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (!text.trim()) return;

        regex.lastIndex = 0;
        const matches = [...text.matchAll(regex)];
        if (matches.length === 0) return;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        for (const match of matches) {
            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            }

            const mark = document.createElement('mark');
            mark.className = 'highlight-banned-word';
            mark.textContent = match[0];
            fragment.appendChild(mark);

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        node.parentNode.replaceChild(fragment, node);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'MARK') {
        const children = Array.from(node.childNodes);
        for (const child of children) {
            highlightTextNodes(child, regex);
        }
    }
}

function clearHighlights() {
    const dom = getHighlightDOM();
    if (!dom.editor) return;

    const marks = dom.editor.querySelectorAll('mark.highlight-banned-word');
    marks.forEach(mark => {
        const text = document.createTextNode(mark.textContent);
        mark.parentNode.replaceChild(text, mark);
    });
    dom.editor.normalize();
}

// ============================================================================
// ВАЛІДАЦІЯ
// ============================================================================

function validateText() {
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
                const currentCount = wordCounts.get(word) || 0;
                wordCounts.set(word, currentCount + 1);
                totalCount++;
            }
        }
    }

    displayResults(wordCounts, totalCount, dom);
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
                const word = e.target.dataset.bannedWord;
                const wordInfo = findBannedWordInfo(word);
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
        const mark = e.target.closest('mark.highlight-banned-word');
        if (mark) {
            const word = mark.textContent.toLowerCase();
            const wordInfo = findBannedWordInfo(word);
            if (wordInfo) showTooltip(mark, wordInfo);
        }
    });

    dom.editor.addEventListener('mouseout', (e) => {
        if (e.target.closest('mark.highlight-banned-word')) {
            hideTooltip();
        }
    });
}

// ============================================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================================

async function initHighlightGenerator() {
    const dom = getHighlightDOM();
    if (!dom.editor) return;

    // 1. Завантажуємо заборонені слова
    await initValidator();

    // 2. Налаштовуємо тулбар
    setupToolbar();

    // 3. Tooltip для підсвічених слів
    setupEditorTooltips();

    // 4. Валідація при введенні
    const debouncedValidate = debounce(validateText, 300);

    // Режим тексту
    dom.editor.addEventListener('input', debouncedValidate);
    dom.editor.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
        setTimeout(debouncedValidate, 50);
    });

    // Режим коду
    dom.codeEditor?.addEventListener('input', debouncedValidate);

    // 5. Підсвічування при втраті фокусу (тільки режим тексту)
    dom.editor.addEventListener('blur', applyHighlights);
    dom.editor.addEventListener('focus', clearHighlights);

    // 6. Початкова валідація
    validateText();

    console.log('✅ Highlight Generator ініціалізовано (Text/Code режими)');
}

registerPanelInitializer('aside-highlight', initHighlightGenerator);
