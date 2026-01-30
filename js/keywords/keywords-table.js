// js/keywords/keywords-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - TABLE RENDERING                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getKeywords } from './keywords-data.js';
import { keywordsState } from './keywords-init.js';
import { renderPseudoTable } from '../common/ui-table.js';
import { escapeHtml } from '../utils/text-utils.js';
import { renderAvatarState } from '../utils/avatar-states.js';

// Прапорець для запобігання рекурсивного виклику
let isRendering = false;

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
 * Генерувати HTML для одного рядка
 */
function generateKeywordRowHTML(row, rowId) {
    const columns = getColumns();
    const visibleCols = keywordsState.visibleColumns.length > 0
        ? keywordsState.visibleColumns
        : ['local_id', 'param_type', 'name_uk', 'trigers'];

    const isColumnVisible = (columnId) => visibleCols.includes(columnId);
    const hiddenClass = (columnId) => isColumnVisible(columnId) ? '' : ' column-hidden';

    const hasGlossary = row.glossary_text && row.glossary_text.trim();
    const eyeClass = hasGlossary ? 'severity-low' : 'severity-high';

    return `
        <div class="pseudo-table-row" data-row-id="${rowId}">
            <div class="pseudo-table-cell cell-actions">
                <button class="btn-icon btn-view-glossary ${eyeClass}" data-keyword-id="${escapeHtml(row.local_id)}" title="Переглянути глосарій">
                    <span class="material-symbols-outlined">visibility</span>
                </button>
                <button class="btn-icon btn-edit" data-keyword-id="${escapeHtml(row.local_id)}" title="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            </div>
            ${columns.map(col => {
                const value = row[col.id];
                const cellClass = col.className || '';
                const tooltipAttr = col.tooltip !== false && value ?
                    `data-tooltip="${escapeHtml(value)}"` : '';

                let cellContent;
                if (col.render && typeof col.render === 'function') {
                    cellContent = col.render(value, row);
                } else {
                    cellContent = escapeHtml(value || '-');
                }

                return `
                    <div class="pseudo-table-cell ${cellClass}${hiddenClass(col.id)}"
                         data-column="${col.id}"
                         ${tooltipAttr}>
                        ${cellContent}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Перерендерити ТІЛЬКИ рядки таблиці (без заголовка)
 * Викликається при фільтрації/сортуванні щоб не знищувати dropdown-и в заголовках
 */
export function renderKeywordsTableRowsOnly() {
    const container = document.getElementById('keywords-table-container');
    if (!container) return;

    const keywords = getKeywords();
    const filteredKeywords = applyFilters(keywords);

    // Видаляємо тільки рядки (не заголовок!)
    container.querySelectorAll('.pseudo-table-row').forEach(row => row.remove());

    // Якщо немає даних - залишаємо порожню таблицю з заголовками
    if (!filteredKeywords || filteredKeywords.length === 0) {
        updateStats(0, keywords.length);
        return;
    }

    // Отримуємо пагіновані дані
    const { currentPage, pageSize } = keywordsState.pagination;
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, filteredKeywords.length);
    const paginatedKeywords = filteredKeywords.slice(start, end);

    // Оновлюємо пагінацію
    if (keywordsState.paginationAPI) {
        keywordsState.paginationAPI.update({
            currentPage,
            pageSize,
            totalItems: filteredKeywords.length
        });
    }

    // Генеруємо нові рядки
    const rowsHTML = paginatedKeywords.map((row, rowIndex) => {
        const rowId = row.id || row.local_id || rowIndex;
        return generateKeywordRowHTML(row, rowId);
    }).join('');

    // Вставляємо після заголовка
    const header = container.querySelector('.pseudo-table-header');
    if (header) {
        header.insertAdjacentHTML('afterend', rowsHTML);
    }

    // Додаємо обробники подій для нових кнопок
    attachRowEventHandlers(container);

    updateStats(filteredKeywords.length, keywords.length);
}

/**
 * Додати обробники подій для кнопок у рядках
 */
function attachRowEventHandlers(container) {
    // Обробник кнопки редагування
    container.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const keywordId = button.dataset.keywordId;
            if (keywordId) {
                const { showEditKeywordModal } = await import('./keywords-crud.js');
                await showEditKeywordModal(keywordId);
            }
        });
    });

    // Обробник кнопки перегляду глосарію
    container.querySelectorAll('.btn-view-glossary').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const keywordId = button.dataset.keywordId;
            if (keywordId) {
                const { showGlossaryModal } = await import('./keywords-crud.js');
                await showGlossaryModal(keywordId);
            }
        });
    });
}

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

    const keywords = getKeywords();
    if (!keywords || keywords.length === 0) {
        renderEmptyState();
        isRendering = false;
        return;
    }

    let filteredKeywords = applyFilters(keywords);

    const { currentPage, pageSize } = keywordsState.pagination;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const paginatedKeywords = filteredKeywords.slice(start, end);

    if (keywordsState.paginationAPI) {
        keywordsState.paginationAPI.update({
            currentPage,
            pageSize,
            totalItems: filteredKeywords.length
        });
    }

    // Нові колонки за замовчуванням: id, тип, назва, тригери
    const visibleCols = keywordsState.visibleColumns.length > 0
        ? keywordsState.visibleColumns
        : ['local_id', 'param_type', 'name_uk', 'trigers'];

    renderPseudoTable(container, {
        data: paginatedKeywords,
        columns: getColumns(),
        visibleColumns: visibleCols,
        rowActionsHeader: ' ',
        rowActionsCustom: (row) => {
            const hasGlossary = row.glossary_text && row.glossary_text.trim();
            const eyeClass = hasGlossary ? 'severity-low' : 'severity-high';

            return `
                <button class="btn-icon btn-view-glossary ${eyeClass}" data-keyword-id="${escapeHtml(row.local_id)}" title="Переглянути глосарій">
                    <span class="material-symbols-outlined">visibility</span>
                </button>
                <button class="btn-icon btn-edit" data-keyword-id="${escapeHtml(row.local_id)}" title="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            `;
        },
        emptyState: {
            icon: 'key',
            message: 'Ключові слова не знайдено'
        },
        withContainer: false
    });

    // Додаємо обробники подій для кнопок
    attachRowEventHandlers(container);

    updateStats(filteredKeywords.length, keywords.length);

    console.log(`✅ Відрендерено ${paginatedKeywords.length} з ${filteredKeywords.length} ключових слів`);

    isRendering = false;
}

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

function renderEmptyState() {
    const container = document.getElementById('keywords-table-container');
    if (!container) return;

    // Використовуємо глобальну систему аватарів
    const avatarHtml = renderAvatarState('empty', {
        size: 'medium',
        containerClass: 'empty-state-container',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });

    container.innerHTML = avatarHtml;
    updateStats(0, 0);
}

function updateStats(visible, total) {
    const statsEl = document.getElementById('tab-stats-keywords');
    if (!statsEl) return;

    statsEl.textContent = `Показано ${visible} з ${total}`;
}
