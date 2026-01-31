// js/common/ui-table.js
// Універсальний компонент для рендерингу таблиць

import { escapeHtml } from '../utils/text-utils.js';
import { renderAvatarState } from '../utils/avatar-states.js';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PSEUDO TABLE - UNIVERSAL API                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Універсальний API для роботи з таблицями.
 * Підтримує повний рендеринг та оновлення тільки рядків (зберігає заголовок).
 *
 * @example
 * const tableAPI = createPseudoTable(container, {
 *     columns: [...],
 *     rowActionsCustom: (row) => `<button>Edit</button>`,
 *     getRowId: (row) => row.local_id,
 *     emptyState: { message: 'Немає даних' }
 * });
 *
 * // Початковий рендер
 * tableAPI.render(data);
 *
 * // Оновлення тільки рядків (заголовок залишається)
 * tableAPI.updateRows(filteredData);
 */
export function createPseudoTable(container, options) {
    const {
        columns = [],
        visibleColumns = null,
        rowActions = [],
        rowActionsCustom = null,
        rowActionsHeader = null,
        emptyState = null,
        onRowClick = null,
        withContainer = true,
        noHeaderSort = false,
        getRowId = (row, index) => row.id || row.local_id || row.code || index,
        // Callback після рендерингу (для кастомних обробників)
        onAfterRender = null
    } = options;

    // Поточні дані та стан
    let currentData = [];
    let currentVisibleColumns = visibleColumns;

    // ==================== ДОПОМІЖНІ ФУНКЦІЇ ====================

    const isColumnVisible = (columnId) => {
        if (!currentVisibleColumns) return true;
        return currentVisibleColumns.includes(columnId);
    };

    const hiddenClass = (columnId) => isColumnVisible(columnId) ? '' : ' column-hidden';

    // ==================== ГЕНЕРАЦІЯ HTML ====================

    /**
     * Генерація HTML заголовка таблиці
     */
    function generateHeaderHTML() {
        return `
            <div class="pseudo-table-header">
                ${rowActions.length > 0 || rowActionsCustom ? `
                    <div class="pseudo-table-cell cell-actions header-actions-cell">
                        ${rowActionsHeader || ''}
                    </div>
                ` : ''}
                ${columns.map(col => {
                    const cellClass = col.className || '';
                    const sortableClass = !noHeaderSort && col.sortable ? ' sortable-header' : '';
                    const filterableClass = col.filterable ? ' filterable' : '';

                    return `
                        <div class="pseudo-table-cell ${cellClass}${sortableClass}${filterableClass}${hiddenClass(col.id)}"
                             ${!noHeaderSort && col.sortable ? `data-sort-key="${col.sortKey || col.id}"` : ''}
                             data-column="${col.id}">
                            <span>${col.label || col.id}</span>
                            ${!noHeaderSort && col.sortable ? '<span class="sort-indicator"><span class="material-symbols-outlined">unfold_more</span></span>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    /**
     * Генерація HTML для одного рядка
     */
    function generateRowHTML(row, rowIndex) {
        const rowId = getRowId(row, rowIndex);
        const rowClasses = ['pseudo-table-row'];
        if (onRowClick) rowClasses.push('clickable');

        return `
            <div class="${rowClasses.join(' ')}" data-row-id="${rowId}">
                ${rowActionsCustom ? `
                    <div class="pseudo-table-cell cell-actions">
                        ${rowActionsCustom(row)}
                    </div>
                ` : rowActions.length > 0 ? `
                    <div class="pseudo-table-cell cell-actions">
                        ${rowActions.map(action => `
                            <button class="btn-icon btn-${action.icon}"
                                    data-row-id="${rowId}"
                                    data-action="${action.icon}"
                                    title="${action.title || action.icon}">
                                <span class="material-symbols-outlined">${action.icon}</span>
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
                ${columns.map(col => {
                    const value = row[col.id];
                    const cellClass = col.className || '';
                    const tooltipAttr = col.tooltip !== false && value ?
                        `data-tooltip="${escapeHtml(String(value))}"` : '';

                    let cellContent;
                    if (col.render && typeof col.render === 'function') {
                        cellContent = col.render(value, row);
                    } else {
                        cellContent = escapeHtml(value || '-');
                    }

                    return `
                        <div class="pseudo-table-cell ${cellClass}${hiddenClass(col.id)}"
                             data-column="${col.id}"
                             ${tooltipAttr}>
                            ${cellContent}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    /**
     * Генерація HTML для всіх рядків
     */
    function generateRowsHTML(data) {
        return data.map((row, index) => generateRowHTML(row, index)).join('');
    }

    // ==================== ОБРОБНИКИ ПОДІЙ ====================

    /**
     * Додати обробники подій для кнопок у рядках
     */
    function attachEventHandlers() {
        // Обробники для rowActions (з handler)
        if (rowActions.length > 0) {
            rowActions.forEach(action => {
                if (!action.handler) return;

                container.querySelectorAll(`.btn-${action.icon}`).forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const rowId = btn.dataset.rowId;
                        const rowData = currentData.find(r => String(getRowId(r)) === String(rowId));
                        if (rowData) {
                            action.handler(rowData, e);
                        }
                    });
                });
            });
        }

        // Обробник кліків на рядки
        if (onRowClick) {
            container.querySelectorAll('.pseudo-table-row.clickable').forEach(rowEl => {
                rowEl.addEventListener('click', (e) => {
                    const rowId = rowEl.dataset.rowId;
                    const rowData = currentData.find(r => String(getRowId(r)) === String(rowId));
                    if (rowData) {
                        onRowClick(rowData, e);
                    }
                });
            });
        }
    }

    // ==================== ПУБЛІЧНІ МЕТОДИ ====================

    /**
     * Повний рендеринг таблиці (заголовок + рядки)
     * @param {Array} data - Дані для відображення
     */
    function render(data = []) {
        currentData = data;

        // Якщо немає даних - показати empty state
        if (data.length === 0 && emptyState) {
            container.innerHTML = renderAvatarState('empty', {
                message: emptyState.message || 'Немає даних для відображення',
                size: 'medium',
                containerClass: 'empty-state-container',
                avatarClass: 'empty-state-avatar',
                messageClass: 'avatar-state-message',
                showMessage: true
            });
            return;
        }

        const headerHTML = generateHeaderHTML();
        const rowsHTML = generateRowsHTML(data);
        const tableHTML = headerHTML + rowsHTML;

        if (withContainer) {
            container.innerHTML = `<div class="pseudo-table-container">${tableHTML}</div>`;
        } else {
            container.innerHTML = tableHTML;
        }

        attachEventHandlers();

        // Викликаємо callback після рендерингу
        if (onAfterRender) {
            onAfterRender(container, currentData);
        }
    }

    /**
     * Оновити ТІЛЬКИ рядки (заголовок залишається)
     * Використовувати при фільтрації/сортуванні/пагінації
     * @param {Array} data - Нові дані для відображення
     */
    function updateRows(data = []) {
        currentData = data;

        // Видаляємо тільки рядки (не заголовок!)
        container.querySelectorAll('.pseudo-table-row').forEach(row => row.remove());

        // Якщо немає даних - залишаємо порожню таблицю з заголовком
        if (data.length === 0) {
            return;
        }

        // Генеруємо нові рядки
        const rowsHTML = generateRowsHTML(data);

        // Вставляємо після заголовка
        const header = container.querySelector('.pseudo-table-header');
        if (header) {
            header.insertAdjacentHTML('afterend', rowsHTML);
        }

        attachEventHandlers();

        // Викликаємо callback після рендерингу
        if (onAfterRender) {
            onAfterRender(container, currentData);
        }
    }

    /**
     * Оновити видимість колонок
     * @param {Array} newVisibleColumns - Масив ID видимих колонок
     */
    function setVisibleColumns(newVisibleColumns) {
        currentVisibleColumns = newVisibleColumns;
        container.querySelectorAll('[data-column]').forEach(cell => {
            const columnId = cell.dataset.column;
            if (isColumnVisible(columnId)) {
                cell.classList.remove('column-hidden');
            } else {
                cell.classList.add('column-hidden');
            }
        });
    }

    /**
     * Отримати поточні дані
     */
    function getData() {
        return currentData;
    }

    /**
     * Отримати контейнер
     */
    function getContainer() {
        return container;
    }

    // Повертаємо публічний API
    return {
        render,
        updateRows,
        setVisibleColumns,
        getData,
        getContainer,
        // Для доступу до генераторів (якщо потрібно кастомне використання)
        generateRowHTML,
        generateRowsHTML,
        attachEventHandlers
    };
}

/**
 * Відрендерити псевдо-таблицю з даними
 * @param {HTMLElement} container - Контейнер для таблиці
 * @param {Object} options - Опції рендерингу
 * @param {Array} options.data - Масив даних для відображення
 * @param {Array} options.columns - Конфігурація колонок
 * @param {Array} [options.visibleColumns] - Масив ID видимих колонок (якщо не вказано - всі видимі)
 * @param {Array} [options.rowActions] - Кнопки дій для кожного рядка
 * @param {Object} [options.emptyState] - Стан для порожньої таблиці
 * @param {Function} [options.onRowClick] - Callback при кліку на рядок
 * @param {boolean} [options.withContainer=true] - Чи додавати .pseudo-table-container
 * @returns {void}
 * @example
 * renderPseudoTable(container, {
 *   data: [{id: 1, name: 'Test'}],
 *   columns: [
 *     {id: 'id', label: 'ID', sortable: true, width: '100px'},
 *     {id: 'name', label: 'Назва', sortable: true, render: (value) => `<strong>${value}</strong>`}
 *   ],
 *   rowActions: [
 *     {icon: 'edit', handler: (row) => console.log('Edit', row)}
 *   ],
 *   emptyState: {icon: 'inbox', message: 'Немає даних'}
 * });
 */
export function renderPseudoTable(container, options) {
    const {
        data = [],
        columns = [],
        visibleColumns = null,
        rowActions = [],
        rowActionsCustom = null,
        rowActionsHeader = null,
        emptyState = null,
        onRowClick = null,
        withContainer = true,
        noHeaderSort = false // Для сторінок з dropdown сортуванням
    } = options;

    // Перевірка видимості колонки
    const isColumnVisible = (columnId) => {
        if (!visibleColumns) return true;
        return visibleColumns.includes(columnId);
    };

    // Клас для прихованих колонок
    const hiddenClass = (columnId) => isColumnVisible(columnId) ? '' : ' column-hidden';

    // Якщо немає даних - показати empty state з аватаром
    if (data.length === 0 && emptyState) {
        container.innerHTML = renderAvatarState('empty', {
            message: emptyState.message || 'Немає даних для відображення',
            size: 'medium',
            containerClass: 'empty-state-container',
            avatarClass: 'empty-state-avatar',
            messageClass: 'avatar-state-message',
            showMessage: true
        });
        return;
    }

    // Генерація заголовка таблиці
    const headerHTML = `
        <div class="pseudo-table-header">
            ${rowActions.length > 0 || rowActionsCustom ? `
                <div class="pseudo-table-cell cell-actions header-actions-cell">
                    ${rowActionsHeader !== undefined ? rowActionsHeader : ''}
                </div>
            ` : ''}
            ${columns.map(col => {
                const cellClass = col.className || '';
                // Клас sortable-header якщо колонка сортується (клік по заголовку)
                const sortableClass = !noHeaderSort && col.sortable ? ' sortable-header' : '';
                // Клас filterable якщо колонка має фільтр (hover 2 сек = dropdown)
                const filterableClass = col.filterable ? ' filterable' : '';

                return `
                    <div class="pseudo-table-cell ${cellClass}${sortableClass}${filterableClass}${hiddenClass(col.id)}"
                         ${!noHeaderSort && col.sortable ? `data-sort-key="${col.sortKey || col.id}"` : ''}
                         data-column="${col.id}">
                        <span>${col.label || col.id}</span>
                        ${!noHeaderSort && col.sortable ? '<span class="sort-indicator"><span class="material-symbols-outlined">unfold_more</span></span>' : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // Генерація рядків таблиці
    const rowsHTML = data.map((row, rowIndex) => {
        const rowId = row.id || row.local_id || rowIndex;
        const rowClasses = ['pseudo-table-row'];
        if (onRowClick) rowClasses.push('clickable');

        return `
            <div class="${rowClasses.join(' ')}" data-row-id="${rowId}">
                ${rowActionsCustom ? `
                    <div class="pseudo-table-cell cell-actions">
                        ${rowActionsCustom(row)}
                    </div>
                ` : rowActions.length > 0 ? `
                    <div class="pseudo-table-cell cell-actions">
                        ${rowActions.map(action => `
                            <button class="btn-icon btn-${action.icon}"
                                    data-row-id="${rowId}"
                                    data-action="${action.icon}"
                                    title="${action.title || action.icon}">
                                <span class="material-symbols-outlined">${action.icon}</span>
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
                ${columns.map(col => {
                    const value = row[col.id];
                    const cellClass = col.className || '';
                    const tooltipAttr = col.tooltip !== false && value ?
                        `data-tooltip="${escapeHtml(value)}"` : '';

                    // Використати custom render функцію якщо є
                    let cellContent;
                    if (col.render && typeof col.render === 'function') {
                        cellContent = col.render(value, row);
                    } else {
                        cellContent = escapeHtml(value || '-');
                    }

                    return `
                        <div class="pseudo-table-cell ${cellClass}${hiddenClass(col.id)}"
                             data-column="${col.id}"
                             ${tooltipAttr}>
                            ${cellContent}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }).join('');

    // Складання фінального HTML
    const tableHTML = headerHTML + rowsHTML;

    if (withContainer) {
        container.innerHTML = `<div class="pseudo-table-container">${tableHTML}</div>`;
    } else {
        container.innerHTML = tableHTML;
    }

    // Додати обробники кліків на кнопки дій
    if (rowActions.length > 0) {
        rowActions.forEach(action => {
            if (!action.handler) return;

            container.querySelectorAll(`.btn-${action.icon}`).forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const rowId = btn.dataset.rowId;
                    const rowData = data.find(r =>
                        (r.id || r.local_id) == rowId
                    );
                    if (rowData) {
                        action.handler(rowData, e);
                    }
                });
            });
        });
    }

    // Додати обробник кліків на рядки
    if (onRowClick) {
        container.querySelectorAll('.pseudo-table-row.clickable').forEach(rowEl => {
            rowEl.addEventListener('click', (e) => {
                const rowId = rowEl.dataset.rowId;
                const rowData = data.find(r => (r.id || r.local_id) == rowId);
                if (rowData) {
                    onRowClick(rowData, e);
                }
            });
        });
    }
}

