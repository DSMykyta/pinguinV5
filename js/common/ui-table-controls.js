// js/common/ui-table-controls.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    UNIVERSAL TABLE CONTROLS                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Єдина система для сортування та фільтрації таблиць.
 * Підтримує два режими UI:
 * - 'click': клік по заголовку колонки (просте сортування)
 * - 'dropdown': випадаюче меню з сортуванням та/або фільтрацією
 *
 * ВИКОРИСТАННЯ:
 * @example
 * const api = initTableControls(container, {
 *     dataSource: () => myData,
 *     columns: [
 *         { id: 'id', sortable: true },                    // click-сортування
 *         { id: 'name', sortable: true, filterable: true }, // dropdown
 *         { id: 'status', sortable: true, sortMode: 'dropdown' } // dropdown без фільтра
 *     ],
 *     columnTypes: { id: 'id-number', status: 'boolean' },
 *     onSort: (data, state) => { myData = data; render(); },
 *     onFilter: (filters) => { applyFilters(filters); render(); }
 * });
 */

import { initDropdowns } from './ui-dropdown.js';

// ==================== СОРТУВАННЯ ====================

/**
 * Відсортувати масив за вказаною колонкою
 * @param {Array} array - Масив даних
 * @param {string} column - ID колонки
 * @param {string} direction - Напрямок ('asc' або 'desc')
 * @param {Object} columnTypes - Типи колонок
 * @returns {Array} Відсортований масив
 */
function sortArray(array, column, direction, columnTypes = {}) {
    if (!column || !direction) return array;

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
                aVal = (aVal || '').toString();
                bVal = (bVal || '').toString();
                break;
        }

        // Порівняння
        if (columnType === 'string' || columnType === 'product' || columnType === undefined) {
            const comparison = aVal.localeCompare(bVal, 'uk', { sensitivity: 'base' });
            return direction === 'asc' ? comparison : -comparison;
        }

        // Для чисел, бульових, дат
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

/**
 * Оновити візуальні індикатори сортування (для click режиму)
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
            header.classList.add(`sorted-${direction}`);
            icon.textContent = direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
        }
    });
}

// ==================== ФІЛЬТРАЦІЯ ====================

/**
 * Отримати унікальні значення для фільтра
 * @param {Array} data - Масив даних
 * @param {string} columnId - ID колонки
 * @param {string} filterType - Тип фільтра ('values' або 'exists')
 * @returns {Array} Масив {value, label, count}
 */
function getUniqueValues(data, columnId, filterType) {
    if (filterType === 'exists') {
        return [
            { value: '__exists__', label: 'Наявно', count: data.filter(item => item[columnId] && item[columnId].toString().trim() !== '').length },
            { value: '__empty__', label: 'Пусто', count: data.filter(item => !item[columnId] || item[columnId].toString().trim() === '').length }
        ];
    }

    const valueCounts = new Map();

    data.forEach(item => {
        const rawValue = item[columnId];
        const key = (rawValue === null || rawValue === undefined || rawValue === '')
            ? '__empty__'
            : rawValue.toString().trim();

        valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
    });

    return Array.from(valueCounts.entries())
        .sort((a, b) => {
            if (a[0] === '__empty__') return 1;
            if (b[0] === '__empty__') return -1;
            return a[0].localeCompare(b[0], 'uk');
        })
        .map(([value, count]) => ({
            value,
            label: value === '__empty__' ? 'Пусто' : value,
            count
        }));
}

/**
 * Застосувати фільтри до даних
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

                if (normalizedValue) {
                    if (!allowedSet.has(normalizedValue)) {
                        return false;
                    }
                } else {
                    if (!allowedSet.has('__empty__')) {
                        return false;
                    }
                }
            }
        }

        return true;
    });
}

// ==================== CLICK SORTING ====================

/**
 * Налаштувати click-сортування для колонок
 * @param {HTMLElement} container - Контейнер таблиці
 * @param {Object} options - Опції
 * @returns {Function} Функція для видалення listener
 */
