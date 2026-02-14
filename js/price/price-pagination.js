// js/price/price-pagination.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - PAGINATION                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Пагінація для таблиці прайсу з використанням універсального ui-pagination.
 */

import { priceState } from './price-init.js';
import { initPagination } from '../common/ui-pagination.js';

/**
 * Ініціалізувати пагінацію для прайсу
 */
export function initPaginationForPrice() {
    const footer = document.querySelector('.footer');

    if (!footer) {
        console.warn('⚠️ footer не знайдено');
        return;
    }

    priceState.paginationAPI = initPagination(footer, {
        currentPage: priceState.pagination.currentPage,
        pageSize: priceState.pagination.pageSize,
        totalItems: priceState.filteredItems.length,
        onPageChange: (page, pageSize) => {
            priceState.pagination.currentPage = page;
            priceState.pagination.pageSize = pageSize;
            priceState.priceManagedTable?.setPage(page, pageSize);
        }
    });

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