/**
 * Відрендерити badge (бейдж) зі статусом
 * @param {*} value - Значення для badge
 * @param {string} type - Тип badge ('checked', 'status', 'success', 'error', 'warning')
 * @param {Object} [options] - Додаткові опції
 * @param {boolean} [options.clickable=false] - Чи має badge бути клікабельним
 * @param {string} [options.id] - ID елемента (для clickable badges)
 * @returns {string} HTML код badge
 * @example
 * renderBadge(true, 'checked')
 * // '<span class="badge badge-success">...</span>'
 *
 * renderBadge('ACTIVE', 'status', {clickable: true, id: '123'})
 * // '<span class="badge clickable" data-id="123">...</span>'
 */
export function renderBadge(value, type = 'default', options = {}) {
    const { clickable = false, id = null } = options;

    let badgeClass = 'badge';
    let icon = '';
    let text = '';

    switch (type) {
        case 'checked':
        case 'boolean':
            const isTrue = value === 'TRUE' || value === true || value === 1;
            badgeClass += isTrue ? ' badge-success' : ' badge-neutral';
            icon = isTrue ? 'check_circle' : 'cancel';
            text = isTrue ? 'Так' : 'Ні';
            break;

        case 'status':
            // Для різних статусів
            if (value === 'ACTIVE' || value === 'TRUE' || value === true) {
                badgeClass += ' badge-success';
                icon = 'check_circle';
                text = value;
            } else if (value === 'FALSE' || value === false) {
                badgeClass += ' badge-neutral';
                icon = 'cancel';
                text = value;
            } else {
                badgeClass += ' badge-neutral';
                text = value;
            }
            break;

        case 'success':
            badgeClass += ' badge-success';
            icon = 'check_circle';
            text = value;
            break;

        case 'error':
            badgeClass += ' badge-error';
            icon = 'error';
            text = value;
            break;

        case 'warning':
            badgeClass += ' badge-warning';
            icon = 'warning';
            text = value;
            break;

        default:
            badgeClass += ' badge-neutral';
            text = value;
    }

    if (clickable) {
        badgeClass += ' clickable';
    }

    const idAttr = id ? `data-badge-id="${id}"` : '';
    const statusAttr = clickable && (type === 'checked' || type === 'boolean') ?
        `data-status="${value}"` : '';

    return `
        <span class="${badgeClass}"
              ${idAttr}
              ${statusAttr}
              ${clickable ? 'style="cursor: pointer;"' : ''}>
            ${icon ? `<span class="material-symbols-outlined" style="font-size: 16px;">${icon}</span>` : ''}
            ${text}
        </span>
    `.trim();
}

