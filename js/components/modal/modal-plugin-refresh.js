// js/components/modal/modal-plugin-refresh.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MODAL REFRESH — ПЛАГІН                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Глобальна делегація click для кнопок оновлення            ║
 * ║  в хедері модалів. Можна видалити — система продовжує працювати.       ║
 * ║                                                                          ║
 * ║  HTML:                                                                   ║
 * ║  <button class="btn-icon" id="refresh-brand" title="Оновити">          ║
 * ║    <span class="material-symbols-outlined">refresh</span>               ║
 * ║  </button>                                                               ║
 * ║                                                                          ║
 * ║  EVENT:                                                                  ║
 * ║  modal:refresh — на .modal-fullscreen-container,                        ║
 * ║                  detail.waitUntil(promise)                               ║
 * ║                                                                          ║
 * ║  JS (сторінковий обробник):                                             ║
 * ║  modal.addEventListener('modal:refresh', (e) => {                       ║
 * ║      e.detail.waitUntil(fetchAndPopulate());                            ║
 * ║  });                                                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { withSpinner } from '../charms/charm-refresh.js';

export function initModalRefresh() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[id^="refresh-"]');
        if (!btn) return;

        const header = btn.closest('.modal-fullscreen-header');
        if (!header) return;

        const modal = btn.closest('.modal-fullscreen-container');
        if (!modal) return;

        handleRefresh(btn, modal);
    });
}

async function handleRefresh(btn, modal) {
    await withSpinner(btn, async () => {
        const promises = [];

        modal.dispatchEvent(new CustomEvent('modal:refresh', {
            bubbles: true,
            detail: { waitUntil: (p) => promises.push(p) }
        }));

        await Promise.allSettled(promises);
    });
}
