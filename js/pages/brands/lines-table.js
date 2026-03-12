// js/pages/brands/lines-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRAND LINES - TABLE RENDERING                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — Використовує createManagedTable для таблиці лінійок.
 */

import { registerHook } from './brands-plugins.js';
import { getBrandLines } from './lines-data.js';
import { getBrandById } from './brands-data.js';
import { brandsState } from './brands-state.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';
import { createBatchActionsBar } from '../../components/actions/actions-batch.js';

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ОБРОБНИКІВ ДІЙ
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('brand-lines', {
    edit: async (rowId) => {
        const { showEditLineModal } = await import('./lines-crud.js');
        await showEditLineModal(rowId);
    }
});

let _actionCleanup = null;
let _linesBatchBar = null;

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export function getLinesColumns() {
    return [
        col('line_id', 'ID', 'tag'),
        col('brand_name', 'Бренд', 'text', { span: 3 }),
        col('name_uk', 'Назва лінійки', 'name', { span: 5 }),
        col('has_logo', 'Логотип', 'status-dot')
    ];
}

function enrichLinesData(lines) {
    return lines.map(l => ({
        ...l,
        brand_name: getBrandById(l.brand_id)?.name_uk || l.brand_id || '—',
        has_logo: l.line_logo_url ? 'active' : 'inactive'
    }));
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGED TABLE
// ═══════════════════════════════════════════════════════════════════════════

function initLinesTable() {
    const visibleCols = brandsState.linesVisibleColumns.length > 0
        ? brandsState.linesVisibleColumns
        : ['line_id', 'brand_name', 'name_uk'];

    const searchCols = brandsState.linesSearchColumns.length > 0
        ? brandsState.linesSearchColumns
        : ['line_id', 'name_uk', 'brand_name'];

    brandsState.linesManagedTable = createManagedTable({
        container: 'lines-table-container',
        columns: getLinesColumns().map(c => ({
            ...c,
            searchable: searchCols.includes(c.id) || c.searchable === true,
            checked: visibleCols.includes(c.id)
        })),
        data: enrichLinesData(getBrandLines()),

        // DOM IDs
        statsId: null,
        paginationId: null,

        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: (row) => actionButton({
                action: 'edit',
                rowId: row.line_id,
                context: 'brand-lines'
            }),
            getRowId: (row) => row.line_id,
            emptyState: { message: 'Лінійки не знайдено' },
            withContainer: false,
            onAfterRender: (container) => {
                if (_actionCleanup) _actionCleanup();
                _actionCleanup = initActionHandlers(container, 'brand-lines');
            },
            plugins: {
                sorting: {
                    columnTypes: {
                        line_id: 'id-text',
                        brand_name: 'string',
                        name_uk: 'string'
                    }
                },
                checkboxes: {
                    batchBar: () => _linesBatchBar
                }
            }
        },

        dataTransform: (data) => enrichLinesData(data),
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'lines'
    });

    // Batch actions bar
    _linesBatchBar = createBatchActionsBar({
        tabId: 'lines',
        actions: [
            {
                id: 'delete',
                label: 'Видалити',
                icon: 'delete',
                dangerous: true,
                handler: async (selectedIds) => {
                    const { deleteBrandLine } = await import('./lines-data.js');
                    const { showToast } = await import('../../components/feedback/toast.js');
                    const { showConfirmModal } = await import('../../components/modal/modal-main.js');
                    const confirmed = await showConfirmModal({ action: 'видалити', entity: `${selectedIds.length} лінійок(у)` });
                    if (!confirmed) return;
                    try {
                        for (const id of selectedIds) {
                            await deleteBrandLine(id);
                        }
                        _linesBatchBar.deselectAll();
                        renderLinesTable();
                        showToast(`Видалено ${selectedIds.length} лінійок(у)`, 'success');
                    } catch (error) {
                        console.error('Batch delete error:', error);
                        showToast('Помилка видалення', 'error');
                    }
                }
            }
        ]
    });

    initColumnsCharm();

    // Деактивувати одразу — brands таб активний за замовчуванням
    brandsState.linesManagedTable.deactivate();

    brandsState.linesTableAPI = brandsState.linesManagedTable.tableAPI;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC RENDER
// ═══════════════════════════════════════════════════════════════════════════

export function renderLinesTable() {
    if (brandsState.activeTab !== 'lines') return;
    if (!window.isAuthorized) return;

    if (!brandsState.linesManagedTable) {
        if (!document.getElementById('lines-table-container')) return;
        initLinesTable();
        brandsState.linesManagedTable.activate();
        return;
    }
    brandsState.linesManagedTable.updateData(getBrandLines());
}

export function renderLinesTableRowsOnly() {
    if (brandsState.linesManagedTable) {
        brandsState.linesManagedTable.refilter();
    } else {
        renderLinesTable();
    }
}

export function resetLinesTableAPI() {
    if (brandsState.linesManagedTable) {
        brandsState.linesManagedTable.destroy();
        brandsState.linesManagedTable = null;
    }
    brandsState.linesTableAPI = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

export function init(state) {
    registerHook('onInit', () => {
        if (brandsState.activeTab === 'lines') {
            renderLinesTable();
        }
    });

    registerHook('onRender', () => {
        if (brandsState.activeTab === 'lines' && brandsState.linesManagedTable) {
            brandsState.linesManagedTable.refilter();
        }
    });

    registerHook('onTabChange', (tab) => {
        if (tab === 'lines') {
            brandsState.brandsManagedTable?.deactivate();
            if (!window.isAuthorized) return;
            if (!brandsState.linesManagedTable) {
                initLinesTable();
            }
            brandsState.linesManagedTable.activate();
        } else {
            brandsState.linesManagedTable?.deactivate();
            if (!window.isAuthorized) return;
            brandsState.brandsManagedTable?.activate();
        }
    });
}
