// js/generators/generator-highlight/ghl-tooltip.js

/**
 * TOOLTIP - Підказки для заборонених слів та гарячих клавіш
 */

import { getHighlightDOM } from './ghl-dom.js';
import { findBannedWordInfo } from './ghl-validator.js';

// ============================================================================
// BANNED WORD TOOLTIP
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

export function showTooltip(target, wordInfo) {
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

    tooltip.style.cssText = `position: fixed; visibility: hidden; display: block;`;
    const tooltipRect = tooltip.getBoundingClientRect();

    if (top + tooltipRect.height > window.innerHeight) {
        top = rect.top - tooltipRect.height - 8;
    }
    if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 10;
    }
    if (left < 10) left = 10;

    tooltip.style.cssText = `position: fixed; top: ${top}px; left: ${left}px;`;
    tooltip.classList.add('visible');
}

export function hideTooltip() {
    if (tooltipElement) {
        tooltipElement.classList.remove('visible');
    }
}

// ============================================================================
// SHORTCUTS TOOLTIP
// ============================================================================

let shortcutsTooltipElement = null;

function getShortcutsTooltip() {
    if (!shortcutsTooltipElement) {
        shortcutsTooltipElement = document.createElement('div');
        shortcutsTooltipElement.className = 'shortcuts-tooltip';
        shortcutsTooltipElement.innerHTML = `
            <div class="tooltip-title">Гарячі клавіші</div>
            <div class="shortcuts-list">
                <div class="shortcut-item">
                    <kbd>Ctrl</kbd> + <kbd>B</kbd>
                    <span>Жирний текст</span>
                </div>
                <div class="shortcut-item">
                    <kbd>Ctrl</kbd> + <kbd>I</kbd>
                    <span>Курсив</span>
                </div>
                <div class="shortcut-item">
                    <kbd>Ctrl</kbd> + <kbd>Z</kbd>
                    <span>Скасувати</span>
                </div>
                <div class="shortcut-item">
                    <kbd>Ctrl</kbd> + <kbd>Y</kbd>
                    <span>Повторити</span>
                </div>
                <div class="shortcut-item">
                    <kbd>Ctrl</kbd> + <kbd>C</kbd>
                    <span>Копіювати HTML код</span>
                </div>
                <div class="shortcut-item">
                    <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd>
                    <span>Копіювати текст</span>
                </div>
                <div class="shortcut-item">
                    <kbd>Enter</kbd>
                    <span>Новий параграф</span>
                </div>
                <div class="shortcut-item">
                    <kbd>Shift</kbd> + <kbd>Enter</kbd>
                    <span>Новий рядок</span>
                </div>
            </div>
        `;
        document.body.appendChild(shortcutsTooltipElement);
    }
    return shortcutsTooltipElement;
}

function showShortcutsTooltip(target) {
    const tooltip = getShortcutsTooltip();
    tooltip.classList.remove('visible');

    const rect = target.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left;

    tooltip.style.cssText = 'position: fixed; visibility: hidden; display: block;';
    const tooltipRect = tooltip.getBoundingClientRect();

    if (top + tooltipRect.height > window.innerHeight) {
        top = rect.top - tooltipRect.height - 8;
    }
    if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 10;
    }
    if (left < 10) left = 10;

    tooltip.style.cssText = `position: fixed; top: ${top}px; left: ${left}px;`;
    tooltip.classList.add('visible');
}

function hideShortcutsTooltip() {
    if (shortcutsTooltipElement) {
        shortcutsTooltipElement.classList.remove('visible');
    }
}

export function setupInfoButtonTooltip() {
    const section = document.getElementById('section-highlight');
    if (!section) return;

    const infoBtn = section.querySelector('button[aria-label="Інформація"]');
    if (!infoBtn) return;

    if (infoBtn.dataset.tooltipInit) return;
    infoBtn.dataset.tooltipInit = 'true';

    infoBtn.addEventListener('mouseenter', (e) => {
        showShortcutsTooltip(e.currentTarget);
    });
    infoBtn.addEventListener('mouseleave', hideShortcutsTooltip);
}

// ============================================================================
// EDITOR TOOLTIPS
// ============================================================================

export function setupEditorTooltips() {
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

// Ініціалізуємо tooltip одразу при завантаженні сторінки
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupInfoButtonTooltip);
} else {
    setupInfoButtonTooltip();
}