function setupClickSorting(container, options) {
    const { state, dataSource, columnTypes, onSort } = options;

    const clickHandler = async (e) => {
        const header = e.target.closest('.sortable-header');
        if (!header) return;

        const sortKey = header.dataset.sortKey;
        if (!sortKey) return;

        // Перемикання напрямку
        if (state.sortColumn === sortKey) {
            state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            state.sortColumn = sortKey;
            state.sortDirection = 'asc';
        }

        // Оновити візуальні індикатори
        updateSortIndicators(container, sortKey, state.sortDirection);

        // Сортувати дані
        const data = dataSource();
        const sortedData = sortArray(data, sortKey, state.sortDirection, columnTypes);

        // Викликати callback
        if (onSort) {
            await onSort(sortedData);
        }

        console.log(`↕️ Сортування (click): ${sortKey} ${state.sortDirection}`);
    };

    container.addEventListener('click', clickHandler);

    return () => container.removeEventListener('click', clickHandler);
}

// ==================== DROPDOWN UI ====================

/**
 * Створити dropdown для колонки
 * @param {HTMLElement} headerCell - Заголовок колонки
 * @param {Object} column - Конфігурація колонки
 * @param {Object} state - Стан сортування/фільтрації
 * @param {Object} handlers - Обробники подій
 */
