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
import { loadBrands } from './brands-data.js';
import { showToast } from '../common/ui-toast.js';
import { initTableSorting } from '../common/ui-table-controls.js';

/**
 * Ініціалізувати всі обробники подій
 */
export function initBrandsEvents() {

    initRefreshButton();
    initLinesRefreshButton();

}

/**
 * Ініціалізувати кнопку оновлення
 */
function initRefreshButton() {
    const refreshBtn = document.getElementById('refresh-tab-brands');
    if (!refreshBtn) return;

    refreshBtn.addEventListener('click', async () => {
        const icon = refreshBtn.querySelector('.material-symbols-outlined');
        refreshBtn.disabled = true;
        icon?.classList.add('is-spinning');

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
                icon?.classList.remove('is-spinning');
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
        icon?.classList.add('is-spinning');

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
                icon?.classList.remove('is-spinning');
            }, 500);
        }
    });
}

/**
 * Ініціалізувати сортування таблиці лінійок
 */
export function initLinesSorting() {
    const container = document.getElementById('lines-table-container');
    if (!container) return null;

    const sortAPI = initTableSorting(container, {
        dataSource: () => brandsState.brandLines || [],
        onSort: async (sortedData) => {
            brandsState.brandLines = sortedData;
            runHook('onRender');

            const sortState = sortAPI.getState();
            if (sortState.column && sortState.direction) {
                const { updateSortIndicators } = await import('../common/ui-table-controls.js');
                updateSortIndicators(container, sortState.column, sortState.direction);
            }
        },
        columnTypes: {
            line_id: 'id-text',
            brand_id: 'string',
            name_uk: 'string'
        }
    });

    brandsState.linesSortAPI = sortAPI;
    return sortAPI;
}

/**
 * Ініціалізувати пошук
 * @param {HTMLElement} searchInput - Поле пошуку
 */
export function initBrandsSearch(searchInput) {
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        brandsState.searchQuery = e.target.value.trim();
        brandsState.pagination.currentPage = 1; // Скинути на першу сторінку
        runHook('onRender');
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

// Реєструємо на хук onInit — ініціалізуємо обробники подій
registerBrandsPlugin('onInit', () => {
    initBrandsEvents();
    // Сортування брендів тепер вбудоване в Table LEGO (brands-table.js)
    initLinesSorting();
});

