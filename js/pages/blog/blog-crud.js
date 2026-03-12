// js/pages/blog/blog-crud.js

/**
 * BLOG — CRUD (MODAL)
 *
 * Modal-based editing for blog posts. Uses generic createCrudModal factory.
 */

import { getBlogPosts, addBlogPost, updateBlogPost, deleteBlogPost } from './blog-data.js';
import { initCustomSelects } from '../../components/forms/select.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal, closeModal } from '../../components/modal/modal-main.js';
import { escapeHtml } from '../../utils/utils-text.js';
import { createHighlightEditor } from '../../components/editor/editor-main.js';
import { initSectionNav } from '../../layout/layout-plugin-nav-sections.js';
import { runHook } from './blog-plugins.js';
import { createCrudModal } from '../../components/crud/crud-main.js';
import { blogPlugins } from './blog-plugins.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let textEditorUa = null;
let textEditorRu = null;

const DEFAULTS = {
    blog_ext_site: ['site-a', 'site-b'],
    blog_target: ['home', 'category', 'product', 'blog'],
    blog_group: ['hero', 'top', 'middle', 'bottom', 'sidebar'],
    blog_type: ['article', 'news', 'promo'],
    status: ['active', 'draft', 'hidden', 'inactive']
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getDynamicOptions(fieldName, currentValue = '') {
    const fromData = getBlogPosts()
        .map(item => String(item[fieldName] || '').trim())
        .filter(Boolean);
    if (currentValue) fromData.push(String(currentValue).trim());
    return [...new Set([...(DEFAULTS[fieldName] || []), ...fromData])].sort((a, b) => a.localeCompare(b));
}

function getBlogById(blogId) {
    return getBlogPosts().find(p => p.blog_id === blogId) || null;
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
    const uaContainer = document.getElementById('blog-text-ua-editor');
    const ruContainer = document.getElementById('blog-text-ru-editor');

    if (uaContainer) {
        textEditorUa = createHighlightEditor(uaContainer, { initialValue: '' });
    }
    if (ruContainer) {
        textEditorRu = createHighlightEditor(ruContainer, { initialValue: '' });
    }
}

function initSectionNavigation() {
    const nav = document.getElementById('blog-section-navigator');
    const content = document.querySelector('#modal-blog-edit .modal-body > main');
    if (nav && content) initSectionNav(nav, content);
}

function populateSelects() {
    const selectConfigs = [
        { id: 'blog-ext-site', field: 'blog_ext_site' },
        { id: 'blog-target', field: 'blog_target' },
        { id: 'blog-group', field: 'blog_group' },
        { id: 'blog-type', field: 'blog_type' }
    ];

    selectConfigs.forEach(({ id, field }) => {
        const el = document.getElementById(id);
        if (!el) return;

        const options = getDynamicOptions(field);
        el.innerHTML = '<option value="">— Оберіть —</option>' +
            options.map(val => `<option value="${escapeHtml(val)}">${escapeHtml(val)}</option>`).join('');
    });

    const modalEl = document.getElementById('modal-blog-edit');
    if (modalEl) initCustomSelects(modalEl);
}

function initStatusToggle() {
    const statusSwitch = document.getElementById('blog-status-switch');
    if (!statusSwitch) return;

    statusSwitch.addEventListener('change', () => {
        updateStatusBadge();
    });
}

function updateStatusBadge() {
    const badge = document.getElementById('blog-status-badge');
    if (!badge) return;

    const status = document.querySelector('input[name="blog-status"]:checked')?.value || 'active';
    badge.textContent = crud.getCurrentId() || '';
    badge.classList.remove('c-green', 'c-yellow', 'c-red');

    if (status === 'active') badge.classList.add('c-green');
    else if (status === 'draft') badge.classList.add('c-yellow');
    else badge.classList.add('c-red');
}

// ═══════════════════════════════════════════════════════════════════════════
// FILL / CLEAR FORM
// ═══════════════════════════════════════════════════════════════════════════

function fillBlogForm(post) {
    set('blog-id', post.blog_id);
    set('blog-ext-id', post.blog_ext_id);
    set('blog-sort-order', post.blog_sort_order);
    set('blog-image-url', post.image_url);
    set('blog-name-ua', post.blog_name_ua);
    set('blog-name-ru', post.blog_name_ru);
    set('blog-url-ua', post.url_ua);
    set('blog-url-ru', post.url_ru);
    set('blog-url', post.url);
    set('blog-display-none-ua', post.blog_display_none_ua);
    set('blog-display-none-ru', post.blog_display_none_ru);
    set('blog-created-at', post.created_at || '—');
    set('blog-created-by', post.created_by || '—');

    // Selects
    ['blog-ext-site', 'blog-target', 'blog-group', 'blog-type'].forEach(id => {
        const el = document.getElementById(id);
        const fieldMap = {
            'blog-ext-site': 'blog_ext_site',
            'blog-target': 'blog_target',
            'blog-group': 'blog_group',
            'blog-type': 'blog_type'
        };
        if (el) el.value = post[fieldMap[id]] || '';
    });

    // Status radio
    const statusRadio = document.querySelector(`input[name="blog-status"][value="${post.status || 'active'}"]`);
    if (statusRadio) statusRadio.checked = true;

    updateStatusBadge();

    // Editors
    if (textEditorUa) textEditorUa.setValue(post.blog_text_ua || '');
    if (textEditorRu) textEditorRu.setValue(post.blog_text_ru || '');
}

function clearBlogForm() {
    ['blog-id', 'blog-ext-id', 'blog-ext-site', 'blog-target', 'blog-group',
     'blog-type', 'blog-sort-order', 'blog-image-url', 'blog-name-ua',
     'blog-name-ru', 'blog-url-ua', 'blog-url-ru', 'blog-url',
     'blog-display-none-ua', 'blog-display-none-ru'].forEach(id => set(id, ''));

    set('blog-created-at', '—');
    set('blog-created-by', '—');

    const statusRadio = document.querySelector('input[name="blog-status"][value="active"]');
    if (statusRadio) statusRadio.checked = true;

    // Reset badge
    const badge = document.getElementById('blog-status-badge');
    if (badge) badge.textContent = '';

    if (textEditorUa) textEditorUa.setValue('');
    if (textEditorRu) textEditorRu.setValue('');
}

// ═══════════════════════════════════════════════════════════════════════════
// COLLECT FORM DATA
// ═══════════════════════════════════════════════════════════════════════════

function getBlogFormData() {
    return {
        blog_ext_id: v('blog-ext-id'),
        blog_ext_site: v('blog-ext-site'),
        blog_target: v('blog-target'),
        blog_group: v('blog-group'),
        blog_type: v('blog-type'),
        blog_sort_order: v('blog-sort-order'),
        status: document.querySelector('input[name="blog-status"]:checked')?.value || 'active',
        blog_name_ua: v('blog-name-ua'),
        blog_name_ru: v('blog-name-ru'),
        url_ua: v('blog-url-ua'),
        url_ru: v('blog-url-ru'),
        url: v('blog-url'),
        blog_display_none_ua: v('blog-display-none-ua'),
        blog_display_none_ru: v('blog-display-none-ru'),
        blog_text_ua: textEditorUa ? textEditorUa.getValue() : '',
        blog_text_ru: textEditorRu ? textEditorRu.getValue() : '',
        image_url: v('blog-image-url')
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

const crud = createCrudModal({
    modalId: 'blog-edit',
    titleId: 'blog-modal-title',
    deleteBtnId: 'btn-delete-blog',
    saveBtnId: 'btn-save-blog',
    saveCloseBtnId: 'save-close-blog',
    entityName: 'Пост',
    addTitle: 'Новий пост',
    getTitle: (post) => post.blog_name_ua || `Пост ${post.blog_id}`,
    getId: (p) => p?.blog_id || null,
    getById: getBlogById,
    add: addBlogPost,
    update: updateBlogPost,
    getFormData: getBlogFormData,
    fillForm: fillBlogForm,
    clearForm: clearBlogForm,
    initComponents: initModalComponents,
    onDelete: async (blogId) => {
        const confirmed = await showConfirmModal({
            action: 'видалити',
            entity: 'пост',
            name: blogId
        });
        if (!confirmed) return;
        try {
            await deleteBlogPost(blogId);
            showToast(`Пост ${blogId} видалено`, 'success');
            closeModal();
            runHook('onRender');
        } catch (error) {
            console.error('Помилка видалення поста:', error);
            showToast('Помилка видалення поста', 'error');
        }
    },
    onCleanup: () => {
        if (textEditorUa) { textEditorUa.destroy(); textEditorUa = null; }
        if (textEditorRu) { textEditorRu.destroy(); textEditorRu = null; }
    },
    plugins: blogPlugins,
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const showAddBlogModal = crud.showAdd;
export const showEditBlogModal = crud.showEdit;
export const getCurrentBlogId = crud.getCurrentId;
