/**
 * MODULE: Table Template Loader
 *
 * ПРИЗНАЧЕННЯ:
 * Завантаження та заповнення HTML шаблонів таблиць з templates/tables/
 *
 * АРХІТЕКТУРА:
 * - Завантажує шаблони через fetch
 * - Заповнює {{placeholders}} даними
 * - Працює з <template> тегами
 * - Незалежний модуль, можна видалити без впливу на інші частини
 *
 * ВИКОРИСТАННЯ:
 * import { loadTableTemplate, populateTableRow } from './ui-table-loader.js';
 * const template = await loadTableTemplate('table-banned-words');
 * const row = populateTableRow(rowTemplate, {id: 1, word: 'test'});
 */

/**
 * Завантажує HTML шаблон таблиці з templates/tables/
 *
 * @param {string} templateName - Назва файлу без .html (наприклад, 'table-banned-words')
 * @returns {Promise<HTMLTemplateElement|null>} Template element або null при помилці
 *
 * @example
 * const template = await loadTableTemplate('table-banned-words');
 * if (template) {
 *   const rowTemplate = template.content.querySelector('.pseudo-table-row');
 * }
 */
export async function loadTableTemplate(templateName) {
    try {
        const response = await fetch(`/templates/tables/${templateName}.html`);

        if (!response.ok) {
            console.error(`Failed to load table template: ${templateName}`, response.status);
            return null;
        }

        const html = await response.text();

        // Створюємо тимчасовий контейнер для парсингу HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // Шукаємо <template> елемент
        const template = tempDiv.querySelector('template');

        if (!template) {
            console.error(`No <template> tag found in ${templateName}.html`);
            return null;
        }

        return template;

    } catch (error) {
        console.error(`Error loading table template ${templateName}:`, error);
        return null;
    }
}

/**
 * Заповнює шаблон рядка таблиці даними, замінюючи {{placeholders}}
 *
 * @param {HTMLElement} rowTemplate - Клонований template.content елемент рядка
 * @param {Object} data - Об'єкт з даними для заповнення
 * @param {Object} renderFunctions - Об'єкт з функціями рендерингу (опціонально)
 * @returns {HTMLElement} Заповнений елемент рядка
 *
 * @example
 * const rowTemplate = template.content.querySelector('.pseudo-table-row').cloneNode(true);
 * const row = populateTableRow(rowTemplate, {
 *   id: 123,
 *   word: 'заборонене',
 *   category: 'Категорія 1',
 *   severity: 'high'
 * }, {
 *   severity: (value) => renderSeverityBadge(value)
 * });
 */
export function populateTableRow(rowTemplate, data, renderFunctions = {}) {
    const rowHtml = rowTemplate.innerHTML;

    // Замінюємо всі {{key}} на відповідні значення з data
    const populatedHtml = rowHtml.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        // Якщо ключ існує в data, повертаємо значення, інакше залишаємо placeholder
        return data.hasOwnProperty(key) ? data[key] : match;
    });

    rowTemplate.innerHTML = populatedHtml;

    // Обробляємо комірки з data-render атрибутами для складного рендерингу
    if (Object.keys(renderFunctions).length > 0) {
        const cells = rowTemplate.querySelectorAll('[data-render]');

        cells.forEach(cell => {
            const renderKey = cell.getAttribute('data-render');
            const fieldName = cell.getAttribute('data-field');

            if (renderFunctions[renderKey] && fieldName && data.hasOwnProperty(fieldName)) {
                const renderedContent = renderFunctions[renderKey](data[fieldName], data);
                cell.innerHTML = renderedContent;
            }
        });
    }

    return rowTemplate;
}

/**
 * Створює та заповнює рядок таблиці з шаблону
 *
 * @param {HTMLTemplateElement} template - Template element з loadTableTemplate()
 * @param {Object} data - Об'єкт з даними для заповнення
 * @param {Object} renderFunctions - Об'єкт з функціями рендерингу (опціонально)
 * @returns {HTMLElement} Готовий елемент рядка для вставки в DOM
 *
 * @example
 * const template = await loadTableTemplate('table-banned-words');
 * const row = createTableRow(template, {id: 1, word: 'test', category: 'Cat1'});
 * tableContainer.appendChild(row);
 */
