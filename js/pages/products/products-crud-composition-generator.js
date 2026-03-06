// js/pages/products/products-crud-composition-generator.js

/**
 * Вбудований генератор таблиць для wizard-режиму.
 * Використовує gt-* модулі, перемикаючи rowsContainer на #wizard-rows-container.
 */

import { setRowsContainer, resetRowsContainer } from '../../generators/generator-table/gt-dom.js';
import { createAndAppendRow, initializeEmptyRow, initializeFirstRow } from '../../generators/generator-table/gt-row-manager.js';
import { addSampleTemplate } from '../../generators/generator-table/gt-template-helpers.js';
import { generateHtmlTable } from '../../generators/generator-table/gt-html-builder.js';
import { generateBrText } from '../../generators/generator-table/gt-br-builder.js';
import { showToast } from '../../components/feedback/toast.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let _initialized = false;
let _fillCallback = null;

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Iнiцiалiзувати wizard-генератор
 * @param {Function} onFill - callback(htmlTable, brText) для заповнення едiторiв
 */
export function initWizardGenerator(onFill) {
    const container = document.getElementById('wizard-rows-container');
    if (!container || _initialized) return;

    _fillCallback = onFill;
    _initialized = true;

    // Перемикаємо gt-* на wizard-контейнер
    setRowsContainer(container);

    // Кнопки дій
    const section = document.getElementById('section-product-table-generator');
    if (!section) return;

    section.addEventListener('click', (e) => {
        const action = e.target.closest('[data-wg-action]')?.dataset.wgAction;
        if (!action) return;

        // Переконатись що gt-* працює з wizard-контейнером
        setRowsContainer(container);

        if (action === 'add-row') createAndAppendRow();
        else if (action === 'add-separator') initializeEmptyRow();
        else if (action === 'add-ingredients') addSampleTemplate('ingredients');
        else if (action === 'add-warning') addSampleTemplate('warning');
    });

    // Кнопка заповнення
    document.getElementById('wizard-fill-composition')?.addEventListener('click', _handleFill);

    // Створити перший рядок
    initializeFirstRow();
}

/**
 * Показати/сховати секцiю генератора
 */
export function showWizardGenerator(show) {
    const section = document.getElementById('section-product-table-generator');
    if (section) section.classList.toggle('u-hidden', !show);
}

/**
 * Очистити генератор
 */
export function resetWizardGenerator() {
    const container = document.getElementById('wizard-rows-container');
    if (container) container.innerHTML = '';

    // Повернути gt-* до стандартного контейнера
    resetRowsContainer();

    _initialized = false;
    _fillCallback = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// FILL EDITORS
// ═══════════════════════════════════════════════════════════════════════════

function _handleFill() {
    // Переконатись що builders читають з wizard-контейнера
    const container = document.getElementById('wizard-rows-container');
    setRowsContainer(container);

    const htmlTable = generateHtmlTable();
    const brText = generateBrText();

    if (!htmlTable && !brText) {
        showToast('Таблиця порожня', 'warning');
        return;
    }

    if (_fillCallback) {
        _fillCallback(htmlTable, brText);
        showToast('Склад заповнено', 'success');
    }
}
