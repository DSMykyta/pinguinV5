// js/keywords/keywords-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - EVENT HANDLERS                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { keywordsState } from './keywords-init.js';
import { renderKeywordsTable, renderKeywordsTableRowsOnly } from './keywords-table.js';
import { loadKeywords } from './keywords-data.js';

export function initKeywordsEvents() {

    const refreshBtn = document.getElementById('refresh-tab-keywords');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const icon = refreshBtn.querySelector('.material-symbols-outlined');
            if (icon) icon.classList.add('is-spinning');

            try {
                await loadKeywords();
                renderKeywordsTable();
                // Сортування/фільтри тепер через Table LEGO плагіни (keywords-table.js)

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

// initKeywordsSorting та reinitKeywordsSorting — тепер сортування та фільтри
// обробляються через Table LEGO плагіни в keywords-table.js
