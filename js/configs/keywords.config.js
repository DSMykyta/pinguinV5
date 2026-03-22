// js/configs/keywords.config.js

/**
 * Keywords entity configuration for Entity Engine
 *
 * CRUD is handled by the existing keywords-crud.js (too custom for declarative config:
 * cascading selects, glossary editor, separate glossary view modal).
 */

import { actionButton } from '../components/actions/actions-main.js';

const PARAM_TYPE_LABELS = {
    'category': 'Категорія',
    'characteristic': 'Характеристика',
    'option': 'Опція',
    'marketing': 'Маркетинг',
    'other': 'Інше'
};

export default {
    name: 'keywords',
    entityName: 'Ключове слово',

    // ── Data source ──
    dataSource: {
        spreadsheetType: 'main',
        sheetName: 'Glossary',
        sheetGid: '90240383',
        idField: 'local_id',
        idPrefix: 'glo-',
        stateKey: 'keywords',
        columns: [
            'local_id', 'param_type', 'parent_local_id', 'entity_identity_id',
            'name_uk', 'name_ru', 'name_en', 'name_lat', 'name_alt',
            'trigers', 'keywords_ua', 'keywords_ru', 'glossary_text'
        ],
    },

    // ── Table ──
    table: {
        containerId: 'keywords-table-container',
        columns: [
            { id: 'local_id', label: 'ID', type: 'tag', sortable: true, sortType: 'id-text' },
            { id: 'param_type', label: 'Тип', type: 'text', sortable: true, filterable: true, filterType: 'values', labelMap: PARAM_TYPE_LABELS },
            { id: 'name_uk', label: 'Назва', type: 'name', span: 4, sortable: true },
            { id: 'trigers', label: 'Тригери', type: 'words-list', span: 3, sortable: true, searchable: true },
        ],
        searchColumns: ['local_id', 'name_uk', 'trigers', 'keywords_ua'],
        emptyMessage: 'Ключові слова не знайдено',

        // Custom row actions — view (with dynamic color) + edit
        rowActions: (row, idField, name) => {
            const hasGlossary = row.glossary_text && row.glossary_text.trim();
            const extraClass = hasGlossary ? 'c-green' : 'c-red';
            return `
                ${actionButton({ action: 'view', rowId: row[idField], context: name, extraClass, title: 'Переглянути глосарій' })}
                ${actionButton({ action: 'edit', rowId: row[idField], context: name })}
            `;
        },

        // Custom action handlers (edit/view go to keywords-crud.js)
        actionHandlers: {
            edit: async (rowId) => {
                const { showEditKeywordModal } = await import('../pages/keywords/keywords-crud.js');
                await showEditKeywordModal(rowId);
            },
            view: async (rowId) => {
                const { showGlossaryModal } = await import('../pages/keywords/keywords-crud.js');
                await showGlossaryModal(rowId);
            }
        },
    },

    // No engine CRUD — keywords-crud.js handles this (cascading selects, glossary editor)
    crud: null,

    // ── Page ──
    page: {
        containers: ['keywords-table-container'],
    },

    // ── Extensions ──
    extensions: [keywordsExtension],
};

function keywordsExtension({ state, plugins, data }) {
    // Expose data functions globally for keywords-crud.js to use
    state._entityData = data;

    plugins.registerHook('onInit', () => {
        // Refresh charm
        const tableContainer = document.getElementById('keywords-table-container');
        if (tableContainer && !tableContainer._keywordsRefreshInit) {
            tableContainer._keywordsRefreshInit = true;
            tableContainer.addEventListener('charm:refresh', (e) => {
                const task = (async () => {
                    await data.load();
                    plugins.runHook('onInit');
                    const { showToast } = await import('../components/feedback/toast.js');
                    showToast('Дані оновлено', 'success');
                })();
                if (e?.detail?.waitUntil) e.detail.waitUntil(task);
            });
        }

        // Add button
        const addBtn = document.getElementById('btn-add-keyword-aside');
        if (addBtn && !addBtn._keywordsAddInit) {
            addBtn._keywordsAddInit = true;
            addBtn.addEventListener('click', async () => {
                const { showAddKeywordModal } = await import('../pages/keywords/keywords-crud.js');
                showAddKeywordModal();
            });
        }
    });
}
