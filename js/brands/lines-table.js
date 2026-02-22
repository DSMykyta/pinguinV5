// js/brands/lines-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRAND LINES - TABLE RENDERING                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — Використовує createManagedTable для таблиці лінійок.
 */

import { registerBrandsPlugin } from './brands-plugins.js';
import { getBrandLines } from './lines-data.js';
import { getBrandById } from './brands-data.js';
import { brandsState } from './brands-state.js';
import { createManagedTable, col } from '../common/table/table-main.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../common/ui-actions.js';

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

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export function getLinesColumns() {
    return [
        col('line_id', 'ID', 'tag'),
        col('_brandName', 'Бренд', 'text'),
        col('name_uk', 'Назва лінійки', 'name'),
        col('_hasLogo', 'Логотип', 'status-dot', { className: 'cell-xs cell-center' })
    ];
}

function enrichLinesData(lines) {
    return lines.map(l => ({
        ...l,
        _brandName: getBrandById(l.brand_id)?.name_uk || l.brand_id || '—',
        _hasLogo: l.line_logo_url ? 'active' : 'inactive'
    }));
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGED TABLE
// ═══════════════════════════════════════════════════════════════════════════

function initLinesTable() {
    const visibleCols = brandsState.linesVisibleColumns.length > 0
        ? brandsState.linesVisibleColumns
        : ['line_id', '_brandName', 'name_uk'];

    const searchCols = brandsState.linesSearchColumns || ['line_id', 'name_uk', '_brandName'];

    brandsState.linesManagedTable = createManagedTable({
        container: 'lines-table-container',
        columns: getLinesColumns().map(c => ({
            ...c,
            searchable: searchCols.includes(c.id),
            checked: visibleCols.includes(c.id)
        })),
        data: enrichLinesData(getBrandLines()),

        // DOM IDs — спільний search input з brands
        searchInputId: 'search-brands',
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
                        _brandName: 'string',
                        name_uk: 'string'
                    }
                }
            }
        },

        dataTransform: (data) => enrichLinesData(data),

        pageSize: null,
        checkboxPrefix: 'lines'
    });

    // Деактивувати одразу — brands таб активний за замовчуванням
    brandsState.linesManagedTable.deactivate();

    brandsState.linesTableAPI = brandsState.linesManagedTable.tableAPI;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC RENDER
// ═══════════════════════════════════════════════════════════════════════════

export function renderLinesTable() {
    if (brandsState.activeTab !== 'lines') return;

    if (!brandsState.linesManagedTable) {
        initLinesTable();
        brandsState.linesManagedTable.activate();
        return;
    }
    brandsState.linesManagedTable.updateData(getBrandLines());
}

export function renderLinesTableRowsOnly() {
    renderLinesTable();
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

registerBrandsPlugin('onInit', () => {
    if (brandsState.activeTab === 'lines') {
        renderLinesTable();
    }
});

registerBrandsPlugin('onRender', () => {
    if (brandsState.activeTab === 'lines' && brandsState.linesManagedTable) {
        brandsState.linesManagedTable.refilter();
    }
});

registerBrandsPlugin('onTabChange', (tab) => {
    if (tab === 'lines') {
        brandsState.brandsManagedTable?.deactivate();
        if (!brandsState.linesManagedTable) {
            initLinesTable();
        }
        brandsState.linesManagedTable.activate();
    } else {
        brandsState.linesManagedTable?.deactivate();
        brandsState.brandsManagedTable?.activate();
    }
});
