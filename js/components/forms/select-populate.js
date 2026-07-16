// js/components/forms/select-populate.js

/**
 * Select population helper.
 */

import { reinitializeCustomSelect } from './select-api.js';

/**
 * Заповнити select елемент даними
 *
 * @param {string|HTMLSelectElement} selectElement - ID або елемент select
 * @param {Array<{value: string, text: string, dataset?: Object}>} items - Масив елементів для select
 * @param {Object} options - Опції
 * @param {string} options.placeholder - Текст placeholder опції (за замовчуванням '-- Оберіть --')
 * @param {boolean} options.reinit - Чи переініціалізувати custom select після заповнення (за замовчуванням true)
 * @param {string} options.selectedValue - Значення яке треба вибрати після заповнення (опціонально)
 *
 * @example
 * populateSelect('my-select', [
 *   { value: '1', text: 'Option 1' },
 *   { value: '2', text: 'Option 2', dataset: { id: '2', name: 'Opt2' } }
 * ], {
 *   placeholder: '-- Choose option --',
 *   selectedValue: '1'
 * });
 */
export function populateSelect(selectElement, items, options = {}) {
    const {
        placeholder = '-- Оберіть --',
        reinit = true,
        selectedValue = null,
        selectedValues = null // Для мультиселекту - масив значень
    } = options;

    // Отримати елемент select
    const selectEl = typeof selectElement === 'string'
        ? document.getElementById(selectElement)
        : selectElement;

    if (!selectEl) {
        console.warn(`⚠️ Select element "${selectElement}" не знайдено`);
        return;
    }

    // Очистити select
    selectEl.innerHTML = '';

    // Додати placeholder тільки для звичайного (не multiple) select
    if (!selectEl.multiple) {
        selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    }

    // Додати всі елементи
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.text;

        // Додати dataset атрибути якщо є
        if (item.dataset) {
            Object.entries(item.dataset).forEach(([key, value]) => {
                option.dataset[key] = value;
            });
        }

        // Для мультиселекту перевірити чи значення в масиві вибраних
        if (selectEl.multiple && selectedValues && selectedValues.includes(item.value)) {
            option.selected = true;
        }

        selectEl.appendChild(option);
    });

    // Встановити вибране значення якщо задано (для single select)
    if (selectedValue !== null && !selectEl.multiple) {
        selectEl.value = selectedValue;
    }

    // Переініціалізувати custom select якщо потрібно
    if (reinit && selectEl.dataset.customSelect !== undefined) {
        reinitializeCustomSelect(selectEl);
    }
}
