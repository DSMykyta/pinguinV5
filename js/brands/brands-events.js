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
import { showToast } from '../common/ui-toast.js';
import { withSpinner } from '../common/charms/refresh-button.js';

/**
 * Ініціалізувати всі обробники подій
 */
export function initBrandsEvents() {

    initRefreshButton();
    initLinesRefreshButton();

}

// initBrandsSorting — тепер сортування та фільтри для брендів
// обробляються через Table LEGO плагіни в brands-table.js

/**
 * Ініціалізувати кнопку оновлення
 */
function initRefreshButton() {
    const refreshBtn = document.getElementById('refresh-tab-brands');
    if (!refreshBtn) return;

    refreshBtn.addEventListener('click', () => withSpinner(refreshBtn, async () => {
        await loadBrands();
        renderBrandsTable();
        showToast('Дані оновлено', 'success');
    }));
}

/**
 * Ініціалізувати кнопку оновлення для табу лінійок
 */
function initLinesRefreshButton() {
    const refreshBtn = document.getElementById('refresh-tab-lines');
    if (!refreshBtn) return;

    refreshBtn.addEventListener('click', () => withSpinner(refreshBtn, async () => {
        const { loadBrandLines } = await import('./lines-data.js');
        await loadBrandLines();
        runHook('onRender');
        showToast('Дані оновлено', 'success');
    }));
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

