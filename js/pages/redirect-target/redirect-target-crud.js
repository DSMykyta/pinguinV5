// js/pages/redirect-target/redirect-target-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    REDIRECT TARGET - CRUD & FORMS                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getRedirects, updateRedirect, deleteRedirect } from './redirect-target-data.js';
import { redirectTargetState } from './redirect-target-state.js';
import { initCustomSelects } from '../../components/forms/select.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';
import { escapeHtml } from '../../utils/text-utils.js';

const DEFAULT_REDIRECT_TARGET_OPTIONS = ['f-s'];

function getRedirectTargetOptions(currentValue = '') {
    const dynamicValues = (redirectTargetState.redirects || [])
        .map(item => String(item.redirect_target || '').trim())
        .filter(Boolean);

    const fromCurrent = String(currentValue || '').trim();
    if (fromCurrent) dynamicValues.push(fromCurrent);

    return [...new Set([...DEFAULT_REDIRECT_TARGET_OPTIONS, ...dynamicValues])].sort((a, b) => a.localeCompare(b));
}

export function renderRedirectEditRow(row) {
    const rowId = String(row.redirect_id || 'redirect').replace(/[^\w-]/g, '_');
    const targetSelectId = `${rowId}-redirect-target`;
    const targetOptions = getRedirectTargetOptions(row.redirect_target)
        .map(value => `<option value="${escapeHtml(value)}" ${row.redirect_target === value ? 'selected' : ''}>${escapeHtml(value)}</option>`)
        .join('');

    return `
        <div class="grid" style="padding: 12px 16px;">
            <div class="group column col-3">
                <label for="${rowId}-redirect-in" class="label-l">Вхідний URL</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-redirect-in" name="redirect_in" placeholder="Вхідний URL" value="${escapeHtml(row.redirect_in || '')}">
                </div></div></div>
            </div>
            <div class="group column col-3">
                <label for="${rowId}-redirect-out" class="label-l">Вихідний URL</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-redirect-out" name="redirect_out" placeholder="Вихідний URL" value="${escapeHtml(row.redirect_out || '')}">
                </div></div></div>
            </div>
            <div class="group column col-3">
                <label for="${targetSelectId}" class="label-l">Ціль</label>
                <div class="content-bloc"><div class="content-line">
                    <select id="${targetSelectId}" name="redirect_target" data-custom-select placeholder="Оберіть ціль">
                        <option value="">— Оберіть —</option>
                        ${targetOptions}
                    </select>
                </div></div>
            </div>
            <div class="group column col-3">
                <label for="${rowId}-redirect-entity" class="label-l">Сутність</label>
                <div class="content-bloc"><div class="content-line"><div class="input-box">
                    <input type="text" id="${rowId}-redirect-entity" name="redirect_entity" placeholder="Сутність" value="${escapeHtml(row.redirect_entity || '')}">
                </div></div></div>
            </div>
        </div>
    `;
}

export function handleRedirectExpand(rowEl) {
    initCustomSelects(rowEl);
}

export async function handleRedirectSave(rowEl, row, managedTable) {
    const saveBtn = rowEl.querySelector('[data-action="expand-save"]');
    if (saveBtn) {
        saveBtn.classList.add('loading');
        saveBtn.disabled = true;
    }
    
    try {
        const updates = {
            redirect_in: rowEl.querySelector('[name="redirect_in"]').value.trim(),
            redirect_out: rowEl.querySelector('[name="redirect_out"]').value.trim(),
            redirect_target: rowEl.querySelector('[name="redirect_target"]').value.trim(),
            redirect_entity: rowEl.querySelector('[name="redirect_entity"]').value.trim()
        };
        
        await updateRedirect(row.redirect_id, updates);
        managedTable?.refilter?.();

        const closeBtn = rowEl.querySelector('[data-action="expand-close"]');
        if (closeBtn) closeBtn.click();

        showToast('Редирект оновлено', 'success');
    } catch (err) {
        console.error('Помилка збереження редиректу:', err);
        showToast('Помилка збереження редиректу', 'error');
    } finally {
        if (saveBtn) {
            saveBtn.classList.remove('loading');
            saveBtn.disabled = false;
        }
    }
}

export async function handleRedirectDelete(rowEl, row, managedTable) {
    const deleteBtn = rowEl.querySelector('[data-action="expand-delete"]');
    if (deleteBtn) {
        deleteBtn.classList.add('loading');
        deleteBtn.disabled = true;
    }

    try {
        const confirmed = await showConfirmModal({
            action: 'видалити',
            entity: 'редирект',
            name: row.redirect_id
        });
        if (!confirmed) return;

        await deleteRedirect(row.redirect_id);
        managedTable?.updateData?.(getRedirects());
        showToast(`Редирект ${row.redirect_id} видалено`, 'success');
    } catch (err) {
        console.error('Помилка видалення редиректу:', err);
        showToast('Помилка видалення редиректу', 'error');
    } finally {
        if (deleteBtn) {
            deleteBtn.classList.remove('loading');
            deleteBtn.disabled = false;
        }
    }
}
