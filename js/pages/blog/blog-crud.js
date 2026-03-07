// js/pages/blog/blog-crud.js

/**
 * BLOG — CRUD (MODAL)
 *
 * Modal-based editing for blog posts (consistent with products pattern).
 */

import { getBlogPosts, addBlogPost, updateBlogPost, deleteBlogPost } from './blog-data.js';
import { initCustomSelects } from '../../components/forms/select.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal, showModal, closeModal } from '../../components/modal/modal-main.js';
import { escapeHtml } from '../../utils/text-utils.js';
import { createHighlightEditor } from '../../components/editor/editor-main.js';
import { initSectionNav } from '../../layout/layout-plugin-nav-sections.js';
import { runHook } from './blog-plugins.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let textEditorUa = null;
let textEditorRu = null;
let currentBlogId = null;

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
// SHOW MODALS
// ═══════════════════════════════════════════════════════════════════════════

export async function showAddBlogModal(defaultType = 'blog') {
    currentBlogId = null;

    await showModal('blog-edit', null);

    const title = document.getElementById('blog-modal-title');
    if (title) title.textContent = 'Новий пост';

    const deleteBtn = document.getElementById('btn-delete-blog');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    const badge = document.getElementById('blog-status-badge');
    if (badge) badge.textContent = '';

    clearBlogForm();
    await initModalComponents();

    // Set default type after selects are populated
    const typeEl = document.getElementById('blog-type');
    if (typeEl) typeEl.value = defaultType;

    runHook('onModalOpen', null);
}

export async function showEditBlogModal(blogId) {
    const post = getBlogById(blogId);
    if (!post) {
        showToast('Пост не знайдено', 'error');
        return;
    }

    currentBlogId = blogId;

    await showModal('blog-edit', null);

    const title = document.getElementById('blog-modal-title');
    if (title) title.textContent = post.blog_name_ua || `Пост ${blogId}`;

    const deleteBtn = document.getElementById('btn-delete-blog');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = () => handleDeleteBlog();
    }

    await initModalComponents();
    fillBlogForm(post);

    runHook('onModalOpen', post);
}

export function getCurrentBlogId() {
    return currentBlogId;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL INIT
// ═══════════════════════════════════════════════════════════════════════════

async function initModalComponents() {
    initTextEditors();
    initSaveHandler();
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

function initSaveHandler() {
    const saveBtn = document.getElementById('btn-save-blog');
    if (saveBtn) saveBtn.onclick = () => handleSaveBlog(false);

    const saveCloseBtn = document.getElementById('save-close-blog');
    if (saveCloseBtn) saveCloseBtn.onclick = () => handleSaveBlog(true);
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
    badge.textContent = currentBlogId || '';
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
// SAVE / DELETE
// ═══════════════════════════════════════════════════════════════════════════

async function handleSaveBlog(shouldClose = true) {
    const blogData = getBlogFormData();

    try {
        if (currentBlogId) {
            await updateBlogPost(currentBlogId, blogData);
            showToast('Пост оновлено', 'success');
        } else {
            const newPost = await addBlogPost(blogData);
            currentBlogId = newPost?.blog_id || null;
            showToast(`Пост ${currentBlogId} додано`, 'success');
        }

        if (shouldClose) closeModal('blog-edit');
        runHook('onRender');
    } catch (error) {
        console.error('Помилка збереження поста:', error);
        showToast('Помилка збереження поста', 'error');
    }
}

async function handleDeleteBlog() {
    if (!currentBlogId) return;

    const confirmed = await showConfirmModal({
        action: 'видалити',
        entity: 'пост',
        name: currentBlogId
    });
    if (!confirmed) return;

    try {
        await deleteBlogPost(currentBlogId);
        showToast(`Пост ${currentBlogId} видалено`, 'success');
        closeModal('blog-edit');
        runHook('onRender');
    } catch (error) {
        console.error('Помилка видалення поста:', error);
        showToast('Помилка видалення поста', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('modal-closed', (e) => {
    if (e.detail?.modalId !== 'blog-edit') return;
    cleanupBlogModal();
});

function cleanupBlogModal() {
    currentBlogId = null;

    if (textEditorUa) { textEditorUa.destroy(); textEditorUa = null; }
    if (textEditorRu) { textEditorRu.destroy(); textEditorRu = null; }
}
