// js/common/ui-table-controls.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    UNIVERSAL TABLE CONTROLS                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Єдина система для сортування та фільтрації таблиць.
 *
 * КЛАСИ:
 * - `.sortable-header` → клік по заголовку = сортування
 * - `.sortable-header.filterable` → клік = сортування + наведення 2 сек = dropdown
 *
 * ВИКОРИСТАННЯ:
 * @example
 * // HTML заголовок з click-сортуванням:
 * <div class="pseudo-table-cell sortable-header" data-sort-key="name">
 *     <span>Назва</span>
 *     <span class="sort-indicator">...</span>
 * </div>
 *
 * // HTML заголовок з click-сортуванням + hover dropdown:
 * <div class="pseudo-table-cell sortable-header filterable" data-sort-key="status" data-column="status">
 *     <span>Статус</span>
 *     <span class="sort-indicator">...</span>
 * </div>
 *
 * // JS ініціалізація:
 * const api = initTableSorting(container, {
 *     dataSource: () => myData,
 *     onSort: async (sortedData) => { myData = sortedData; render(); },
 *     columnTypes: { id: 'id-number', status: 'boolean' },
 *     filterColumns: [  // Опційно - для колонок з .filterable
 *         { id: 'status', label: 'Статус', filterType: 'values' }
 *     ],
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
            case 'id-text':
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
 * Оновити візуальні індикатори сортування
 * @param {HTMLElement} container - Контейнер таблиці
 * @param {string|null} activeSortKey - Активна колонка сортування
 * @param {string|null} direction - Напрямок сортування ('asc' або 'desc')
 */
export function updateSortIndicators(container, activeSortKey, direction) {
    const headers = container.querySelectorAll('.sortable-header');

    headers.forEach(header => {
        const indicator = header.querySelector('.sort-indicator');
        const sortKey = header.dataset.sortKey;

        // Видалити всі класи сортування
        header.classList.remove('sorted-asc', 'sorted-desc');

        if (sortKey === activeSortKey && direction) {
            header.classList.add(`sorted-${direction}`);
            if (indicator) {
                const icon = indicator.querySelector('.material-symbols-outlined');
                if (icon) {
                    icon.textContent = direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
                }
            }
        } else if (indicator) {
            const icon = indicator.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.textContent = 'unfold_more';
            }
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

// ==================== HOVER DROPDOWN ====================

/**
 * Стан hover dropdown системи
 */
const hoverState = {
    activeHeader: null,
    hoverTimeout: null,
    activeDropdown: null
};

/**
 * Створити dropdown HTML для колонки
 */
function createHoverDropdown(header, columnConfig, handlers) {
    const { dataSource, activeFilters, onFilter } = handlers;
    const columnId = header.dataset.sortKey || header.dataset.column;
    const columnLabel = columnConfig?.label || header.querySelector('span')?.textContent || columnId;

    // Отримуємо унікальні значення для фільтра
    const uniqueValues = getUniqueValues(dataSource(), columnId, columnConfig?.filterType);

    // Ініціалізуємо фільтр якщо потрібно
    if (!activeFilters.has(columnId)) {
        activeFilters.set(columnId, new Set(uniqueValues.map(v => v.value)));
    }

    const currentFilter = activeFilters.get(columnId);
    const allSelected = uniqueValues.every(v => currentFilter.has(v.value));

    // Створюємо dropdown елемент (використовуємо існуючі класи)
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown-menu';
    dropdown.dataset.column = columnId;
    dropdown.style.display = 'block';
    dropdown.style.opacity = '1';
    dropdown.style.transform = 'none';

    // Dropdown містить ТІЛЬКИ фільтри (сортування працює по кліку на заголовок)
    dropdown.innerHTML = `
        <div class="dropdown-header">${columnLabel}</div>
        <div class="dropdown-body">
            <label class="dropdown-item filter-select-all">
                <input type="checkbox" data-filter-all ${allSelected ? 'checked' : ''}>
                <span>Всі</span>
            </label>
            <div class="dropdown-separator"></div>
            ${uniqueValues.map(({ value, label, count }) => `
                <label class="dropdown-item">
                    <input type="checkbox" data-filter-value="${value}" ${currentFilter.has(value) ? 'checked' : ''}>
                    <span>${label}</span>
                    <span class="filter-count">${count}</span>
                </label>
            `).join('')}
        </div>
    `;

    // Обробник "Всі"
    const selectAllCheckbox = dropdown.querySelector('[data-filter-all]');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            e.stopPropagation();
            const checkboxes = dropdown.querySelectorAll('[data-filter-value]');
            const filter = activeFilters.get(columnId);

            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                if (e.target.checked) {
                    filter.add(cb.dataset.filterValue);
                } else {
                    filter.delete(cb.dataset.filterValue);
                }
            });

            triggerFilterChange(activeFilters, handlers.filterColumns, onFilter, dataSource);
        });
    }

    // Обробники окремих чекбоксів
    dropdown.querySelectorAll('[data-filter-value]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            const filter = activeFilters.get(columnId);
            const value = e.target.dataset.filterValue;

            if (e.target.checked) {
                filter.add(value);
            } else {
                filter.delete(value);
            }

            // Оновити "Всі"
            const allChecked = uniqueValues.every(v => filter.has(v.value));
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = allChecked;
            }

            triggerFilterChange(activeFilters, handlers.filterColumns, onFilter, dataSource);
        });
    });

    // Запобігаємо закриттю при кліку всередині dropdown
    dropdown.addEventListener('click', (e) => e.stopPropagation());

    return dropdown;
}

