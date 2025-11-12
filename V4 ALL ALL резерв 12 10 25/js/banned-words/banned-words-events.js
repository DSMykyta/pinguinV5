// js/banned-words/banned-words-events.js
// Обробники подій для Banned Words

import { bannedWordsState } from './banned-words-init.js';
import { initTableSorting } from '../common/ui-table-sort.js';

/**
 * Ініціалізація всіх обробників подій
 */
export function initBannedWordsEvents() {
    // Слухаємо кліки на чекбоксах
    initCheckboxEvents();

    // Слухаємо кліки на кнопках статусу
    initStatusToggleEvents();

    // Слухаємо кнопку масової зміни статусу (опціонально)
    // initBulkActionButton();

    // Слухаємо зміни фільтрів
    initFilterEvents();

    // Слухаємо сортування
    initSortingEvents();

    console.log('✅ Обробники подій Banned Words ініціалізовано');
}

/**
 * Обробка чекбоксів (вибір рядків)
 */
function initCheckboxEvents() {
    const contentContainer = document.getElementById('tab-content-container');
    if (!contentContainer) return;

    // Делегування подій для чекбоксів рядків
    contentContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('row-checkbox')) {
            const productId = e.target.dataset.id;

            if (e.target.checked) {
                bannedWordsState.selectedIds.add(productId);
            } else {
                bannedWordsState.selectedIds.delete(productId);
            }

            // updateBulkActionButton(); // відключено
            updateHeaderCheckbox();
        }
    });

    // Header checkbox (select all)
    contentContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('header-select-all')) {
            const isChecked = e.target.checked;
            const checkboxes = contentContainer.querySelectorAll('.row-checkbox');

            checkboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
                const productId = checkbox.dataset.id;

                if (isChecked) {
                    bannedWordsState.selectedIds.add(productId);
                } else {
                    bannedWordsState.selectedIds.delete(productId);
                }
            });

            // updateBulkActionButton(); // відключено
        }
    });
}

/**
 * Оновити стан header checkbox (select all)
 */
function updateHeaderCheckbox() {
    const headerCheckbox = document.querySelector('.header-select-all');
    if (!headerCheckbox) return;

    const allCheckboxes = document.querySelectorAll('.row-checkbox');
    const checkedCheckboxes = document.querySelectorAll('.row-checkbox:checked');

    if (allCheckboxes.length === 0) {
        headerCheckbox.checked = false;
        headerCheckbox.indeterminate = false;
    } else if (checkedCheckboxes.length === 0) {
        headerCheckbox.checked = false;
        headerCheckbox.indeterminate = false;
    } else if (checkedCheckboxes.length === allCheckboxes.length) {
        headerCheckbox.checked = true;
        headerCheckbox.indeterminate = false;
    } else {
        headerCheckbox.checked = false;
        headerCheckbox.indeterminate = true;
    }
}

/**
 * Обробка кнопок зміни статусу
 */
function initStatusToggleEvents() {
    const contentContainer = document.getElementById('tab-content-container');
    if (!contentContainer) return;

    contentContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.status-toggle');
        if (!button) return;

        const productId = button.dataset.id;
        const currentStatus = button.dataset.status === 'true';
        const newStatus = !currentStatus;

        // Оновлюємо статус
        updateProductStatus(productId, newStatus);

        // Оновлюємо UI кнопки
        button.dataset.status = newStatus;
        button.className = `status-toggle ${newStatus ? 'status-true' : 'status-false'}`;
        button.textContent = newStatus ? 'TRUE' : 'FALSE';

        // Перерендерюємо таблицю (щоб статистика оновилась)
        renderTable(bannedWordsState.currentSheet);
    });
}

/**
 * Обробка фільтрів
 */
function initFilterEvents() {
    // Фільтр за статусом
    const statusFilter = document.getElementById('filter-status');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            bannedWordsState.filters.status = e.target.value;
            renderTable(bannedWordsState.currentSheet);
            console.log(`🔍 Фільтр статус: ${e.target.value}`);
        });
    }

    // Фільтр за полем
    const fieldFilter = document.getElementById('filter-field');
    if (fieldFilter) {
        fieldFilter.addEventListener('change', (e) => {
            bannedWordsState.filters.field = e.target.value;
            renderTable(bannedWordsState.currentSheet);
            console.log(`🔍 Фільтр поле: ${e.target.value}`);
        });
    }

    // Пошук за забороненим словом
    const bannedWordSearch = document.getElementById('search-banned-word');
    if (bannedWordSearch) {
        bannedWordSearch.addEventListener('input', (e) => {
            bannedWordsState.filters.bannedWord = e.target.value.toLowerCase();
            renderTable(bannedWordsState.currentSheet);
        });
    }

    // Пошук за ID/назвою товару
    const productSearch = document.getElementById('search-product');
    if (productSearch) {
        productSearch.addEventListener('input', (e) => {
            bannedWordsState.filters.productSearch = e.target.value.toLowerCase();
            renderTable(bannedWordsState.currentSheet);
        });
    }
}

/**
 * Обробка сортування
 */
