// js/pages/brands/brands-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - EVENT HANDLERS                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Обробники подій для сторінки брендів.
 */

import { brandsState } from './brands-state.js';
import { registerBrandsPlugin, runHook } from './brands-plugins.js';
import { renderBrandsTable } from './brands-table.js';
import { loadBrands, getBrands } from './brands-data.js';
import { showToast } from '../../components/feedback/toast.js';

/**
 * Ініціалізувати всі обробники подій
 */
export function initBrandsEvents() {

    initRefreshHandlers();

}

/**
 * Обробники charm:refresh на контейнерах
 */
function initRefreshHandlers() {
    const brandsContainer = document.getElementById('brands-table-container');
    if (brandsContainer) {
        brandsContainer.addEventListener('charm:refresh', (e) => {
            e.detail.waitUntil((async () => {
                await loadBrands();
                renderBrandsTable();
                const { resetSnapshots } = await import('./brands-polling.js');
                resetSnapshots();
                showToast('Дані оновлено', 'success');
            })());
        });
    }

    const linesContainer = document.getElementById('lines-table-container');
    if (linesContainer) {
        linesContainer.addEventListener('charm:refresh', (e) => {
            e.detail.waitUntil((async () => {
                const { loadBrandLines } = await import('./lines-data.js');
                await loadBrandLines();
                const { resetSnapshots } = await import('./brands-polling.js');
                resetSnapshots();
                runHook('onRender');
                showToast('Дані оновлено', 'success');
            })());
        });
    }

    // Modal-level — модал завантажується лише при відкритті,
    // тому вішаємо listener через modal-opened event
    document.addEventListener('modal-opened', (e) => {
        if (e.detail.modalId !== 'brand-edit') return;
        const container = e.detail.modalElement?.querySelector('.modal-fullscreen-container');
        if (!container || container._brandsRefreshInit) return;
        container._brandsRefreshInit = true;
        container.addEventListener('charm:refresh', (ev) => {
            ev.detail.waitUntil((async () => {
                await loadBrands();
                renderBrandsTable();
                const { resetSnapshots } = await import('./brands-polling.js');
                const { refreshBrandModal } = await import('./brands-crud.js');
                resetSnapshots();
                refreshBrandModal(true);
                showToast('Дані оновлено', 'success');
            })());
        });
    });
}

// initLinesSorting — тепер сортування лінійок
// обробляється через Table LEGO плагіни в lines-table.js

// Пошук тепер керується через createManagedTable (brands-table.js, lines-table.js)

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

// Реєструємо на хук onInit — ініціалізуємо обробники подій
export function init(state) {
    registerBrandsPlugin('onInit', () => {
        initBrandsEvents();
        // Сортування/фільтри тепер через Table LEGO плагіни (brands-table.js, lines-table.js)
    });
}

