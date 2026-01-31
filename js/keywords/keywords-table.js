// js/keywords/keywords-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - TABLE RENDERING                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Використовує універсальний createPseudoTable API для рендерингу таблиці.
 */

import { getKeywords } from './keywords-data.js';
import { keywordsState } from './keywords-init.js';
import { createPseudoTable } from '../common/ui-table.js';
import { escapeHtml } from '../utils/text-utils.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../common/ui-actions.js';

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ОБРОБНИКІВ ДІЙ
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('keywords', {
    edit: async (rowId) => {
        const { showEditKeywordModal } = await import('./keywords-crud.js');
        await showEditKeywordModal(rowId);
    },
    view: async (rowId) => {
        const { showGlossaryModal } = await import('./keywords-crud.js');
        await showGlossaryModal(rowId);
    }
});

// Прапорець для запобігання рекурсивного виклику
let isRendering = false;

// Table API instance
let tableAPI = null;

// Мапа типів параметрів для відображення
const PARAM_TYPE_LABELS = {
    'category': 'Категорія',
    'characteristic': 'Характеристика',
    'option': 'Опція',
    'marketing': 'Маркетинг',
    'other': 'Інше'
};

/**
 * Отримати конфігурацію колонок для таблиці ключових слів
 */
export function getColumns() {
    return [
        {
            id: 'local_id',
            label: 'ID',
            className: 'cell-id',
            sortable: true,
            searchable: true,
            render: (value) => `<span class="word-chip">${escapeHtml(value || '')}</span>`
        },
        {
            id: 'param_type',
            label: 'Тип',
            className: 'cell-type',
            sortable: true,
            searchable: true,
            filterable: true,
            filterType: 'values',
            render: (value) => {
                if (!value) return '<span class="text-muted">—</span>';
                const label = PARAM_TYPE_LABELS[value] || value;
                return `<span>${escapeHtml(label)}</span>`;
            }
        },
        {
            id: 'name_uk',
            label: 'Назва',
            sortable: true,
            searchable: true,
            className: 'cell-main-name',
            render: (value) => `<strong>${escapeHtml(value || '')}</strong>`
        },
        {
            id: 'trigers',
            label: 'Тригери',
            className: 'cell-triggers',
            sortable: true,
            searchable: true,
            render: (value) => {
                if (!value) return '<span class="text-muted">—</span>';
                const triggers = value.split(',').map(t => t.trim()).filter(Boolean);

                if (triggers.length === 0) return '<span class="text-muted">—</span>';

                // Показувати тільки перший тригер + "+N" якщо є більше
                const firstTrigger = `<span class="word-chip primary">${escapeHtml(triggers[0])}</span>`;
                const hiddenCount = triggers.length - 1;

                let chipsHtml = firstTrigger;
                if (hiddenCount > 0) {
                    chipsHtml += ` <span class="word-chip neutral">+${hiddenCount}</span>`;
                }

                return `<div class="cell-words-list">${chipsHtml}</div>`;
            }
        }
    ];
}

/**
 * Ініціалізувати таблицю (викликається один раз)
 */
function initTableAPI() {
    const container = document.getElementById('keywords-table-container');
    if (!container || tableAPI) return;

    const visibleCols = keywordsState.visibleColumns.length > 0
        ? keywordsState.visibleColumns
        : ['local_id', 'param_type', 'name_uk', 'trigers'];

    tableAPI = createPseudoTable(container, {
        columns: getColumns(),
        visibleColumns: visibleCols,
        rowActionsHeader: ' ',
        rowActionsCustom: (row) => {
            const hasGlossary = row.glossary_text && row.glossary_text.trim();
            const extraClass = hasGlossary ? 'severity-low' : 'severity-high';

            return `
                ${actionButton({ action: 'view', rowId: row.local_id, context: 'keywords', extraClass, title: 'Переглянути глосарій' })}
                ${actionButton({ action: 'edit', rowId: row.local_id, context: 'keywords' })}
            `;
        },
        getRowId: (row) => row.local_id,
        emptyState: {
            icon: 'key',
            message: 'Ключові слова не знайдено'
        },
        withContainer: false,
        onAfterRender: (container) => initActionHandlers(container, 'keywords')
    });

    // Зберігаємо в state для доступу з інших модулів
    keywordsState.tableAPI = tableAPI;
}

/**
 * Отримати відфільтровані та пагіновані дані
 */
function getFilteredPaginatedData() {
    const keywords = getKeywords();
    const filteredKeywords = applyFilters(keywords);

    const { currentPage, pageSize } = keywordsState.pagination;
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, filteredKeywords.length);

    return {
        all: keywords,
        filtered: filteredKeywords,
        paginated: filteredKeywords.slice(start, end)
    };
}

