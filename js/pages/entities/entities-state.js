// js/pages/entities/entities-state.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    ENTITIES - STATE                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Стан модуля сутностей. Створений через generic createPageState.
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 */

import { createPageState } from '../../components/page/page-state.js';

export const entitiesState = createPageState({
    activeTab: 'categories',

    searchColumns: {
        categories: ['id', 'name_ua', 'name_ru'],
        characteristics: ['id', 'name_ua', 'name_ru', 'type'],
        options: ['id', 'value_ua', 'value_ru'],
    },

    visibleColumns: {
        categories: ['id', 'nesting_level', 'name_ua', 'parent_id', 'grouping', 'bindings'],
        characteristics: ['id', 'raw_category_ids', 'name_ua', 'type', 'is_global', 'bindings'],
        options: ['id', 'characteristic_id', 'value_ua', 'bindings'],
    },

    custom: {
        filters: { categories: {}, characteristics: {}, options: {} },
        columnFilters: { categories: {}, characteristics: {}, options: {} },
        columnFiltersAPI: { categories: null, characteristics: null, options: null },

        sortState: {
            categories: { column: null, direction: null },
            characteristics: { column: null, direction: null },
            options: { column: null, direction: null },
        },

        selectedRows: {
            categories: new Set(),
            characteristics: new Set(),
            options: new Set(),
        },
    }
});
