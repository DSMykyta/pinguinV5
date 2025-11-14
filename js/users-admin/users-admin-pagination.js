// js/users-admin/users-admin-pagination.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            USERS ADMIN - PAGINATION WRAPPER                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за ініціалізацію та управління пагінацією для таблиці користувачів.
 * Використовує універсальний модуль js/common/ui-pagination.js
 */

import { usersAdminState } from './users-admin-init.js';
import { initPagination } from '../common/ui-pagination.js';
import { renderUsersTable } from './users-admin-manage.js';

/**
 * Ініціалізує пагінацію для таблиці користувачів
 */
export function initPaginationForUsers() {
    const footer = document.querySelector('.fixed-footer');
    if (!footer) {
        console.error('❌ Footer не знайдено для пагінації');
        return;
    }

    const paginationAPI = initPagination(footer, {
        currentPage: usersAdminState.pagination.currentPage,
        pageSize: usersAdminState.pagination.pageSize,
        totalItems: usersAdminState.pagination.totalItems,
        onPageChange: async (page, pageSize) => {
            console.log(`📄 Pagination: сторінка ${page}, розмір ${pageSize}`);

            // Оновити стан пагінації
            usersAdminState.pagination.currentPage = page;
            usersAdminState.pagination.pageSize = pageSize;

            // Перерендерити таблицю
            await renderUsersTable();
        }
    });

    // Зберегти API для подальшого використання
    usersAdminState.paginationAPI = paginationAPI;
    footer._paginationAPI = paginationAPI;

    console.log('✅ Пагінація для Users Admin ініціалізована');
}

/**
 * Оновлює загальну кількість елементів пагінації
 * @param {number} totalItems - Нова загальна кількість
 */
export function updatePaginationTotal(totalItems) {
    usersAdminState.pagination.totalItems = totalItems;

    if (usersAdminState.paginationAPI) {
        usersAdminState.paginationAPI.updateTotalItems(totalItems);
    }
}