/**
 * Render severity badge (low/medium/high)
 * @param {string} severity - Severity level: 'low', 'medium', or 'high'
 * @returns {string} HTML для severity badge
 */
export function renderSeverityBadge(severity) {
    if (!severity) severity = 'high';

    const severityLower = severity.toLowerCase();
    let icon = '';
    let text = '';

    switch (severityLower) {
        case 'low':
            icon = 'exclamation';
            text = 'Перевірити';
            break;
        case 'medium':
            icon = 'error';
            text = 'Несутєво';
            break;
        case 'high':
            icon = 'brightness_alert';
            text = 'Критично';
            break;
        default:
            icon = 'brightness_alert';
            text = 'Критично';
    }

    return `
        <span class="severity-badge severity-${severityLower}">
            <span class="material-symbols-outlined">${icon}</span>
            
           <!-- ${text} -->
            
            </span>
    `.trim();
}

/**
 * Оновити лічильник записів в таблиці
 * @param {HTMLElement} counterElement - Елемент де відобразити лічильник
 * @param {number} currentCount - Кількість поточних записів (на сторінці)
 * @param {number} totalCount - Загальна кількість записів
 * @example
 * updateTableCounter(element, 10, 150)
 * // Відобразить "Показано 10 з 150"
 */
export function updateTableCounter(counterElement, currentCount, totalCount) {
    if (!counterElement) return;

    counterElement.textContent = `Показано ${currentCount} з ${totalCount}`;
}

