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

export function renderKeywordsTable() {
    console.log('🎨 Рендеринг таблиці ключових слів...');

    const container = document.getElementById('keywords-table-container');
    if (!container) return;

    const keywords = getKeywords();
    if (!keywords || keywords.length === 0) {
        renderEmptyState();
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

    const visibleCols = keywordsState.visibleColumns.length > 0
        ? keywordsState.visibleColumns
        : ['local_id', 'param_type', 'name_uk', 'trigers', 'keywords_ua'];

    renderPseudoTable(container, {
        data: paginatedKeywords,
        columns: [
            {
                id: 'local_id',
                label: 'ID',
                className: 'cell-id',
                sortable: true,
                render: (value) => `<span class="word-chip">${escapeHtml(value || '')}</span>`
            },
            {
                id: 'param_type',
                label: 'Тип',
                className: 'cell-id',
                sortable: true,
                render: (value) => value ? `<span class="word-chip">${escapeHtml(value)}</span>` : '-'
            },
            {
                id: 'parent_local_id',
                label: 'Батьківський елемент',
                className: 'cell-id',
                sortable: true,
                render: (value) => value ? escapeHtml(value) : '-'
            },
            {
                id: 'characteristics_local_id',
                label: 'Характеристика',
                className: 'cell-id',
                sortable: true,
                render: (value) => value ? escapeHtml(value) : '-'
            },
            {
                id: 'name_uk',
                label: 'Назва (UA)',
                sortable: true,
                className: 'cell-main-name',
                render: (value) => `<strong>${escapeHtml(value || '')}</strong>`
            },
            {
                id: 'name_ru',
                label: 'Назва (RU)',
                sortable: true,
                className: 'cell-main-name',
                render: (value) => value ? escapeHtml(value) : '-'
            },
            {
                id: 'name_en',
                label: 'Назва (EN)',
                sortable: true,
                className: 'cell-main-name',
                render: (value) => value ? escapeHtml(value) : '-'
            },
            {
                id: 'name_lat',
                label: 'Назва (LAT)',
                sortable: true,
                className: 'cell-main-name',
                render: (value) => value ? escapeHtml(value) : '-'
            },
            {
                id: 'name_alt',
                label: 'Альтернативні назви',
                sortable: true,
                className: 'cell-context',
                render: (value) => value ? escapeHtml(value) : '-'
            },
            {
                id: 'trigers',
                label: 'Тригери',
                className: 'cell-id',
                sortable: true,
                render: (value) => {
                    if (!value) return '-';
                    const triggers = value.split(',').map(t => t.trim()).filter(Boolean);
                    const chipsHtml = triggers.map(t => `<span class="word-chip primary">${escapeHtml(t)}</span>`).join(' ');
                    return `<div class="cell-words-list">${chipsHtml}</div>`;
                }
            },
            {
                id: 'keywords_ua',
                label: 'Ключові слова (UA)',
                className: 'cell-context',
                sortable: true,
                render: (value) => {
                    if (!value) return '<span class="text-muted">—</span>';
                    return `<div class="context-fragment">${escapeHtml(value)}</div>`;
                }
            },
            {
                id: 'keywords_ru',
                label: 'Ключові слова (RU)',
                className: 'cell-context',
                sortable: true,
                render: (value) => {
                    if (!value) return '<span class="text-muted">—</span>';
                    return `<div class="context-fragment">${escapeHtml(value)}</div>`;
                }
            }
        ],
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

    updateStats(filteredKeywords.length, keywords.length);

    console.log(`✅ Відрендерено ${paginatedKeywords.length} з ${filteredKeywords.length} ключових слів`);
}

function applyFilters(keywords) {
    let filtered = [...keywords];

    // Застосувати фільтр типів
    if (keywordsState.paramTypeFilter && keywordsState.paramTypeFilter !== 'all') {
        filtered = filtered.filter(entry => entry.param_type === keywordsState.paramTypeFilter);
    }

    // Застосувати пошук
    if (keywordsState.searchQuery) {
        const query = keywordsState.searchQuery.toLowerCase();
        const columns = keywordsState.searchColumns || ['local_id', 'name_uk', 'param_type', 'trigers', 'keywords_ua'];

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

    container.innerHTML = `
        <div class="empty-state">
            <span class="material-symbols-outlined">key</span>
            <p>Немає ключових слів</p>
        </div>
    `;

    updateStats(0, 0);
}

function updateStats(visible, total) {
    const statsEl = document.getElementById('tab-stats-keywords');
    if (!statsEl) return;

    statsEl.textContent = `Показано ${visible} з ${total}`;
}
