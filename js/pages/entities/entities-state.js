// js/pages/entities/entities-state.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    ENTITIES - STATE                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Глобальний стан для модуля сутностей.
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 */

/**
 * Глобальний стан для entities модуля
 */
export const entitiesState = {
    // ═══════════════════════════════════════════════════════════════════════
    // АКТИВНИЙ ТАБ
    // ═══════════════════════════════════════════════════════════════════════

    activeTab: 'categories',

    // ═══════════════════════════════════════════════════════════════════════
    // ПОШУК
    // ═══════════════════════════════════════════════════════════════════════

    searchQuery: '',
    searchColumns: {
        categories: ['id', 'name_ua', 'name_ru'],
        characteristics: ['id', 'name_ua', 'name_ru', 'type'],
        options: ['id', 'value_ua', 'value_ru'],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ФІЛЬТРИ
    // ═══════════════════════════════════════════════════════════════════════

    filters: { categories: {}, characteristics: {}, options: {} },
    columnFilters: { categories: {}, characteristics: {}, options: {} },
    columnFiltersAPI: { categories: null, characteristics: null, options: null },

    // ═══════════════════════════════════════════════════════════════════════
    // ВИДИМІ КОЛОНКИ
    // ═══════════════════════════════════════════════════════════════════════

    visibleColumns: {
        categories: ['id', 'nesting_level', 'name_ua', 'parent_id', 'grouping', 'bindings'],
        characteristics: ['id', 'raw_category_ids', 'name_ua', 'type', 'is_global', 'bindings'],
        options: ['id', 'characteristic_id', 'value_ua', 'bindings'],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // СОРТУВАННЯ
    // ═══════════════════════════════════════════════════════════════════════

    sortState: {
        categories: { column: null, direction: null },
        characteristics: { column: null, direction: null },
        options: { column: null, direction: null },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ВИБРАНІ РЯДКИ
    // ═══════════════════════════════════════════════════════════════════════

    selectedRows: {
        categories: new Set(),
        characteristics: new Set(),
        options: new Set(),
    },
};
