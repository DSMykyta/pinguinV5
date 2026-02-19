// js/common/table/table-managed.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MANAGED TABLE                                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Єдина функція яка з'єднує:                                             ║
 * ║  1. Таблицю (Table LEGO)                                                ║
 * ║  2. Dropdown видимості колонок                                          ║
 * ║  3. Пошук по всіх видимих searchable колонках                           ║
 * ║  4. Stats ("Показано X з Y")                                            ║
 * ║  5. Filters plugin (column filters + text search)                       ║
 * ║  6. dataTransform — трансформація даних перед фільтрацією               ║
 * ║  7. preFilter — додатковий зовнішній фільтр                             ║
 * ║  8. activate/deactivate — для табів зі спільним пошуком                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { renderTable } from './table-main.js';
import { createColumnSelector } from './table-columns.js';
import { filterData as applyColumnFilters } from './table-filters.js';

/**
 * @param {Object} config
 * @param {string|HTMLElement} config.container
 * @param {Array} config.columns
 * @param {Array} config.data
 * @param {string} [config.columnsListId]
 * @param {string} [config.searchInputId]
 * @param {string} [config.statsId]
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
        searchInputId,
        statsId,
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

    let isActive = true;
    let searchHandler = null;
    let debounceTimer = null;

    // ── Shared search config ID (saved for activate/deactivate) ──
    const _searchInputId = searchInputId;

    // ── DOM refs ──
    const statsEl = statsId ? document.getElementById(statsId) : null;
    let searchInput = _searchInputId ? document.getElementById(_searchInputId) : null;

    // ── Filter columns config (from plugins.filters) ──
    const filterColumnsConfig = tableConfig.plugins?.filters?.filterColumns || [];

    // ── Helper: get transformed data ──
    function getWorkingData() {
        return dataTransform ? dataTransform([...allData]) : [...allData];
    }

    // ── Helper: get searchable column IDs (searchable + visible) ──
    function getSearchColumnIds() {
        return columns
            .filter(c => c.searchable && visibleColumnIds.includes(c.id))
            .map(c => c.id);
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
                renderPage();
            }
        });
    }

    // ── 3. Combined filtering (column filters + text search) ──
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

        // 2. Text search (по всіх видимих searchable колонках, підтримка масивів)
        if (searchQuery) {
            const searchCols = getSearchColumnIds();
            data = data.filter(row =>
                searchCols.some(colId => {
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

    // ── 4. Render ──
    function renderPage() {
        let pageData;
        if (currentPageSize < 100000) {
            const start = (currentPage - 1) * currentPageSize;
            pageData = filteredData.slice(start, start + currentPageSize);
        } else {
            pageData = filteredData;
        }

        tableAPI.render(pageData);
        updateStats(pageData.length, filteredData.length);
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
        tableAPI,

        render(customData) {
            if (customData) {
                filteredData = customData;
            }
            renderPage();
        },

        setData(newData) {
            allData = [...newData];
            searchQuery = '';
            columnFilters = {};
            if (searchInput) searchInput.value = '';
            applyFilters();
        },

        updateData(newData) {
            allData = [...newData];
            applyFilters();
        },

        getFilteredData() {
            return filteredData;
        },

        getFilteredCount() {
            return filteredData.length;
        },

        getAllData() {
            return allData;
        },

        refilter() {
            applyFilters();
        },

        setSearchQuery(query) {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
                debounceTimer = null;
            }
            searchQuery = (query || '').toLowerCase().trim();
            if (searchInput && isActive) {
                searchInput.value = query || '';
            }
            applyFilters();
        },

        setPage(page, size) {
            currentPage = page;
            if (size !== undefined) currentPageSize = size;
            renderPage();
        },

        activate() {
            if (isActive) return;
            isActive = true;
            bindSearchInput();
            applyFilters();
        },

        deactivate() {
            if (!isActive) return;
            isActive = false;
            unbindSearchInput();
        },

        destroy() {
            unbindSearchInput();
            tableAPI.destroy?.();
        }
    };
}
