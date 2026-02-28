// js/components/modal/modal-plugin-refresh.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MODAL REFRESH — ПЛАГІН                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Глобальна делегація click для кнопок оновлення                        ║
 * ║  в хедері fullscreen модалів.                                          ║
 * ║                                                                          ║
 * ║  HTML:                                                                   ║
 * ║  <button class="btn-icon" id="refresh-brand" title="Оновити">          ║
 * ║    <span class="material-symbols-outlined">refresh</span>               ║
 * ║  </button>                                                               ║
 * ║                                                                          ║
 * ║  РЕЄСТРАЦІЯ (сторінковий код):                                          ║
 * ║  registerModalRefresh('brand-edit', async () => {                       ║
 * ║      await loadBrands();                                                ║
 * ║      fillBrandForm(getBrandById(currentBrandId));                       ║
 * ║  });                                                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { withSpinner } from '../charms/charm-refresh.js';

/** @type {Map<string, Function>} modalId → async refreshFn */
const refreshHandlers = new Map();

/**
 * Зареєструвати refresh-handler для модала.
 * @param {string} modalId — data-modal-id модала (напр. 'brand-edit')
 * @param {Function} fn — async callback для оновлення даних
 */
export function registerModalRefresh(modalId, fn) {
    refreshHandlers.set(modalId, fn);
}

/**
 * Ініціалізація — глобальна делегація click
 */
export function initModalRefresh() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[id^="refresh-"]');
        if (!btn) return;

        const header = btn.closest('.modal-fullscreen-header');
        if (!header) return;

        const overlay = btn.closest('[data-modal-id]');
        if (!overlay) return;

        const modalId = overlay.dataset.modalId;
        const handler = refreshHandlers.get(modalId);
        if (!handler) return;

        handleRefresh(btn, handler);
    });
}

async function handleRefresh(btn, handler) {
    await withSpinner(btn, handler);
}