function createColumnDropdown(headerCell, column, state, handlers) {
    const { dataSource, columnTypes, onSort, onFilter, activeFilters } = handlers;

    // Перевіряємо чи вже є dropdown
    if (headerCell.querySelector('.dropdown-wrapper')) {
        return;
    }

    const isSortable = column.sortable;
    const isFilterable = column.filterable;

    // Отримуємо унікальні значення для фільтра
    let uniqueValues = [];
    if (isFilterable) {
        uniqueValues = getUniqueValues(dataSource(), column.id, column.filterType);

        // Ініціалізуємо фільтр як "всі вибрані"
        if (!activeFilters.has(column.id)) {
            activeFilters.set(column.id, new Set(uniqueValues.map(v => v.value)));
        }
    }

    // Визначаємо іконку
    const hasActiveSort = state.sortColumn === column.id;
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
                ${isSortable ? renderSortOptions(column.id, state) : ''}
                ${isSortable && isFilterable ? '<div class="dropdown-separator"></div>' : ''}
                ${isFilterable ? renderFilterOptions(column.id, uniqueValues, activeFilters) : ''}
            </div>
        </div>
    `;

    headerCell.appendChild(wrapper);

    // Додаємо обробники
    if (isSortable) {
        setupDropdownSortHandlers(wrapper, column.id, state, handlers);
    }
    if (isFilterable) {
        setupDropdownFilterHandlers(wrapper, column.id, column, state, handlers);
    }
}

/**
 * Рендер опцій сортування для dropdown
 */
function renderSortOptions(columnId, state) {
    const isActiveAsc = state.sortColumn === columnId && state.sortDirection === 'asc';
    const isActiveDesc = state.sortColumn === columnId && state.sortDirection === 'desc';

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
 * Рендер опцій фільтрації для dropdown
 */
function renderFilterOptions(columnId, values, activeFilters) {
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
 * Налаштувати обробники сортування для dropdown
 */
function setupDropdownSortHandlers(wrapper, columnId, state, handlers) {
    const { dataSource, columnTypes, onSort, container, columns, activeFilters } = handlers;

    wrapper.querySelectorAll('[data-sort-column]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const direction = btn.dataset.sortDirection;

            // Оновлюємо стан сортування
            state.sortColumn = columnId;
            state.sortDirection = direction;

            // Оновлюємо візуальні індикатори у всіх dropdown
            updateDropdownSortIndicators(container, columns, state);

            // Сортуємо дані
            const data = dataSource();
            const sortedData = sortArray(data, columnId, direction, columnTypes);

            // Викликаємо callback
            if (onSort) {
                await onSort(sortedData);
            }

            // Закриваємо dropdown
            wrapper.classList.remove('is-open');

            console.log(`↕️ Сортування (dropdown): ${columnId} ${direction}`);
        });
    });
}

/**
 * Налаштувати обробники фільтрації для dropdown
 */
function setupDropdownFilterHandlers(wrapper, columnId, column, state, handlers) {
    const { dataSource, onFilter, container, columns, activeFilters } = handlers;
    const body = wrapper.querySelector(`[data-filter-body="${columnId}"]`);
    if (!body) return;

    // Обробник "Всі"
    const selectAllCheckbox = body.querySelector(`[data-filter-all="${columnId}"]`);
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = body.querySelectorAll(`[data-filter-column="${columnId}"]`);
            const filter = activeFilters.get(columnId);

            if (e.target.checked) {
                checkboxes.forEach(cb => {
                    cb.checked = true;
                    filter.add(cb.dataset.filterValue);
                });
            } else {
                checkboxes.forEach(cb => {
                    cb.checked = false;
                    filter.delete(cb.dataset.filterValue);
                });
            }

            updateFilterIndicator(container, columnId, activeFilters, columns);
            triggerFilterChange(activeFilters, columns, onFilter, dataSource);
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
            updateFilterIndicator(container, columnId, activeFilters, columns);
            triggerFilterChange(activeFilters, columns, onFilter, dataSource);
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
 * Оновити індикатор активного фільтра
 */
function updateFilterIndicator(container, columnId, activeFilters, columns) {
    const trigger = container.querySelector(`[data-filter-column="${columnId}"].btn-filter`);
    if (!trigger) return;

    const filter = activeFilters.get(columnId);
    const column = columns.find(c => c.id === columnId);
    // Потрібно порівняти з кількістю унікальних значень, але це ускладнює логіку
    // Просто показуємо індикатор якщо не всі вибрані
    const isFiltered = filter && filter.size < 100; // Спрощена логіка

    trigger.classList.toggle('is-filtered', isFiltered);
}

/**
 * Оновити індикатори сортування у всіх dropdown
 */
function updateDropdownSortIndicators(container, columns, state) {
    columns.forEach(col => {
        if (!col.sortable) return;

        const trigger = container.querySelector(`[data-filter-column="${col.id}"].btn-filter`);
        if (!trigger) return;

        const isActive = state.sortColumn === col.id;
        trigger.classList.toggle('is-filtered', isActive);

        // Оновлюємо активні класи в кнопках сортування
        const body = container.querySelector(`[data-filter-body="${col.id}"]`);
        if (body) {
            body.querySelectorAll('[data-sort-column]').forEach(btn => {
                const btnDir = btn.dataset.sortDirection;
                const isActiveBtn = isActive && state.sortDirection === btnDir;
                btn.classList.toggle('active', isActiveBtn);
            });
        }
    });
}

/**
 * Викликати callback зміни фільтрів
 */
function triggerFilterChange(activeFilters, columns, onFilter, dataSource) {
    if (!onFilter) return;

    const filtersObj = {};
    activeFilters.forEach((values, columnId) => {
        const column = columns.find(c => c.id === columnId);
        if (!column?.filterable) return;

        const uniqueValues = getUniqueValues(dataSource(), columnId, column.filterType);

        // Включаємо тільки якщо НЕ всі значення вибрані
        if (values.size < uniqueValues.length) {
            filtersObj[columnId] = Array.from(values);
        }
    });

    onFilter(filtersObj);
}

/**
 * Налаштувати dropdown для колонок
 */
function setupDropdownControls(container, options) {
    const { columns, state, dataSource, columnTypes, onSort, onFilter, activeFilters } = options;

    const handlers = {
        dataSource,
        columnTypes,
        onSort,
        onFilter,
        container,
        columns,
        activeFilters
    };

    // Знаходимо заголовки та створюємо dropdown
    columns.forEach(column => {
        const headerCell = container.querySelector(`.pseudo-table-header [data-column="${column.id}"]`);
        if (headerCell) {
            createColumnDropdown(headerCell, column, state, handlers);
        }
    });

    // Ініціалізуємо dropdown поведінку
    initDropdowns();
}

// ==================== ГОЛОВНА ФУНКЦІЯ ====================

/**
 * Ініціалізувати контроли таблиці (сортування та/або фільтрація)
 * @param {HTMLElement} container - Контейнер таблиці
 * @param {Object} options - Опції
 * @param {Function} options.dataSource - Функція що повертає масив даних
 * @param {Array} options.columns - Конфігурація колонок
 * @param {Object} [options.columnTypes] - Типи колонок для сортування
 * @param {Function} [options.onSort] - Callback сортування (data, state)
 * @param {Function} [options.onFilter] - Callback фільтрації (filters)
 * @returns {Object} API для керування
 */
export function initTableControls(container, options) {
    const {
        dataSource,
        columns = [],
        columnTypes = {},
        onSort = null,
        onFilter = null
    } = options;

    // Стан
    const state = {
        sortColumn: null,
        sortDirection: null
    };

    const activeFilters = new Map();

    // Розділити колонки по режимах
    const clickColumns = [];
    const dropdownColumns = [];

    columns.forEach(col => {
        if (!col.sortable && !col.filterable) return;

        const mode = col.sortMode || (col.filterable ? 'dropdown' : 'click');
        if (mode === 'click' && col.sortable && !col.filterable) {
            clickColumns.push(col);
        }
        if (mode === 'dropdown' || col.filterable) {
            dropdownColumns.push(col);
        }
    });

    // Cleanup функції
    let destroyClickSort = null;

    // Ініціалізувати click-сортування
    if (clickColumns.length > 0) {
        destroyClickSort = setupClickSorting(container, {
            columns: clickColumns,
            state,
            dataSource,
            columnTypes,
            onSort: (data) => onSort?.(data, { column: state.sortColumn, direction: state.sortDirection })
        });
    }

    // Ініціалізувати dropdown
    if (dropdownColumns.length > 0) {
        setupDropdownControls(container, {
            columns: dropdownColumns,
            state,
            dataSource,
            columnTypes,
            activeFilters,
            onSort: (data) => onSort?.(data, { column: state.sortColumn, direction: state.sortDirection }),
            onFilter
        });
    }

    console.log(`✅ Table controls: ${clickColumns.length} click, ${dropdownColumns.length} dropdown колонок`);

    // API
    return {
        /**
         * Програмно відсортувати за колонкою
         */
        sort: async (column, direction) => {
            state.sortColumn = column;
            state.sortDirection = direction;

            // Оновити візуальні індикатори
            const isClickColumn = clickColumns.find(c => c.id === column);
            if (isClickColumn) {
                updateSortIndicators(container, column, direction);
            } else {
                updateDropdownSortIndicators(container, dropdownColumns, state);
            }

            // Сортувати та викликати callback
            const data = dataSource();
            const sortedData = sortArray(data, column, direction, columnTypes);
            if (onSort) {
                await onSort(sortedData, { column, direction });
            }
        },

        /**
         * Отримати поточний стан сортування
         */
        getSortState: () => ({
            column: state.sortColumn,
            direction: state.sortDirection
        }),

        /**
         * Скинути сортування
         */
        resetSort: () => {
            state.sortColumn = null;
            state.sortDirection = null;
            updateSortIndicators(container, null, null);
            updateDropdownSortIndicators(container, dropdownColumns, state);
        },

        /**
         * Отримати активні фільтри
         */
        getFilters: () => {
            const filtersObj = {};
            activeFilters.forEach((values, columnId) => {
                filtersObj[columnId] = Array.from(values);
            });
            return filtersObj;
        },

        /**
         * Встановити фільтри програмно
         */
        setFilters: (filters) => {
            Object.entries(filters).forEach(([columnId, values]) => {
                activeFilters.set(columnId, new Set(values));
                updateFilterIndicator(container, columnId, activeFilters, columns);
            });
            triggerFilterChange(activeFilters, dropdownColumns, onFilter, dataSource);
        },

        /**
         * Скинути всі фільтри
         */
        resetFilters: () => {
            dropdownColumns.filter(c => c.filterable).forEach(column => {
                const uniqueValues = getUniqueValues(dataSource(), column.id, column.filterType);
                activeFilters.set(column.id, new Set(uniqueValues.map(v => v.value)));
                updateFilterIndicator(container, column.id, activeFilters, columns);
            });
            triggerFilterChange(activeFilters, dropdownColumns, onFilter, dataSource);
        },

        /**
         * Застосувати фільтри до масиву даних
         */
        filter: (data) => {
            const filtersObj = {};
            activeFilters.forEach((values, columnId) => {
                const column = dropdownColumns.find(c => c.id === columnId);
                if (!column?.filterable) return;
                const uniqueValues = getUniqueValues(dataSource(), columnId, column.filterType);
                if (values.size < uniqueValues.length) {
                    filtersObj[columnId] = Array.from(values);
                }
            });
            return filterData(data, filtersObj, dropdownColumns);
        },

        /**
         * Оновити dropdown (після зміни даних)
         */
        refresh: () => {
            // Перестворити dropdown з новими даними
            dropdownColumns.forEach(column => {
                const wrapper = container.querySelector(`[data-filter-column="${column.id}"]`)?.closest('.dropdown-wrapper');
                if (wrapper) {
                    wrapper.remove();
                }
            });
            if (dropdownColumns.length > 0) {
                setupDropdownControls(container, {
                    columns: dropdownColumns,
                    state,
                    dataSource,
                    columnTypes,
                    activeFilters,
                    onSort: (data) => onSort?.(data, { column: state.sortColumn, direction: state.sortDirection }),
                    onFilter
                });
            }
        },

        /**
         * Знищити всі контроли
         */
        destroy: () => {
            if (destroyClickSort) destroyClickSort();
            dropdownColumns.forEach(column => {
                const wrapper = container.querySelector(`[data-filter-column="${column.id}"]`)?.closest('.dropdown-wrapper');
                if (wrapper) {
                    wrapper.remove();
                }
            });
            activeFilters.clear();
        }
    };
}

// ==================== LEGACY EXPORTS ====================
// Для зворотної сумісності під час міграції

/**
 * @deprecated Використовуйте initTableControls()
 */
export function initTableSorting(container, options) {
    const { dataSource, onSort, columnTypes = {} } = options;

    // Старий API працював з data-sort-key атрибутами напряму
    // Тому нам потрібно зберегти цю поведінку
    const state = {
        sortColumn: null,
        sortDirection: null
    };

    const clickHandler = async (e) => {
        const header = e.target.closest('.sortable-header');
        if (!header) return;

        const sortKey = header.dataset.sortKey;
        if (!sortKey) return;

        // Перемикання напрямку
        if (state.sortColumn === sortKey) {
            state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            state.sortColumn = sortKey;
            state.sortDirection = 'asc';
        }

        updateSortIndicators(container, sortKey, state.sortDirection);

        const data = dataSource();
        const sortedData = sortArray(data, sortKey, state.sortDirection, columnTypes);

        if (onSort) {
            await onSort(sortedData);
        }

        console.log(`↕️ Сортування: ${sortKey} ${state.sortDirection}`);
    };

    container.addEventListener('click', clickHandler);

    return {
        sort: async (column, direction) => {
            state.sortColumn = column;
            state.sortDirection = direction;
            updateSortIndicators(container, column, direction);

            const data = dataSource();
            const sortedData = sortArray(data, column, direction, columnTypes);

            if (onSort) {
                await onSort(sortedData);
            }
        },
        reset: () => {
            state.sortColumn = null;
            state.sortDirection = null;
            updateSortIndicators(container, null, null);
        },
        getState: () => ({
            column: state.sortColumn,
            direction: state.sortDirection
        }),
        destroy: () => {
            container.removeEventListener('click', clickHandler);
        }
    };
}

/**
 * @deprecated Використовуйте initTableControls()
 */
export function initTableFilters(container, options) {
    const {
        dataSource,
        columns = [],
        columnTypes = {},
        onFilter = null,
        onSort = null
    } = options;

    // Делегуємо до initTableControls
    return initTableControls(container, {
        dataSource,
        columns: columns.map(col => ({
            ...col,
            sortMode: 'dropdown' // Все dropdown
        })),
        columnTypes,
        onSort: onSort ? (data, state) => onSort(data, state) : null,
        onFilter
    });
}

/**
 * Отримати значення для сортування з об'єкта
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
