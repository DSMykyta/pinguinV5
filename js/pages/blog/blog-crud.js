// js/pages/blog/blog-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                        BLOG — CRUD & FORMS                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getBlogPosts, addBlogPost, updateBlogPost, deleteBlogPost } from './blog-data.js';
import { initCustomSelects } from '../../components/forms/select.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';
import { escapeHtml } from '../../utils/text-utils.js';
import { createHighlightEditor } from '../../components/editor/editor-main.js';

const DEFAULTS = {
    blog_ext_site: ['site-a', 'site-b'],
    blog_target: ['home', 'category', 'product', 'blog'],
    blog_group: ['hero', 'top', 'middle', 'bottom', 'sidebar'],
    blog_type: ['article', 'news', 'promo'],
    status: ['active', 'draft', 'hidden', 'inactive']
};

function getDynamicOptions(fieldName, currentValue = '') {
    const fromData = getBlogPosts()
        .map(item => String(item[fieldName] || '').trim())
        .filter(Boolean);
    if (currentValue) fromData.push(String(currentValue).trim());

    return [...new Set([...(DEFAULTS[fieldName] || []), ...fromData])].sort((a, b) => a.localeCompare(b));
}

function renderSelectOptions(options, selectedValue) {
    return options
        .map(value => `<option value="${escapeHtml(value)}" ${String(selectedValue || '') === value ? 'selected' : ''}>${escapeHtml(value)}</option>`)
        .join('');
}

function readRowFields(rowEl, fieldNames) {
    const result = {};
    fieldNames.forEach((name) => {
        const input = rowEl.querySelector(`[name="${name}"]`);
        result[name] = input ? input.value.trim() : '';
    });
    return result;
}

