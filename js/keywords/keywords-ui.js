// js/keywords/keywords-ui.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - UI MANAGEMENT                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { keywordsState } from './keywords-init.js';
import { createColumnSelector } from '../common/ui-table-columns.js';
import { renderKeywordsTable } from './keywords-table.js';

export function populateSearchColumns() {
    const allSearchColumns = [
        { id: 'local_id', label: 'ID', checked: true },
        { id: 'name_uk', label: 'Назва', checked: true },
        { id: 'param_type', label: 'Тип', checked: true },
        { id: 'trigers', label: 'Тригери', checked: true },
        { id: 'keywords_ua', label: 'Ключові слова', checked: true }
    ];

    createColumnSelector('search-columns-list-keywords', allSearchColumns, {
        checkboxPrefix: 'search-col-keywords',
        filterBy: keywordsState.visibleColumns,
        onChange: (selectedIds) => {
            keywordsState.searchColumns = selectedIds;
            console.log('🔍 Колонки пошуку:', keywordsState.searchColumns);
        }
    });

    console.log('✅ Колонки пошуку заповнено');
}

export function populateTableColumns() {
    const tableColumns = [
        { id: 'local_id', label: 'ID', checked: true },
        { id: 'name_uk', label: 'Назва', checked: true },
        { id: 'param_type', label: 'Тип', checked: true },
        { id: 'trigers', label: 'Тригери', checked: true },
        { id: 'keywords_ua', label: 'Ключові слова', checked: true }
    ];

    const columnSelector = createColumnSelector('table-columns-list-keywords', tableColumns, {
        checkboxPrefix: 'table-col-keywords',
        onChange: async (selectedIds) => {
            keywordsState.visibleColumns = selectedIds;
            console.log('📋 Видимі колонки:', keywordsState.visibleColumns);

            populateSearchColumns();

            renderKeywordsTable();
        }
    });

    if (columnSelector) {
        keywordsState.visibleColumns = columnSelector.getSelected();
    }

    console.log('✅ Колонки таблиці заповнено');
}
