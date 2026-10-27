// js/components/table/table-state.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE LEGO - STATE MANAGEMENT                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Централізований state + hooks система для таблиць             ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Управління станом таблиці та комунікація між плагінами через hooks.     ║
 * ║                                                                          ║
 * ║  ЕКСПОРТОВАНІ ФУНКЦІЇ:                                                   ║
 * ║  - createTableState(config) — Створити новий стан таблиці                ║
 * ║                                                                          ║
 * ║  HOOKS:                                                                  ║
 * ║  - onSort(column, direction) — При сортуванні                            ║
 * ║  - onFilter(filters) — При зміні фільтрів                                ║
 * ║  - onSelect(selectedIds) — При виборі рядків                             ║
 * ║  - onPageChange(page, pageSize) — При зміні сторінки                     ║
 * ║  - onDataChange(data) — При зміні даних                                  ║
 * ║  - onRender() — Після рендерингу                                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createHookRegistry } from '../../utils/utils-hooks.js';

/**
 * Створити новий стан таблиці
 * @param {Object} config - Конфігурація
 * @returns {Object} State API
 */
export function createTableState(config = {}) {
    // Внутрішній стан
    const state = {
        // Дані
        data: config.data || [],
        filteredData: [],
        paginatedData: [],

        // Сортування
        sortColumn: null,
        sortDirection: null, // 'asc' | 'desc' | null

        // Фільтри
        filters: {},
        searchQuery: '',

        // Вибір рядків
        selectedRows: new Set(),

        // Пагінація
        currentPage: 1,
        pageSize: config.pageSize || 25,
        totalItems: 0,

        // Колонки
        columns: config.columns || [],
        visibleColumns: config.visibleColumns || null,

        // Метадані
        tableId: config.tableId || `table-${Date.now()}`,
        isLoading: false
    };

    // Hooks registry
    const { registerHook, runHook, runHookAsync, clearHooks } = createHookRegistry({
        name: 'Table',
        events: ['onSort', 'onFilter', 'onSelect', 'onPageChange', 'onDataChange', 'onRender', 'onBeforeRender', 'onDestroy'],
    });

    /**
     * Оновити дані
     */
    function setData(newData) {
        state.data = newData || [];
        state.totalItems = state.data.length;
        runHook('onDataChange', state.data);
    }

    /**
     * Встановити сортування
     */
    function setSort(column, direction) {
        state.sortColumn = column;
        state.sortDirection = direction;
        runHook('onSort', column, direction);
    }

    /**
     * Встановити фільтр
     */
    function setFilter(columnId, value) {
        if (value === null || value === undefined || value === '') {
            delete state.filters[columnId];
        } else {
            state.filters[columnId] = value;
        }
        state.currentPage = 1; // Reset to first page
        runHook('onFilter', { ...state.filters });
    }

    /**
     * Встановити всі фільтри
     */
    function setFilters(filters) {
        state.filters = { ...filters };
        state.currentPage = 1;
        runHook('onFilter', state.filters);
    }

    /**
     * Очистити фільтри
     */
    function clearFilters() {
        state.filters = {};
        state.searchQuery = '';
        state.currentPage = 1;
        runHook('onFilter', {});
    }

    /**
     * Встановити пошуковий запит
     */
    function setSearchQuery(query) {
        state.searchQuery = query;
        state.currentPage = 1;
        runHook('onFilter', state.filters);
    }

    /**
     * Вибрати рядок
     */
    function selectRow(rowId) {
        state.selectedRows.add(rowId);
        runHook('onSelect', Array.from(state.selectedRows));
    }

    /**
     * Зняти вибір рядка
     */
    function deselectRow(rowId) {
        state.selectedRows.delete(rowId);
        runHook('onSelect', Array.from(state.selectedRows));
    }

    /**
     * Перемкнути вибір рядка
     */
    function toggleRow(rowId) {
        if (state.selectedRows.has(rowId)) {
            deselectRow(rowId);
        } else {
            selectRow(rowId);
        }
    }

    /**
     * Вибрати всі рядки (на поточній сторінці)
     */
    function selectAll(rowIds) {
        rowIds.forEach(id => state.selectedRows.add(id));
        runHook('onSelect', Array.from(state.selectedRows));
    }

    /**
     * Зняти вибір всіх рядків
     */
    function deselectAll() {
        state.selectedRows.clear();
        runHook('onSelect', []);
    }

    /**
     * Встановити сторінку
     */
    function setPage(page) {
        state.currentPage = page;
        runHook('onPageChange', page, state.pageSize);
    }

    /**
     * Встановити розмір сторінки
     */
    function setPageSize(size) {
        state.pageSize = size;
        state.currentPage = 1;
        runHook('onPageChange', state.currentPage, size);
    }

    /**
     * Встановити видимі колонки
     */
    function setVisibleColumns(columns) {
        state.visibleColumns = columns;
    }

    /**
     * Встановити стан завантаження
     */
    function setLoading(isLoading) {
        state.isLoading = isLoading;
    }

    /**
     * Отримати стан (read-only копія)
     */
    function getState() {
        return {
            ...state,
            selectedRows: new Set(state.selectedRows),
            filters: { ...state.filters }
        };
    }

    /**
     * Знищити стан
     */
    function destroy() {
        runHook('onDestroy');
        clearHooks();
        state.selectedRows.clear();
    }

    // Public API
    return {
        // Getters
        getState,
        getData: () => state.data,
        getFilteredData: () => state.filteredData,
        getPaginatedData: () => state.paginatedData,
        getSelectedRows: () => Array.from(state.selectedRows),
        isSelected: (id) => state.selectedRows.has(id),
        getSort: () => ({ column: state.sortColumn, direction: state.sortDirection }),
        getFilters: () => ({ ...state.filters }),
        getPage: () => state.currentPage,
        getPageSize: () => state.pageSize,
        getTotalItems: () => state.totalItems,
        getColumns: () => state.columns,
        getVisibleColumns: () => state.visibleColumns,
        getTableId: () => state.tableId,
        isLoading: () => state.isLoading,

        // Setters
        setData,
        setFilteredData: (data) => { state.filteredData = data; },
        setPaginatedData: (data) => { state.paginatedData = data; },
        setTotalItems: (total) => { state.totalItems = total; },
        setSort,
        setFilter,
        setFilters,
        clearFilters,
        setSearchQuery,
        selectRow,
        deselectRow,
        toggleRow,
        selectAll,
        deselectAll,
        setPage,
        setPageSize,
        setVisibleColumns,
        setLoading,

        // Hooks
        registerHook,
        runHook,
        runHookAsync,

        // Lifecycle
        destroy
    };
}
