// js/generators/generator-table/gt-event-handler.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          TABLE GENERATOR - ОБРОБНИК ПОДІЙ (EVENT HANDLER)                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Центральний модуль для налаштування всіх глобальних слухачів подій.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - setupEventListeners() - Налаштовує всі слухачі подій для генератора
 */

import { getTableDOM } from './gt-dom.js';
import { createAndAppendRow, initializeEmptyRow } from './gt-row-manager.js';
import { getNutritionFacts, getVitamins, getAminoAcids } from './gt-data-provider.js';
import { closeModal } from '../../common/ui-modal.js';
import { calculatePercentages, checkForEmptyNutritionFacts, markEssentialAminoAcids } from './gt-calculator.js';
import { generateHtmlTable } from './gt-html-builder.js';
import { generateBrText } from './gt-br-builder.js';
import { processAndFillInputs } from './gt-magic-parser.js';
import { initMagicHints, destroyMagicHints } from './gt-magic-hints.js';
import { copyToClipboard, debounce } from './gt-utils.js';
import { autoSaveSession } from './gt-session-manager.js';
import { addSampleList, addSampleTemplate } from './gt-template-helpers.js';

export function setupEventListeners() {
    const dom = getTableDOM();
    if (!dom.rowsContainer) return;

    const rightPanel = document.getElementById('panel-right');
    if (rightPanel) {
        rightPanel.addEventListener('click', (event) => {
            const target = event.target.closest('[id]');
            if (!target) return;
            const actions = {
                'add-input-btn': () => createAndAppendRow(),
                'add-empty-line-btn': () => initializeEmptyRow(),
                'add-ingredients-btn': () => addSampleTemplate('ingredients'),
                'add-warning-btn': () => addSampleTemplate('warning'),
                'add-composition-btn': () => addSampleTemplate('composition'),
                'add-nutrition-btn': () => addSampleList(getNutritionFacts()),
                'add-vitamins-btn': () => addSampleList(getVitamins()),
                'add-aminos-btn': () => addSampleList(getAminoAcids()),
                'result-card-html': () => {
                    if (checkForEmptyNutritionFacts()) return;
                    copyToClipboard(generateHtmlTable());
                },
                'result-card-br': () => {
                    if (checkForEmptyNutritionFacts()) return;
                    copyToClipboard(generateBrText());
                }
            };
            if (actions[target.id]) actions[target.id](event);
        });
    }

    document.addEventListener('click', (event) => {
        const magicApplyBtn = event.target.closest('#magic-apply-btn');
        if (magicApplyBtn) handleMagicApply();

        const modalCloseBtn = event.target.closest('[data-modal-close]');
        if (modalCloseBtn) {
             closeModal();
        }
    });

    // Слухаємо modal-opened event для preview та magic hints
    document.addEventListener('modal-opened', handleTablePreview);
    document.addEventListener('modal-opened', handleMagicModalOpened);
    document.addEventListener('modal-closed', handleMagicModalClosed);

    const debouncedCalculateAndSave = debounce(() => {
        calculatePercentages();
        markEssentialAminoAcids();
        autoSaveSession();
    }, 300);
    dom.rowsContainer.addEventListener('input', debouncedCalculateAndSave);
}


// --- Допоміжні функції для обробників ---

function handleMagicApply() {
    const magicTextEl = document.getElementById('magic-text');
    if (magicTextEl) {
        processAndFillInputs(magicTextEl.value);
        magicTextEl.value = '';
    }
    closeModal();
}

/**
 * Ініціалізує magic hints при відкритті модалі магічного парсингу
 * @param {CustomEvent} event - Подія modal-opened
 */
function handleMagicModalOpened(event) {
    if (!event.detail) return;
    const { modalId } = event.detail;
    if (modalId === 'magic-modal') {
        initMagicHints();
    }
}

/**
 * Знищує magic hints при закритті модалі магічного парсингу
 * @param {CustomEvent} event - Подія modal-closed
 */
function handleMagicModalClosed(event) {
    if (!event.detail) return;
    const { modalId } = event.detail;
    if (modalId === 'magic-modal') {
        destroyMagicHints();
    }
}

/**
 * Обробляє запит на попередній перегляд таблиці
 * @param {CustomEvent} event - Подія modal-opened
 */
function handleTablePreview(event) {
    if (!event.detail) return;
    const { modalId, trigger } = event.detail;

    // Перевіряємо чи це preview-modal-table
    if (modalId !== 'preview-modal-table') return;

    const previewType = trigger?.dataset?.previewTarget;
    if (!previewType) return;

    // Перевіряємо чи це табличний preview (html або br)
    if (!['html', 'br'].includes(previewType)) return;

    setTimeout(() => {
        const contentTarget = document.getElementById('preview-content-target-table');
        if (!contentTarget) {
            console.error('Не знайдено цільовий елемент #preview-content-target-table у модальному вікні.');
            return;
        }

        if (checkForEmptyNutritionFacts(true)) {
            contentTarget.innerHTML = `<p style="color: var(--color-error);">Помилка: обов'язкове поле "Пищевая ценность" не заповнено!</p>`;
            return;
        }

        let generatedContent = '';
        if (previewType === 'html') {
            generatedContent = generateHtmlTable();
        } else if (previewType === 'br') {
            generatedContent = generateBrText();
        }

        contentTarget.innerHTML = generatedContent || '<p>Нічого для відображення.</p>';
    }, 50);
}
