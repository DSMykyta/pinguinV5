// js/pages/brands/brands-crud-alt-names.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS CRUD — АЛЬТЕРНАТИВНІ НАЗВИ                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 Секція альтернативних назв у модалі бренду.
 */

import { escapeHtml } from '../../_utils/text-utils.js';

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати обробники альтернативних назв
 */
export function initAltNamesHandlers() {
    ensureEmptyAltNameInput();
}

// ═══════════════════════════════════════════════════════════════════════════
// ADD / REMOVE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Додати інпут для альтернативної назви
 * @param {string} value - Значення
 * @param {boolean} isEmpty - Чи це порожній інпут (без кнопки видалення)
 */
function addAltNameInput(value = '', isEmpty = false) {
    const container = document.getElementById('brand-names-alt-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'content-bloc';

    if (isEmpty) {
        row.innerHTML = `
            <div class="content-line">
                <div class="input-box">
                    <input type="text" value="" placeholder="Альтернативна назва">
                </div>
            </div>
        `;
        row.dataset.empty = 'true';
    } else {
        row.innerHTML = `
            <div class="content-line">
                <div class="input-box">
                    <input type="text" value="${escapeHtml(value)}" placeholder="Альтернативна назва">
                </div>
                <button type="button" class="btn-icon ci-remove" data-tooltip="Видалити">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
        `;
        row.querySelector('.ci-remove').onclick = () => row.remove();
    }

    const input = row.querySelector('input');

    input.addEventListener('blur', () => {
        const val = input.value.trim();
        if (val && row.dataset.empty === 'true') {
            delete row.dataset.empty;
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn-icon ci-remove';
            deleteBtn.title = 'Видалити';
            deleteBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
            deleteBtn.onclick = () => row.remove();
            row.querySelector('.content-line').appendChild(deleteBtn);

            ensureEmptyAltNameInput();
        }
    });

    container.appendChild(row);
}

/**
 * Переконатися що є порожній інпут в кінці
 */
function ensureEmptyAltNameInput() {
    const container = document.getElementById('brand-names-alt-container');
    if (!container) return;

    const emptyRow = container.querySelector('.content-bloc[data-empty="true"]');
    if (!emptyRow) {
        addAltNameInput('', true);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET / SET
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати всі альтернативні назви
 * @returns {string[]} Масив назв
 */
export function getAltNames() {
    const container = document.getElementById('brand-names-alt-container');
    if (!container) return [];

    const inputs = container.querySelectorAll('.content-bloc input');
    return Array.from(inputs)
        .map(input => input.value.trim())
        .filter(v => v);
}

/**
 * Встановити альтернативні назви
 * @param {string[]} names - Масив назв
 */
export function setAltNames(names) {
    const container = document.getElementById('brand-names-alt-container');
    if (!container) return;

    container.innerHTML = '';

    if (Array.isArray(names) && names.length > 0) {
        names.forEach(name => addAltNameInput(name, false));
    }

    ensureEmptyAltNameInput();
}
