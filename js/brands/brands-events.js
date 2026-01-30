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
    console.log('🎯 Ініціалізація обробників подій для брендів...');

    initRefreshButton();

    console.log('✅ Обробники подій ініціалізовано');
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
        dataSource: () => getBrands(),
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
            brand_site_link: 'string'
        }
    });

    brandsState.sortAPI = sortAPI;

    console.log('✅ Сортування ініціалізовано');
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
});

console.log('[Brands Events] Плагін завантажено');
