// js/config/pages/banners.config.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    ENTITY CONFIG — БАНЕРИ                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Конфігурація сутності для page-entity.js                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { escapeHtml } from '../../utils/utils-text.js';

export default {
    name: 'banners',
    entityName: 'Банер',

    // ── Data source ──
    dataSource: {
        spreadsheetType: 'products',
        sheetName: 'Banners',
        sheetGid: '1208466784',
        idField: 'banner_id',
        idPrefix: 'banner-',
        stateKey: 'banners',
        columns: [
            'banner_id', 'banner_target', 'banner_group', 'banner_type',
            'banner_sort_order', 'status', 'banner_name_ua', 'banner_name_ru',
            'url_ua', 'url_ru', 'url', 'banner_text_ua', 'banner_text_ru',
            'image_url', 'created_at', 'created_by'
        ],
        autoFields: {
            created_at: () => new Date().toISOString().replace('T', ' ').slice(0, 19),
        },
    },

    // ── Table ──
    table: {
        containerId: 'banners-table-container',
        columns: [
            { id: 'banner_id', label: 'ID', type: 'tag', span: 1, sortable: true, sortType: 'string' },
            { id: 'banner_target', label: 'Target', type: 'text', span: 1, sortable: true, filterable: true },
            { id: 'banner_group', label: 'Group', type: 'text', span: 1, sortable: true, filterable: true },
            { id: 'banner_type', label: 'Type', type: 'text', span: 1, sortable: true, filterable: true },
            { id: 'banner_sort_order', label: 'Sort', type: 'code', span: 1, sortable: true, sortType: 'number' },
            { id: 'status', label: 'Status', type: 'status-dot', span: 1, sortable: true, filterable: true },
            { id: 'banner_name_ua', label: 'Назва UA', type: 'name', span: 2, sortable: true },
            { id: 'url', label: 'URL', type: 'code', span: 1, sortable: true },
            {
                id: 'image_url', label: 'Фото', type: 'photo', span: 1,
                render: (value, row) => value
                    ? `<img src="${escapeHtml(value)}" alt="${escapeHtml(row.banner_name_ua || row.banner_id || '')}" class="product-thumb" show>`
                    : '<div class="product-thumb product-thumb-empty"><span class="material-symbols-outlined">image</span></div>'
            },
            { id: 'created_at', label: 'Створено', type: 'code', span: 1, sortable: true },
        ],
        searchColumns: [
            'banner_id', 'banner_target', 'banner_group', 'banner_type',
            'banner_name_ua', 'banner_name_ru', 'url_ua', 'url_ru',
            'url', 'created_by'
        ],
        emptyMessage: 'Банери не знайдено',
        actions: ['edit'],
    },

    // ── CRUD modal ──
    crud: {
        modalId: 'banner-edit',
        titleId: 'banner-modal-title',
        deleteBtnId: 'btn-delete-banner',
        saveBtnId: 'btn-save-banner',
        saveCloseBtnId: 'save-close-banner',
        addTitle: 'Новий банер',
        getTitle: (banner) => banner.banner_name_ua || `Банер ${banner.banner_id}`,
        sectionNavId: 'banner-section-navigator',
        deleteConfirm: { action: 'видалити', entity: 'банер', nameField: 'banner_id' },

        fields: [
            { domId: 'banner-id', field: 'banner_id', readonly: true },
            { domId: 'banner-target', field: 'banner_target', type: 'select' },
            { domId: 'banner-group', field: 'banner_group', type: 'select' },
            { domId: 'banner-type', field: 'banner_type', type: 'select' },
            { domId: 'banner-sort-order', field: 'banner_sort_order' },
            { domId: 'banner-image-url', field: 'image_url' },
            { domId: 'banner-name-ua', field: 'banner_name_ua' },
            { domId: 'banner-name-ru', field: 'banner_name_ru' },
            { domId: 'banner-url-ua', field: 'url_ua' },
            { domId: 'banner-url-ru', field: 'url_ru' },
            { domId: 'banner-url', field: 'url' },
            { domId: 'banner-created-at', field: 'created_at', default: '—' },
            { domId: 'banner-created-by', field: 'created_by', default: '—' },
            { domId: 'banner-status', field: 'status', type: 'radio', default: 'active' },
            { domId: 'banner-text-ua-editor', field: 'banner_text_ua', type: 'editor' },
            { domId: 'banner-text-ru-editor', field: 'banner_text_ru', type: 'editor' },
        ],

        // Custom init for dynamic selects and status badge
        onInitComponents: ({ data }) => {
            populateDynamicSelects(data);
            initStatusBadge();
        },
    },

    // ── Page ──
    page: {
        containers: ['banners-table-container'],
    },

    // ── Extensions ──
    extensions: [bannersUIExtension],
};

// ═══════════════════════════════════════════════════════════════════════════
// BANNERS-SPECIFIC EXTENSIONS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULTS = {
    banner_target: ['home', 'category', 'product', 'blog'],
    banner_group: ['hero', 'top', 'middle', 'bottom', 'sidebar'],
    banner_type: ['image', 'text', 'promo'],
};

function populateDynamicSelects(data) {
    const selectConfigs = [
        { id: 'banner-target', field: 'banner_target' },
        { id: 'banner-group', field: 'banner_group' },
        { id: 'banner-type', field: 'banner_type' },
    ];

    selectConfigs.forEach(({ id, field }) => {
        const el = document.getElementById(id);
        if (!el) return;

        const fromData = data.getAll()
            .map(item => String(item[field] || '').trim())
            .filter(Boolean);
        const options = [...new Set([...(DEFAULTS[field] || []), ...fromData])].sort();

        el.innerHTML = '<option value="">— Оберіть —</option>' +
            options.map(val => `<option value="${val}">${val}</option>`).join('');
    });
}

function initStatusBadge() {
    const statusSwitch = document.getElementById('banner-status-switch');
    if (!statusSwitch || statusSwitch._statusInit) return;
    statusSwitch._statusInit = true;

    statusSwitch.addEventListener('change', updateStatusBadge);
}

function updateStatusBadge() {
    const badge = document.getElementById('banner-status-badge');
    if (!badge) return;

    const status = document.querySelector('input[name="banner-status"]:checked')?.value || 'active';
    badge.classList.remove('c-green', 'c-yellow', 'c-red');

    if (status === 'active') badge.classList.add('c-green');
    else if (status === 'draft') badge.classList.add('c-yellow');
    else badge.classList.add('c-red');
}

function bannersUIExtension({ state, plugins, data }) {
    plugins.registerHook('onInit', () => {
        const tableContainer = document.getElementById('banners-table-container');
        if (tableContainer && !tableContainer._bannersRefreshInit) {
            tableContainer._bannersRefreshInit = true;
            tableContainer.addEventListener('charm:refresh', (e) => {
                const refreshTask = (async () => {
                    await data.load();
                    plugins.runHook('onInit');
                    const { showToast } = await import('../../components/feedback/toast.js');
                    showToast('Дані оновлено', 'success');
                })();
                if (e?.detail?.waitUntil) e.detail.waitUntil(refreshTask);
            });
        }

        const addButtons = [
            document.getElementById('btn-add-banner'),
            document.getElementById('btn-add-banner-aside')
        ].filter(Boolean);

        addButtons.forEach((btn) => {
            if (btn._bannersAddInit) return;
            btn._bannersAddInit = true;
            btn.addEventListener('click', () => {
                const crud = state._crudModule;
                if (crud) crud.showAdd();
            });
        });
    });
}
