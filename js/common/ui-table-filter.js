// js/common/ui-table-filter.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE COLUMN FILTERS                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Універсальна система фільтрації колонок таблиці.
 * Додає dropdown з чекбоксами в заголовки колонок для фільтрації даних.
 *
 * ВИКОРИСТАННЯ:
 * 1. Додати filterable: true до конфігурації колонки
 * 2. Викликати initTableFilters() після рендерингу таблиці
 * 3. Обробляти зміни через callback onFilter
 *
 * @example
 * const filterAPI = initTableFilters(container, {
 *     dataSource: () => priceState.priceItems,
 *     columns: [
 *         { id: 'reserve', label: 'Резерв', filterable: true },
 *         { id: 'shiping_date', label: 'Відправка', filterable: true, filterType: 'exists' }
 *     ],
 *     onFilter: (activeFilters) => {
 *         // activeFilters = { reserve: ['Андрій', 'Костя'], shiping_date: ['exists'] }
 *         applyFilters();
 *         renderTable();
 *     }
 * });
 */

import { initDropdowns } from './ui-dropdown.js';

/**
 * Ініціалізувати фільтри для таблиці
 * @param {HTMLElement} container - Контейнер таблиці
 * @param {Object} options - Опції
 * @param {Function} options.dataSource - Функція що повертає масив даних
 * @param {Array} options.columns - Конфігурація колонок з filterable: true або sortable: true
 * @param {Function} options.onFilter - Callback при зміні фільтрів
 * @param {Function} options.onSort - Callback при зміні сортування
 * @param {Object} options.columnTypes - Типи колонок для сортування
 * @returns {Object} API для управління фільтрами та сортуванням
 */
