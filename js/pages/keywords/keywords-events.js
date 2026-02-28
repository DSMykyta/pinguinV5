// js/pages/keywords/keywords-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - EVENT HANDLERS                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { renderKeywordsTable } from './keywords-table.js';
import { loadKeywords } from './keywords-data.js';
import { showToast } from '../../components/feedback/toast.js';

export function init(state) { /* one-time setup — main orchestrates event binding */ }

export function initKeywordsEvents() {

    // Modal-level — refresh даних ключових слів
    const keywordsModal = document.querySelector('[data-modal-id="keywords-edit"] > .modal-fullscreen-container');
    if (keywordsModal) {
        keywordsModal.addEventListener('charm:refresh', (e) => {
            e.detail.waitUntil((async () => {
                await loadKeywords();
                renderKeywordsTable();
                showToast('Дані оновлено', 'success');
            })());
        });
    }

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
