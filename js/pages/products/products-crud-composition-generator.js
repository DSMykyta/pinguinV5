// js/pages/products/products-crud-composition-generator.js

/**
 * Wizard-генератор: перемикає gt-* на wizard-rows-container
 * і використовує справжній aside-table для кнопок/магії.
 */

import { setRowsContainer, resetRowsContainer } from '../../generators/generator-table/gt-dom.js';
import { initializeFirstRow } from '../../generators/generator-table/gt-row-manager.js';
import { generateHtmlTable } from '../../generators/generator-table/gt-html-builder.js';
import { generateBrText } from '../../generators/generator-table/gt-br-builder.js';
import { showAsidePanel } from '../../layout/layout-plugin-aside-loader.js';
import { showToast } from '../../components/feedback/toast.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let _initialized = false;
let _fillCallback = null;
let _interceptHandler = null;

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Активувати wizard-генератор:
 * - перемикає gt-* на wizard-rows-container
 * - показує справжній aside-table поверх модалу
 * - перехоплює result-card кліки для заповнення editors
 * @param {Function} onFill - callback(htmlTable, brText)
 */
export function initWizardGenerator(onFill) {
    const container = document.getElementById('wizard-rows-container');
    if (!container || _initialized) return;

    _fillCallback = onFill;
    _initialized = true;

    // Перемикаємо gt-* на wizard-контейнер
    setRowsContainer(container);

    // Показати aside-table поверх модалу
    document.body.classList.add('wizard-aside-active');
    showAsidePanel('aside-table');

    // Перехоплення result-card кліків: заповнити editors замість clipboard
    _interceptHandler = (e) => {
        const target = e.target.closest('#result-card-html, #result-card-br');
        if (!target) return;

        e.stopImmediatePropagation();
        e.preventDefault();
        _handleFill();
    };
    document.addEventListener('click', _interceptHandler, true);

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
 * Деактивувати wizard-генератор
 */
export function resetWizardGenerator() {
    const container = document.getElementById('wizard-rows-container');
    if (container) container.innerHTML = '';

    // Повернути gt-* до стандартного контейнера
    resetRowsContainer();

    // Прибрати aside поверх модалу
    document.body.classList.remove('wizard-aside-active');

    // Зняти перехоплення
    if (_interceptHandler) {
        document.removeEventListener('click', _interceptHandler, true);
        _interceptHandler = null;
    }

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
