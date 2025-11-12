// js/common/ui-pagination-tabs.js
// Система пагінації з підтримкою множинних табів

/**
 * Ініціалізувати пагінацію для множинних табів
 * @param {HTMLElement} footerElement - Footer елемент з пагінацією
 * @param {Object} options - Опції
 * @param {Function} options.onPageChange - Callback при зміні сторінки (tabId, page, pageSize)
 * @param {Function} options.getActiveTab - Функція що повертає ID активного табу
 * @returns {Object} API для керування пагінацією табів
 * @example
 * const paginationAPI = initMultiTabPagination(footer, {
 *   onPageChange: (tabId, page, pageSize) => {
 *     console.log(`Tab ${tabId}: page ${page}, size ${pageSize}`);
 *   },
 *   getActiveTab: () => document.querySelector('.tab-button.active')?.dataset.tabTarget
 * });
 *
 * // Зареєструвати таб
 * paginationAPI.registerTab('tab-1', {
 *   totalItems: 100,
 *   renderFn: () => renderMyTable()
 * });
 */
export function initMultiTabPagination(footerElement, options) {
    const {
        onPageChange,
        getActiveTab
    } = options;

    // Зберігаємо пагінацію для кожного табу
    const tabPaginations = {};

    /**
     * Зареєструвати пагінацію для табу
     */
    function registerTab(tabId, config) {
        const {
            currentPage = 1,
            pageSize = 10,
            totalItems = 0,
            renderFn = null
        } = config;

        tabPaginations[tabId] = {
            currentPage,
            pageSize,
            totalItems,
            renderFn
        };

        console.log(`📋 Registered pagination for tab: ${tabId}`, tabPaginations[tabId]);

        // Якщо це активний таб - оновити footer
        if (getActiveTab() === tabId) {
            updateFooterUI(tabId);
        }

        return tabPaginations[tabId];
    }

    /**
     * Оновити пагінацію табу
     */
    function updateTab(tabId, updates) {
        if (!tabPaginations[tabId]) {
            console.warn(`Tab pagination not found: ${tabId}`);
            return false;
        }

        Object.assign(tabPaginations[tabId], updates);

        // Якщо це активний таб - оновити footer
        if (getActiveTab() === tabId) {
            updateFooterUI(tabId);
        }

        return true;
    }

    /**
     * Відновити пагінацію табу (при перемиканні)
     */
    function restoreTab(tabId) {
        const pagination = tabPaginations[tabId];

        if (!pagination) {
            console.warn(`Cannot restore pagination for tab: ${tabId}`);
            return false;
        }

        updateFooterUI(tabId);

        console.log(`🔄 Restored pagination for tab: ${tabId}`, pagination);
        return true;
    }

    /**
     * Видалити пагінацію табу
     */
    function removeTab(tabId) {
        if (tabPaginations[tabId]) {
            delete tabPaginations[tabId];
            console.log(`🗑️ Removed pagination for tab: ${tabId}`);
            return true;
        }
        return false;
    }

    /**
     * Отримати пагінацію поточного табу
     */
    function getCurrentTabPagination() {
        const activeTabId = getActiveTab();
        return activeTabId ? tabPaginations[activeTabId] : null;
    }

    /**
     * Змінити сторінку для поточного табу
     */
    async function changePage(newPage) {
        const activeTabId = getActiveTab();
        if (!activeTabId || !tabPaginations[activeTabId]) return false;

        const pagination = tabPaginations[activeTabId];
        pagination.currentPage = newPage;

        // Оновити footer
        updateFooterUI(activeTabId);

        // Викликати callback
        if (onPageChange) {
            await onPageChange(activeTabId, newPage, pagination.pageSize);
        }

        // Викликати renderFn якщо є
        if (pagination.renderFn) {
            await pagination.renderFn();
        }

        return true;
    }

    /**
     * Змінити розмір сторінки для поточного табу
     */
    async function changePageSize(newPageSize) {
        const activeTabId = getActiveTab();
        if (!activeTabId || !tabPaginations[activeTabId]) return false;

        const pagination = tabPaginations[activeTabId];
        pagination.pageSize = newPageSize;
        pagination.currentPage = 1; // Скинути на першу сторінку

        // Оновити footer
        updateFooterUI(activeTabId);

        // Викликати callback
        if (onPageChange) {
            await onPageChange(activeTabId, 1, newPageSize);
        }

        // Викликати renderFn якщо є
        if (pagination.renderFn) {
            await pagination.renderFn();
        }

        return true;
    }

    /**
     * Оновити UI footer для табу
     */
    function updateFooterUI(tabId) {
        const pagination = tabPaginations[tabId];
        if (!pagination) return;

        // Отримати API пагінації з footer (якщо є)
        if (footerElement && footerElement._paginationAPI) {
            footerElement._paginationAPI.update({
                currentPage: pagination.currentPage,
                pageSize: pagination.pageSize,
                totalItems: pagination.totalItems
            });
        }
    }

    // Підключитись до подій пагінації footer
    if (footerElement && footerElement._paginationAPI) {
        const originalOnPageChange = footerElement._paginationAPI.onPageChange;
        const originalOnPageSizeChange = footerElement._paginationAPI.onPageSizeChange;

        // Перехопити зміну сторінки
        footerElement._paginationAPI.onPageChange = async (newPage) => {
            await changePage(newPage);
        };

        // Перехопити зміну розміру
        footerElement._paginationAPI.onPageSizeChange = async (newPageSize) => {
            await changePageSize(newPageSize);
        };
    }

    // Повернути API
    return {
        registerTab,
        updateTab,
        restoreTab,
        removeTab,
        getCurrentTabPagination,
        changePage,
        changePageSize,
        tabPaginations // Доступ до всіх пагінацій
    };
}

/**
 * Обчислити індекси для пагінації
 * @param {number} currentPage - Поточна сторінка
 * @param {number} pageSize - Розмір сторінки
 * @param {number} totalItems - Загальна кількість елементів
 * @returns {Object} {startIndex, endIndex, totalPages}
 * @example
 * const {startIndex, endIndex} = calculatePaginationIndexes(2, 10, 100);
 * // startIndex: 10, endIndex: 20
 */
export function calculatePaginationIndexes(currentPage, pageSize, totalItems) {
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    return {
        startIndex,
        endIndex,
        totalPages,
        isFirstPage: currentPage === 1,
        isLastPage: currentPage === totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1
    };
}

/**
 * Застосувати пагінацію до масиву даних
 * @param {Array} data - Масив даних
 * @param {number} currentPage - Поточна сторінка
 * @param {number} pageSize - Розмір сторінки
 * @returns {Array} Зріз даних для поточної сторінки
 * @example
 * const pageData = applyPagination(allData, 2, 10);
 * // Повертає елементи з 10 по 20
 */
export function applyPagination(data, currentPage, pageSize) {
    const { startIndex, endIndex } = calculatePaginationIndexes(
        currentPage,
        pageSize,
        data.length
    );

    return data.slice(startIndex, endIndex);
}
