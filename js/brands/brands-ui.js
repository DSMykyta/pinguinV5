// js/brands/brands-ui.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - UI MANAGEMENT                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за UI компоненти: селектори колонок, фільтри пошуку тощо
 */

import { brandsState } from './brands-init.js';
import { setupSearchColumnsSelector, setupTableColumnsSelector } from '../common/ui-table-columns.js';
import { renderBrandsTable, getColumns } from './brands-table.js';

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
            // Перемальовати таблицю
            renderBrandsTable();
        }
    });
    console.log('✅ Колонки таблиці заповнено');
}
