/**
 * MODULE: Banned Words Manage (NEW SYSTEM)
 *
 * ПРИЗНАЧЕННЯ:
 * Новий таб управління забороненими словами з використанням системи шаблонів
 *
 * АРХІТЕКТУРА:
 * - Використовує дані з bannedWordsState (зі старого табу)
 * - Завантажує HTML шаблон з templates/tables/
 * - Застосовує фільтри та сортування
 * - Паралельно зі старим табом (для порівняння)
 */

import { bannedWordsState } from './banned-words-init.js';
import {
    loadTableTemplate,
    populateTable,
    showTableLoading,
    showTableEmpty
} from '../common/ui-table-loader.js';
import { renderBadge, renderSeverityBadge } from '../common/ui-table.js';
import { openBannedWordModal } from './banned-words-manage.js';
import { createColumnSelector } from '../common/ui-column-selector.js';

// Стан нового табу
let newTabState = {
    template: null,
    sortKey: 'local_id',
    sortDirection: 'asc',
    activeFilter: 'all'
};

/**
 * Сортує дані
 */
function sortData(data, key, direction) {
    return [...data].sort((a, b) => {
        let aVal = a[key];
        let bVal = b[key];

        // Для чисел
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Для рядків
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();

        if (direction === 'asc') {
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
            return bVal < aVal ? -1 : bVal > aVal ? 1 : 0;
        }
    });
}

/**
 * Оновлює індикатори сортування
 */
function updateSortIndicators() {
    const container = document.getElementById('banned-words-table-new-container');
    if (!container) return;

    container.querySelectorAll('.sortable-header').forEach(header => {
        header.classList.remove('sorted-asc', 'sorted-desc');
    });

    const activeHeader = container.querySelector(`.sortable-header[data-sort-key="${newTabState.sortKey}"]`);
    if (activeHeader) {
        activeHeader.classList.add(`sorted-${newTabState.sortDirection}`);
    }
}

/**
 * Оновлює лічильники
 */
function updateCounters(pageCount, totalCount) {
    const tabStats = document.getElementById('tab-stats-manage-new');
    if (tabStats) {
        tabStats.textContent = `Показано ${pageCount} з ${totalCount}`;
    }
}

/**
 * Рендер нового табу
 */
export async function renderBannedWordsNewTab() {
    const container = document.getElementById('banned-words-table-new-container');
    if (!container) return;

    showTableLoading(container, 'Завантаження...');

    try {
        // Завантажити шаблон (якщо ще не завантажено)
        if (!newTabState.template) {
            const template = await loadTableTemplate('table-banned-words-new');
            if (!template) {
                showTableEmpty(container, 'Помилка завантаження шаблону');
                return;
            }
            newTabState.template = template;
        }

        // Отримати дані зі state
        let filteredWords = [...bannedWordsState.bannedWords];

        // Застосувати фільтр
        if (newTabState.activeFilter === 'checked') {
            filteredWords = filteredWords.filter(w => w.cheaked_line === 'TRUE' || w.cheaked_line === true);
        } else if (newTabState.activeFilter === 'unchecked') {
            filteredWords = filteredWords.filter(w => w.cheaked_line !== 'TRUE' && w.cheaked_line !== true);
        }

        // Сортувати
        const sortedWords = sortData(filteredWords, newTabState.sortKey, newTabState.sortDirection);

        // Оновити totalItems для пагінації
        const tabPagination = bannedWordsState.tabPaginations['tab-manage-new'];
        if (tabPagination) {
            tabPagination.totalItems = sortedWords.length;
        }

        // Застосувати пагінацію
        const pageSize = tabPagination?.pageSize || 10;
        const currentPage = tabPagination?.currentPage || 1;
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedWords = sortedWords.slice(startIndex, endIndex);

        // Оновити лічильники
        updateCounters(paginatedWords.length, sortedWords.length);

        if (sortedWords.length === 0) {
            showTableEmpty(container, 'Немає даних');
            return;
        }

        // Підготувати дані для шаблону (raw values для render functions)
        const preparedData = paginatedWords.map(word => ({
            local_id: word.local_id || 'N/A',
            group_name_ua: word.group_name_ua || 'Без назви',
            name_uk: word.name_uk || '-',
            name_ru: word.name_ru || '-',
            banned_type: word.banned_type || 'не вказано',
            severity: word.severity || '',
            cheaked_line: word.cheaked_line,
            _originalWord: word  // Зберігаємо оригінальний об'єкт для edit кнопки
        }));

        // Заповнити таблицю
        populateTable(container, newTabState.template, preparedData, {
            onRowClick: null,  // Модал відкривається тільки через edit кнопку
            clearExisting: true,
            renderFunctions: {
                severity: (value) => renderSeverityBadge(value),
                checked: (value, rowData) => renderBadge(value, 'checked', {
                    clickable: true,
                    id: rowData.local_id
                })
            }
        });

        // Оновити індикатори сортування
        updateSortIndicators();

        // Додати event delegation для edit кнопок
        container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const wordId = btn.dataset.rowId;
                const word = bannedWordsState.bannedWords.find(w => w.local_id === wordId);
                if (word) {
                    openBannedWordModal(word);
                }
            });
        });

        console.log(`✅ NEW Tab rendered: ${preparedData.length} rows`);

    } catch (error) {
        console.error('❌ Error rendering NEW tab:', error);
        showTableEmpty(container, 'Помилка завантаження');
    }
}