export function initTableFilters(container, options) {
    const {
        dataSource,
        columns = [],
        onFilter = null,
        onSort = null,
        columnTypes = {}
    } = options;

    // Стан фільтрів: { columnId: Set(['value1', 'value2']) }
    const activeFilters = new Map();

    // Стан сортування
    let sortState = { column: null, direction: null };

    // Знаходимо колонки з filterable: true або sortable: true
    const filterableColumns = columns.filter(col => col.filterable);
    const sortableColumns = columns.filter(col => col.sortable);
    const dropdownColumns = columns.filter(col => col.filterable || col.sortable);

    if (dropdownColumns.length === 0) {
        console.warn('⚠️ Немає колонок з filterable: true або sortable: true');
        return null;
    }

    /**
     * Отримати унікальні значення для колонки
     */
    function getUniqueValues(columnId, filterType) {
        const data = dataSource();

        if (filterType === 'exists') {
            // Для типу exists - повертаємо фіксовані опції
            return [
                { value: '__exists__', label: 'Наявно', count: data.filter(item => item[columnId] && item[columnId].toString().trim() !== '').length },
                { value: '__empty__', label: 'Пусто', count: data.filter(item => !item[columnId] || item[columnId].toString().trim() === '').length }
            ];
        }

        // Звичайний тип - збираємо унікальні значення
        const valueCounts = new Map();

        data.forEach(item => {
            const value = item[columnId];
            const normalizedValue = value ? value.toString().trim() : '';

            if (normalizedValue) {
                valueCounts.set(normalizedValue, (valueCounts.get(normalizedValue) || 0) + 1);
            }
        });

        // Сортуємо за алфавітом
        return Array.from(valueCounts.entries())
            .sort((a, b) => a[0].localeCompare(b[0], 'uk'))
            .map(([value, count]) => ({ value, label: value, count }));
    }

    /**
     * Створити dropdown для заголовка колонки
     */
    function createFilterDropdown(column) {
        const headerCell = container.querySelector(`.pseudo-table-header [data-column="${column.id}"]`);
        if (!headerCell) {
            console.warn(`⚠️ Заголовок колонки "${column.id}" не знайдено`);
            return;
        }

        // Перевіряємо чи вже є dropdown
        if (headerCell.querySelector('.dropdown-wrapper')) {
            return;
        }

        const isSortable = column.sortable;
        const isFilterable = column.filterable;

        // Отримуємо унікальні значення тільки якщо колонка filterable
        let uniqueValues = [];
        if (isFilterable) {
            uniqueValues = getUniqueValues(column.id, column.filterType);

            // Ініціалізуємо фільтр як "всі вибрані"
            if (!activeFilters.has(column.id)) {
                activeFilters.set(column.id, new Set(uniqueValues.map(v => v.value)));
            }
        }

        // Визначаємо іконку та клас
        const hasActiveSort = sortState.column === column.id;
        const iconName = isSortable && !isFilterable ? 'swap_vert' : 'filter_list';

        // Створюємо dropdown wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'dropdown-wrapper filter-dropdown';
        wrapper.innerHTML = `
            <button class="btn-icon btn-filter ${hasActiveSort ? 'is-filtered' : ''}" data-dropdown-trigger data-filter-column="${column.id}" aria-label="${column.label}">
                <span class="material-symbols-outlined">${iconName}</span>
            </button>
            <div class="dropdown-menu dropdown-menu-right">
                <div class="dropdown-header">${column.label}</div>
                <div class="dropdown-body" data-filter-body="${column.id}">
                    ${isSortable ? renderSortOptions(column.id) : ''}
                    ${isSortable && isFilterable ? '<div class="dropdown-separator"></div>' : ''}
                    ${isFilterable ? renderFilterOptions(column.id, uniqueValues) : ''}
                </div>
            </div>
        `;

        // Вставляємо після тексту заголовка
        headerCell.appendChild(wrapper);

        // Додаємо обробники
        if (isSortable) {
            setupSortHandlers(wrapper, column.id);
        }
        if (isFilterable) {
            setupFilterHandlers(wrapper, column.id);
        }
    }

    /**
     * Рендер опцій сортування
     */
    function renderSortOptions(columnId) {
        const isActiveAsc = sortState.column === columnId && sortState.direction === 'asc';
        const isActiveDesc = sortState.column === columnId && sortState.direction === 'desc';

        return `
            <button class="dropdown-item ${isActiveAsc ? 'active' : ''}" data-sort-column="${columnId}" data-sort-direction="asc">
                <span class="material-symbols-outlined">arrow_upward</span>
                <span>Сортувати А → Я</span>
            </button>
            <button class="dropdown-item ${isActiveDesc ? 'active' : ''}" data-sort-column="${columnId}" data-sort-direction="desc">
                <span class="material-symbols-outlined">arrow_downward</span>
                <span>Сортувати Я → А</span>
            </button>
        `;
    }

    /**
     * Налаштувати обробники сортування
     */
    function setupSortHandlers(wrapper, columnId) {
        wrapper.querySelectorAll('[data-sort-column]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const direction = btn.dataset.sortDirection;

                // Оновлюємо стан сортування
                sortState = { column: columnId, direction };

                // Оновлюємо візуальні індикатори всіх колонок
                updateAllSortIndicators();

                // Сортуємо дані та викликаємо callback
                triggerSortChange();

                // Закриваємо dropdown
                const dropdownWrapper = wrapper.closest('.dropdown-wrapper');
                if (dropdownWrapper) {
                    dropdownWrapper.classList.remove('is-open');
                }
            });
        });
    }

    /**
     * Оновити індикатори сортування у всіх колонках
     */
    function updateAllSortIndicators() {
        dropdownColumns.forEach(col => {
            if (!col.sortable) return;

            const trigger = container.querySelector(`[data-filter-column="${col.id}"].btn-filter`);
            if (!trigger) return;

            const isActive = sortState.column === col.id;
            trigger.classList.toggle('is-filtered', isActive); // Використовуємо існуючий клас is-filtered

            // Оновлюємо активні класи в кнопках сортування
            const body = container.querySelector(`[data-filter-body="${col.id}"]`);
            if (body) {
                body.querySelectorAll('[data-sort-column]').forEach(btn => {
                    const btnDir = btn.dataset.sortDirection;
                    const isActiveBtn = isActive && sortState.direction === btnDir;
                    btn.classList.toggle('active', isActiveBtn);
                });
            }
        });
    }

    /**
     * Викликати callback зміни сортування
     */
    function triggerSortChange() {
        if (onSort) {
            const data = dataSource();
            const sortedData = sortArray(data, sortState.column, sortState.direction, columnTypes);
            onSort(sortedData, sortState);
        }
    }

    /**
     * Відсортувати масив
     */
    function sortArray(array, column, direction, types = {}) {
        if (!column || !direction) return array;

        const columnType = types[column] || 'string';

        return [...array].sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // Обробка типу product
            if (columnType === 'product') {
                aVal = ((a.brand || '') + ' ' + (a.name || '')).trim().toLowerCase();
                bVal = ((b.brand || '') + ' ' + (b.name || '')).trim().toLowerCase();
            } else if (columnType === 'boolean') {
                aVal = (aVal === 'TRUE' || aVal === true) ? 1 : 0;
                bVal = (bVal === 'TRUE' || bVal === true) ? 1 : 0;
                return direction === 'asc' ? aVal - bVal : bVal - aVal;
            } else if (columnType === 'date') {
                aVal = aVal ? new Date(aVal).getTime() : 0;
                bVal = bVal ? new Date(bVal).getTime() : 0;
                return direction === 'asc' ? aVal - bVal : bVal - aVal;
            } else if (columnType === 'number') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
                return direction === 'asc' ? aVal - bVal : bVal - aVal;
            } else {
                aVal = String(aVal || '').toLowerCase();
                bVal = String(bVal || '').toLowerCase();
            }

            const comparison = aVal.localeCompare(bVal, 'uk');
            return direction === 'asc' ? comparison : -comparison;
        });
    }

    /**
     * Рендер опцій фільтра
     */
    function renderFilterOptions(columnId, values) {
        const currentFilter = activeFilters.get(columnId) || new Set();
        const allSelected = values.every(v => currentFilter.has(v.value));

        let html = `
            <label class="dropdown-item filter-select-all">
                <input type="checkbox" data-filter-all="${columnId}" ${allSelected ? 'checked' : ''}>
                <span>Всі</span>
            </label>
            <div class="dropdown-separator"></div>
        `;

        values.forEach(({ value, label, count }) => {
            const isChecked = currentFilter.has(value);
            html += `
                <label class="dropdown-item">
                    <input type="checkbox" data-filter-value="${value}" data-filter-column="${columnId}" ${isChecked ? 'checked' : ''}>
                    <span>${label}</span>
                    <span class="filter-count">${count}</span>
                </label>
            `;
        });

        return html;
    }

    /**
     * Налаштувати обробники подій для фільтра
     */
    function setupFilterHandlers(wrapper, columnId) {
        const body = wrapper.querySelector(`[data-filter-body="${columnId}"]`);
        if (!body) return;

        // Обробник "Всі"
        const selectAllCheckbox = body.querySelector(`[data-filter-all="${columnId}"]`);
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                const checkboxes = body.querySelectorAll(`[data-filter-column="${columnId}"]`);
                const filter = activeFilters.get(columnId);

                if (e.target.checked) {
                    // Вибрати всі
                    checkboxes.forEach(cb => {
                        cb.checked = true;
                        filter.add(cb.dataset.filterValue);
                    });
                } else {
                    // Зняти всі
                    checkboxes.forEach(cb => {
                        cb.checked = false;
                        filter.delete(cb.dataset.filterValue);
                    });
                }

                updateFilterIndicator(columnId);
                triggerFilterChange();
            });
        }

        // Обробники окремих чекбоксів
        body.querySelectorAll(`[data-filter-column="${columnId}"]`).forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const filter = activeFilters.get(columnId);
                const value = e.target.dataset.filterValue;

                console.log(`🔧 Filter change: ${columnId} = "${value}", checked: ${e.target.checked}`);

                if (e.target.checked) {
                    filter.add(value);
                } else {
                    filter.delete(value);
                }

                console.log(`🔧 Filter ${columnId} now has ${filter.size} values`);

                // Оновити "Всі"
                updateSelectAllState(body, columnId);
                updateFilterIndicator(columnId);
                triggerFilterChange();
            });
        });
    }

    /**
     * Оновити стан чекбокса "Всі"
     */
    function updateSelectAllState(body, columnId) {
        const selectAllCheckbox = body.querySelector(`[data-filter-all="${columnId}"]`);
        if (!selectAllCheckbox) return;

        const checkboxes = body.querySelectorAll(`[data-filter-column="${columnId}"]`);
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);

        selectAllCheckbox.checked = allChecked;
    }

    /**
     * Оновити візуальний індикатор фільтра
     */
    function updateFilterIndicator(columnId) {
        const trigger = container.querySelector(`[data-filter-column="${columnId}"].btn-filter`);
        if (!trigger) return;

        const filter = activeFilters.get(columnId);
        const uniqueValues = getUniqueValues(columnId, columns.find(c => c.id === columnId)?.filterType);

        // Якщо не всі вибрані - показуємо індикатор
        const isFiltered = filter.size < uniqueValues.length;

        if (isFiltered) {
            trigger.classList.add('is-filtered');
        } else {
            trigger.classList.remove('is-filtered');
        }
    }

    /**
     * Викликати callback зміни фільтрів
     */
    function triggerFilterChange() {
        if (onFilter) {
            // Конвертуємо Map в об'єкт, включаючи тільки активні фільтри
            const filtersObj = {};
            activeFilters.forEach((values, columnId) => {
                const column = filterableColumns.find(c => c.id === columnId);
                const uniqueValues = getUniqueValues(columnId, column?.filterType);

                console.log(`🔧 Column ${columnId}: ${values.size} selected / ${uniqueValues.length} total`);

                // Включаємо тільки якщо НЕ всі значення вибрані
                if (values.size < uniqueValues.length) {
                    filtersObj[columnId] = Array.from(values);
                }
            });
            console.log('🔧 Sending filters:', filtersObj);
            onFilter(filtersObj);
        }
    }

    /**
     * Застосувати фільтри до масиву даних
     */
    function applyFiltersToData(data) {
        return data.filter(item => {
            // Перевіряємо кожен активний фільтр
            for (const [columnId, allowedValues] of activeFilters) {
                const column = columns.find(c => c.id === columnId);
                const itemValue = item[columnId];

                if (column?.filterType === 'exists') {
                    // Фільтр по наявності
                    const hasValue = itemValue && itemValue.toString().trim() !== '';

                    if (allowedValues.has('__exists__') && allowedValues.has('__empty__')) {
                        // Обидва вибрані - показуємо все
                        continue;
                    } else if (allowedValues.has('__exists__') && !hasValue) {
                        return false;
                    } else if (allowedValues.has('__empty__') && hasValue) {
                        return false;
                    } else if (!allowedValues.has('__exists__') && !allowedValues.has('__empty__')) {
                        return false;
                    }
                } else {
                    // Звичайний фільтр по значенню
                    const normalizedValue = itemValue ? itemValue.toString().trim() : '';

                    if (normalizedValue && !allowedValues.has(normalizedValue)) {
                        return false;
                    }
                }
            }

            return true;
        });
    }

    /**
     * Оновити dropdown (наприклад, після зміни даних)
     */
    function refreshDropdowns() {
        filterableColumns.forEach(column => {
            const body = container.querySelector(`[data-filter-body="${column.id}"]`);
            if (!body) return;

            const uniqueValues = getUniqueValues(column.id, column.filterType);
            body.innerHTML = renderFilterOptions(column.id, uniqueValues);
            setupFilterHandlers(body.closest('.dropdown-wrapper'), column.id);
        });
    }

    // Ініціалізуємо dropdowns для колонок з filterable або sortable
    dropdownColumns.forEach(column => {
        createFilterDropdown(column);
    });

    // Ініціалізуємо dropdown поведінку
    initDropdowns();

    console.log(`✅ Фільтри/сортування таблиці ініціалізовано для ${dropdownColumns.length} колонок`);

    // Повертаємо API
    return {
        /**
         * Отримати поточні активні фільтри
         * @returns {Object} Об'єкт з фільтрами { columnId: ['value1', 'value2'] }
         */
        getFilters() {
            const filtersObj = {};
            activeFilters.forEach((values, columnId) => {
                filtersObj[columnId] = Array.from(values);
            });
            return filtersObj;
        },

        /**
         * Встановити фільтри програмно
         * @param {Object} filters - Об'єкт з фільтрами
         */
        setFilters(filters) {
            Object.entries(filters).forEach(([columnId, values]) => {
                activeFilters.set(columnId, new Set(values));
                updateFilterIndicator(columnId);
            });
            triggerFilterChange();
        },

        /**
         * Скинути всі фільтри
         */
        resetFilters() {
            filterableColumns.forEach(column => {
                const uniqueValues = getUniqueValues(column.id, column.filterType);
                activeFilters.set(column.id, new Set(uniqueValues.map(v => v.value)));
                updateFilterIndicator(column.id);
            });
            refreshDropdowns();
            triggerFilterChange();
        },

        /**
         * Застосувати фільтри до масиву даних
         * @param {Array} data - Масив даних
         * @returns {Array} Відфільтрований масив
         */
        filter(data) {
            return applyFiltersToData(data);
        },

        /**
         * Оновити dropdowns (викликати після зміни даних)
         */
        refresh() {
            refreshDropdowns();
        },

        /**
         * Отримати поточний стан сортування
         * @returns {{column: string|null, direction: string|null}}
         */
        getSortState() {
            return { ...sortState };
        },

        /**
         * Встановити сортування програмно
         * @param {string} column - ID колонки
         * @param {string} direction - Напрямок ('asc' або 'desc')
         */
        setSort(column, direction) {
            sortState = { column, direction };
            updateAllSortIndicators();
            triggerSortChange();
        },

        /**
         * Скинути сортування
         */
        resetSort() {
            sortState = { column: null, direction: null };
            updateAllSortIndicators();
        },

        /**
         * Знищити фільтри та сортування
         */
        destroy() {
            dropdownColumns.forEach(column => {
                const wrapper = container.querySelector(`[data-filter-column="${column.id}"]`)?.closest('.dropdown-wrapper');
                if (wrapper) {
                    wrapper.remove();
                }
            });
            activeFilters.clear();
            sortState = { column: null, direction: null };
        }
    };
}