/**
 * Показати hover dropdown
 */
function showHoverDropdown(header, columnConfig, handlers) {
    hideHoverDropdown();

    const dropdown = createHoverDropdown(header, columnConfig, handlers);
    document.body.appendChild(dropdown);

    // Позиціонування
    const rect = header.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.zIndex = '10000';

    // Перевірка чи не виходить за межі екрану
    requestAnimationFrame(() => {
        const dropdownRect = dropdown.getBoundingClientRect();
        if (dropdownRect.right > window.innerWidth) {
            dropdown.style.left = `${window.innerWidth - dropdownRect.width - 8}px`;
        }
        if (dropdownRect.bottom > window.innerHeight) {
            dropdown.style.top = `${rect.top - dropdownRect.height - 4}px`;
        }
    });

    hoverState.activeDropdown = dropdown;
    hoverState.activeHeader = header;

    // Закриття при кліку поза dropdown
    setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
    }, 0);
}

/**
 * Приховати hover dropdown
 */
function hideHoverDropdown() {
    if (hoverState.activeDropdown) {
        hoverState.activeDropdown.remove();
        hoverState.activeDropdown = null;
    }
    hoverState.activeHeader = null;
    document.removeEventListener('click', handleOutsideClick);
}

/**
 * Обробник кліку поза dropdown
 */
function handleOutsideClick(e) {
    if (hoverState.activeDropdown && !hoverState.activeDropdown.contains(e.target)) {
        hideHoverDropdown();
    }
}

/**
 * Налаштувати hover dropdown для filterable колонок
 */
function setupHoverDropdowns(container, handlers) {
    const filterableHeaders = container.querySelectorAll('.sortable-header.filterable');

    filterableHeaders.forEach(header => {
        const columnId = header.dataset.sortKey || header.dataset.column;
        const columnConfig = handlers.filterColumns?.find(c => c.id === columnId);

        // Hover з затримкою 2 секунди
        header.addEventListener('mouseenter', () => {
            hoverState.hoverTimeout = setTimeout(() => {
                showHoverDropdown(header, columnConfig, handlers);
            }, 2000);
        });

        header.addEventListener('mouseleave', (e) => {
            // Скасовуємо таймер
            if (hoverState.hoverTimeout) {
                clearTimeout(hoverState.hoverTimeout);
                hoverState.hoverTimeout = null;
            }

            // Не закриваємо якщо перейшли на dropdown
            if (hoverState.activeDropdown) {
                const toElement = e.relatedTarget;
                if (toElement && hoverState.activeDropdown.contains(toElement)) {
                    return;
                }
            }
        });
    });

    // Закриваємо dropdown при виході з нього
    document.addEventListener('mouseleave', (e) => {
        if (hoverState.activeDropdown && e.target === hoverState.activeDropdown) {
            const toElement = e.relatedTarget;
            if (toElement && hoverState.activeHeader && hoverState.activeHeader.contains(toElement)) {
                return;
            }
            hideHoverDropdown();
        }
    }, true);
}

/**
 * Викликати callback зміни фільтрів
 */
