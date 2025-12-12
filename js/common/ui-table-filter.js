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
 * @param {Array} options.columns - Конфігурація колонок з filterable: true
 * @param {Function} options.onFilter - Callback при зміні фільтрів
 * @returns {Object} API для управління фільтрами
 */
export function initTableFilters(container, options) {
    const {
        dataSource,
        columns = [],
        onFilter = null
    } = options;

    // Стан фільтрів: { columnId: Set(['value1', 'value2']) }
    const activeFilters = new Map();

    // Знаходимо колонки з filterable: true
    const filterableColumns = columns.filter(col => col.filterable);

    if (filterableColumns.length === 0) {
        console.warn('⚠️ Немає колонок з filterable: true');
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

        const uniqueValues = getUniqueValues(column.id, column.filterType);

        // Ініціалізуємо фільтр як "всі вибрані"
        if (!activeFilters.has(column.id)) {
            activeFilters.set(column.id, new Set(uniqueValues.map(v => v.value)));
        }

        // Створюємо dropdown wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'dropdown-wrapper filter-dropdown';
        wrapper.innerHTML = `
            <button class="btn-icon btn-filter" data-dropdown-trigger data-filter-column="${column.id}" aria-label="Фільтр ${column.label}">
                <span class="material-symbols-outlined">filter_list</span>
            </button>
            <div class="dropdown-menu dropdown-menu-right">
                <div class="dropdown-header">${column.label}</div>
                <div class="dropdown-body filter-options" data-filter-body="${column.id}">
                    ${renderFilterOptions(column.id, uniqueValues)}
                </div>
            </div>
        `;

        // Вставляємо після тексту заголовка
        headerCell.appendChild(wrapper);

        // Додаємо обробники чекбоксів
        setupFilterHandlers(wrapper, column.id);
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

                if (e.target.checked) {
                    filter.add(value);
                } else {
                    filter.delete(value);
                }

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
            // Конвертуємо Map в об'єкт
            const filtersObj = {};
            activeFilters.forEach((values, columnId) => {
                filtersObj[columnId] = Array.from(values);
            });
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

    // Ініціалізуємо dropdowns для кожної filterable колонки
    filterableColumns.forEach(column => {
        createFilterDropdown(column);
    });

    // Ініціалізуємо dropdown поведінку
    initDropdowns();

    console.log(`✅ Фільтри таблиці ініціалізовано для ${filterableColumns.length} колонок`);

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
         * Знищити фільтри
         */
        destroy() {
            filterableColumns.forEach(column => {
                const wrapper = container.querySelector(`[data-filter-column="${column.id}"]`)?.closest('.dropdown-wrapper');
                if (wrapper) {
                    wrapper.remove();
                }
            });
            activeFilters.clear();
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
