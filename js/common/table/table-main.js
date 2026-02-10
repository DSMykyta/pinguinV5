// js/common/table/table-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE LEGO - MAIN ENTRY POINT                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🏭 ФАБРИКА — Композиція таблиці з плагінами                             ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Головна точка входу для створення таблиць з LEGO архітектурою.          ║
 * ║  Спрощує композицію ядра та плагінів.                                    ║
 * ║                                                                          ║
 * ║  ВИКОРИСТАННЯ:                                                           ║
 * ║  ```javascript                                                           ║
 * ║  import { createTable } from '../common/table/table-main.js';            ║
 * ║                                                                          ║
 * ║  const table = createTable('container-id', {                             ║
 * ║      columns: [                                                          ║
 * ║          { id: 'name', label: 'Назва', sortable: true },                 ║
 * ║          { id: 'price', label: 'Ціна', type: 'number', filterable: true }║
 * ║      ],                                                                  ║
 * ║      getRowId: row => row.id,                                            ║
 * ║      plugins: {                                                          ║
 * ║          sorting: true,                                                  ║
 * ║          filters: { filterType: 'values' },                              ║
 * ║          checkboxes: { batchBar: myBatchBar }                            ║
 * ║      }                                                                   ║
 * ║  });                                                                     ║
 * ║                                                                          ║
 * ║  table.setData(myData);                                                  ║
 * ║  table.render();                                                         ║
 * ║  ```                                                                     ║
 * ║                                                                          ║
 * ║  АРХІТЕКТУРА:                                                            ║
 * ║  ┌─────────────────────────────────────────────────────────────────┐     ║
 * ║  │                     createTable()                               │     ║
 * ║  │  ┌──────────────────────────────────────────────────────────┐   │     ║
 * ║  │  │                   TableCore                              │   │     ║
 * ║  │  │  ┌─────────┐ ┌─────────┐ ┌───────────┐ ┌──────────────┐  │   │     ║
 * ║  │  │  │ Sorting │ │ Filters │ │ Checkboxes│ │ Custom Plugin│  │   │     ║
 * ║  │  │  └─────────┘ └─────────┘ └───────────┘ └──────────────┘  │   │     ║
 * ║  │  └──────────────────────────────────────────────────────────┘   │     ║
 * ║  │                         ▲                                       │     ║
 * ║  │                         │                                       │     ║
 * ║  │  ┌──────────────────────────────────────────────────────────┐   │     ║
 * ║  │  │                   TableState                             │   │     ║
 * ║  │  │        (data, selection, pagination, hooks)              │   │     ║
 * ║  │  └──────────────────────────────────────────────────────────┘   │     ║
 * ║  └─────────────────────────────────────────────────────────────────┘     ║
 * ║                                                                          ║
 * ║  ЕКСПОРТОВАНІ ФУНКЦІЇ:                                                   ║
 * ║  - createTable(container, config) — Створити таблицю                     ║
 * ║  - createTableState(config) — Створити state (re-export)                 ║
 * ║  - TableCore — Клас ядра (re-export)                                     ║
 * ║  - SortingPlugin — Плагін сортування (re-export)                         ║
 * ║  - FiltersPlugin — Плагін фільтрів (re-export)                           ║
 * ║  - CheckboxesPlugin — Плагін чекбоксів (re-export)                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// Re-export core components
export { createTableState } from './table-state.js';
export { TableCore } from './table-core.js';
export { SortingPlugin } from './table-sorting.js';
export { FiltersPlugin, filterData } from './table-filters.js';
export { CheckboxesPlugin } from './table-checkboxes.js';
export { renderBadge, renderSeverityBadge, updateTableCounter } from './table-badges.js';

// Import for internal use
import { createTableState } from './table-state.js';
import { TableCore } from './table-core.js';
import { SortingPlugin } from './table-sorting.js';
import { FiltersPlugin } from './table-filters.js';
import { CheckboxesPlugin } from './table-checkboxes.js';

/**
 * Створити таблицю з LEGO архітектурою
 *
 * @param {string|HTMLElement} container - ID контейнера або DOM елемент
 * @param {Object} config - Конфігурація таблиці
 * @param {Array} config.columns - Масив колонок
 * @param {Function} [config.getRowId] - Функція отримання ID рядка
 * @param {Function} [config.rowActions] - Функція для додаткових дій в рядку
 * @param {string} [config.rowActionsHeader] - HTML заголовка колонки дій
 * @param {Object} [config.emptyState] - Конфіг порожнього стану
 * @param {Object} [config.plugins] - Конфіг плагінів
 * @param {boolean|Object} [config.plugins.sorting] - Сортування
 * @param {boolean|Object} [config.plugins.filters] - Фільтри
 * @param {boolean|Object} [config.plugins.checkboxes] - Чекбокси
 * @param {Array} [config.customPlugins] - Масив кастомних плагінів
 * @param {Array} [config.data] - Початкові дані
 * @param {number} [config.pageSize] - Розмір сторінки
 * @param {string} [config.tableId] - ID таблиці
 * @returns {Object} Table API
 */
