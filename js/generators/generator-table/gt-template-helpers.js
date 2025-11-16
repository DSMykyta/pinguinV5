// js/generators/generator-table/gt-template-helpers.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          TABLE GENERATOR - TEMPLATE HELPERS                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Допоміжні функції для додавання готових шаблонів рядків у таблицю.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - addSampleList(items) - Додає список елементів як рядки
 * - addSampleTemplate(type) - Додає готовий шаблон (ingredients, warning, composition)
 */

import { createAndAppendRow, initializeEmptyRow } from './gt-row-manager.js';
import { handleInputTypeSwitch } from './gt-row-renderer.js';

/**
 * Додає список елементів як окремі рядки в таблицю
 * @param {Array<string>} items - Масив елементів для додавання
 */
export function addSampleList(items) {
    items.forEach(item => {
        createAndAppendRow().then(row => {
            row.classList.add('added');
            row.querySelector('.input-left').value = item;
        });
    });
}

/**
 * Додає готовий шаблон у таблицю
 * @param {'ingredients'|'warning'|'composition'} type - Тип шаблону
 */
export async function addSampleTemplate(type) {
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
