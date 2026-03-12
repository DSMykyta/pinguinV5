// js/pages/blog/blog-table.js

/**
 * BLOG — TABLE RENDERING
 *
 * Uses action handlers + fullscreen modal (consistent with products pattern).
 */

import { getBlogPosts } from './blog-data.js';
import { blogState } from './blog-state.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';
import { registerHook } from './blog-plugins.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';
import { escapeHtml } from '../../utils/utils-text.js';

// ═══════════════════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('blog', {
    edit: async (rowId) => {
        const { showEditBlogModal } = await import('./blog-crud.js');
        await showEditBlogModal(rowId);
    }
});

let _newsManagedTable = null;
let _blogManagedTable = null;

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function normalizeType(value) {
    return String(value || '').trim().toLowerCase();
}

function rowMatchesTab(rowType, tabName) {
    const type = normalizeType(rowType);
    const newsTypes = new Set(['news', 'новини', 'novyny']);
    const blogTypes = new Set(['blog', 'блог', 'article', 'стаття']);

    if (tabName === 'news') {
        return newsTypes.has(type);
    }

    if (!type) return true;
    return blogTypes.has(type);
}

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

export function getColumns() {
    return [
        col('blog_id', 'ID', 'tag', { span: 1, sortable: true }),
        col('blog_ext_site', 'Site', 'text', { span: 1, sortable: true, filterable: true }),
        col('blog_target', 'Target', 'text', { span: 1, sortable: true, filterable: true }),
        col('blog_group', 'Group', 'text', { span: 1, sortable: true, filterable: true }),
        col('blog_type', 'Type', 'text', { span: 1, sortable: true, filterable: true }),
        col('blog_sort_order', 'Sort', 'code', { span: 1, sortable: true }),
        col('status', 'Status', 'status-dot', { span: 1, sortable: true, filterable: true }),
        col('blog_name_ua', 'Назва UA', 'name', { span: 2, sortable: true }),
        col('url', 'URL', 'code', { span: 1, sortable: true }),
        col('image_url', 'Фото', 'photo', {
            span: 1,
            sortable: false,
            render: (value, row) => value
                ? `<img src="${escapeHtml(value)}" alt="${escapeHtml(row.blog_name_ua || row.blog_id || '')}" class="product-thumb" show>`
                : '<div class="product-thumb product-thumb-empty"><span class="material-symbols-outlined">image</span></div>'
        }),
        col('created_at', 'Створено', 'code', { span: 1, sortable: true })
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGED TABLE
// ═══════════════════════════════════════════════════════════════════════════

function initManagedBlogTable({ containerId, tabName, checkboxPrefix }) {
    const visibleCols = [
        'blog_id', 'blog_ext_site', 'blog_target', 'blog_group',
        'blog_type', 'blog_sort_order', 'status', 'blog_name_ua',
        'url', 'image_url', 'created_at'
    ];

    const searchCols = [
        'blog_id', 'blog_ext_id', 'blog_ext_site', 'blog_target',
        'blog_group', 'blog_type', 'blog_name_ua', 'blog_name_ru',
        'url_ua', 'url_ru', 'url', 'created_by'
    ];

    let _actionCleanup = null;

    const managedTable = createManagedTable({
        container: containerId,
        columns: getColumns().map(c => ({
            ...c,
            searchable: searchCols.includes(c.id) || c.searchable === true,
            checked: visibleCols.includes(c.id)
        })),
        data: getBlogPosts(),
        statsId: null,
        paginationId: null,
        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: (row) => actionButton({
                action: 'edit',
                rowId: row.blog_id,
                context: 'blog'
            }),
            getRowId: (row) => row.blog_id,
            emptyState: { message: 'Пости не знайдено' },
            withContainer: false,
            onAfterRender: (container) => {
                if (_actionCleanup) _actionCleanup();
                _actionCleanup = initActionHandlers(container, 'blog');
            },
            plugins: {
                sorting: {
                    columnTypes: {
                        blog_id: 'string',
                        blog_ext_site: 'string',
                        blog_target: 'string',
                        blog_group: 'string',
                        blog_type: 'string',
                        blog_sort_order: 'number',
                        status: 'string',
                        blog_name_ua: 'string',
                        url: 'string',
                        created_at: 'string'
                    }
                },
                filters: {
                    filterColumns: [
                        { id: 'blog_ext_site', label: 'Site', filterType: 'values' },
                        { id: 'blog_target', label: 'Target', filterType: 'values' },
                        { id: 'blog_group', label: 'Group', filterType: 'values' },
                        { id: 'blog_type', label: 'Type', filterType: 'values' },
                        { id: 'status', label: 'Status', filterType: 'values' }
                    ]
                }
            }
        },
        preFilter: (data) => data.filter(row => rowMatchesTab(row.blog_type, tabName)),
        pageSize: null,
        checkboxPrefix
    });

    return managedTable;
}

export function renderBlogTable() {
    const newsContainer = document.getElementById('news-table-container');
    const blogContainer = document.getElementById('blog-table-container');

    if (!_newsManagedTable && newsContainer) {
        _newsManagedTable = initManagedBlogTable({
            containerId: 'news-table-container',
            tabName: 'news',
            checkboxPrefix: 'news'
        });
        blogState.managedTables.news = _newsManagedTable;
    }

    if (!_blogManagedTable && blogContainer) {
        _blogManagedTable = initManagedBlogTable({
            containerId: 'blog-table-container',
            tabName: 'blog',
            checkboxPrefix: 'blog'
        });
        blogState.managedTables.blog = _blogManagedTable;
    }

    initColumnsCharm();

    if (!_newsManagedTable && !_blogManagedTable) return;

    _newsManagedTable?.updateData(getBlogPosts());
    _blogManagedTable?.updateData(getBlogPosts());

    if (blogState.activeTab === 'blog') {
        blogState.managedTable = _blogManagedTable;
        blogState.tableAPI = _blogManagedTable?.tableAPI || null;
    } else {
        blogState.managedTable = _newsManagedTable;
        blogState.tableAPI = _newsManagedTable?.tableAPI || null;
    }
}

export function renderBlogTableRowsOnly() {
    if (!_newsManagedTable && !_blogManagedTable) {
        renderBlogTable();
        return;
    }

    _newsManagedTable?.refilter();
    _blogManagedTable?.refilter();
}

export function resetBlogTableAPI() {
    if (_newsManagedTable) {
        _newsManagedTable.destroy();
        _newsManagedTable = null;
    }
    if (_blogManagedTable) {
        _blogManagedTable.destroy();
        _blogManagedTable = null;
    }

    blogState.managedTables.news = null;
    blogState.managedTables.blog = null;
    blogState.tableAPI = null;
    blogState.managedTable = null;
}

export function getActiveManagedTable() {
    return blogState.activeTab === 'blog'
        ? (_blogManagedTable || null)
        : (_newsManagedTable || null);
}

export function init() {
    registerHook('onInit', () => {
        renderBlogTable();
    });
    registerHook('onRender', () => {
        _newsManagedTable?.refilter();
        _blogManagedTable?.refilter();
        blogState.managedTable = getActiveManagedTable();
        blogState.tableAPI = blogState.managedTable?.tableAPI || null;
    });
}