function triggerFilterChange(activeFilters, filterColumns, onFilter, dataSource) {
    if (!onFilter) return;

    const filtersObj = {};
    activeFilters.forEach((values, columnId) => {
        const column = filterColumns?.find(c => c.id === columnId);
        if (!column) return;

        const uniqueValues = getUniqueValues(dataSource(), columnId, column.filterType);

        // Включаємо тільки якщо НЕ всі значення вибрані
        if (values.size < uniqueValues.length) {
            filtersObj[columnId] = Array.from(values);
        }
    });

    onFilter(filtersObj);
}

// ==================== ГОЛОВНА ФУНКЦІЯ ====================

/**
 * Ініціалізувати сортування таблиці
 *
 * @param {HTMLElement} container - Контейнер таблиці
 * @param {Object} options - Опції
 * @param {Function} options.dataSource - Функція що повертає масив даних
 * @param {Function} options.onSort - Callback після сортування
 * @param {Object} [options.columnTypes] - Типи колонок для сортування
 * @param {Array} [options.filterColumns] - Конфігурація колонок з фільтрами
 * @param {Function} [options.onFilter] - Callback після зміни фільтрів
 * @returns {Object} API для керування
 */
export function initTableSorting(container, options) {
    const {
        dataSource,
        onSort,
        columnTypes = {},
        filterColumns = [],
        onFilter = null
    } = options;

    // Стан
    const state = {
        sortColumn: null,
        sortDirection: null
    };

    const activeFilters = new Map();

    // Handlers об'єкт для передачі в інші функції
    const handlers = {
        container,
        dataSource,
        columnTypes,
        activeFilters,
        filterColumns,
        onSort,
        onFilter
    };

    // Click сортування для всіх .sortable-header
    const clickHandler = async (e) => {
        const header = e.target.closest('.sortable-header');
        if (!header) return;

        // Якщо клік був на dropdown - ігноруємо
        if (e.target.closest('.hover-dropdown')) return;

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

    // Hover dropdown для .sortable-header.filterable
    if (filterColumns.length > 0) {
        setupHoverDropdowns(container, handlers);
    }

    console.log(`✅ Table sorting initialized`);

    // API
    return {
        /**
         * Програмно відсортувати
         */
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

        /**
         * Скинути сортування
         */
        reset: () => {
            state.sortColumn = null;
            state.sortDirection = null;
            updateSortIndicators(container, null, null);
        },

        /**
         * Отримати стан сортування
         */
        getState: () => ({
            column: state.sortColumn,
            direction: state.sortDirection
        }),

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
         * Встановити фільтри
         */
        setFilters: (filters) => {
            Object.entries(filters).forEach(([columnId, values]) => {
                activeFilters.set(columnId, new Set(values));
            });
            triggerFilterChange(activeFilters, filterColumns, onFilter, dataSource);
        },

        /**
         * Скинути фільтри
         */
        resetFilters: () => {
            filterColumns.forEach(column => {
                const uniqueValues = getUniqueValues(dataSource(), column.id, column.filterType);
                activeFilters.set(column.id, new Set(uniqueValues.map(v => v.value)));
            });
            triggerFilterChange(activeFilters, filterColumns, onFilter, dataSource);
        },

        /**
         * Застосувати фільтри до даних
         */
        filter: (data) => {
            const filtersObj = {};
            activeFilters.forEach((values, columnId) => {
                const column = filterColumns.find(c => c.id === columnId);
                if (!column) return;
                const uniqueValues = getUniqueValues(dataSource(), columnId, column.filterType);
                if (values.size < uniqueValues.length) {
                    filtersObj[columnId] = Array.from(values);
                }
            });
            return filterData(data, filtersObj, filterColumns);
        },

        /**
         * Знищити
         */
        destroy: () => {
            container.removeEventListener('click', clickHandler);
            hideHoverDropdown();
            activeFilters.clear();
        }
    };
}

// ==================== LEGACY EXPORTS ====================

/**
 * @deprecated Використовуйте initTableSorting()
 * Збережено для зворотної сумісності з price-events.js
 */
export function initTableFilters(container, options) {
    const {
        dataSource,
        columns = [],
        columnTypes = {},
        onFilter = null,
        onSort = null
    } = options;

    // Стан
    const state = {
        sortColumn: null,
        sortDirection: null
    };

    const activeFilters = new Map();

    // Ініціалізуємо фільтри для всіх колонок
    columns.forEach(column => {
        if (column.filterable) {
            const uniqueValues = getUniqueValues(dataSource(), column.id, column.filterType);
            activeFilters.set(column.id, new Set(uniqueValues.map(v => v.value)));
        }
    });

    // Створюємо dropdown кнопки для колонок
    columns.forEach(column => {
        const headerCell = container.querySelector(`.pseudo-table-header [data-column="${column.id}"]`);
        if (!headerCell) return;

        // Перевіряємо чи вже є dropdown
        if (headerCell.querySelector('.dropdown-wrapper')) return;

        const uniqueValues = column.filterable ?
            getUniqueValues(dataSource(), column.id, column.filterType) : [];

        const currentFilter = activeFilters.get(column.id) || new Set();
        const allSelected = uniqueValues.every(v => currentFilter.has(v.value));

        // Створюємо dropdown wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'dropdown-wrapper filter-dropdown';
        wrapper.innerHTML = `
            <button class="btn-icon btn-filter" data-dropdown-trigger data-filter-column="${column.id}">
                <span class="material-symbols-outlined">swap_vert</span>
            </button>
            <div class="dropdown-menu dropdown-menu-right">
                <div class="dropdown-header">${column.label}</div>
                <div class="dropdown-body" data-filter-body="${column.id}">
                    ${column.sortable ? `
                        <button class="dropdown-item ${state.sortColumn === column.id && state.sortDirection === 'asc' ? 'active' : ''}"
                                data-sort-column="${column.id}" data-sort-direction="asc">
                            <span class="material-symbols-outlined">arrow_upward</span>
                            <span>Сортувати А → Я</span>
                        </button>
                        <button class="dropdown-item ${state.sortColumn === column.id && state.sortDirection === 'desc' ? 'active' : ''}"
                                data-sort-column="${column.id}" data-sort-direction="desc">
                            <span class="material-symbols-outlined">arrow_downward</span>
                            <span>Сортувати Я → А</span>
                        </button>
                    ` : ''}
                    ${column.sortable && column.filterable ? '<div class="dropdown-separator"></div>' : ''}
                    ${column.filterable ? `
                        <label class="dropdown-item filter-select-all">
                            <input type="checkbox" data-filter-all="${column.id}" ${allSelected ? 'checked' : ''}>
                            <span>Всі</span>
                        </label>
                        <div class="dropdown-separator"></div>
                        ${uniqueValues.map(({ value, label, count }) => `
                            <label class="dropdown-item">
                                <input type="checkbox" data-filter-value="${value}" data-filter-column="${column.id}" ${currentFilter.has(value) ? 'checked' : ''}>
                                <span>${label}</span>
                                <span class="filter-count">${count}</span>
                            </label>
                        `).join('')}
                    ` : ''}
                </div>
            </div>
        `;

        headerCell.appendChild(wrapper);

        // Обробники сортування
        if (column.sortable) {
            wrapper.querySelectorAll('[data-sort-column]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const direction = btn.dataset.sortDirection;
                    state.sortColumn = column.id;
                    state.sortDirection = direction;

                    // Оновити active класи
                    columns.forEach(col => {
                        const body = container.querySelector(`[data-filter-body="${col.id}"]`);
                        if (body) {
                            body.querySelectorAll('[data-sort-column]').forEach(b => {
                                const isActive = col.id === column.id && b.dataset.sortDirection === direction;
                                b.classList.toggle('active', isActive);
                            });
                        }
                    });

                    const data = dataSource();
                    const sortedData = sortArray(data, column.id, direction, columnTypes);

                    if (onSort) {
                        await onSort(sortedData);
                    }

                    wrapper.classList.remove('is-open');
                    console.log(`↕️ Сортування: ${column.id} ${direction}`);
                });
            });
        }

        // Обробники фільтрації
        if (column.filterable) {
            const body = wrapper.querySelector(`[data-filter-body="${column.id}"]`);

            // "Всі"
            const selectAllCheckbox = body.querySelector(`[data-filter-all="${column.id}"]`);
            if (selectAllCheckbox) {
                selectAllCheckbox.addEventListener('change', (e) => {
                    const checkboxes = body.querySelectorAll(`[data-filter-column="${column.id}"]`);
                    const filter = activeFilters.get(column.id);

                    checkboxes.forEach(cb => {
                        cb.checked = e.target.checked;
                        if (e.target.checked) {
                            filter.add(cb.dataset.filterValue);
                        } else {
                            filter.delete(cb.dataset.filterValue);
                        }
                    });

                    triggerFilterChangeLegacy();
                });
            }

            // Окремі чекбокси
            body.querySelectorAll(`[data-filter-column="${column.id}"]`).forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const filter = activeFilters.get(column.id);
                    const value = e.target.dataset.filterValue;

                    if (e.target.checked) {
                        filter.add(value);
                    } else {
                        filter.delete(value);
                    }

                    // Оновити "Всі"
                    const allChecked = uniqueValues.every(v => filter.has(v.value));
                    if (selectAllCheckbox) {
                        selectAllCheckbox.checked = allChecked;
                    }

                    triggerFilterChangeLegacy();
                });
            });
        }
    });

    function triggerFilterChangeLegacy() {
        if (!onFilter) return;

        const filtersObj = {};
        activeFilters.forEach((values, columnId) => {
            const column = columns.find(c => c.id === columnId);
            if (!column?.filterable) return;

            const uniqueValues = getUniqueValues(dataSource(), columnId, column.filterType);
            if (values.size < uniqueValues.length) {
                filtersObj[columnId] = Array.from(values);
            }
        });

        onFilter(filtersObj);
    }

    // Ініціалізуємо dropdown
    initDropdowns();

    console.log(`✅ Table filters initialized (legacy)`);

    return {
        getSortState: () => ({ column: state.sortColumn, direction: state.sortDirection }),
        getFilters: () => {
            const filtersObj = {};
            activeFilters.forEach((values, columnId) => {
                filtersObj[columnId] = Array.from(values);
            });
            return filtersObj;
        },
        setFilters: (filters) => {
            Object.entries(filters).forEach(([columnId, values]) => {
                activeFilters.set(columnId, new Set(values));
                // Оновити чекбокси
                const body = container.querySelector(`[data-filter-body="${columnId}"]`);
                if (body) {
                    body.querySelectorAll(`[data-filter-column="${columnId}"]`).forEach(cb => {
                        cb.checked = values.includes(cb.dataset.filterValue);
                    });
                    const selectAll = body.querySelector(`[data-filter-all="${columnId}"]`);
                    if (selectAll) {
                        const column = columns.find(c => c.id === columnId);
                        const uniqueValues = getUniqueValues(dataSource(), columnId, column?.filterType);
                        selectAll.checked = uniqueValues.every(v => values.includes(v.value));
                    }
                }
            });
        },
        resetFilters: () => {
            columns.filter(c => c.filterable).forEach(column => {
                const uniqueValues = getUniqueValues(dataSource(), column.id, column.filterType);
                activeFilters.set(column.id, new Set(uniqueValues.map(v => v.value)));

                const body = container.querySelector(`[data-filter-body="${column.id}"]`);
                if (body) {
                    body.querySelectorAll(`[data-filter-column="${column.id}"]`).forEach(cb => {
                        cb.checked = true;
                    });
                    const selectAll = body.querySelector(`[data-filter-all="${column.id}"]`);
                    if (selectAll) selectAll.checked = true;
                }
            });
            triggerFilterChangeLegacy();
        },
        filter: (data) => {
            const filtersObj = {};
            activeFilters.forEach((values, columnId) => {
                const column = columns.find(c => c.id === columnId);
                if (!column?.filterable) return;
                const uniqueValues = getUniqueValues(dataSource(), columnId, column.filterType);
                if (values.size < uniqueValues.length) {
                    filtersObj[columnId] = Array.from(values);
                }
            });
            return filterData(data, filtersObj, columns);
        },
        refresh: () => {
            // Перестворити dropdown
            columns.forEach(column => {
                const wrapper = container.querySelector(`[data-filter-column="${column.id}"]`)?.closest('.dropdown-wrapper');
                if (wrapper) wrapper.remove();
            });
            // Рекурсивно викликаємо initTableFilters
            return initTableFilters(container, options);
        },
        destroy: () => {
            columns.forEach(column => {
                const wrapper = container.querySelector(`[data-filter-column="${column.id}"]`)?.closest('.dropdown-wrapper');
                if (wrapper) wrapper.remove();
            });
            activeFilters.clear();
        }
    };
}

/**
 * Отримати значення для сортування
 */
export function getSortValue(item, column, columnType) {
    let value = item[column];

    switch (columnType) {
        case 'id-number':
        case 'id-text':
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
