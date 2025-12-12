// js/price/price-pagination.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - PAGINATION                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Пагінація для таблиці прайсу з використанням універсального ui-pagination.
 */

import { priceState } from './price-init.js';
import { renderPriceTableRowsOnly } from './price-table.js';
import { initPagination } from '../common/ui-pagination.js';

/**
 * Ініціалізувати пагінацію для прайсу
 */
export function initPaginationForPrice() {
    const footer = document.querySelector('.fixed-footer');

    if (!footer) {
        console.warn('⚠️ fixed-footer не знайдено');
        return;
    }

    // Використовуємо універсальну пагінацію
    priceState.paginationAPI = initPagination(footer, {
        currentPage: priceState.pagination.currentPage,
        pageSize: priceState.pagination.pageSize,
        totalItems: priceState.filteredItems.length,
        onPageChange: async (page, pageSize) => {
            priceState.pagination.currentPage = page;
            priceState.pagination.pageSize = pageSize;
            // Тільки рядки - заголовок з dropdown-ами НЕ чіпаємо!
            await renderPriceTableRowsOnly();
        }
    });

    console.log('✅ Price pagination initialized');
}

/**
 * Оновити пагінацію з новими даними
 */
export function updatePagination() {
    if (priceState.paginationAPI) {
        priceState.paginationAPI.update({
            totalItems: priceState.filteredItems.length,
            currentPage: priceState.pagination.currentPage,
            pageSize: priceState.pagination.pageSize
        });
    }
}
