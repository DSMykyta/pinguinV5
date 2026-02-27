// js/keywords/keywords-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - EVENT HANDLERS                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { renderKeywordsTable } from './keywords-table.js';
import { loadKeywords } from './keywords-data.js';

export function init(state) { /* one-time setup — main orchestrates event binding */ }

export function initKeywordsEvents() {

    const container = document.getElementById('keywords-table-container');
    if (container) {
        container.addEventListener('charm:refresh', (e) => {
            e.detail.waitUntil((async () => {
                await loadKeywords();
                renderKeywordsTable();
            })());
        });
    }
}

// Пошук тепер керується через createManagedTable (keywords-table.js)