/**
 * Обробник сортування
 */
function handleSort(sortKey) {
    if (newTabState.sortKey === sortKey) {
        newTabState.sortDirection = newTabState.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        newTabState.sortKey = sortKey;
        newTabState.sortDirection = 'asc';
    }
    renderBannedWordsNewTab();
}

/**
 * Обробник фільтрів
 */
function handleFilter(filter) {
    newTabState.activeFilter = filter;

    // Оновити активну кнопку
    const buttons = document.querySelectorAll('[data-tab-id="tab-manage-new"][data-filter]');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    renderBannedWordsNewTab();
}

/**
 * Ініціалізація нового табу
 */
export function initBannedWordsNewTab() {
    console.log('🔧 Initializing NEW tab...');

    // Зареєструвати пагінацію для нового табу
    bannedWordsState.tabPaginations['tab-manage-new'] = {
        currentPage: 1,
        pageSize: 10,
        totalItems: bannedWordsState.bannedWords.length,
        renderFn: renderBannedWordsNewTab
    };
    console.log('✅ tab-manage-new зареєстровано в tabPaginations');

    const container = document.getElementById('banned-words-table-new-container');
    if (!container) {
        console.error('❌ NEW tab container not found');
        return;
    }

    // Сортування
    container.querySelectorAll('.sortable-header').forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sortKey;
            if (sortKey) handleSort(sortKey);
        });
    });

    // Фільтри
    const filterButtons = document.querySelectorAll('[data-tab-id="tab-manage-new"][data-filter]');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            handleFilter(btn.dataset.filter);
        });
    });

    // Кнопка оновлення
    const refreshBtn = document.getElementById('refresh-tab-manage-new');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('🔄 Refreshing NEW tab...');
            renderBannedWordsNewTab();
        });
    }

    // Ініціалізувати селектор колонок
    const tableColumns = [
        { id: 'local_id', label: 'ID', enabled: true },
        { id: 'group_name_ua', label: 'Назва групи', enabled: true },
        { id: 'name_uk', label: 'Слова UA', enabled: true },
        { id: 'name_ru', label: 'Слова RU', enabled: true },
        { id: 'banned_type', label: 'Тип', enabled: true },
        { id: 'severity', label: 'Severity', enabled: true },
        { id: 'cheaked_line', label: 'Перевірено', enabled: true }
    ];

    createColumnSelector('table-columns-list-new', tableColumns, {
        checkboxPrefix: 'table-col-new',
        onChange: async (selectedIds) => {
            console.log('📋 Видимі колонки (NEW):', selectedIds);
            // TODO: Implement column hiding logic
        }
    });

    // Початковий рендер
    renderBannedWordsNewTab();
}
