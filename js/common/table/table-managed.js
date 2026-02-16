// js/common/table/table-managed.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MANAGED TABLE                                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Єдина функція яка з'єднує:                                             ║
 * ║  1. Таблицю (Table LEGO)                                                ║
 * ║  2. Dropdown видимості колонок                                          ║
 * ║  3. Пошук + dropdown колонок пошуку (тільки видимі)                     ║
 * ║  4. Stats ("Показано X з Y")                                            ║
 * ║  5. Пагінація (опціонально)                                             ║
 * ║  6. Filters plugin (column filters + text search)                       ║
 * ║  7. dataTransform — трансформація даних перед фільтрацією               ║
 * ║  8. preFilter — додатковий зовнішній фільтр                             ║
 * ║  9. activate/deactivate — для табів зі спільним пошуком                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { renderTable } from './table-main.js';
import { createColumnSelector } from './table-columns.js';
import { filterData as applyColumnFilters } from './table-filters.js';
import { initPagination } from '../ui-pagination.js';

/**
 * @param {Object} config
 * @param {string|HTMLElement} config.container
 * @param {Array} config.columns
 * @param {Array} config.data
 * @param {string} [config.columnsListId]
 * @param {string} [config.searchColumnsId]
 * @param {string} [config.searchInputId]
 * @param {string} [config.statsId]
 * @param {string} [config.paginationId]
 * @param {Object} [config.tableConfig]
 * @param {number|null} [config.pageSize=25]
 * @param {string} [config.checkboxPrefix='managed']
 * @param {Function} [config.dataTransform] - (data) => transformedData
 * @param {Function} [config.preFilter] - (data) => filteredData
 * @returns {Object} Managed Table API
 */
