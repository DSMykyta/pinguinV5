// js/pages/marketplaces/marketplaces-state.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MARKETPLACES - STATE                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Стан модуля маркетплейсів. Створений через generic createPageState.
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 */

import { createPageState } from '../../components/page/page-state.js';

export const marketplacesState = createPageState({
    searchColumns: ['id', 'name', 'slug'],
    visibleColumns: ['id', 'name', 'slug', 'is_active'],

    custom: {
        filters: {},
        columnFiltersAPI: null,
        sortState: { column: null, direction: null },
        selectedRows: new Set(),
    }
});