export function createTableRow(template, data, renderFunctions = {}) {
    const rowTemplate = template.content.querySelector('.pseudo-table-row');

    if (!rowTemplate) {
        console.error('No .pseudo-table-row found in template');
        return null;
    }

    const clonedRow = rowTemplate.cloneNode(true);
    return populateTableRow(clonedRow, data, renderFunctions);
}

/**
 * Заповнює всю таблицю масивом даних
 *
 * @param {HTMLElement} container - Контейнер таблиці (.pseudo-table-container)
 * @param {HTMLTemplateElement} template - Template element з loadTableTemplate()
 * @param {Array<Object>} dataArray - Масив об'єктів з даними
 * @param {Object} options - Додаткові опції
 * @param {Function} options.onRowClick - Callback при кліку на рядок
 * @param {boolean} options.clearExisting - Очистити існуючі рядки (default: true)
 * @param {Object} options.renderFunctions - Функції для складного рендерингу комірок
 *
 * @example
 * const template = await loadTableTemplate('table-banned-words');
 * populateTable(container, template, wordsData, {
 *   onRowClick: (row, data) => openModal(data.id),
 *   clearExisting: true,
 *   renderFunctions: {
 *     severity: (value) => renderSeverityBadge(value),
 *     checked: (value, row) => renderBadge(value, 'checked', {clickable: true, id: row.local_id})
 *   }
 * });
 */
export function populateTable(container, template, dataArray, options = {}) {
    const {
        onRowClick = null,
        clearExisting = true,
        renderFunctions = {}
    } = options;

    // Очищуємо існуючі рядки та стани завантаження (залишаємо тільки header)
    if (clearExisting) {
        const existingRows = container.querySelectorAll('.pseudo-table-row, .loading-row');
        existingRows.forEach(row => row.remove());
    }

    // Створюємо фрагмент для оптимізації DOM операцій
    const fragment = document.createDocumentFragment();

    dataArray.forEach((data) => {
        const row = createTableRow(template, data, renderFunctions);

        if (row) {
            // Додаємо клік обробник якщо потрібно
            if (onRowClick) {
                row.classList.add('clickable-row');
                row.addEventListener('click', (e) => {
                    // Не викликати onRowClick якщо клік був на кнопці чи чекбоксі
                    if (!e.target.closest('button') && !e.target.closest('input[type="checkbox"]')) {
                        onRowClick(row, data);
                    }
                });
            }

            fragment.appendChild(row);
        }
    });

    container.appendChild(fragment);
}

/**
 * Показує стан завантаження в таблиці
 *
 * @param {HTMLElement} container - Контейнер таблиці
 * @param {string} message - Повідомлення для відображення (default: 'Завантаження...')
 */
export function showTableLoading(container, message = 'Завантаження...') {
    // Очищуємо рядки
    const existingRows = container.querySelectorAll('.pseudo-table-row, .loading-row');
    existingRows.forEach(row => row.remove());

    const loadingRow = document.createElement('div');
    loadingRow.className = 'loading-row';
    loadingRow.textContent = message;

    container.appendChild(loadingRow);
}

/**
 * Показує повідомлення про відсутність даних
 *
 * @param {HTMLElement} container - Контейнер таблиці
 * @param {string} message - Повідомлення для відображення (default: 'Немає даних')
 */
export function showTableEmpty(container, message = 'Немає даних') {
    // Очищуємо рядки
    const existingRows = container.querySelectorAll('.pseudo-table-row, .loading-row');
    existingRows.forEach(row => row.remove());

    const emptyRow = document.createElement('div');
    emptyRow.className = 'loading-row';
    emptyRow.innerHTML = `<span class="text-muted">${message}</span>`;

    container.appendChild(emptyRow);
}
