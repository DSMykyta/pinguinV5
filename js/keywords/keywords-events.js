// js/keywords/keywords-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - EVENT HANDLERS                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { keywordsState } from './keywords-init.js';
import { renderKeywordsTable, getColumns } from './keywords-table.js';
import { loadKeywords, getKeywords } from './keywords-data.js';
import { initTableSorting } from '../common/ui-table-controls.js';

export function initKeywordsEvents() {
    console.log('🎯 Ініціалізація обробників подій для ключових слів...');

    const refreshBtn = document.getElementById('refresh-tab-keywords');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            console.log('🔄 Оновлення даних Keywords...');
            await loadKeywords();
            renderKeywordsTable();
        });
    }

    console.log('✅ Обробники подій ініціалізовано');
}

export function initKeywordsSearch(searchInput) {
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        keywordsState.searchQuery = e.target.value.trim();
        keywordsState.pagination.currentPage = 1;
        renderKeywordsTable();
    });

    console.log('✅ Пошук ініціалізовано');
}

export function initKeywordsSorting() {
    const container = document.getElementById('keywords-table-container');
    if (!container) {
        console.warn('⚠️ keywords-table-container не знайдено');
        return null;
    }

    // Отримуємо конфігурацію колонок для фільтрів
    const columns = getColumns();

    // Колонки з фільтрами (для hover dropdown)
    const filterColumns = columns
        .filter(col => col.filterable)
        .map(col => ({
            id: col.id,
            label: col.label,
            filterType: col.filterType || 'values'
        }));

    const sortAPI = initTableSorting(container, {
        dataSource: () => getKeywords(),
        columnTypes: {
            local_id: 'id-text',
            param_type: 'string',
            name_uk: 'string',
            trigers: 'string'
        },
        filterColumns,
        onSort: async (sortedData) => {
            keywordsState.keywords = sortedData;
            keywordsState.pagination.currentPage = 1;
            await renderKeywordsTable();
        },
        onFilter: (activeFilters) => {
            keywordsState.columnFilters = activeFilters;
            keywordsState.pagination.currentPage = 1;
            renderKeywordsTable();
        }
    });

    keywordsState.sortAPI = sortAPI;

    console.log('✅ Сортування та фільтрація ініціалізовано');
    return sortAPI;
}
