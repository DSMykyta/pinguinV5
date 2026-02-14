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
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { renderTable } from './table-main.js';
import { createColumnSelector } from './table-columns.js';
import { initPagination } from '../ui-pagination.js';

/**
 * Створити керовану таблицю з автоматичною зв'язкою компонентів
 *
 * @param {Object} config
 * @param {string|HTMLElement} config.container - ID або елемент контейнера таблиці
 * @param {Array} config.columns - Масив колонок (розширений формат, див. нижче)
 * @param {Array} config.data - Початкові дані
 * @param {string} [config.columnsListId] - ID dropdown body для видимості колонок
 * @param {string} [config.searchColumnsId] - ID dropdown body для колонок пошуку
 * @param {string} [config.searchInputId] - ID input пошуку
 * @param {string} [config.statsId] - ID елемента статистики
 * @param {string} [config.paginationId] - ID footer елемента пагінації
 * @param {Object} [config.tableConfig] - Конфіг для Table LEGO (plugins, rowActions, etc.)
 * @param {number|null} [config.pageSize=25] - Розмір сторінки (null = без пагінації)
 * @param {string} [config.checkboxPrefix='managed'] - Префікс для checkbox IDs
 *
 * Формат колонки:
 * {
 *   id: string,           // обов'язково
 *   label: string,        // обов'язково
 *   searchable: boolean,  // чи доступна для пошуку (default: false)
 *   checked: boolean,     // чи видима за замовчуванням (default: true)
 *   // + стандартні поля Table LEGO: sortable, className, render
 * }
 *
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
        checkboxPrefix = 'managed'
    } = config;

    // ── Internal state ──
    let allData = [...data];
    let filteredData = [...data];
    let searchQuery = '';
    let currentPage = 1;
    let currentPageSize = pageSize || 999999;
    let visibleColumnIds = columns.filter(c => c.checked !== false).map(c => c.id);
    let searchColumnIds = columns
        .filter(c => c.searchable && c.checked !== false)
        .map(c => c.id);

    let searchColsSelector = null;
    let paginationAPI = null;

    // ── DOM refs ──
    const statsEl = statsId ? document.getElementById(statsId) : null;
    const searchInput = searchInputId ? document.getElementById(searchInputId) : null;
    const paginationEl = paginationId ? document.getElementById(paginationId) : null;

    // ── 1. Create table ──
    const tableColumns = columns.map(({ searchable, checked, ...col }) => col);

    const tableAPI = renderTable(container, {
        ...tableConfig,
        columns: tableColumns,
        data: [],
        visibleColumns: visibleColumnIds,
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
            } : undefined
        }
    });

    // ── 2. Column visibility selector ──
    if (columnsListId) {
        const visibilityColumns = columns.map(c => ({
            id: c.id,
            label: c.label,
            checked: c.checked !== false
        }));

        createColumnSelector(columnsListId, visibilityColumns, {
            checkboxPrefix: `${checkboxPrefix}-col`,
            onChange: (selectedIds) => {
                visibleColumnIds = selectedIds;
                tableAPI.setVisibleColumns?.(selectedIds);
                rebuildSearchColumnsSelector();
                renderPage();
            }
        });
    }

    // ── 3. Search columns selector ──
    function rebuildSearchColumnsSelector() {
        if (!searchColumnsId) return;

        // Searchable columns that are currently visible
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

        searchColsSelector = createColumnSelector(searchColumnsId, searchableVisible, {
            checkboxPrefix: `${checkboxPrefix}-search`,
            onChange: (selectedIds) => {
                searchColumnIds = selectedIds;
                applySearch();
            }
        });

        // Remove columns that are no longer visible from active search
        searchColumnIds = searchColumnIds.filter(id => visibleColumnIds.includes(id));
    }

    // Initial build
    rebuildSearchColumnsSelector();

    // ── 4. Search ──
    function applySearch() {
        const q = searchQuery;
        if (!q) {
            filteredData = [...allData];
        } else {
            filteredData = allData.filter(row =>
                searchColumnIds.some(colId => {
                    const val = row[colId];
                    return val && String(val).toLowerCase().includes(q);
                })
            );
        }
        currentPage = 1;
        renderPage();
    }

    if (searchInput) {
        searchInput.value = '';
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            applySearch();
        });
    }

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
    renderPage();

    // ── Public API ──
    return {
        /** Оригінальний Table LEGO API */
        tableAPI,

        /** Рендер з поточними фільтрованими даними */
        render(customData) {
            if (customData) {
                filteredData = customData;
                renderPage();
            } else {
                renderPage();
            }
        },

        /** Повна заміна даних */
        setData(newData) {
            allData = [...newData];
            searchQuery = '';
            if (searchInput) searchInput.value = '';
            filteredData = [...allData];
            currentPage = 1;
            renderPage();
        },

        /** Поточні відфільтровані дані */
        getFilteredData() {
            return filteredData;
        },

        /** Всі дані */
        getAllData() {
            return allData;
        },

        /** Повторно застосувати пошук (після зовнішньої зміни даних) */
        refilter() {
            applySearch();
        },

        /** Cleanup */
        destroy() {
            if (searchColsSelector) searchColsSelector.destroy();
            if (searchInput) searchInput.value = '';
            tableAPI.destroy?.();
        }
    };
}
