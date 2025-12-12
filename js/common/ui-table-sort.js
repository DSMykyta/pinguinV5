// js/common/ui-table-sort.js
// Універсальна система сортування таблиць

/**
 * Ініціалізувати сортування для таблиці
 * @param {HTMLElement} container - Контейнер таблиці
 * @param {Object} options - Опції сортування
 * @param {Function} options.dataSource - Функція що повертає масив даних для сортування
 * @param {Function} options.onSort - Callback після сортування (отримує відсортований масив)
 * @param {Object} [options.columnTypes] - Об'єкт з типами колонок {columnId: 'string'|'number'|'boolean'|'id-number'}
 * @returns {Object} API для керування сортуванням
 * @example
 * const sortAPI = initTableSorting(container, {
 *   dataSource: () => myData,
 *   onSort: async (sortedData) => {
 *     myData = sortedData;
 *     await renderTable();
 *   },
 *   columnTypes: {
 *     local_id: 'id-number',  // "ban-000123" -> 123
 *     cheaked_line: 'boolean',
 *     name: 'string'
 *   }
 * });
 */
export function initTableSorting(container, options) {
    const {
        dataSource,
        onSort,
        columnTypes = {}
    } = options;

    let currentSortColumn = null;
    let currentSortDirection = null; // null, 'asc', 'desc'

    // Event delegation для кліків на sortable headers
    const clickHandler = async (e) => {
        const header = e.target.closest('.sortable-header');
        if (!header) return;

        const sortKey = header.dataset.sortKey;
        if (!sortKey) return;

        // Перемикання напрямку сортування
        if (currentSortColumn === sortKey) {
            if (currentSortDirection === null || currentSortDirection === 'desc') {
                currentSortDirection = 'asc';
            } else if (currentSortDirection === 'asc') {
                currentSortDirection = 'desc';
            }
        } else {
            currentSortColumn = sortKey;
            currentSortDirection = 'asc';
        }

        // Оновити візуальні індикатори
        updateSortIndicators(container, sortKey, currentSortDirection);

        // Сортувати дані
        const data = dataSource();
        const sortedData = sortArray(data, sortKey, currentSortDirection, columnTypes);

        // Викликати callback
        if (onSort) {
            await onSort(sortedData);
        }

        console.log(`↕️ Сортування: ${sortKey} ${currentSortDirection}`);
    };

    container.addEventListener('click', clickHandler);

    // API для керування
    return {
        /**
         * Відсортувати за вказаною колонкою
         * @param {string} column - ID колонки
         * @param {string} direction - Напрямок ('asc' або 'desc')
         */
        sort: async (column, direction) => {
            currentSortColumn = column;
            currentSortDirection = direction;
            updateSortIndicators(container, column, direction);

            const data = dataSource();
            const sortedData = sortArray(data, column, direction, columnTypes);

            if (onSort) {
                await onSort(sortedData);
            }
        },

        /**
         * Скинути сортування
         */
        reset: () => {
            currentSortColumn = null;
            currentSortDirection = null;
            updateSortIndicators(container, null, null);
        },

        /**
         * Отримати поточний стан сортування
         * @returns {{column: string|null, direction: string|null}}
         */
        getState: () => ({
            column: currentSortColumn,
            direction: currentSortDirection
        }),

        /**
         * Видалити event listener
         */
        destroy: () => {
            container.removeEventListener('click', clickHandler);
        }
    };
}

/**
 * Оновити візуальні індикатори сортування
 * @param {HTMLElement} container - Контейнер таблиці
 * @param {string|null} activeSortKey - Активна колонка сортування
 * @param {string|null} direction - Напрямок сортування ('asc' або 'desc')
 */
export function updateSortIndicators(container, activeSortKey, direction) {
    const headers = container.querySelectorAll('.sortable-header');

    headers.forEach(header => {
        const indicator = header.querySelector('.sort-indicator');
        if (!indicator) return;

        const icon = indicator.querySelector('.material-symbols-outlined');
        if (!icon) return;

        const sortKey = header.dataset.sortKey;

        // Видалити всі класи сортування
        header.classList.remove('sorted-asc', 'sorted-desc');

        if (sortKey === activeSortKey && direction) {
            // Додати клас і змінити іконку для активної колонки
            header.classList.add(`sorted-${direction}`);
            icon.textContent = direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
        }
        // Для неактивних колонок іконка прихована через CSS (display: none)
    });
}

/**
 * Відсортувати масив за вказаною колонкою
 * @param {Array} array - Масив даних
 * @param {string} column - ID колонки
 * @param {string} direction - Напрямок ('asc' або 'desc')
 * @param {Object} columnTypes - Типи колонок
 * @returns {Array} Відсортований масив
 */
function sortArray(array, column, direction, columnTypes = {}) {
    const columnType = columnTypes[column] || 'string';

    return [...array].sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        // Обробка різних типів даних
        switch (columnType) {
            case 'id-number':
                // Витягти число з рядка типу "ban-000123" або "item-456"
                aVal = parseInt((aVal || '').toString().replace(/\D/g, ''), 10) || 0;
                bVal = parseInt((bVal || '').toString().replace(/\D/g, ''), 10) || 0;
                break;

            case 'number':
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
                break;

            case 'boolean':
                // Перетворити в числа для порівняння
                aVal = (aVal === 'TRUE' || aVal === true || aVal === 1) ? 1 : 0;
                bVal = (bVal === 'TRUE' || bVal === true || bVal === 1) ? 1 : 0;
                break;

            case 'date':
                aVal = new Date(aVal || 0).getTime();
                bVal = new Date(bVal || 0).getTime();
                break;

            case 'product':
                // Спеціальний тип для сортування товарів по Brand + Name
                aVal = ((a.brand || '') + ' ' + (a.name || '')).trim().toLowerCase();
                bVal = ((b.brand || '') + ' ' + (b.name || '')).trim().toLowerCase();
                break;

            case 'string':
            default:
                // String сортування (case-insensitive) - зберігаємо як рядок для localeCompare
                aVal = (aVal || '').toString();
                bVal = (bVal || '').toString();
                break;
        }

        // Порівняння
        // Для рядків та product використовуємо localeCompare для правильного сортування кирилиці
        if (columnType === 'string' || columnType === 'product' || columnType === undefined) {
            const comparison = aVal.localeCompare(bVal, 'uk', { sensitivity: 'base' });
            return direction === 'asc' ? comparison : -comparison;
        }

        // Для чисел, бульових, дат - просте порівняння
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

/**
 * Отримати значення для сортування з об'єкта
 * (Utility функція для складних випадків)
 * @param {Object} item - Об'єкт даних
 * @param {string} column - ID колонки
 * @param {string} columnType - Тип колонки
 * @returns {*} Значення для порівняння
 */
export function getSortValue(item, column, columnType) {
    let value = item[column];

    switch (columnType) {
        case 'id-number':
            return parseInt((value || '').toString().replace(/\D/g, ''), 10) || 0;

        case 'number':
            return parseFloat(value) || 0;

        case 'boolean':
            return (value === 'TRUE' || value === true || value === 1) ? 1 : 0;

        case 'date':
            return new Date(value || 0).getTime();

        case 'string':
        default:
            return (value || '').toString().toLowerCase();
    }
}
