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

    // ПРИМІТКА: Сортування ініціалізується окремо через initBannedWordsSorting() та initCheckTabSorting()
    // ПРИМІТКА: Фільтри і пошук обробляються в banned-words-aside.js

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

// Старі функції (initStatusToggleEvents, initFilterEvents, initSortingEvents) видалені
// - Фільтрація і пошук тепер обробляються в banned-words-aside.js
// - Сортування тепер обробляється через ui-table-sort.js

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
        dataSource: () => bannedWordsState.checkResults,
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

    console.log(`✅ Сортування для check tab ${tabId} ініціалізовано`);
    return sortAPI;
}
