// js/pages/banners/banners-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      BANNERS — CRUD & FORMS                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getBanners, addBanner, updateBanner, deleteBanner } from './banners-data.js';
import { initCustomSelects } from '../../components/forms/select.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';
import { escapeHtml } from '../../utils/text-utils.js';
import { createHighlightEditor } from '../../components/editor/editor-main.js';

const DEFAULTS = {
    banner_target: ['home', 'category', 'product', 'blog'],
    banner_group: ['hero', 'top', 'middle', 'bottom', 'sidebar'],
    banner_type: ['image', 'text', 'promo'],
    status: ['active', 'draft', 'hidden', 'inactive']
};

function getDynamicOptions(fieldName, currentValue = '') {
    const fromData = getBanners()
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

export function renderBannerEditRow(row) {
    const rowId = String(row.banner_id || 'banner').replace(/[^\w-]/g, '_');
    const targetOptions = renderSelectOptions(getDynamicOptions('banner_target', row.banner_target), row.banner_target);
    const groupOptions = renderSelectOptions(getDynamicOptions('banner_group', row.banner_group), row.banner_group);
    const typeOptions = renderSelectOptions(getDynamicOptions('banner_type', row.banner_type), row.banner_type);
    const statusOptions = renderSelectOptions(getDynamicOptions('status', row.status), row.status);

    return `
        <div class="grid" style="padding: 12px 16px;">
            <div class="group column col-3">
                <label for="${rowId}-banner-target" class="label-l">Target</label>
                <div class="content-bloc"><div class="content-line">
                    <select id="${rowId}-banner-target" name="banner_target" data-custom-select placeholder="Оберіть target">
                        <option value="">— Оберіть —</option>
                        ${targetOptions}
                    </select>
                </div></div>
            </div>
            <div class="group column col-3">
                <label for="${rowId}-banner-group" class="label-l">Group</label>
                <div class="content-bloc"><div class="content-line">
                    <select id="${rowId}-banner-group" name="banner_group" data-custom-select placeholder="Оберіть group">
                        <option value="">— Оберіть —</option>
                        ${groupOptions}
                    </select>
                </div></div>
            </div>
            <div class="group column col-3">
                <label for="${rowId}-banner-type" class="label-l">Type</label>
                <div class="content-bloc"><div class="content-line">
                    <select id="${rowId}-banner-type" name="banner_type" data-custom-select placeholder="Оберіть type">
                        <option value="">— Оберіть —</option>
                        ${typeOptions}
                    </select>
                </div></div>
            </div>
            <div class="group column col-3">
                <label for="${rowId}-banner-status" class="label-l">Status</label>
                <div class="content-bloc"><div class="content-line">
                    <select id="${rowId}-banner-status" name="status" data-custom-select placeholder="Оберіть status">
                        <option value="">— Оберіть —</option>
                        ${statusOptions}
                    </select>
                </div></div>
            </div>

            <div class="group column col-3">
                <label for="${rowId}-banner-sort-order" class="label-l">Sort Order</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-banner-sort-order" name="banner_sort_order" placeholder="0" value="${escapeHtml(row.banner_sort_order || '')}">
                </div></div></div>
            </div>
            <div class="group column col-9">
                <label for="${rowId}-image-url" class="label-l">Image URL</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-image-url" name="image_url" placeholder="https://..." value="${escapeHtml(row.image_url || '')}">
                </div></div></div>
            </div>

            <div class="group column col-6">
                <label for="${rowId}-banner-name-ua" class="label-l">Назва UA</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-banner-name-ua" name="banner_name_ua" placeholder="Назва UA" value="${escapeHtml(row.banner_name_ua || '')}">
                </div></div></div>
            </div>
            <div class="group column col-6">
                <label for="${rowId}-banner-name-ru" class="label-l">Назва RU</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-banner-name-ru" name="banner_name_ru" placeholder="Назва RU" value="${escapeHtml(row.banner_name_ru || '')}">
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
                <label class="label-l">Текст UA</label>
                <div class="content-bloc"><div class="content-line">
                    <div id="${rowId}-banner-text-ua" class="highlight-editor-container" data-field="banner_text_ua"
                         editor tools code data-placeholder="Введіть текст UA..." data-min-height="200"
                         data-initial-value="${escapeHtml(row.banner_text_ua || '')}"></div>
                </div></div>
            </div>
            <div class="group column col-6">
                <label class="label-l">Текст RU</label>
                <div class="content-bloc"><div class="content-line">
                    <div id="${rowId}-banner-text-ru" class="highlight-editor-container" data-field="banner_text_ru"
                         editor tools code data-placeholder="Введіть текст RU..." data-min-height="200"
                         data-initial-value="${escapeHtml(row.banner_text_ru || '')}"></div>
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

export function handleBannerExpand(rowEl) {
    initCustomSelects(rowEl);

    rowEl.querySelectorAll('.highlight-editor-container[data-field]').forEach(container => {
        const initialValue = container.dataset.initialValue || '';
        const editor = createHighlightEditor(container, { initialValue });
        container._editorApi = editor;
    });
}

export async function handleBannerSave(rowEl, row, managedTable) {
    const saveBtn = rowEl.querySelector('[data-action="expand-save"]');
    if (saveBtn) {
        saveBtn.classList.add('loading');
        saveBtn.disabled = true;
    }

    try {
        const updates = readRowFields(rowEl, [
            'banner_target',
            'banner_group',
            'banner_type',
            'banner_sort_order',
            'status',
            'banner_name_ua',
            'banner_name_ru',
            'url_ua',
            'url_ru',
            'url',
            'image_url',
            'created_at',
            'created_by'
        ]);

        const editorUa = rowEl.querySelector('[data-field="banner_text_ua"]');
        const editorRu = rowEl.querySelector('[data-field="banner_text_ru"]');
        updates.banner_text_ua = editorUa?._editorApi?.getValue() || '';
        updates.banner_text_ru = editorRu?._editorApi?.getValue() || '';

        await updateBanner(row.banner_id, updates);
        managedTable?.refilter?.();

        const closeBtn = rowEl.querySelector('[data-action="expand-close"]');
        if (closeBtn) closeBtn.click();

        showToast('Банер оновлено', 'success');
    } catch (error) {
        console.error('Помилка збереження банера:', error);
        showToast('Помилка збереження банера', 'error');
    } finally {
        if (saveBtn) {
            saveBtn.classList.remove('loading');
            saveBtn.disabled = false;
        }
    }
}

export async function handleBannerDelete(rowEl, row, managedTable) {
    const deleteBtn = rowEl.querySelector('[data-action="expand-delete"]');
    if (deleteBtn) {
        deleteBtn.classList.add('loading');
        deleteBtn.disabled = true;
    }

    try {
        const confirmed = await showConfirmModal({
            action: 'видалити',
            entity: 'банер',
            name: row.banner_id
        });
        if (!confirmed) return;

        await deleteBanner(row.banner_id);
        managedTable?.updateData?.(getBanners());
        showToast(`Банер ${row.banner_id} видалено`, 'success');
    } catch (error) {
        console.error('Помилка видалення банера:', error);
        showToast('Помилка видалення банера', 'error');
    } finally {
        if (deleteBtn) {
            deleteBtn.classList.remove('loading');
            deleteBtn.disabled = false;
        }
    }
}

export async function handleBannerAdd(managedTable) {
    try {
        const newBanner = await addBanner({
            banner_target: '',
            banner_group: '',
            banner_type: '',
            banner_sort_order: String(getBanners().length + 1),
            status: 'active',
            banner_name_ua: '',
            banner_name_ru: '',
            url_ua: '',
            url_ru: '',
            url: '',
            banner_text_ua: '',
            banner_text_ru: '',
            image_url: ''
        });

        managedTable?.updateData?.(getBanners());
        showToast(`Банер ${newBanner.banner_id} додано`, 'success');

        setTimeout(() => {
            const escapedId = window.CSS?.escape
                ? window.CSS.escape(newBanner.banner_id)
                : String(newBanner.banner_id).replace(/"/g, '\\"');
            const row = document.querySelector(`.pseudo-table-row[data-row-id="${escapedId}"]`);
            const openBtn = row?.querySelector('[data-action="expand-edit"]');
            openBtn?.click();
        }, 0);
    } catch (error) {
        console.error('Помилка додавання банера:', error);
        showToast('Помилка додавання банера', 'error');
    }
}
