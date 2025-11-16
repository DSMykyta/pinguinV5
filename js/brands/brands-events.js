// js/brands/brands-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - EVENT HANDLERS                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Обробники подій для сторінки брендів.
 */

import { brandsState } from './brands-init.js';
import { renderBrandsTable } from './brands-table.js';
import { loadBrands } from './brands-data.js';
import { showToast } from '../common/ui-toast.js';

/**
 * Ініціалізувати всі обробники подій
 */
export function initBrandsEvents() {
    console.log('🎯 Ініціалізація обробників подій для брендів...');

    initRefreshButton();

    console.log('✅ Обробники подій ініціалізовано');
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
        renderBrandsTable();
    });
}
