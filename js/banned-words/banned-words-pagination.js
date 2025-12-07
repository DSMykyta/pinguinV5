// js/banned-words/banned-words-pagination.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                BANNED WORDS - PAGINATION MANAGEMENT                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за:
 * - Ініціалізацію пагінації для табів
 * - Збереження стану пагінації для кожного табу
 * - Обробку зміни сторінок
 */

import { bannedWordsState } from './banned-words-init.js';
import { initPagination } from '../common/ui-pagination.js';

/**
 * Ініціалізувати пагінацію для banned words
 * Створює єдину пагінацію яка працює з різними табами
 */
export function initPaginationForBannedWords() {
    const footer = document.querySelector('.fixed-footer');
    if (!footer) return;

    // Зареєструвати tab-manage в tabPaginations
    bannedWordsState.tabPaginations['tab-manage'] = {
        currentPage: 1,
        pageSize: 10,
        totalItems: bannedWordsState.bannedWords.length,
        renderFn: async () => {
            const { renderBannedWordsTable } = await import('./banned-words-manage.js');
            await renderBannedWordsTable();
        }
    };
    console.log('✅ tab-manage зареєстровано в tabPaginations');

    const paginationAPI = initPagination(footer, {
        currentPage: bannedWordsState.tabPaginations['tab-manage'].currentPage,
        pageSize: bannedWordsState.tabPaginations['tab-manage'].pageSize,
        totalItems: bannedWordsState.tabPaginations['tab-manage'].totalItems,
        onPageChange: async (page, pageSize) => {
            console.log(`📄 Pagination: сторінка ${page}, розмір ${pageSize}`);

            // 1. Знайти активний таб
            const activeTab = document.querySelector('.tab-content.active');
            const tabId = activeTab ? activeTab.dataset.tabContent : 'tab-manage';

            if (!activeTab) {
                console.warn('⚠️ Не знайдено активного табу, використовую tab-manage за замовчуванням');
            } else {
                console.log(`🎯 Активний таб: ${tabId}`);
            }

            // 2. Отримати пагінацію для цього табу
            const tabPagination = bannedWordsState.tabPaginations[tabId];
            if (!tabPagination) {
                console.warn(`⚠️ Не знайдено пагінації для табу ${tabId}`);
                return;
            }

            // 3. Оновити стан пагінації для цього табу
            tabPagination.currentPage = page;
            tabPagination.pageSize = pageSize;

            // Зберегти стан пагінації в localStorage
            if (tabId !== 'tab-manage') {
                const { updateTabState } = await import('./banned-words-state-persistence.js');
                updateTabState(tabId, { currentPage: page, pageSize: pageSize });
            }

            // 4. Викликати функцію рендерингу для цього табу
            if (tabPagination.renderFn) {
                console.log(`🔄 Виклик renderFn для табу ${tabId}`);
                await tabPagination.renderFn();
            } else {
                console.warn(`⚠️ Не знайдено renderFn для табу ${tabId}`);
            }
        }
    });

    // Зберегти API для оновлення
    bannedWordsState.paginationAPI = paginationAPI;
    footer._paginationAPI = paginationAPI;
}

/**
 * Зареєструвати пагінацію для check табу
 * @param {string} tabId - ID табу
 * @param {number} totalItems - Загальна кількість елементів
 * @param {Function} renderFn - Функція рендерингу
 */
export function registerCheckTabPagination(tabId, totalItems, renderFn) {
    // Зберегти існуючу пагінацію якщо є (щоб не скидати currentPage)
    const existing = bannedWordsState.tabPaginations[tabId];

    bannedWordsState.tabPaginations[tabId] = {
        currentPage: existing?.currentPage || 1,
        pageSize: existing?.pageSize || 10,
        totalItems: totalItems,
        renderFn: renderFn
    };
    console.log(`✅ Пагінація для ${tabId} зареєстрована (${totalItems} елементів, сторінка ${bannedWordsState.tabPaginations[tabId].currentPage})`);
}