export function createManagedTable(config) {
    const {
        container,
        columns,
        data = [],
        columnsListId,
        searchColumnsId,
        searchInputId,
        statsId,
        paginationId,
        tableConfig = {},
        pageSize = 25,
        checkboxPrefix = 'managed',
        dataTransform = null,
        preFilter = null
    } = config;

    // ── Internal state ──
    let allData = [...data];
    let filteredData = [];
    let searchQuery = '';
    let columnFilters = {};
    let currentPage = 1;
    let currentPageSize = pageSize || 999999;
    let visibleColumnIds = columns.filter(c => c.checked !== false).map(c => c.id);
    let searchColumnIds = columns
        .filter(c => c.searchable && c.checked !== false)
        .map(c => c.id);

    let searchColsSelector = null;
    let paginationAPI = null;
    let isActive = true;
    let searchHandler = null;
    let debounceTimer = null;

    // ── Shared search config IDs (saved for activate/deactivate) ──
    const _searchInputId = searchInputId;
    const _searchColumnsId = searchColumnsId;

    // ── DOM refs ──
    const statsEl = statsId ? document.getElementById(statsId) : null;
    let searchInput = _searchInputId ? document.getElementById(_searchInputId) : null;
    const paginationEl = paginationId ? document.getElementById(paginationId) : null;

    // ── Filter columns config (from plugins.filters) ──
    const filterColumnsConfig = tableConfig.plugins?.filters?.filterColumns || [];

    // ── Helper: get transformed data ──
    function getWorkingData() {
        return dataTransform ? dataTransform([...allData]) : [...allData];
    }

    // ── 1. Create table ──
    const tableColumns = columns.map(({ searchable, checked, ...col }) => col);

    // Columns always visible (action columns excluded from visibility selector)
    const alwaysVisibleIds = columns
        .filter(c => c.id === '_unlink' || c.id === '_actions' || !c.label?.trim())
        .map(c => c.id);

    const tableAPI = renderTable(container, {
        ...tableConfig,
        columns: tableColumns,
        data: [],
        visibleColumns: [...visibleColumnIds, ...alwaysVisibleIds],
        plugins: {
            ...tableConfig.plugins,
            sorting: tableConfig.plugins?.sorting ? {
                ...tableConfig.plugins.sorting,
                dataSource: () => filteredData,
                onSort: (sortedData) => {
                    filteredData = sortedData;
                    currentPage = 1;
                    renderPage();
                }
            } : undefined,
            filters: tableConfig.plugins?.filters ? {
                ...tableConfig.plugins.filters,
                dataSource: () => getWorkingData(),
                onFilter: (filters) => {
                    columnFilters = filters;
                    applyFilters();
                }
            } : undefined
        }
    });

    // ── 2. Column visibility selector ──
    if (columnsListId) {
        const visibilityColumns = columns
            .filter(c => c.id !== '_unlink' && c.id !== '_actions' && c.label?.trim())
            .map(c => ({
                id: c.id,
                label: c.label,
                checked: c.checked !== false
            }));

        createColumnSelector(columnsListId, visibilityColumns, {
            checkboxPrefix: `${checkboxPrefix}-col`,
            onChange: (selectedIds) => {
                visibleColumnIds = selectedIds;
                tableAPI.setVisibleColumns?.([...selectedIds, ...alwaysVisibleIds]);
                rebuildSearchColumnsSelector();
                renderPage();
            }
        });
    }

    // ── 3. Search columns selector ──
    function rebuildSearchColumnsSelector() {
        if (!_searchColumnsId) return;

        const searchableVisible = columns
            .filter(c => c.searchable && visibleColumnIds.includes(c.id))
            .map(c => ({
                id: c.id,
                label: c.label,
                checked: searchColumnIds.includes(c.id)
            }));

        if (searchColsSelector) {
            searchColsSelector.destroy();
        }

        searchColsSelector = createColumnSelector(_searchColumnsId, searchableVisible, {
            checkboxPrefix: `${checkboxPrefix}-search`,
            onChange: (selectedIds) => {
                searchColumnIds = selectedIds;
                applyFilters();
            }
        });

        // Remove columns that are no longer visible from active search
        searchColumnIds = searchColumnIds.filter(id => visibleColumnIds.includes(id));
    }

    // Initial build (only if active)
    if (_searchColumnsId) {
        rebuildSearchColumnsSelector();
    }

    // ── 4. Combined filtering (column filters + text search) ──
    function applyFilters() {
        let data = getWorkingData();

        // 0. Pre-filter (зовнішня логіка: paramTypeFilter, activeTab тощо)
        if (preFilter) {
            data = preFilter(data);
        }

        // 1. Column filters (from FiltersPlugin)
        if (Object.keys(columnFilters).length > 0 && filterColumnsConfig.length > 0) {
            data = applyColumnFilters(data, columnFilters, filterColumnsConfig);
        }

        // 2. Text search (підтримка масивів — names_alt, trigers)
        if (searchQuery) {
            data = data.filter(row =>
                searchColumnIds.some(colId => {
                    const val = row[colId];
                    if (Array.isArray(val)) {
                        return val.some(v => String(v).toLowerCase().includes(searchQuery));
                    }
                    return val && String(val).toLowerCase().includes(searchQuery);
                })
            );
        }

        filteredData = data;
        currentPage = 1;
        renderPage();
    }

    // ── Search input binding with debounce ──
    function createSearchHandler() {
        return (e) => {
            const value = e.target.value.toLowerCase().trim();
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                searchQuery = value;
                applyFilters();
            }, 200);
        };
    }

    function bindSearchInput() {
        if (!_searchInputId) return;
        searchInput = document.getElementById(_searchInputId);
        if (!searchInput) return;

        // Remove old handler if exists
        unbindSearchInput();

        searchHandler = createSearchHandler();
        searchInput.addEventListener('input', searchHandler);

        // Restore current search query to input
        if (searchQuery) {
            searchInput.value = searchQuery;
        } else {
            searchInput.value = '';
        }
    }

    function unbindSearchInput() {
        if (searchInput && searchHandler) {
            searchInput.removeEventListener('input', searchHandler);
        }
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        searchHandler = null;
    }

    // Initial bind
    bindSearchInput();

    // ── 5. Pagination ──
    if (paginationEl && pageSize) {
        paginationAPI = initPagination(paginationEl, {
            currentPage,
            pageSize: currentPageSize,
            totalItems: filteredData.length,
            onPageChange: (page, size) => {
                currentPage = page;
                currentPageSize = size;
                renderPage();
            }
        });
    }

    // ── 6. Render ──
    function renderPage() {
        let pageData;
        if (paginationAPI && currentPageSize < 100000) {
            const start = (currentPage - 1) * currentPageSize;
            pageData = filteredData.slice(start, start + currentPageSize);
        } else {
            pageData = filteredData;
        }

        tableAPI.render(pageData);
        updateStats(pageData.length, filteredData.length);

        if (paginationAPI) {
            paginationAPI.update({
                totalItems: filteredData.length,
                currentPage,
                pageSize: currentPageSize
            });
        }
    }

    function updateStats(shown, total) {
        if (statsEl) {
            statsEl.textContent = `Показано ${shown} з ${total}`;
        }
    }

    // ── Initial render ──
    applyFilters();

    // ── Public API ──
    return {
        /** Оригінальний Table LEGO API */
        tableAPI,

        /** Рендер з поточними фільтрованими даними */
        render(customData) {
            if (customData) {
                filteredData = customData;
            }
            renderPage();
        },

        /** Повна заміна даних (скидає пошук + фільтри) */
        setData(newData) {
            allData = [...newData];
            searchQuery = '';
            columnFilters = {};
            if (searchInput) searchInput.value = '';
            applyFilters();
        },

        /** Оновити дані (зберігає пошук + фільтри) */
        updateData(newData) {
            allData = [...newData];
            applyFilters();
        },

        /** Поточні відфільтровані дані */
        getFilteredData() {
            return filteredData;
        },

        /** Кількість відфільтрованих */
        getFilteredCount() {
            return filteredData.length;
        },

        /** Всі дані */
        getAllData() {
            return allData;
        },

        /** Повторно застосувати пошук + фільтри */
        refilter() {
            applyFilters();
        },

        /** Встановити пошуковий запит програмно */
        setSearchQuery(query) {
            searchQuery = (query || '').toLowerCase().trim();
            if (searchInput && isActive) {
                searchInput.value = query || '';
            }
            applyFilters();
        },

        /** Зовнішнє керування пагінацією (для спільного footer) */
        setPage(page, size) {
            currentPage = page;
            if (size !== undefined) currentPageSize = size;
            renderPage();
        },

        /** Підключити спільний пошук та search columns selector */
        activate() {
            if (isActive) return;
            isActive = true;
            bindSearchInput();
            rebuildSearchColumnsSelector();
            applyFilters();
        },

        /** Відключити від спільного пошуку */
        deactivate() {
            if (!isActive) return;
            isActive = false;
            unbindSearchInput();
            if (searchColsSelector) {
                searchColsSelector.destroy();
                searchColsSelector = null;
            }
        },

        /** Cleanup */
        destroy() {
            unbindSearchInput();
            if (searchColsSelector) searchColsSelector.destroy();
            tableAPI.destroy?.();
        }
    };
}
