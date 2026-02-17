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

    refreshBtn.addEventListener('click', async () => {
        const icon = refreshBtn.querySelector('.material-symbols-outlined');
        refreshBtn.disabled = true;
        icon?.classList.add('spinning');

        try {
            await loadBrands();
            renderBrandsTable();
            showToast('Дані оновлено', 'success');
        } catch (error) {
            console.error('❌ Помилка оновлення:', error);
            showToast('Помилка оновлення даних', 'error');
        } finally {
            setTimeout(() => {
                refreshBtn.disabled = false;
                icon?.classList.remove('spinning');
            }, 500);
        }
    });
}

/**
 * Ініціалізувати кнопку оновлення для табу лінійок
 */
function initLinesRefreshButton() {
    const refreshBtn = document.getElementById('refresh-tab-lines');
    if (!refreshBtn) return;

    refreshBtn.addEventListener('click', async () => {
        const icon = refreshBtn.querySelector('.material-symbols-outlined');
        refreshBtn.disabled = true;
        icon?.classList.add('spinning');

        try {
            const { loadBrandLines } = await import('./lines-data.js');
            await loadBrandLines();
            runHook('onRender');
            showToast('Дані оновлено', 'success');
        } catch (error) {
            console.error('❌ Помилка оновлення лінійок:', error);
            showToast('Помилка оновлення даних', 'error');
        } finally {
            setTimeout(() => {
                refreshBtn.disabled = false;
                icon?.classList.remove('spinning');
            }, 500);
        }
    });
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

