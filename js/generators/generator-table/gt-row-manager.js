/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            TABLE GENERATOR - МЕНЕДЖЕР РЯДКІВ (ROW MANAGER)               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * * ПРИЗНАЧЕННЯ:
 * Керує колекцією рядків: додавання, видалення, вставка та повне очищення.
 * Виступає як "контролер", що використовує renderer для створення візуальних
 * елементів, але сам відповідає за логіку їх розміщення та видалення з DOM.
 * Містить логіку захисту від видалення останнього рядка.
 */

// js/generators/generator-table/gt-row-manager.js

import { initDropdowns } from '../../common/ui-dropdown.js';
import { getTableDOM } from './gt-dom.js';
import { renderNewRow } from './gt-row-renderer.js';
import { resetRowCounter } from './gt-state.js';
import { clearSession, autoSaveSession } from './gt-session-manager.js';
import { ROW_CLASSES } from './gt-config.js';

const dom = getTableDOM();

/**
 * Створює новий рядок і додає його в кінець контейнера.
 */
export async function createAndAppendRow() {
    const newRow = await renderNewRow();
    dom.rowsContainer.appendChild(newRow);
    initDropdowns();
    autoSaveSession();
    return newRow;
}

/**
 * Видаляє вказаний рядок з DOM, якщо він не останній.
 * @param {HTMLElement} row - Рядок для видалення.
 */
export function deleteRow(row) {
    if (dom.rowsContainer.querySelectorAll('.content-bloc').length > 1) {
        row.remove();
        autoSaveSession();
    } else {
        console.warn('Неможливо видалити останній рядок.');
    }
}

/**
 * Вставляє новий рядок над вказаним.
 * @param {HTMLElement} referenceRow - Рядок, над яким буде вставлено новий.
 */
export async function insertRowAbove(referenceRow) {
    const newRow = await renderNewRow();
    referenceRow.parentNode.insertBefore(newRow, referenceRow);
    initDropdowns();
    autoSaveSession();
}

/**
 * Вставляє новий рядок під вказаним.
 * @param {HTMLElement} referenceRow - Рядок, під яким буде вставлено новий.
 */
export async function insertRowBelow(referenceRow) {
    const newRow = await renderNewRow();
    referenceRow.parentNode.insertBefore(newRow, referenceRow.nextSibling);
    initDropdowns();
    autoSaveSession();
}

/**
 * Створює і налаштовує найперший рядок "Пищевая ценность".
 */
export async function initializeFirstRow() {
    if (dom.rowsContainer.children.length > 0) return;
    const firstRow = await createAndAppendRow();
    firstRow.classList.remove(ROW_CLASSES.TD);
    firstRow.classList.add(ROW_CLASSES.TH_STRONG);
    firstRow.querySelector('.input-box.large input, .input-box.large textarea').value = 'Пищевая ценность';
    autoSaveSession.flush?.(); // Примусове негайне збереження
}

/**
 * Створює рядок-розділювач між таблицями.
 */
export async function initializeEmptyRow() {
    const newRow = await createAndAppendRow();
    newRow.classList.remove(ROW_CLASSES.TD);
    newRow.classList.add(ROW_CLASSES.NEW_TABLE);
    autoSaveSession();
}

/**
 * Повністю очищує секцію таблиць і повертає її до початкового стану.
 */
export function resetTableSection() {
    dom.rowsContainer.innerHTML = '';
    resetRowCounter();
    clearSession();
    initializeFirstRow();
}