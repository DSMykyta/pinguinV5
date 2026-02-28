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
 * ║  Конфігурація REFRESH_MAP визначає data-модуль та load-функцію          ║
 * ║  для кожного modal-id. CRUD файли не імпортують цей модуль.            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { withSpinner } from '../charms/charm-refresh.js';
import { showToast } from '../feedback/toast.js';

/**
 * modal-id → async () => завантажити дані з сервера
 */
const REFRESH_MAP = {
    'brand-edit':                 () => import('../../pages/brands/brands-data.js').then(m => m.loadBrands()),
    'keywords-edit':              () => import('../../pages/keywords/keywords-data.js').then(m => m.loadKeywords()),
    'mapper-category-edit':       () => import('../../pages/mapper/mapper-data-own.js').then(m => m.loadCategories()),
    'mapper-characteristic-edit': () => import('../../pages/mapper/mapper-data-own.js').then(m => m.loadCharacteristics()),
    'mapper-option-edit':         () => import('../../pages/mapper/mapper-data-own.js').then(m => m.loadOptions()),
    'mapper-mp-data':             () => import('../../pages/mapper/mapper-data-own.js').then(m => m.loadMarketplaces()),
};

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
        const loader = REFRESH_MAP[modalId];
        if (!loader) return;

        handleRefresh(btn, loader);
    });
}

async function handleRefresh(btn, loader) {
    await withSpinner(btn, async () => {
        await loader();
        showToast('Дані оновлено', 'success');
    });
}