/**
 * Знайти рядок таблиці за ID
 * @param {HTMLElement} container - Контейнер таблиці
 * @param {string|number} rowId - ID рядка
 * @returns {HTMLElement|null} Елемент рядка або null
 */
export function findTableRow(container, rowId) {
    return container.querySelector(`[data-row-id="${rowId}"]`);
}

/**
 * Оновити конкретну клітинку в таблиці
 * @param {HTMLElement} container - Контейнер таблиці
 * @param {string|number} rowId - ID рядка
 * @param {string} columnId - ID колонки
 * @param {string} newContent - Новий HTML контент
 * @returns {boolean} true якщо оновлено успішно
 */
export function updateTableCell(container, rowId, columnId, newContent) {
    const row = findTableRow(container, rowId);
    if (!row) return false;

    const cell = row.querySelector(`[data-column="${columnId}"]`);
    if (!cell) return false;

    cell.innerHTML = newContent;
    return true;
}

/**
 * Додати клас до рядка таблиці
 * @param {HTMLElement} container - Контейнер таблиці
 * @param {string|number} rowId - ID рядка
 * @param {string} className - Клас для додавання
 * @returns {boolean} true якщо успішно
 */
export function addTableRowClass(container, rowId, className) {
    const row = findTableRow(container, rowId);
    if (!row) return false;

    row.classList.add(className);
    return true;
}

/**
 * Видалити клас з рядка таблиці
 * @param {HTMLElement} container - Контейнер таблиці
 * @param {string|number} rowId - ID рядка
 * @param {string} className - Клас для видалення
 * @returns {boolean} true якщо успішно
 */
export function removeTableRowClass(container, rowId, className) {
    const row = findTableRow(container, rowId);
    if (!row) return false;

    row.classList.remove(className);
    return true;
}

/**
 * Приховати/показати колонки таблиці
 * @param {HTMLElement} container - Контейнер таблиці
 * @param {string[]} visibleColumns - Масив ID видимих колонок
 */
export function toggleTableColumns(container, visibleColumns) {
    // Приховати всі колонки
    container.querySelectorAll('[data-column]').forEach(cell => {
        const columnId = cell.dataset.column;
        if (visibleColumns.includes(columnId)) {
            cell.classList.remove('column-hidden');
        } else {
            cell.classList.add('column-hidden');
        }
    });
}
