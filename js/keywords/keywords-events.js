// js/keywords/keywords-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - EVENT HANDLERS                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { keywordsState } from './keywords-init.js';
import { renderKeywordsTable } from './keywords-table.js';
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

    const sortAPI = initTableSorting(container, {
        dataSource: () => getKeywords(),
        onSort: async (sortedData) => {
            keywordsState.keywords = sortedData;
            await renderKeywordsTable();

            const sortState = sortAPI.getState();
            if (sortState.key && sortState.order) {
                const header = container.querySelector(`[data-sort-key="${sortState.key}"]`);
                if (header) {
                    header.classList.add('is-sorted', sortState.order === 'asc' ? 'is-asc' : 'is-desc');
                }
            }
        }
    });

    keywordsState.sortAPI = sortAPI;

    console.log('✅ Сортування ініціалізовано');
    return sortAPI;
}
