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

// Мапа типів параметрів для відображення
const PARAM_TYPE_LABELS = {
    'category': 'Категорія',
    'characteristic': 'Характеристика',
    'option': 'Опція',
    'marketing': 'Маркетинг',
    'other': 'Інше'
};

// Мапа кольорів для типів
const PARAM_TYPE_COLORS = {
    'category': 'badge-primary',
    'characteristic': 'badge-success',
    'option': 'badge-warning',
    'marketing': 'badge-info',
    'other': 'badge-neutral'
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
            filterOptions: Object.entries(PARAM_TYPE_LABELS).map(([value, label]) => ({ value, label })),
            render: (value) => {
                if (!value) return '<span class="text-muted">—</span>';
                const label = PARAM_TYPE_LABELS[value] || value;
                const colorClass = PARAM_TYPE_COLORS[value] || 'badge-neutral';
                return `<span class="badge ${colorClass}">${escapeHtml(label)}</span>`;
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

                // Обмежити до 5 тригерів, решту показати як +N
                const maxVisible = 5;
                const visibleTriggers = triggers.slice(0, maxVisible);
                const hiddenCount = triggers.length - maxVisible;

                let chipsHtml = visibleTriggers
                    .map(t => `<span class="word-chip primary">${escapeHtml(t)}</span>`)
                    .join(' ');

                if (hiddenCount > 0) {
                    chipsHtml += ` <span class="word-chip neutral">+${hiddenCount}</span>`;
                }

                return `<div class="cell-words-list">${chipsHtml}</div>`;
            }
        }
    ];
}

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
