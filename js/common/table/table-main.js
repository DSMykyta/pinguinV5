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
 * ║  const table = createTable(container, {                                  ║
 * ║      columns: [...],                                                     ║
 * ║      rowActions: (row) => `<button>Edit</button>`,                       ║
 * ║      rowActionsHeader: ' ',                                              ║
 * ║      getRowId: row => row.id,                                            ║
 * ║      withContainer: false,                                               ║
 * ║      onAfterRender: (container) => {},                                   ║
 * ║      plugins: {                                                          ║
 * ║          sorting: { columnTypes: { id: 'id-number' } },                  ║
 * ║          filters: {                                                      ║
 * ║              filterColumns: [                                            ║
 * ║                  { id: 'status', label: 'Статус', filterType: 'values' } ║
 * ║              ],                                                          ║
 * ║              onFilter: (filters) => {}                                   ║
 * ║          }                                                               ║
 * ║      }                                                                   ║
 * ║  });                                                                     ║
 * ║                                                                          ║
 * ║  table.setData(myData);                                                  ║
 * ║  table.render();                                                         ║
 * ║  ```                                                                     ║
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
 * @param {Function} [config.rowActions] - Функція для дій в рядку (як rowActionsCustom в ui-table.js)
 * @param {string} [config.rowActionsHeader] - HTML заголовка колонки дій
 * @param {boolean} [config.noHeaderSort] - Вимкнути sortable-header класи
 * @param {Function} [config.onRowClick] - Callback при кліку на рядок
 * @param {Function} [config.onAfterRender] - Callback після рендерингу
 * @param {Object} [config.emptyState] - Конфіг порожнього стану
 * @param {boolean} [config.withContainer] - Обгортати в .pseudo-table-container
 * @param {Array} [config.visibleColumns] - Масив видимих колонок
 * @param {Object} [config.plugins] - Конфіг плагінів
 * @param {boolean|Object} [config.plugins.sorting] - Сортування
 * @param {boolean|Object} [config.plugins.filters] - Фільтри
 * @param {boolean|Object} [config.plugins.checkboxes] - Чекбокси
 * @param {Array} [config.customPlugins] - Масив кастомних плагінів
 * @param {Array} [config.data] - Початкові дані
 * @returns {Object} Table API
 */
export function createTable(container, config = {}) {
    const {
        columns = [],
        getRowId = (row, index) => row.id || row.local_id || row.code || index,
        rowActions = null,
        rowActionsHeader = null,
        noHeaderSort = false,
        onRowClick = null,
        onAfterRender = null,
        emptyState = null,
        withContainer = true,
        visibleColumns = null,
        plugins = {},
        customPlugins = [],
        data = [],
        pageSize = 25,
        tableId = `table-${Date.now()}`,
        ...restConfig
    } = config;

    // 1. Створюємо state
    const state = createTableState({
        data,
        columns,
        pageSize,
        tableId,
        visibleColumns
    });

    // 2. Створюємо ядро таблиці
    const tableCore = new TableCore(container, {
        columns,
        getRowId,
        rowActions,
        rowActionsHeader,
        noHeaderSort,
        onRowClick,
        onAfterRender,
        emptyState,
        withContainer,
        visibleColumns,
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
        setVisibleColumns: (cols) => tableCore.setVisibleColumns(cols),
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
 * Рендерити таблицю одноразово (аналог renderPseudoTable з ui-table.js)
 *
 * Створює Table LEGO, рендерить дані та повертає API.
 * Використовується для простих таблиць (модалки, деталі)
 * де не потрібно зберігати окремий tableAPI.
 *
 * @param {string|HTMLElement} container - Контейнер
 * @param {Object} config - Конфігурація (як createTable + data)
 * @param {Array} config.data - Дані для рендерингу
 * @returns {Object} Table API
 */
export function renderTable(container, config = {}) {
    const { data = [], ...tableConfig } = config;
    const table = createTable(container, tableConfig);
    table.render(data);
    return table;
}

/**
 * Створити просту таблицю без плагінів
 */
export function createSimpleTable(container, config = {}) {
    return createTable(container, {
        ...config,
        plugins: {}
    });
}

/**
 * Створити таблицю з усіма плагінами
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
