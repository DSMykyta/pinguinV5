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

    // Modal-level — модал завантажується при відкритті,
    // тому вішаємо listener через modal-opened event
    document.addEventListener('modal-opened', (e) => {
        if (e.detail.modalId !== 'keywords-edit') return;
        const modal = e.detail.modalElement?.querySelector('.modal-fullscreen-container');
        if (!modal || modal._keywordsRefreshInit) return;
        modal._keywordsRefreshInit = true;
        modal.addEventListener('charm:refresh', (ev) => {
            ev.detail.waitUntil((async () => {
                await loadKeywords();
                renderKeywordsTable();
                showToast('Дані оновлено', 'success');
            })());
        });
    });

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