/**
 * Оновити тільки рядки таблиці (заголовок залишається)
 * Використовується при фільтрації/сортуванні/пагінації/пошуку
 */
export function renderKeywordsTableRowsOnly() {
    if (!tableAPI) {
        // Якщо API ще не створено - робимо повний рендер
        renderKeywordsTable();
        return;
    }

    const { all, filtered, paginated } = getFilteredPaginatedData();

    // Оновлюємо пагінацію
    if (keywordsState.paginationAPI) {
        keywordsState.paginationAPI.update({
            currentPage: keywordsState.pagination.currentPage,
            pageSize: keywordsState.pagination.pageSize,
            totalItems: filtered.length
        });
    }

    // Оновлюємо тільки рядки
    tableAPI.updateRows(paginated);

    updateStats(filtered.length, all.length);
}

/**
 * Повний рендеринг таблиці (заголовок + рядки)
 * Використовується при початковому завантаженні та refresh
 */
export function renderKeywordsTable() {
    // Запобігаємо рекурсивному виклику
    if (isRendering) return;
    isRendering = true;

    console.log('🎨 Рендеринг таблиці ключових слів...');

    const container = document.getElementById('keywords-table-container');
    if (!container) {
        isRendering = false;
        return;
    }

    // Ініціалізуємо API якщо потрібно
    if (!tableAPI) {
        initTableAPI();
    }

    const { all, filtered, paginated } = getFilteredPaginatedData();

    if (!all || all.length === 0) {
        renderEmptyState();
        isRendering = false;
        return;
    }

    // Оновлюємо пагінацію
    if (keywordsState.paginationAPI) {
        keywordsState.paginationAPI.update({
            currentPage: keywordsState.pagination.currentPage,
            pageSize: keywordsState.pagination.pageSize,
            totalItems: filtered.length
        });
    }

    // Повний рендер таблиці
    tableAPI.render(paginated);

    updateStats(filtered.length, all.length);

    console.log(`✅ Відрендерено ${paginated.length} з ${filtered.length} ключових слів`);

    isRendering = false;
}

/**
 * Застосувати фільтри до даних
 */
function applyFilters(keywords) {
    let filtered = [...keywords];

    // Застосувати фільтр типів з кнопок header
    if (keywordsState.paramTypeFilter && keywordsState.paramTypeFilter !== 'all') {
        filtered = filtered.filter(entry => entry.param_type === keywordsState.paramTypeFilter);
    }

    // Застосувати фільтри по колонках (з dropdown в заголовках)
    if (keywordsState.columnFilters && Object.keys(keywordsState.columnFilters).length > 0) {
        filtered = filtered.filter(item => {
            for (const [columnId, allowedValues] of Object.entries(keywordsState.columnFilters)) {
                const itemValue = item[columnId];
                const allowedSet = new Set(allowedValues);

                const normalizedValue = itemValue ? itemValue.toString().trim() : '';

                if (normalizedValue) {
                    if (!allowedSet.has(normalizedValue)) {
                        return false;
                    }
                } else {
                    if (!allowedSet.has('__empty__')) {
                        return false;
                    }
                }
            }
            return true;
        });
    }

    // Застосувати пошук
    if (keywordsState.searchQuery) {
        const query = keywordsState.searchQuery.toLowerCase();
        const columns = keywordsState.searchColumns || ['local_id', 'name_uk', 'param_type', 'trigers'];

        filtered = filtered.filter(entry => {
            return columns.some(column => {
                const value = entry[column];
                return value?.toString().toLowerCase().includes(query);
            });
        });
    }

    return filtered;
}

/**
 * Показати порожній стан
 */
function renderEmptyState() {
    const container = document.getElementById('keywords-table-container');
    if (!container) return;

    import('../utils/avatar-states.js').then(({ renderAvatarState }) => {
        container.innerHTML = renderAvatarState('empty', {
            size: 'medium',
            containerClass: 'empty-state-container',
            avatarClass: 'empty-state-avatar',
            messageClass: 'avatar-state-message',
            showMessage: true
        });
    });

    updateStats(0, 0);
}

/**
 * Оновити статистику
 */
function updateStats(visible, total) {
    const statsEl = document.getElementById('tab-stats-keywords');
    if (!statsEl) return;

    statsEl.textContent = `Показано ${visible} з ${total}`;
}

/**
 * Скинути tableAPI (для реініціалізації)
 */
export function resetTableAPI() {
    tableAPI = null;
    keywordsState.tableAPI = null;
}
