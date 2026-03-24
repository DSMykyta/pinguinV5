// js/config/pages/blog.config.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    ENTITY CONFIG — БЛОГ                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Конфігурація сутності для page-entity.js                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { escapeHtml } from '../../utils/utils-text.js';
import { nowLocal } from '../../utils/utils-date.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULTS for dynamic selects
// ═══════════════════════════════════════════════════════════════════════════

const SELECT_DEFAULTS = {
    blog_ext_site: ['site-a', 'site-b'],
    blog_target: ['home', 'category', 'product', 'blog'],
    blog_group: ['hero', 'top', 'middle', 'bottom', 'sidebar'],
    blog_type: ['article', 'news', 'promo'],
};

export default {
    name: 'blog',
    entityName: 'Пост',

    // ── Data source ──
    dataSource: {
        spreadsheetType: 'products',
        sheetName: 'Blog',
        sheetGid: '908847151',
        idField: 'blog_id',
        idPrefix: 'blog-',
        stateKey: 'posts',
        columns: [
            'blog_id', 'blog_ext_id', 'blog_ext_site', 'blog_target',
            'blog_group', 'blog_type', 'blog_sort_order', 'status',
            'blog_name_ua', 'blog_name_ru', 'url_ua', 'url_ru', 'url',
            'blog_display_none_ua', 'blog_display_none_ru',
            'blog_text_ua', 'blog_text_ru', 'image_url',
            'created_at', 'created_by'
        ],
        autoFields: {
            created_at: () => nowLocal(),
        },
    },

    // Table is managed by dualTableExtension — engine's table is skipped
    table: {
        containerId: 'news-table-container',  // primary container for engine
        columns: [],  // empty — dual table extension handles columns
        actions: [],
        _skipEngineTable: true,  // flag for engine to skip table creation
    },

    // ── CRUD modal ──
    crud: {
        modalId: 'blog-edit',
        titleId: 'blog-modal-title',
        deleteBtnId: 'btn-delete-blog',
        saveBtnId: 'btn-save-blog',
        saveCloseBtnId: 'save-close-blog',
        addTitle: 'Новий пост',
        getTitle: (post) => post.blog_name_ua || `Пост ${post.blog_id}`,
        sectionNavId: 'blog-section-navigator',
        deleteConfirm: { action: 'видалити', entity: 'пост', nameField: 'blog_id' },

        fields: [
            { domId: 'blog-id', field: 'blog_id', readonly: true },
            { domId: 'blog-ext-id', field: 'blog_ext_id' },
            { domId: 'blog-ext-site', field: 'blog_ext_site', type: 'select' },
            { domId: 'blog-target', field: 'blog_target', type: 'select' },
            { domId: 'blog-group', field: 'blog_group', type: 'select' },
            { domId: 'blog-type', field: 'blog_type', type: 'select' },
            { domId: 'blog-sort-order', field: 'blog_sort_order' },
            { domId: 'blog-image-url', field: 'image_url' },
            { domId: 'blog-name-ua', field: 'blog_name_ua' },
            { domId: 'blog-name-ru', field: 'blog_name_ru' },
            { domId: 'blog-url-ua', field: 'url_ua' },
            { domId: 'blog-url-ru', field: 'url_ru' },
            { domId: 'blog-url', field: 'url' },
            { domId: 'blog-display-none-ua', field: 'blog_display_none_ua' },
            { domId: 'blog-display-none-ru', field: 'blog_display_none_ru' },
            { domId: 'blog-created-at', field: 'created_at', default: '—' },
            { domId: 'blog-created-by', field: 'created_by', default: '—' },
            { domId: 'blog-status', field: 'status', type: 'radio', default: 'active' },
            { domId: 'blog-text-ua-editor', field: 'blog_text_ua', type: 'editor' },
            { domId: 'blog-text-ru-editor', field: 'blog_text_ru', type: 'editor' },
        ],

        onInitComponents: ({ data }) => {
            populateDynamicSelects(data);
            initStatusBadge();
        },
    },

    page: {
        containers: ['news-table-container', 'blog-table-container'],
    },

    extensions: [dualTableExtension, blogUIExtension],
};

// ═══════════════════════════════════════════════════════════════════════════
// DUAL TABLE EXTENSION (news + blog)
// ═══════════════════════════════════════════════════════════════════════════

function normalizeType(value) {
    return String(value || '').trim().toLowerCase();
}

function rowMatchesTab(rowType, tabName) {
    const type = normalizeType(rowType);
    const newsTypes = new Set(['news', 'новини', 'novyny']);
    const blogTypes = new Set(['blog', 'блог', 'article', 'стаття']);
    if (tabName === 'news') return newsTypes.has(type);
    if (!type) return true;
    return blogTypes.has(type);
}

function getColumns() {
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
            span: 1, sortable: false,
            render: (value, row) => value
                ? `<img src="${escapeHtml(value)}" alt="${escapeHtml(row.blog_name_ua || row.blog_id || '')}" class="product-thumb" show>`
                : '<div class="product-thumb product-thumb-empty"><span class="material-symbols-outlined">image</span></div>'
        }),
        col('created_at', 'Створено', 'code', { span: 1, sortable: true }),
    ];
}

