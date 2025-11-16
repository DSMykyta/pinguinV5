// js/brands/brands-ui.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - UI MANAGEMENT                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за UI компоненти: селектори колонок, фільтри пошуку тощо
 */

import { brandsState } from './brands-init.js';
import { createColumnSelector } from '../common/ui-table-columns.js';
import { renderBrandsTable } from './brands-table.js';

/**
 * Заповнити колонки для пошуку в dropdown
 */
export function populateSearchColumns() {
    const allSearchColumns = [
        { id: 'brand_id', label: 'ID', checked: true },
        { id: 'name_uk', label: 'Назва', checked: true },
        { id: 'names_alt', label: 'Альтернативні назви', checked: true },
        { id: 'country_option_id', label: 'Країна', checked: true },
        { id: 'brand_text', label: 'Опис', checked: false },
        { id: 'brand_site_link', label: 'Сайт', checked: false }
    ];

    createColumnSelector('search-columns-list-brands', allSearchColumns, {
        checkboxPrefix: 'search-col-brands',
        onChange: (selectedIds) => {
            brandsState.searchColumns = selectedIds;
            console.log('🔍 Колонки пошуку:', brandsState.searchColumns);
        }
    });

    console.log('✅ Колонки пошуку заповнено');
}

/**
 * Заповнити колонки таблиці в dropdown
 */
export function populateTableColumns() {
    const tableColumns = [
        { id: 'brand_id', label: 'ID', checked: true },
        { id: 'name_uk', label: 'Назва', checked: true },
        { id: 'names_alt', label: 'Альтернативні назви', checked: false },
        { id: 'country_option_id', label: 'Країна', checked: true },
        { id: 'brand_text', label: 'Опис', checked: false },
        { id: 'brand_site_link', label: 'Сайт', checked: true }
    ];

    const columnSelector = createColumnSelector('table-columns-list-brands', tableColumns, {
        checkboxPrefix: 'table-col-brands',
        onChange: async (selectedIds) => {
            brandsState.visibleColumns = selectedIds;
            console.log('📋 Видимі колонки:', brandsState.visibleColumns);

            // Перемальовати таблицю
            renderBrandsTable();
        }
    });

    // Зберегти початкові видимі колонки в state
    if (columnSelector) {
        brandsState.visibleColumns = columnSelector.getSelected();
    }

    console.log('✅ Колонки таблиці заповнено');
}
