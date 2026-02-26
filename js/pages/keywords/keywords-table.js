// js/keywords/keywords-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - TABLE RENDERING                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Використовує createManagedTable для таблиці + пошуку + колонок.
 */

import { getKeywords } from './keywords-data.js';
import { keywordsState } from './keywords-state.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';

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

let _actionCleanup = null;

const PARAM_TYPE_LABELS = {
    'category': 'Категорія',
    'characteristic': 'Характеристика',
    'option': 'Опція',
    'marketing': 'Маркетинг',
    'other': 'Інше'
};

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

export function getColumns() {
    return [
        col('local_id', 'ID', 'tag'),
        col('param_type', 'Тип', 'text', { filterable: true, filterType: 'values' }),
        col('name_uk', 'Назва', 'name', { span: 4 }),
        col('trigers', 'Тригери', 'words-list', { span: 3, sortable: true, searchable: true })
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGED TABLE
// ═══════════════════════════════════════════════════════════════════════════

let keywordsManagedTable = null;

function initKeywordsTable() {
    const visibleCols = keywordsState.visibleColumns.length > 0
        ? keywordsState.visibleColumns
        : ['local_id', 'param_type', 'name_uk', 'trigers'];

    const searchCols = keywordsState.searchColumns.length > 0
        ? keywordsState.searchColumns
        : ['local_id', 'name_uk', 'param_type', 'trigers'];

    keywordsManagedTable = createManagedTable({
        container: 'keywords-table-container',
        columns: getColumns().map(c => ({
            ...c,
            searchable: searchCols.includes(c.id) || c.searchable === true,
            checked: visibleCols.includes(c.id)
        })),
        data: getKeywords(),

        // DOM IDs
        searchInputId: 'search-keywords',
        statsId: null,
        paginationId: null,

        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: (row) => {
                const hasGlossary = row.glossary_text && row.glossary_text.trim();
                const extraClass = hasGlossary ? 'c-green' : 'c-red';
                return `
                    ${actionButton({ action: 'view', rowId: row.local_id, context: 'keywords', extraClass, title: 'Переглянути глосарій' })}
                    ${actionButton({ action: 'edit', rowId: row.local_id, context: 'keywords' })}
                `;
            },
            getRowId: (row) => row.local_id,
            emptyState: { message: 'Ключові слова не знайдено' },
            withContainer: false,
            onAfterRender: (container) => {
                if (_actionCleanup) _actionCleanup();
                _actionCleanup = initActionHandlers(container, 'keywords');
            },
            plugins: {
                sorting: {
                    columnTypes: {
                        local_id: 'id-text',
                        param_type: 'string',
                        name_uk: 'string',
                        trigers: 'string'
                    }
                },
                filters: {
                    filterColumns: [
                        { id: 'param_type', label: 'Тип', filterType: 'values', labelMap: PARAM_TYPE_LABELS }
                    ]
                }
            }
        },

        preFilter: (data) => {
            if (keywordsState.paramTypeFilter && keywordsState.paramTypeFilter !== 'all') {
                return data.filter(e => e.param_type === keywordsState.paramTypeFilter);
            }
            return data;
        },

        pageSize: null,
        checkboxPrefix: 'keywords'
    });

    keywordsState.tableAPI = keywordsManagedTable.tableAPI;
    keywordsState.keywordsManagedTable = keywordsManagedTable;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC RENDER
// ═══════════════════════════════════════════════════════════════════════════

export function renderKeywordsTable() {
    if (!keywordsManagedTable) {
        if (!document.getElementById('keywords-table-container')) return;
        initKeywordsTable();
        return;
    }
    keywordsManagedTable.updateData(getKeywords());
}

export function renderKeywordsTableRowsOnly() {
    if (keywordsManagedTable) {
        keywordsManagedTable.refilter();
    } else {
        renderKeywordsTable();
    }
}

export function resetTableAPI() {
    if (keywordsManagedTable) {
        keywordsManagedTable.destroy();
        keywordsManagedTable = null;
    }
    keywordsState.tableAPI = null;
    keywordsState.keywordsManagedTable = null;
}