function dualTableExtension({ state, plugins, data }) {
    let _newsManagedTable = null;
    let _blogManagedTable = null;

    state.activeTab = state.activeTab || 'news';
    state.managedTables = { news: null, blog: null };

    registerActionHandlers('blog', {
        edit: async (rowId) => {
            const crud = state._crudModule;
            if (crud) crud.showEdit(rowId);
        }
    });

    function createBlogTable({ containerId, tabName, checkboxPrefix }) {
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
        const sortingTypes = {
            blog_id: 'string', blog_ext_site: 'string', blog_target: 'string',
            blog_group: 'string', blog_type: 'string', blog_sort_order: 'number',
            status: 'string', blog_name_ua: 'string', url: 'string', created_at: 'string'
        };
        const filterColumns = [
            { id: 'blog_ext_site', label: 'Site', filterType: 'values' },
            { id: 'blog_target', label: 'Target', filterType: 'values' },
            { id: 'blog_group', label: 'Group', filterType: 'values' },
            { id: 'blog_type', label: 'Type', filterType: 'values' },
            { id: 'status', label: 'Status', filterType: 'values' },
        ];

        let _actionCleanup = null;

        return createManagedTable({
            container: containerId,
            columns: getColumns().map(c => ({
                ...c,
                searchable: searchCols.includes(c.id),
                checked: visibleCols.includes(c.id)
            })),
            data: data.getAll(),
            statsId: null, paginationId: null,
            tableConfig: {
                rowActionsHeader: ' ',
                rowActions: (row) => actionButton({ action: 'edit', rowId: row.blog_id, context: 'blog' }),
                getRowId: (row) => row.blog_id,
                emptyState: { message: 'Пости не знайдено' },
                withContainer: false,
                onAfterRender: (container) => {
                    if (_actionCleanup) _actionCleanup();
                    _actionCleanup = initActionHandlers(container, 'blog');
                },
                plugins: {
                    sorting: { columnTypes: sortingTypes },
                    filters: { filterColumns },
                },
            },
            preFilter: (rows) => rows.filter(row => rowMatchesTab(row.blog_type, tabName)),
            pageSize: null,
            checkboxPrefix,
        });
    }

    function renderTables() {
        if (!_newsManagedTable && document.getElementById('news-table-container')) {
            _newsManagedTable = createBlogTable({ containerId: 'news-table-container', tabName: 'news', checkboxPrefix: 'news' });
            state.managedTables.news = _newsManagedTable;
        }
        if (!_blogManagedTable && document.getElementById('blog-table-container')) {
            _blogManagedTable = createBlogTable({ containerId: 'blog-table-container', tabName: 'blog', checkboxPrefix: 'blog' });
            state.managedTables.blog = _blogManagedTable;
        }
        initColumnsCharm();
        _newsManagedTable?.updateData(data.getAll());
        _blogManagedTable?.updateData(data.getAll());
        syncActiveTable();
    }

    function syncActiveTable() {
        if (state.activeTab === 'blog') {
            state.managedTable = _blogManagedTable;
            state.tableAPI = _blogManagedTable?.tableAPI || null;
        } else {
            state.managedTable = _newsManagedTable;
            state.tableAPI = _newsManagedTable?.tableAPI || null;
        }
    }

    plugins.registerHook('onInit', renderTables);
    plugins.registerHook('onRender', () => {
        _newsManagedTable?.refilter();
        _blogManagedTable?.refilter();
        syncActiveTable();
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOG-SPECIFIC HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function populateDynamicSelects(data) {
    const selectConfigs = [
        { id: 'blog-ext-site', field: 'blog_ext_site' },
        { id: 'blog-target', field: 'blog_target' },
        { id: 'blog-group', field: 'blog_group' },
        { id: 'blog-type', field: 'blog_type' },
    ];

    selectConfigs.forEach(({ id, field }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const fromData = data.getAll().map(item => String(item[field] || '').trim()).filter(Boolean);
        const options = [...new Set([...(SELECT_DEFAULTS[field] || []), ...fromData])].sort();
        el.innerHTML = '<option value="">— Оберіть —</option>' +
            options.map(val => `<option value="${val}">${val}</option>`).join('');
    });
}

function initStatusBadge() {
    const statusSwitch = document.getElementById('blog-status-switch');
    if (!statusSwitch || statusSwitch._statusInit) return;
    statusSwitch._statusInit = true;
    statusSwitch.addEventListener('change', () => {
        const badge = document.getElementById('blog-status-badge');
        if (!badge) return;
        const status = document.querySelector('input[name="blog-status"]:checked')?.value || 'active';
        badge.classList.remove('c-green', 'c-yellow', 'c-red');
        if (status === 'active') badge.classList.add('c-green');
        else if (status === 'draft') badge.classList.add('c-yellow');
        else badge.classList.add('c-red');
    });
}

function blogUIExtension({ state, plugins, data }) {
    plugins.registerHook('onInit', () => {
        const containers = [
            document.getElementById('news-table-container'),
            document.getElementById('blog-table-container')
        ].filter(Boolean);

        containers.forEach((c) => {
            if (c._blogRefreshInit) return;
            c._blogRefreshInit = true;
            c.addEventListener('charm:refresh', (e) => {
                const refreshTask = (async () => {
                    await data.load();
                    plugins.runHook('onInit');
                    const { showToast } = await import('../../components/feedback/toast.js');
                    showToast('Дані оновлено', 'success');
                })();
                if (e?.detail?.waitUntil) e.detail.waitUntil(refreshTask);
            });
        });

        ['btn-add-news', 'btn-add-blog', 'btn-add-blog-aside'].forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (!btn || btn._blogAddInit) return;
            btn._blogAddInit = true;
            btn.addEventListener('click', () => {
                const crud = state._crudModule;
                if (crud) crud.showAdd();
            });
        });
    });
}