export function createTable(container, config = {}) {
    const {
        columns = [],
        getRowId = (row) => row.id,
        rowActions = null,
        rowActionsHeader = '',
        emptyState = { icon: 'table_rows', message: 'Дані відсутні' },
        plugins = {},
        customPlugins = [],
        data = [],
        pageSize = 25,
        tableId = `table-${Date.now()}`,
        withContainer = true,
        tableClass = 'pseudo-table',
        ...restConfig
    } = config;

    // 1. Створюємо state
    const state = createTableState({
        data,
        columns,
        pageSize,
        tableId,
        visibleColumns: config.visibleColumns || null
    });

    // 2. Створюємо ядро таблиці
    const tableCore = new TableCore(container, {
        columns,
        getRowId,
        rowActions,
        rowActionsHeader,
        emptyState,
        withContainer,
        tableClass,
        ...restConfig
    }, state);

    // 3. Підключаємо вбудовані плагіни
    const pluginInstances = {};

    // Sorting plugin
    if (plugins.sorting) {
        const sortingConfig = typeof plugins.sorting === 'object' ? plugins.sorting : {};
        pluginInstances.sorting = new SortingPlugin(sortingConfig);
        tableCore.use(pluginInstances.sorting);
    }

    // Filters plugin
    if (plugins.filters) {
        const filtersConfig = typeof plugins.filters === 'object' ? plugins.filters : {};
        pluginInstances.filters = new FiltersPlugin(filtersConfig);
        tableCore.use(pluginInstances.filters);
    }

    // Checkboxes plugin
    if (plugins.checkboxes) {
        const checkboxesConfig = typeof plugins.checkboxes === 'object' ? plugins.checkboxes : {};
        pluginInstances.checkboxes = new CheckboxesPlugin(checkboxesConfig);
        tableCore.use(pluginInstances.checkboxes);
    }

    // 4. Підключаємо кастомні плагіни
    customPlugins.forEach(plugin => {
        if (plugin && typeof plugin.init === 'function') {
            tableCore.use(plugin);
        }
    });

    // 5. Якщо є початкові дані, рендеримо
    if (data && data.length > 0) {
        state.setData(data);
    }

    // 6. Створюємо public API
    const api = {
        // Ядро
        core: tableCore,
        state: state,
        plugins: pluginInstances,

        // Рендеринг
        render: (customData) => tableCore.render(customData),
        updateRows: (customData) => tableCore.updateRows(customData),

        // Дані
        setData: (newData) => state.setData(newData),
        getData: () => state.getData(),
        getFilteredData: () => state.getFilteredData(),
        getPaginatedData: () => state.getPaginatedData(),

        // Сортування
        setSort: (column, direction) => state.setSort(column, direction),
        getSort: () => state.getSort(),

        // Фільтри
        setFilter: (columnId, value) => state.setFilter(columnId, value),
        setFilters: (filters) => state.setFilters(filters),
        getFilters: () => state.getFilters(),
        clearFilters: () => state.clearFilters(),
        setSearchQuery: (query) => state.setSearchQuery(query),

        // Вибір рядків
        selectRow: (rowId) => state.selectRow(rowId),
        deselectRow: (rowId) => state.deselectRow(rowId),
        toggleRow: (rowId) => state.toggleRow(rowId),
        selectAll: (rowIds) => state.selectAll(rowIds),
        deselectAll: () => state.deselectAll(),
        getSelectedRows: () => state.getSelectedRows(),
        isSelected: (rowId) => state.isSelected(rowId),

        // Пагінація
        setPage: (page) => state.setPage(page),
        setPageSize: (size) => state.setPageSize(size),
        getPage: () => state.getPage(),
        getPageSize: () => state.getPageSize(),
        getTotalItems: () => state.getTotalItems(),
        setTotalItems: (total) => state.setTotalItems(total),
        setFilteredData: (data) => state.setFilteredData(data),
        setPaginatedData: (data) => state.setPaginatedData(data),

        // Колонки
        setVisibleColumns: (cols) => state.setVisibleColumns(cols),
        getVisibleColumns: () => state.getVisibleColumns(),

        // Стан
        isLoading: () => state.isLoading(),
        setLoading: (loading) => state.setLoading(loading),
        getState: () => state.getState(),

        // Hooks
        registerHook: (hookName, callback) => state.registerHook(hookName, callback),
        runHook: (hookName, ...args) => state.runHook(hookName, ...args),

        // DOM
        getContainer: () => tableCore.getContainer(),
        getDOM: () => tableCore.getDOM(),
        findRow: (rowId) => tableCore.findRow(rowId),
        updateCell: (rowId, columnId, content) => tableCore.updateCell(rowId, columnId, content),
        addRowClass: (rowId, className) => tableCore.addRowClass(rowId, className),
        removeRowClass: (rowId, className) => tableCore.removeRowClass(rowId, className),

        // Плагіни
        use: (plugin) => {
            tableCore.use(plugin);
            return api;
        },
        getPlugin: (name) => pluginInstances[name],

        // Lifecycle
        destroy: () => tableCore.destroy()
    };

    return api;
}

/**
 * Створити просту таблицю без плагінів
 * Для випадків коли потрібен тільки рендеринг
 *
 * @param {string|HTMLElement} container
 * @param {Object} config
 * @returns {Object} Table API
 */
export function createSimpleTable(container, config = {}) {
    return createTable(container, {
        ...config,
        plugins: {}
    });
}

/**
 * Створити таблицю з усіма плагінами
 * Зручний shortcut для повнофункціональної таблиці
 *
 * @param {string|HTMLElement} container
 * @param {Object} config
 * @returns {Object} Table API
 */
export function createFullTable(container, config = {}) {
    return createTable(container, {
        ...config,
        plugins: {
            sorting: config.sortingConfig || true,
            filters: config.filtersConfig || true,
            checkboxes: config.checkboxesConfig || true,
            ...config.plugins
        }
    });
}