export function renderBlogEditRow(row) {
    const rowId = String(row.blog_id || 'blog').replace(/[^\w-]/g, '_');
    const extSiteOptions = renderSelectOptions(getDynamicOptions('blog_ext_site', row.blog_ext_site), row.blog_ext_site);
    const targetOptions = renderSelectOptions(getDynamicOptions('blog_target', row.blog_target), row.blog_target);
    const groupOptions = renderSelectOptions(getDynamicOptions('blog_group', row.blog_group), row.blog_group);
    const typeOptions = renderSelectOptions(getDynamicOptions('blog_type', row.blog_type), row.blog_type);
    const statusOptions = renderSelectOptions(getDynamicOptions('status', row.status), row.status);

    return `
        <div class="grid" style="padding: 12px 16px;">
            <div class="group column col-3">
                <label for="${rowId}-blog-ext-id" class="label-l">EXT ID</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-blog-ext-id" name="blog_ext_id" placeholder="external-id" value="${escapeHtml(row.blog_ext_id || '')}">
                </div></div></div>
            </div>
            <div class="group column col-3">
                <label for="${rowId}-blog-ext-site" class="label-l">EXT Site</label>
                <div class="content-bloc"><div class="content-line">
                    <select id="${rowId}-blog-ext-site" name="blog_ext_site" data-custom-select placeholder="Оберіть site">
                        <option value="">— Оберіть —</option>
                        ${extSiteOptions}
                    </select>
                </div></div>
            </div>
            <div class="group column col-3">
                <label for="${rowId}-blog-target" class="label-l">Target</label>
                <div class="content-bloc"><div class="content-line">
                    <select id="${rowId}-blog-target" name="blog_target" data-custom-select placeholder="Оберіть target">
                        <option value="">— Оберіть —</option>
                        ${targetOptions}
                    </select>
                </div></div>
            </div>
            <div class="group column col-3">
                <label for="${rowId}-blog-group" class="label-l">Group</label>
                <div class="content-bloc"><div class="content-line">
                    <select id="${rowId}-blog-group" name="blog_group" data-custom-select placeholder="Оберіть group">
                        <option value="">— Оберіть —</option>
                        ${groupOptions}
                    </select>
                </div></div>
            </div>

            <div class="group column col-3">
                <label for="${rowId}-blog-type" class="label-l">Type</label>
                <div class="content-bloc"><div class="content-line">
                    <select id="${rowId}-blog-type" name="blog_type" data-custom-select placeholder="Оберіть type">
                        <option value="">— Оберіть —</option>
                        ${typeOptions}
                    </select>
                </div></div>
            </div>
            <div class="group column col-3">
                <label for="${rowId}-blog-sort-order" class="label-l">Sort Order</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-blog-sort-order" name="blog_sort_order" placeholder="0" value="${escapeHtml(row.blog_sort_order || '')}">
                </div></div></div>
            </div>
            <div class="group column col-3">
                <label for="${rowId}-blog-status" class="label-l">Status</label>
                <div class="content-bloc"><div class="content-line">
                    <select id="${rowId}-blog-status" name="status" data-custom-select placeholder="Оберіть status">
                        <option value="">— Оберіть —</option>
                        ${statusOptions}
                    </select>
                </div></div>
            </div>
            <div class="group column col-3">
                <label for="${rowId}-image-url" class="label-l">Image URL</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-image-url" name="image_url" placeholder="https://..." value="${escapeHtml(row.image_url || '')}">
                </div></div></div>
            </div>

            <div class="group column col-6">
                <label for="${rowId}-blog-name-ua" class="label-l">Назва UA</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-blog-name-ua" name="blog_name_ua" placeholder="Назва UA" value="${escapeHtml(row.blog_name_ua || '')}">
                </div></div></div>
            </div>
            <div class="group column col-6">
                <label for="${rowId}-blog-name-ru" class="label-l">Назва RU</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-blog-name-ru" name="blog_name_ru" placeholder="Назва RU" value="${escapeHtml(row.blog_name_ru || '')}">
                </div></div></div>
            </div>

            <div class="group column col-4">
                <label for="${rowId}-url-ua" class="label-l">URL UA</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-url-ua" name="url_ua" placeholder="/ua/..." value="${escapeHtml(row.url_ua || '')}">
                </div></div></div>
            </div>
            <div class="group column col-4">
                <label for="${rowId}-url-ru" class="label-l">URL RU</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-url-ru" name="url_ru" placeholder="/ru/..." value="${escapeHtml(row.url_ru || '')}">
                </div></div></div>
            </div>
            <div class="group column col-4">
                <label for="${rowId}-url" class="label-l">URL</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-url" name="url" placeholder="https://..." value="${escapeHtml(row.url || '')}">
                </div></div></div>
            </div>

            <div class="group column col-6">
                <label for="${rowId}-display-none-ua" class="label-l">display_none UA</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-display-none-ua" name="blog_display_none_ua" placeholder="0 / 1" value="${escapeHtml(row.blog_display_none_ua || '')}">
                </div></div></div>
            </div>
            <div class="group column col-6">
                <label for="${rowId}-display-none-ru" class="label-l">display_none RU</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-display-none-ru" name="blog_display_none_ru" placeholder="0 / 1" value="${escapeHtml(row.blog_display_none_ru || '')}">
                </div></div></div>
            </div>

            <div class="group column col-6">
                <label class="label-l">Текст UA</label>
                <div class="content-bloc"><div class="content-line">
                    <div id="${rowId}-blog-text-ua" class="highlight-editor-container" data-field="blog_text_ua"
                         editor tools code data-placeholder="Введіть текст UA..." data-min-height="200"
                         data-initial-value="${escapeHtml(row.blog_text_ua || '')}"></div>
                </div></div>
            </div>
            <div class="group column col-6">
                <label class="label-l">Текст RU</label>
                <div class="content-bloc"><div class="content-line">
                    <div id="${rowId}-blog-text-ru" class="highlight-editor-container" data-field="blog_text_ru"
                         editor tools code data-placeholder="Введіть текст RU..." data-min-height="200"
                         data-initial-value="${escapeHtml(row.blog_text_ru || '')}"></div>
                </div></div>
            </div>

            <div class="group column col-6">
                <label for="${rowId}-created-at" class="label-l">Створено</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-created-at" name="created_at" placeholder="YYYY-MM-DD HH:mm:ss" value="${escapeHtml(row.created_at || '')}">
                </div></div></div>
            </div>
            <div class="group column col-6">
                <label for="${rowId}-created-by" class="label-l">Хто створив</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-created-by" name="created_by" placeholder="User" value="${escapeHtml(row.created_by || '')}">
                </div></div></div>
            </div>
        </div>
    `;
}