/**
 * Допоміжна функція для фільтрації даних
 * Використовується коли не потрібен повний API
 * @param {Array} data - Масив даних
 * @param {Object} filters - Об'єкт з фільтрами { columnId: ['value1', 'value2'] }
 * @param {Array} columns - Конфігурація колонок
 * @returns {Array} Відфільтрований масив
 */
export function filterData(data, filters, columns = []) {
    if (!filters || Object.keys(filters).length === 0) {
        return data;
    }

    return data.filter(item => {
        for (const [columnId, allowedValues] of Object.entries(filters)) {
            const column = columns.find(c => c.id === columnId);
            const itemValue = item[columnId];
            const allowedSet = new Set(allowedValues);

            if (column?.filterType === 'exists') {
                const hasValue = itemValue && itemValue.toString().trim() !== '';

                if (allowedSet.has('__exists__') && allowedSet.has('__empty__')) {
                    continue;
                } else if (allowedSet.has('__exists__') && !hasValue) {
                    return false;
                } else if (allowedSet.has('__empty__') && hasValue) {
                    return false;
                } else if (!allowedSet.has('__exists__') && !allowedSet.has('__empty__')) {
                    return false;
                }
            } else {
                const normalizedValue = itemValue ? itemValue.toString().trim() : '';

                if (normalizedValue && !allowedSet.has(normalizedValue)) {
                    return false;
                }
            }
        }

        return true;
    });
}
