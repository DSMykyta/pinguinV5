// js/generators/generator-table/gt-event-handler.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          TABLE GENERATOR - ОБРОБНИК ПОДІЙ (EVENT HANDLER)                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * * ПРИЗНАЧЕННЯ:
 * Центральний модуль для налаштування всіх глобальних слухачів подій,
 * включаючи логіку для модального вікна підтвердження очищення.
 */

import { getTableDOM } from './gt-dom.js';
import { createAndAppendRow, initializeEmptyRow, resetTableSection } from './gt-row-manager.js';
import { handleInputTypeSwitch } from './gt-row-renderer.js';
import { getNutritionFacts, getVitamins, getAminoAcids } from './gt-data-provider.js';
import { calculatePercentages, checkForEmptyNutritionFacts } from './gt-calculator.js';
import { generateHtmlTable } from './gt-html-builder.js';
import { generateBrText } from './gt-br-builder.js';
import { processAndFillInputs } from './gt-magic-parser.js';
import { copyToClipboard, debounce } from './gt-utils.js';
import { autoSaveSession } from './gt-session-manager.js';

export function setupEventListeners() {
    const dom = getTableDOM();
    if (!dom.rowsContainer) return;

    if (dom.reloadBtn) {
        dom.reloadBtn.dataset.modalTrigger = 'confirm-clear-modal';
        dom.reloadBtn.dataset.modalSize = 'small';
    }

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
                'result-card-html': (e) => {
                    if (!e.target.closest('[data-dropdown-trigger]')) {
                        if (checkForEmptyNutritionFacts()) return;
                        copyToClipboard(generateHtmlTable(), target);
                    }
                },
                'result-card-br': (e) => {
                    if (!e.target.closest('[data-dropdown-trigger]')) {
                        if (checkForEmptyNutritionFacts()) return;
                        copyToClipboard(generateBrText(), target);
                    }
                }
            };
            if (actions[target.id]) actions[target.id](event);
        });
    }

    document.addEventListener('click', (event) => {
        const magicApplyBtn = event.target.closest('#magic-apply-btn');
        if (magicApplyBtn) handleMagicApply();

        // ВИДАЛЕНО старий handlePreview

        const confirmClearBtn = event.target.closest('#confirm-clear-action');
        if (confirmClearBtn) {
            resetTableSection();
            document.querySelector('#global-modal-wrapper .modal-close-btn')?.click();
        }

        const modalCloseBtn = event.target.closest('[data-modal-close]');
        if (modalCloseBtn) {
             document.querySelector('#global-modal-wrapper .modal-close-btn')?.click();
        }
    });

    // ДОДАНО: Слухаємо modal-opened event
    document.addEventListener('modal-opened', handleTablePreview);
    
    const debouncedCalculateAndSave = debounce(() => {
        calculatePercentages();
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
    document.querySelector('#global-modal-wrapper .modal-close-btn')?.click();
}

/**
 * Обробляє запит на попередній перегляд.
 * @param {HTMLElement} trigger - Кнопка, що викликала подію.
 */
function handleTablePreview(event) {
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

function addSampleList(items) {
    items.forEach(item => {
        createAndAppendRow().then(row => {
            row.classList.add('added');
            row.querySelector('.input-left').value = item;
        });
    });
}

async function addSampleTemplate(type) {
    await initializeEmptyRow();

    if (type === 'ingredients') {
        const headerRow = await createAndAppendRow();
        headerRow.classList.remove('td');
        headerRow.classList.add('th-strong', 'single');
        headerRow.querySelector('.input-left').value = 'Ингредиенты';
    }

    const fieldRow = await createAndAppendRow();
    handleInputTypeSwitch(fieldRow, 'field');
    fieldRow.classList.remove('td');
    fieldRow.classList.add('single');

    if (type === 'warning' || type === 'composition') {
        fieldRow.classList.add('bold');
    }
    if (type === 'composition') {
        fieldRow.querySelector('.input-left').value = 'Состав может незначительно отличаться в зависимости от вкуса';
    }
}