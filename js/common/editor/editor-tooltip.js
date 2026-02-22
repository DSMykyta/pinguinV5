// js/common/editor/editor-tooltip.js

/**
 * PLUGIN — Підказки для заборонених слів та гарячих клавіш
 *
 * - Hover на підсвіченому слові в редакторі → tooltip з інформацією
 * - Hover на чіпі валідації → tooltip з інформацією
 * - Hover на кнопці "info" → tooltip з гарячими клавішами
 *
 * Можна видалити — підсвічування працюватиме без підказок.
 */

export function init(state) {
    if (!state.config.validation) return;

    let tooltipElement = null;
    let currentHighlight = null;

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

    function hideTooltip() {
        if (tooltipElement) {
            tooltipElement.classList.remove('visible');
        }
    }

    // ================================================================
    // EDITOR TOOLTIPS — hover на підсвічених словах
    // ================================================================

    if (state.dom.editor) {
        state.dom.editor.addEventListener('mouseover', (e) => {
            const highlight = e.target.closest('.highlight-error');
            if (highlight && highlight !== currentHighlight) {
                currentHighlight = highlight;
                const wordInfo = state.findBannedWordInfo?.(highlight.textContent.toLowerCase());
                if (wordInfo) showTooltip(highlight, wordInfo);
            }
        });

        state.dom.editor.addEventListener('mouseout', (e) => {
            const highlight = e.target.closest('.highlight-error');
            if (!highlight) return;

            const relatedTarget = e.relatedTarget;
            const isStillInHighlight = relatedTarget && highlight.contains(relatedTarget);

            if (!isStillInHighlight && highlight === currentHighlight) {
                currentHighlight = null;
                hideTooltip();
            }
        });

        state.dom.editor.addEventListener('mouseleave', () => {
            if (currentHighlight) {
                currentHighlight = null;
                hideTooltip();
            }
        });
    }

    // ================================================================
    // CHIP TOOLTIPS — hover на чіпах валідації
    // ================================================================

    if (state.dom.validationResults) {
        state.dom.validationResults.addEventListener('mouseover', (e) => {
            // Заборонені слова
            const errorChip = e.target.closest('.chip.c-red[data-banned-word]');
            if (errorChip) {
                const wordInfo = state.findBannedWordInfo?.(errorChip.dataset.bannedWord);
                if (wordInfo) showTooltip(errorChip, wordInfo);
                return;
            }

            // HTML патерни
            const warningChip = e.target.closest('.chip.c-yellow[data-html-pattern]');
            if (warningChip) {
                const patternInfo = state.findHtmlPatternInfo?.(warningChip.dataset.htmlPattern);
                if (patternInfo) showTooltip(warningChip, patternInfo);
            }
        });

        state.dom.validationResults.addEventListener('mouseleave', hideTooltip);
    }

    // ================================================================
    // SHORTCUTS TOOLTIP — hover на кнопці "info"
    // ================================================================

    const section = state.dom.container?.closest('section');
    const infoBtn = section?.querySelector('button[aria-label="Інформація"]');

    if (infoBtn && !infoBtn.dataset.tooltipInit) {
        infoBtn.dataset.tooltipInit = 'true';

        let shortcutsTooltipEl = null;

        async function getShortcutsTooltip() {
            if (!shortcutsTooltipEl) {
                try {
                    const res = await fetch('templates/tooltips/tooltip-highlight-shortcuts.html');
                    const html = await res.text();
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = html.trim();
                    shortcutsTooltipEl = wrapper.firstElementChild;
                    document.body.appendChild(shortcutsTooltipEl);
                } catch (e) {
                    console.warn('[Editor Tooltip] Не вдалося завантажити shortcuts template:', e.message);
                    return null;
                }
            }
            return shortcutsTooltipEl;
        }

        infoBtn.addEventListener('mouseenter', async (e) => {
            const tooltip = await getShortcutsTooltip();
            if (!tooltip) return;
            tooltip.classList.remove('visible');

            const rect = e.currentTarget.getBoundingClientRect();
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
        });

        infoBtn.addEventListener('mouseleave', () => {
            if (shortcutsTooltipEl) {
                shortcutsTooltipEl.classList.remove('visible');
            }
        });
    }
}
