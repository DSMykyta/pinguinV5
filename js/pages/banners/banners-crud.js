// js/pages/banners/banners-crud.js

/**
 * BANNERS — CRUD (MODAL)
 *
 * Modal-based editing for banners. Uses generic createCrudModal factory.
 */

import { getBanners, addBanner, updateBanner, deleteBanner } from './banners-data.js';
import { initCustomSelects } from '../../components/forms/select.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal, closeModal } from '../../components/modal/modal-main.js';
import { escapeHtml } from '../../utils/utils-text.js';
import { createHighlightEditor } from '../../components/editor/editor-main.js';
import { initSectionNav } from '../../layout/layout-plugin-nav-sections.js';
import { runHook } from './banners-plugins.js';
import { createCrudModal } from '../../components/crud/crud-main.js';
import { bannersPlugins } from './banners-plugins.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let textEditorUa = null;
let textEditorRu = null;

const DEFAULTS = {
    banner_target: ['home', 'category', 'product', 'blog'],
    banner_group: ['hero', 'top', 'middle', 'bottom', 'sidebar'],
    banner_type: ['image', 'text', 'promo'],
    status: ['active', 'draft', 'hidden', 'inactive']
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getDynamicOptions(fieldName, currentValue = '') {
    const fromData = getBanners()
        .map(item => String(item[fieldName] || '').trim())
        .filter(Boolean);
    if (currentValue) fromData.push(String(currentValue).trim());
    return [...new Set([...(DEFAULTS[fieldName] || []), ...fromData])].sort((a, b) => a.localeCompare(b));
}

function getBannerById(bannerId) {
    return getBanners().find(b => b.banner_id === bannerId) || null;
}

function v(id) {
    return document.getElementById(id)?.value.trim() || '';
}

function set(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL INIT
// ═══════════════════════════════════════════════════════════════════════════

async function initModalComponents() {
    initTextEditors();
    initSectionNavigation();
    populateSelects();
    initStatusToggle();
}

function initTextEditors() {
    const uaContainer = document.getElementById('banner-text-ua-editor');
    const ruContainer = document.getElementById('banner-text-ru-editor');

    if (uaContainer) {
        textEditorUa = createHighlightEditor(uaContainer, { initialValue: '' });
    }
    if (ruContainer) {
        textEditorRu = createHighlightEditor(ruContainer, { initialValue: '' });
    }
}

function initSectionNavigation() {
    const nav = document.getElementById('banner-section-navigator');
    const content = document.querySelector('#modal-banner-edit .modal-body > main');
    if (nav && content) initSectionNav(nav, content);
}

function populateSelects() {
    const selectConfigs = [
        { id: 'banner-target', field: 'banner_target' },
        { id: 'banner-group', field: 'banner_group' },
        { id: 'banner-type', field: 'banner_type' }
    ];

    selectConfigs.forEach(({ id, field }) => {
        const el = document.getElementById(id);
        if (!el) return;

        const options = getDynamicOptions(field);
        el.innerHTML = '<option value="">— Оберіть —</option>' +
            options.map(val => `<option value="${escapeHtml(val)}">${escapeHtml(val)}</option>`).join('');
    });

    const modalEl = document.getElementById('modal-banner-edit');
    if (modalEl) initCustomSelects(modalEl);
}

function initStatusToggle() {
    const statusSwitch = document.getElementById('banner-status-switch');
    if (!statusSwitch) return;

    statusSwitch.addEventListener('change', () => {
        updateStatusBadge();
    });
}

function updateStatusBadge() {
    const badge = document.getElementById('banner-status-badge');
    if (!badge) return;

    const status = document.querySelector('input[name="banner-status"]:checked')?.value || 'active';
    badge.textContent = crud.getCurrentId() || '';
    badge.classList.remove('c-green', 'c-yellow', 'c-red');

    if (status === 'active') badge.classList.add('c-green');
    else if (status === 'draft') badge.classList.add('c-yellow');
    else badge.classList.add('c-red');
}

// ═══════════════════════════════════════════════════════════════════════════
// FILL / CLEAR FORM
// ═══════════════════════════════════════════════════════════════════════════

function fillBannerForm(banner) {
    set('banner-id', banner.banner_id);
    set('banner-sort-order', banner.banner_sort_order);
    set('banner-image-url', banner.image_url);
    set('banner-name-ua', banner.banner_name_ua);
    set('banner-name-ru', banner.banner_name_ru);
    set('banner-url-ua', banner.url_ua);
    set('banner-url-ru', banner.url_ru);
    set('banner-url', banner.url);
    set('banner-created-at', banner.created_at || '—');
    set('banner-created-by', banner.created_by || '—');

    // Selects
    ['banner-target', 'banner-group', 'banner-type'].forEach(id => {
        const el = document.getElementById(id);
        const fieldMap = {
            'banner-target': 'banner_target',
            'banner-group': 'banner_group',
            'banner-type': 'banner_type'
        };
        if (el) el.value = banner[fieldMap[id]] || '';
    });

    // Status radio
    const statusRadio = document.querySelector(`input[name="banner-status"][value="${banner.status || 'active'}"]`);
    if (statusRadio) statusRadio.checked = true;

    updateStatusBadge();

    // Editors
    if (textEditorUa) textEditorUa.setValue(banner.banner_text_ua || '');
    if (textEditorRu) textEditorRu.setValue(banner.banner_text_ru || '');
}

function clearBannerForm() {
    ['banner-id', 'banner-target', 'banner-group', 'banner-type',
     'banner-sort-order', 'banner-image-url', 'banner-name-ua',
     'banner-name-ru', 'banner-url-ua', 'banner-url-ru', 'banner-url'].forEach(id => set(id, ''));

    set('banner-created-at', '—');
    set('banner-created-by', '—');

    const statusRadio = document.querySelector('input[name="banner-status"][value="active"]');
    if (statusRadio) statusRadio.checked = true;

    // Reset badge
    const badge = document.getElementById('banner-status-badge');
    if (badge) badge.textContent = '';

    if (textEditorUa) textEditorUa.setValue('');
    if (textEditorRu) textEditorRu.setValue('');
}

// ═══════════════════════════════════════════════════════════════════════════
// COLLECT FORM DATA
// ═══════════════════════════════════════════════════════════════════════════

function getBannerFormData() {
    return {
        banner_target: v('banner-target'),
        banner_group: v('banner-group'),
        banner_type: v('banner-type'),
        banner_sort_order: v('banner-sort-order'),
        status: document.querySelector('input[name="banner-status"]:checked')?.value || 'active',
        banner_name_ua: v('banner-name-ua'),
        banner_name_ru: v('banner-name-ru'),
        url_ua: v('banner-url-ua'),
        url_ru: v('banner-url-ru'),
        url: v('banner-url'),
        banner_text_ua: textEditorUa ? textEditorUa.getValue() : '',
        banner_text_ru: textEditorRu ? textEditorRu.getValue() : '',
        image_url: v('banner-image-url')
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

const crud = createCrudModal({
    modalId: 'banner-edit',
    titleId: 'banner-modal-title',
    deleteBtnId: 'btn-delete-banner',
    saveBtnId: 'btn-save-banner',
    saveCloseBtnId: 'save-close-banner',
    entityName: 'Банер',
    addTitle: 'Новий банер',
    getTitle: (banner) => banner.banner_name_ua || `Банер ${banner.banner_id}`,
    getId: (b) => b?.banner_id || null,
    getById: getBannerById,
    add: addBanner,
    update: updateBanner,
    getFormData: getBannerFormData,
    fillForm: fillBannerForm,
    clearForm: clearBannerForm,
    initComponents: initModalComponents,
    onDelete: async (bannerId) => {
        const confirmed = await showConfirmModal({
            action: 'видалити',
            entity: 'банер',
            name: bannerId
        });
        if (!confirmed) return;
        try {
            await deleteBanner(bannerId);
            showToast(`Банер ${bannerId} видалено`, 'success');
            closeModal();
            runHook('onRender');
        } catch (error) {
            console.error('Помилка видалення банера:', error);
            showToast('Помилка видалення банера', 'error');
        }
    },
    onCleanup: () => {
        if (textEditorUa) { textEditorUa.destroy(); textEditorUa = null; }
        if (textEditorRu) { textEditorRu.destroy(); textEditorRu = null; }
    },
    plugins: bannersPlugins,
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const showAddBannerModal = crud.showAdd;
export const showEditBannerModal = crud.showEdit;
export const getCurrentBannerId = crud.getCurrentId;
