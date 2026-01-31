// js/brands/brands-ui.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - UI MANAGEMENT                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — можна видалити, система працюватиме без UI компонентів.
 *
 * Відповідає за UI компоненти: селектори колонок, фільтри пошуку тощо
 */

import { brandsState } from './brands-state.js';
import { registerBrandsPlugin, runHook } from './brands-plugins.js';
import { setupSearchColumnsSelector, setupTableColumnsSelector } from '../common/ui-table-columns.js';
import { getColumns } from './brands-table.js';

/**
 * Заповнити колонки для пошуку в aside
 * Використовує універсальну функцію setupSearchColumnsSelector
 */
export function populateSearchColumns() {
    setupSearchColumnsSelector({
        containerId: 'search-columns-list-brands',
        getColumns,
        state: brandsState,
        checkboxPrefix: 'search-col-brands'
    });
    console.log('✅ Колонки пошуку заповнено');
}

/**
 * Заповнити колонки таблиці в dropdown
 * Використовує універсальну функцію setupTableColumnsSelector
 */
export function populateTableColumns() {
    setupTableColumnsSelector({
        containerId: 'table-columns-list-brands',
        getColumns,
        state: brandsState,
        checkboxPrefix: 'brands-col',
        searchColumnsContainerId: 'search-columns-list-brands',
        onVisibilityChange: async (selectedIds) => {
            // Оновити visible columns в tableAPI якщо він існує
            if (brandsState.tableAPI) {
                brandsState.tableAPI.setVisibleColumns(selectedIds);
            }
            // Перемальовати таблицю
            runHook('onRender');
        }
    });
    console.log('✅ Колонки таблиці заповнено');
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

// Реєструємо на хук onInit — заповнюємо UI компоненти
registerBrandsPlugin('onInit', () => {
    populateSearchColumns();
    populateTableColumns();
});

console.log('[Brands UI] Плагін завантажено');
