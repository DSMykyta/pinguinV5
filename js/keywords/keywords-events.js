// js/keywords/keywords-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - EVENT HANDLERS                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { renderKeywordsTable } from './keywords-table.js';
import { loadKeywords } from './keywords-data.js';

export function initKeywordsEvents() {

    const refreshBtn = document.getElementById('refresh-tab-keywords');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const icon = refreshBtn.querySelector('.material-symbols-outlined');
            if (icon) icon.classList.add('spinning');

            try {
                await loadKeywords();
                renderKeywordsTable();
            } catch (error) {
                console.error('❌ Помилка оновлення:', error);
            } finally {
                if (icon) icon.classList.remove('spinning');
            }
        });
    }
}

// Пошук тепер керується через createManagedTable (keywords-table.js)
