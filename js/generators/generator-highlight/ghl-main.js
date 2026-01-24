// js/generators/generator-highlight/ghl-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║           HIGHLIGHT GENERATOR - MAIN (ОНОВЛЕНА ВЕРСІЯ)                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Інтеграція Rich Text Editor з валідатором заборонених слів
 */

import { registerPanelInitializer } from '../../panel/panel-right.js';
import { getHighlightDOM } from './ghl-dom.js';
import { initRichEditor, getPlainText, getEditorElement, applyHighlights, clearHighlights } from './ghl-editor.js';
import { initValidator, getValidationRegex, getBannedWordsData, findBannedWordInfo } from './ghl-validator.js';
import { debounce } from '../../utils/common-utils.js';

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
// ВАЛІДАЦІЯ ТА ПІДСВІЧУВАННЯ
// ============================================================================

/**
 * Виконує валідацію тексту та оновлює UI
 */
function validateAndHighlight() {
    const dom = getHighlightDOM();
    const editorEl = getEditorElement();
    if (!editorEl) return;

    const text = getPlainText();
    const regex = getValidationRegex();

    // Очищаємо старі підсвічування
    clearHighlights();

    // Якщо є regex - застосовуємо підсвічування
    if (regex && text.trim()) {
        applyHighlights(regex, 'highlight-banned-word');
    }

    // Рахуємо заборонені слова
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

    // Оновлюємо чіпи з результатами
    displayResults(wordCounts, totalCount, dom);
}

/**
 * Відображає результати валідації
 */
function displayResults(wordCounts, totalCount, dom) {
    if (!dom.validationResults) return;

    if (totalCount > 0) {
        const sortedEntries = Array.from(wordCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        const chips = sortedEntries.map(([word, count]) =>
            `<span class="chip chip-error" data-banned-word="${word}">${word} (${count})</span>`
        ).join(' ');

        dom.validationResults.innerHTML = chips;
        dom.validationResults.classList.add('has-errors');

        // Tooltip обробники
        dom.validationResults.querySelectorAll('.chip-error[data-banned-word]').forEach(chip => {
            chip.addEventListener('mouseenter', (e) => {
                const word = e.target.dataset.bannedWord;
                const wordInfo = findBannedWordInfo(word);
                if (wordInfo) {
                    showTooltip(e.target, wordInfo);
                }
            });
            chip.addEventListener('mouseleave', hideTooltip);
        });
    } else {
        dom.validationResults.innerHTML = '';
        dom.validationResults.classList.remove('has-errors');
    }
}

/**
 * Налаштовує tooltip для підсвічених слів в редакторі
 */
function setupEditorTooltips() {
    const editorEl = getEditorElement();
    if (!editorEl) return;

    editorEl.addEventListener('mouseover', (e) => {
        const mark = e.target.closest('mark.highlight-banned-word');
        if (mark) {
            const word = mark.textContent.toLowerCase();
            const wordInfo = findBannedWordInfo(word);
            if (wordInfo) {
                showTooltip(mark, wordInfo);
            }
        }
    });

    editorEl.addEventListener('mouseout', (e) => {
        const mark = e.target.closest('mark.highlight-banned-word');
        if (mark) {
            hideTooltip();
        }
    });
}

// ============================================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================================

async function initHighlightGenerator() {
    const dom = getHighlightDOM();
    if (!dom.editorContainer) return;

    // 1. Ініціалізуємо редактор
    initRichEditor();

    // 2. Завантажуємо заборонені слова
    await initValidator();

    // 3. Налаштовуємо обробники
    const editorEl = getEditorElement();
    if (editorEl) {
        const debouncedValidate = debounce(validateAndHighlight, 300);
        editorEl.addEventListener('input', debouncedValidate);
        editorEl.addEventListener('paste', () => setTimeout(debouncedValidate, 50));
    }

    // 4. Tooltip для підсвічених слів
    setupEditorTooltips();

    // 5. Початкова валідація
    validateAndHighlight();

    console.log('✅ Highlight Generator з Rich Editor ініціалізовано');
}

// Реєструємо ініціалізатор
registerPanelInitializer('aside-highlight', initHighlightGenerator);