export function handleBlogExpand(rowEl) {
    initCustomSelects(rowEl);

    rowEl.querySelectorAll('.highlight-editor-container[data-field]').forEach(container => {
        const initialValue = container.dataset.initialValue || '';
        const editor = createHighlightEditor(container, { initialValue });
        container._editorApi = editor;
    });
}

export async function handleBlogSave(rowEl, row, managedTable) {
    const saveBtn = rowEl.querySelector('[data-action="expand-save"]');
    if (saveBtn) {
        saveBtn.classList.add('loading');
        saveBtn.disabled = true;
    }

    try {
        const updates = readRowFields(rowEl, [
            'blog_ext_id',
            'blog_ext_site',
            'blog_target',
            'blog_group',
            'blog_type',
            'blog_sort_order',
            'status',
            'blog_name_ua',
            'blog_name_ru',
            'url_ua',
            'url_ru',
            'url',
            'blog_display_none_ua',
            'blog_display_none_ru',
            'image_url',
            'created_at',
            'created_by'
        ]);

        const editorUa = rowEl.querySelector('[data-field="blog_text_ua"]');
        const editorRu = rowEl.querySelector('[data-field="blog_text_ru"]');
        updates.blog_text_ua = editorUa?._editorApi?.getValue() || '';
        updates.blog_text_ru = editorRu?._editorApi?.getValue() || '';

        await updateBlogPost(row.blog_id, updates);
        managedTable?.refilter?.();

        const closeBtn = rowEl.querySelector('[data-action="expand-close"]');
        if (closeBtn) closeBtn.click();

        showToast('Пост оновлено', 'success');
    } catch (error) {
        console.error('Помилка збереження поста:', error);
        showToast('Помилка збереження поста', 'error');
    } finally {
        if (saveBtn) {
            saveBtn.classList.remove('loading');
            saveBtn.disabled = false;
        }
    }
}

export async function handleBlogDelete(rowEl, row, managedTable) {
    const deleteBtn = rowEl.querySelector('[data-action="expand-delete"]');
    if (deleteBtn) {
        deleteBtn.classList.add('loading');
        deleteBtn.disabled = true;
    }

    try {
        const confirmed = await showConfirmModal({
            action: 'видалити',
            entity: 'пост',
            name: row.blog_id
        });
        if (!confirmed) return;

        await deleteBlogPost(row.blog_id);
        managedTable?.updateData?.(getBlogPosts());
        showToast(`Пост ${row.blog_id} видалено`, 'success');
    } catch (error) {
        console.error('Помилка видалення поста:', error);
        showToast('Помилка видалення поста', 'error');
    } finally {
        if (deleteBtn) {
            deleteBtn.classList.remove('loading');
            deleteBtn.disabled = false;
        }
    }
}

export async function handleBlogAdd(managedTable, defaultType = 'blog') {
    try {
        const newPost = await addBlogPost({
            blog_ext_id: '',
            blog_ext_site: '',
            blog_target: '',
            blog_group: '',
            blog_type: defaultType,
            blog_sort_order: String(getBlogPosts().length + 1),
            status: 'active',
            blog_name_ua: '',
            blog_name_ru: '',
            url_ua: '',
            url_ru: '',
            url: '',
            blog_display_none_ua: '',
            blog_display_none_ru: '',
            blog_text_ua: '',
            blog_text_ru: '',
            image_url: ''
        });

        managedTable?.updateData?.(getBlogPosts());
        showToast(`Пост ${newPost.blog_id} додано`, 'success');

        setTimeout(() => {
            const escapedId = window.CSS?.escape
                ? window.CSS.escape(newPost.blog_id)
                : String(newPost.blog_id).replace(/"/g, '\\"');
            const row = document.querySelector(`.pseudo-table-row[data-row-id="${escapedId}"]`);
            const openBtn = row?.querySelector('[data-action="expand-edit"]');
            openBtn?.click();
        }, 0);
    } catch (error) {
        console.error('Помилка додавання поста:', error);
        showToast('Помилка додавання поста', 'error');
    }
}