function initSortingEvents() {
    const contentContainer = document.getElementById('tab-content-container');
    if (!contentContainer) return;

    contentContainer.addEventListener('click', (e) => {
        const header = e.target.closest('.sortable-header');
        if (!header) return;

        const sortKey = header.dataset.sortKey;
        if (!sortKey) return;

        // Оновлюємо стан сортування для поточного аркуша
        const currentSheet = bannedWordsState.currentSheet;

        if (!bannedWordsState.pagination[currentSheet]) {
            bannedWordsState.pagination[currentSheet] = {
                currentPage: 1,
                pageSize: 25
            };
        }

        const pagination = bannedWordsState.pagination[currentSheet];

        // Перемикаємо напрямок сортування
        if (pagination.sortKey === sortKey) {
            pagination.sortDirection = pagination.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            pagination.sortKey = sortKey;
            pagination.sortDirection = 'asc';
        }

        // Оновлюємо індикатори сортування
        updateSortIndicators(sortKey, pagination.sortDirection);

        // Сортуємо результати
        sortResults(sortKey, pagination.sortDirection);

        // Перерендерюємо таблицю
        renderTable(currentSheet);

        console.log(`↕️ Сортування: ${sortKey} ${pagination.sortDirection}`);
    });
}

/**
 * Оновити індикатори сортування в заголовках
 */
function updateSortIndicators(activeSortKey, direction) {
    const headers = document.querySelectorAll('.sortable-header');

    headers.forEach(header => {
        const indicator = header.querySelector('.sort-indicator');
        if (!indicator) return;

        const sortKey = header.dataset.sortKey;

        if (sortKey === activeSortKey) {
            indicator.textContent = direction === 'asc' ? '▲' : '▼';
            indicator.style.opacity = '1';
        } else {
            indicator.textContent = '';
            indicator.style.opacity = '0';
        }
    });
}

/**
 * Сортувати результати
 */
function sortResults(sortKey, direction) {
    const currentSheet = bannedWordsState.currentSheet;

    // Отримуємо результати для поточного аркуша
    const results = bannedWordsState.checkedResults.filter(r => r._sheetName === currentSheet);

    results.sort((a, b) => {
        let valueA, valueB;

        switch (sortKey) {
            case 'id':
                valueA = a.id;
                valueB = b.id;
                break;
            case 'titleRos':
                valueA = a.titleRos.toLowerCase();
                valueB = b.titleRos.toLowerCase();
                break;
            case 'status':
                valueA = a.status ? 1 : 0;
                valueB = b.status ? 1 : 0;
                break;
            default:
                return 0;
        }

        if (valueA < valueB) return direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Оновлюємо порядок в глобальному масиві
    bannedWordsState.checkedResults = [
        ...results,
        ...bannedWordsState.checkedResults.filter(r => r._sheetName !== currentSheet)
    ];
}

// initRefreshButton видалено - тепер функція в banned-words-init.js

/**
 * Ініціалізація сортування для таблиці заборонених слів (tab-manage)
 */
export function initBannedWordsSorting() {
    const container = document.getElementById('banned-words-table-container');
    if (!container) {
        console.warn('⚠️ banned-words-table-container не знайдено');
        return null;
    }

    const sortAPI = initTableSorting(container, {
        dataSource: () => bannedWordsState.bannedWords,
        onSort: async (sortedData) => {
            // Оновити масив заборонених слів
            bannedWordsState.bannedWords = sortedData;

            // Перерендерити таблицю
            const { renderBannedWordsTable } = await import('./banned-words-manage.js');
            await renderBannedWordsTable();

            // ВАЖЛИВО: Відновити візуальні індикатори після рендерингу
            const sortState = sortAPI.getState();
            if (sortState.column && sortState.direction) {
                const { updateSortIndicators } = await import('../common/ui-table-sort.js');
                updateSortIndicators(container, sortState.column, sortState.direction);
            }
        },
        columnTypes: {
            local_id: 'id-number',
            name_uk: 'string',
            name_ru: 'string',
            banned_type: 'string',
            banned_explaine: 'string',
            banned_hint: 'string',
            cheaked_line: 'boolean'
        }
    });

    console.log('✅ Сортування заборонених слів (tab-manage) ініціалізовано');
    return sortAPI;
}

/**
 * Ініціалізація сортування для check tabs
 * @param {string} tabId - ID табу (check-SheetName-word-column)
 */
export function initCheckTabSorting(tabId) {
    const container = document.getElementById(`check-results-${tabId}`);
    if (!container) {
        console.warn(`⚠️ check-results-${tabId} не знайдено`);
        return null;
    }

    const sortAPI = initTableSorting(container, {
        dataSource: () => bannedWordsState.bannedWords,
        onSort: async (sortedData) => {
            // Оновити результати перевірки
            bannedWordsState.checkResults = sortedData;

            // Знайти заборонене слово
            const bannedWord = bannedWordsState.bannedWords.find(w => w.local_id === bannedWordsState.selectedWord);

            // Перерендерити таблицю результатів (тепер експортована функція)
            const { renderCheckResults } = await import('./banned-words-check.js');
            await renderCheckResults(bannedWordsState.selectedSheet, bannedWord);

            // ВАЖЛИВО: Відновити візуальні індикатори після рендерингу
            const sortState = sortAPI.getState();
            if (sortState.column && sortState.direction) {
                const { updateSortIndicators } = await import('../common/ui-table-sort.js');
                updateSortIndicators(container, sortState.column, sortState.direction);
            }
        },
        columnTypes: {
            local_id: 'id-number',
            severity: 'string', // ДОДАНО
            group_name_ua: 'string', // ДОДАНО
            name_uk: 'string',
            name_ru: 'string',
            banned_type: 'string',
            banned_explaine: 'string',
            banned_hint: 'string',
            cheaked_line: 'boolean'
        }
    });

    console.log('✅ Сортування заборонених слів (tab-manage) ініціалізовано');
    return sortAPI;
}
