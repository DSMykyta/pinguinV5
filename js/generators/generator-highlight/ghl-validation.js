// js/generators/generator-highlight/ghl-validation.js

/**
 * VALIDATION - Валідація та відображення результатів
 */

import { getHighlightDOM } from './ghl-dom.js';
import { getCurrentMode } from './ghl-mode.js';
import { getValidationRegex, checkHtmlPatterns, findBannedWordInfo, findHtmlPatternInfo } from './ghl-validator.js';
import { getCleanHtml } from './ghl-undo.js';
import { getPlainText, updateStats } from './ghl-stats.js';
import { applyHighlights } from './ghl-highlights.js';
import { showTooltip, hideTooltip } from './ghl-tooltip.js';

/**
 * Отримати HTML контент
 */
function getHtmlContent() {
    const dom = getHighlightDOM();
    if (getCurrentMode() === 'text') {
        return getCleanHtml();
    }
    return dom.codeEditor?.value || '';
}

/**
 * Оновити fade-ефект для validation results
 */
export function updateValidationScrollFade() {
    const dom = getHighlightDOM();
    if (!dom.validationResults) return;

    const wrapper = dom.validationResults.parentElement;
    if (!wrapper || !wrapper.classList.contains('validation-results-wrapper')) return;

    const el = dom.validationResults;
    const hasScrollLeft = el.scrollLeft > 0;
    const hasScrollRight = el.scrollLeft < (el.scrollWidth - el.clientWidth - 1);

    wrapper.classList.toggle('has-scroll-left', hasScrollLeft);
    wrapper.classList.toggle('has-scroll-right', hasScrollRight);
}

/**
 * Відобразити результати валідації
 */
function displayResults(wordCounts, bannedCount, htmlResults, dom) {
    if (!dom.validationResults) return;

    const totalCount = bannedCount + htmlResults.totalCount;

    if (totalCount > 0) {
        const chips = [];

        // HTML патерни (жовті чіпи)
        for (const [patternId, data] of htmlResults.patternCounts.entries()) {
            chips.push(`<span class="chip chip-warning chip-nav" data-html-pattern="${patternId}">${data.pattern.name} (${data.count})</span>`);
        }

        // Заборонені слова (червоні чіпи)
        const sortedEntries = Array.from(wordCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        for (const [word, count] of sortedEntries) {
            chips.push(`<span class="chip chip-error chip-nav" data-banned-word="${word}">${word} (${count})</span>`);
        }

        dom.validationResults.innerHTML = chips.join(' ');
        dom.validationResults.classList.add('has-errors');

        // Tooltip для HTML патернів
        dom.validationResults.querySelectorAll('.chip-warning[data-html-pattern]').forEach(chip => {
            chip.addEventListener('mouseenter', (e) => {
                const patternInfo = findHtmlPatternInfo(e.target.dataset.htmlPattern);
                if (patternInfo) showTooltip(e.target, patternInfo);
            });
            chip.addEventListener('mouseleave', hideTooltip);
        });

        // Tooltip для заборонених слів
        dom.validationResults.querySelectorAll('.chip-error[data-banned-word]').forEach(chip => {
            chip.addEventListener('mouseenter', (e) => {
                const wordInfo = findBannedWordInfo(e.target.dataset.bannedWord);
                if (wordInfo) showTooltip(e.target, wordInfo);
            });
            chip.addEventListener('mouseleave', hideTooltip);
        });

        setTimeout(updateValidationScrollFade, 0);
    } else {
        dom.validationResults.innerHTML = '';
        dom.validationResults.classList.remove('has-errors');
        updateValidationScrollFade();
    }
}

/**
 * Тільки валідація (без підсвічування)
 */
export function validateOnly() {
    const dom = getHighlightDOM();
    const text = getPlainText();
    const html = getHtmlContent();
    const regex = getValidationRegex();

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

    const htmlResults = checkHtmlPatterns(html);

    displayResults(wordCounts, bannedCount, htmlResults, dom);
    updateStats();
}

/**
 * Валідація з підсвічуванням
 */
export function validateAndHighlight() {
    validateOnly();
    applyHighlights();
}
