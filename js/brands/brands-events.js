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
import { initTableSorting } from '../common/ui-table-controls.js';

/**
 * Ініціалізувати всі обробники подій
 */
export function initBrandsEvents() {

    initRefreshButton();
    initLinesRefreshButton();

}

/**
 * Ініціалізувати сортування таблиці брендів
 * @returns {Object} API сортування
 */
export function initBrandsSorting() {
    const container = document.getElementById('brands-table-container');
    if (!container) {
        console.warn('⚠️ brands-table-container не знайдено');
        return null;
    }

    const sortAPI = initTableSorting(container, {
        dataSource: () => {
            const lines = brandsState.brandLines || [];
            return getBrands().map(b => {
                b.lines_count = lines.filter(l => l.brand_id === b.brand_id).length;
                return b;
            });
        },
        onSort: async (sortedData) => {
            // Оновити масив брендів в state
            brandsState.brands = sortedData;

            // Перерендерити таблицю
            await renderBrandsTable();

            // Відновити візуальні індикатори після рендерингу
            const sortState = sortAPI.getState();
            if (sortState.column && sortState.direction) {
                const { updateSortIndicators } = await import('../common/ui-table-controls.js');
                updateSortIndicators(container, sortState.column, sortState.direction);
            }
        },
        columnTypes: {
            brand_id: 'id-text',
            name_uk: 'string',
            names_alt: 'string',
            country_option_id: 'string',
            brand_text: 'string',
            brand_site_link: 'string',
            lines_count: 'number'
        },
        filterColumns: [
            { id: 'country_option_id', label: 'Країна', filterType: 'values' },
            { id: 'brand_status', label: 'Статус', filterType: 'values' }
        ],
        onFilter: (filters) => {
            brandsState.columnFilters = filters;
            brandsState.pagination.currentPage = 1;
            runHook('onRender');
        }
    });

    brandsState.sortAPI = sortAPI;

    return sortAPI;
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
    initBrandsSorting();
    initLinesSorting();
});

