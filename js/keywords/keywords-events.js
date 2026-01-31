// js/keywords/keywords-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - EVENT HANDLERS                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { keywordsState } from './keywords-init.js';
import { renderKeywordsTable, renderKeywordsTableRowsOnly, getColumns } from './keywords-table.js';
import { loadKeywords, getKeywords } from './keywords-data.js';
import { initTableSorting } from '../common/ui-table-controls.js';

export function initKeywordsEvents() {

    const refreshBtn = document.getElementById('refresh-tab-keywords');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const icon = refreshBtn.querySelector('.material-symbols-outlined');
            if (icon) icon.classList.add('is-spinning');

            try {
                await loadKeywords();
                renderKeywordsTable();
                // Реініціалізуємо сортування після повного рендерингу
                reinitKeywordsSorting();

                // Оновлюємо пагінацію
                if (keywordsState.paginationAPI) {
                    keywordsState.paginationAPI.update({
                        totalItems: keywordsState.keywords.length
                    });
                }
            } catch (error) {
                console.error('❌ Помилка оновлення:', error);
            } finally {
                if (icon) icon.classList.remove('is-spinning');
            }
        });
    }

}

export function initKeywordsSearch(searchInput) {
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        keywordsState.searchQuery = e.target.value.trim();
        keywordsState.pagination.currentPage = 1;
        // Оновлюємо тільки рядки, зберігаючи заголовок з dropdown
        renderKeywordsTableRowsOnly();
    });

}

// Мапа типів параметрів для відображення в dropdown фільтрі
const PARAM_TYPE_LABELS = {
    'category': 'Категорія',
    'characteristic': 'Характеристика',
    'option': 'Опція',
    'marketing': 'Маркетинг',
    'other': 'Інше'
};

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
            filterType: col.filterType || 'values',
            // Додаємо labelMap для param_type
            labelMap: col.id === 'param_type' ? PARAM_TYPE_LABELS : null
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
            // Оновлюємо тільки рядки, зберігаючи заголовок з dropdown
            renderKeywordsTableRowsOnly();
        },
        onFilter: (activeFilters) => {
            keywordsState.columnFilters = activeFilters;
            keywordsState.pagination.currentPage = 1;
            // Оновлюємо тільки рядки, зберігаючи заголовок з dropdown
            renderKeywordsTableRowsOnly();
        }
    });

    keywordsState.sortAPI = sortAPI;

    return sortAPI;
}

/**
 * Реініціалізувати сортування та фільтрацію після повного рендерингу таблиці
 * Викликається тільки після renderKeywordsTable (коли заголовок перестворено)
 */
export function reinitKeywordsSorting() {
    const container = document.getElementById('keywords-table-container');
    if (!container) return;

    // Перевіряємо чи є заголовок таблиці
    const hasHeader = container.querySelector('.pseudo-table-header');
    if (!hasHeader) return;

    // Знищуємо старий API
    if (keywordsState.sortAPI) {
        keywordsState.sortAPI.destroy();
    }

    // Зберігаємо поточні фільтри
    const savedFilters = keywordsState.columnFilters ? { ...keywordsState.columnFilters } : null;

    // Отримуємо конфігурацію колонок для фільтрів
    const columns = getColumns();

    // Колонки з фільтрами (для hover dropdown)
    const filterColumns = columns
        .filter(col => col.filterable)
        .map(col => ({
            id: col.id,
            label: col.label,
            filterType: col.filterType || 'values',
            labelMap: col.id === 'param_type' ? PARAM_TYPE_LABELS : null
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
            // Оновлюємо тільки рядки, зберігаючи заголовок з dropdown
            renderKeywordsTableRowsOnly();
        },
        onFilter: (activeFilters) => {
            keywordsState.columnFilters = activeFilters;
            keywordsState.pagination.currentPage = 1;
            // Оновлюємо тільки рядки, зберігаючи заголовок з dropdown
            renderKeywordsTableRowsOnly();
        }
    });

    // Відновлюємо фільтри
    if (savedFilters && Object.keys(savedFilters).length > 0) {
        sortAPI.setFilters(savedFilters);
    }

    keywordsState.sortAPI = sortAPI;
}
