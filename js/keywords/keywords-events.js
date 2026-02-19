// js/keywords/keywords-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - EVENT HANDLERS                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { renderKeywordsTable } from './keywords-table.js';
import { loadKeywords } from './keywords-data.js';
import { withSpinner } from '../common/charms/refresh-button.js';

export function initKeywordsEvents() {

    const refreshBtn = document.getElementById('refresh-tab-keywords');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => withSpinner(refreshBtn, async () => {
            await loadKeywords();
            renderKeywordsTable();
        }));
    }
}

// Пошук тепер керується через createManagedTable (keywords-table.js)
