// js/components/page/page-state.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PAGE STATE — Generic State Factory                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Фабрика стану сторінки. Замінює brands-state.js, entities-state.js.   ║
 * ║                                                                          ║
 * ║  ВИКОРИСТАННЯ:                                                           ║
 * ║  const state = createPageState({                                         ║
 * ║      activeTab: 'brands',                                                ║
 * ║      searchColumns: ['brand_id', 'name_uk'],                             ║
 * ║      visibleColumns: ['brand_id', 'name_uk', 'brand_status'],            ║
 * ║      custom: { brands: [], brandLines: [] }                              ║
 * ║  });                                                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Створити стан сторінки
 * @param {Object} config
 * @param {string} [config.activeTab] - Активний таб
 * @param {Array<string>} [config.searchColumns] - Колонки для пошуку
 * @param {Array<string>} [config.visibleColumns] - Видимі колонки
 * @param {Object} [config.custom] - Кастомні поля стану (page-specific)
 * @returns {Object} State object
 */
export function createPageState(config = {}) {
    return {
        // Таби
        activeTab: config.activeTab || null,

        // Пошук
        searchQuery: '',
        searchColumns: config.searchColumns || [],

        // Колонки
        visibleColumns: config.visibleColumns || [],
        columnFilters: {},

        // Сортування
        sortKey: null,
        sortOrder: 'asc',

        // Managed tables (заповнюються плагінами)
        // Наприклад: state.brandsManagedTable = createManagedTable(...)

        // Кастомні поля (page-specific дані)
        ...(config.custom || {})
    };
}
