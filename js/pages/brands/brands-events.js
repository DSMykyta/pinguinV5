// js/brands/brands-events.js

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
import { showToast } from '../../components/ui-toast.js';

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
                runHook('onRender');
                showToast('Дані оновлено', 'success');
            })());
        });
    }
}

// initLinesSorting — тепер сортування лінійок
// обробляється через Table LEGO плагіни в lines-table.js

// Пошук тепер керується через createManagedTable (brands-table.js, lines-table.js)

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

// Реєструємо на хук onInit — ініціалізуємо обробники подій
registerBrandsPlugin('onInit', () => {
    initBrandsEvents();
    // Сортування/фільтри тепер через Table LEGO плагіни (brands-table.js, lines-table.js)
});

