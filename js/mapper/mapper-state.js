// js/mapper/mapper-state.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - STATE MANAGEMENT                             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Централізований state + hooks система для плагінів            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// Хуки для комунікації між плагінами
const hooks = {
    onDataLoaded: [],
    onTabChange: [],
    onSearch: [],
    onFilter: [],
    onRender: [],
    onModalOpen: [],
    onModalClose: [],
    onItemCreate: [],
    onItemUpdate: [],
    onItemDelete: [],
    onMappingCreate: [],
    onMappingDelete: [],
    onRowSelect: [],
};

/**
 * Глобальний стан Mapper модуля
 */
export const mapperState = {
    activeTab: 'categories',

    // Власні дані
    categories: [],
    characteristics: [],
    options: [],
    marketplaces: [],

    // Дані маркетплейсів (MP)
    mpCategories: [],
    mpCharacteristics: [],
    mpOptions: [],

    // Маппінги
    mapCategories: [],
    mapCharacteristics: [],
    mapOptions: [],

    // Пошук
    searchQuery: '',
    searchColumns: {
        categories: ['id', 'name_ua', 'name_ru'],
        characteristics: ['id', 'name_ua', 'name_ru', 'type'],
        options: ['id', 'value_ua', 'value_ru'],
        marketplaces: ['id', 'name', 'slug']
    },

    // Фільтри
    filters: {
        categories: { source: 'all' },
        characteristics: { source: 'all' },
        options: { source: 'all' },
        marketplaces: { source: 'all' }
    },

    // Видимі колонки
    visibleColumns: {
        categories: ['id', '_nestingLevel', 'name_ua', 'parent_id'],
        characteristics: ['id', 'category_ids', 'name_ua', 'type', 'is_global'],
        options: ['id', 'characteristic_id', 'value_ua'],
        marketplaces: ['id', 'name', 'slug', 'is_active']
    },

    // Сортування
    sortKey: null,
    sortOrder: 'asc',

    // Пагінація
    pagination: {
        currentPage: 1,
        pageSize: 25,
        totalItems: 0
    },

    paginationAPI: null,

    // Вибрані рядки
    selectedRows: {
        categories: new Set(),
        characteristics: new Set(),
        options: new Set(),
        marketplaces: new Set()
    },

    // Завантажені плагіни
    loadedPlugins: new Set(),
};

/**
 * Реєстрація хука
 */
export function registerHook(hookName, callback) {
    if (hooks[hookName]) {
        hooks[hookName].push(callback);
    } else {
        console.warn(`[Mapper] Unknown hook: ${hookName}`);
    }
}

/**
 * Виконання хука
 */
export function runHook(hookName, ...args) {
    if (!hooks[hookName]) return;
    hooks[hookName].forEach(cb => {
        try {
            cb(...args);
        } catch (e) {
            console.error(`[Mapper Hook Error] ${hookName}:`, e);
        }
    });
}

/**
 * Скинути виділення
 */
export function clearSelection(tabName) {
    if (mapperState.selectedRows[tabName]) {
        mapperState.selectedRows[tabName].clear();
        runHook('onRowSelect', tabName, []);
    }
}

/**
 * Отримати активний таб
 */
export function getActiveTab() {
    return mapperState.activeTab;
}

/**
 * Встановити активний таб
 */
export function setActiveTab(tabName) {
    const prevTab = mapperState.activeTab;
    mapperState.activeTab = tabName;
    mapperState.pagination.currentPage = 1;
    mapperState.searchQuery = '';
    runHook('onTabChange', tabName, prevTab);
}

/**
 * Позначити плагін як завантажений
 */
export function markPluginLoaded(pluginName) {
    mapperState.loadedPlugins.add(pluginName);
    console.log(`[Mapper] ✅ Plugin loaded: ${pluginName}`);
}

/**
 * Перевірити чи плагін завантажений
 */
export function isPluginLoaded(pluginName) {
    return mapperState.loadedPlugins.has(pluginName);
}
