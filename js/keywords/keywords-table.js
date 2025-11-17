// js/keywords/keywords-table.js

/**
 * TPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW
 * Q                    KEYWORDS - TABLE RENDERING                            Q
 * ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]
 */

import { getKeywords } from './keywords-data.js';
import { keywordsState } from './keywords-init.js';
import { renderPseudoTable } from '../common/ui-table.js';
import { escapeHtml } from '../utils/text-utils.js';

export function renderKeywordsTable() {
    console.log('<¨  5=45@8=3 B01;8FV :;NG>28E A;V2...');

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
        : ['local_id', 'name_uk', 'param_type', 'trigers', 'keywords_ua'];

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
                id: 'name_uk',
                label: '0720',
                sortable: true,
                className: 'cell-main-name',
                render: (value) => `<strong>${escapeHtml(value || '')}</strong>`
            },
            {
                id: 'param_type',
                label: '"8?',
                sortable: true,
                render: (value) => escapeHtml(value || '-')
            },
            {
                id: 'trigers',
                label: '"@835@8',
                sortable: true,
                render: (value) => escapeHtml(value || '-')
            },
            {
                id: 'keywords_ua',
                label: ';NG>2V A;>20',
                sortable: true,
                render: (value) => escapeHtml(value || '-')
            }
        ],
        visibleColumns: visibleCols,
        rowActionsHeader: ' ',
        rowActionsCustom: (row) => {
            return `
                <button class="btn-icon btn-edit" data-keyword-id="${escapeHtml(row.local_id)}" title=" 5403C20B8">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            `;
        },
        emptyState: {
            icon: 'key',
            message: ';NG>2V A;>20 =5 7=0945=>'
        },
        withContainer: false
    });

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

    updateStats(filteredKeywords.length, keywords.length);

    console.log(` V4@5=45@5=> ${paginatedKeywords.length} 7 ${filteredKeywords.length} :;NG>28E A;V2`);
}

function applyFilters(keywords) {
    let filtered = [...keywords];

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
            <p>5<0T :;NG>28E A;V2</p>
        </div>
    `;

    updateStats(0, 0);
}

function updateStats(visible, total) {
    const statsEl = document.getElementById('tab-stats-keywords');
    if (!statsEl) return;

    statsEl.textContent = `>:070=> ${visible} 7 ${total}`;
}
