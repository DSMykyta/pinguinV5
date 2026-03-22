// js/config/pages/redirect-target.config.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    ENTITY CONFIG — РЕДИРЕКТИ                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Конфігурація сутності для page-entity.js                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { escapeHtml } from '../../utils/utils-text.js';
import { initCustomSelects } from '../../components/forms/select.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';

const DEFAULT_TARGET_OPTIONS = ['f-s'];

function getTargetOptions(allItems, currentValue = '') {
    const fromData = allItems
        .map(item => String(item.redirect_target || '').trim())
        .filter(Boolean);
    if (currentValue) fromData.push(String(currentValue).trim());
    return [...new Set([...DEFAULT_TARGET_OPTIONS, ...fromData])].sort();
}

function renderEditRow(row, allItems) {
    const rowId = String(row.redirect_id || 'redirect').replace(/[^\w-]/g, '_');
    const targetSelectId = `${rowId}-redirect-target`;
    const targetOptions = getTargetOptions(allItems, row.redirect_target)
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

export default {
    name: 'redirect-target',
    entityName: 'Редирект',

    dataSource: {
        spreadsheetType: 'products',
        sheetName: 'RedirectTarget',
        sheetGid: '1641646787',
        idField: 'redirect_id',
        idPrefix: 'redir-',
        stateKey: 'redirects',
        columns: [
            'redirect_id', 'redirect_in', 'redirect_out',
            'redirect_target', 'redirect_entity'
        ],
    },

    table: {
        containerId: 'redirect-target-table-container',
        columns: [
            { id: 'redirect_id', label: 'ID', type: 'tag', span: 2, sortable: true },
            { id: 'redirect_in', label: 'Вхідний URL', type: 'code', span: 3, sortable: true },
            { id: 'redirect_out', label: 'Вихідний URL', type: 'code', span: 3, sortable: true },
            {
                id: 'redirect_target', label: 'Ціль', type: 'words-list', span: 2,
                sortable: true, filterable: true,
                render: (value) => value
                    ? `<span class="tag c-main">${escapeHtml(value)}</span>`
                    : '<span class="text-muted">—</span>'
            },
            { id: 'redirect_entity', label: 'Сутність', type: 'text', span: 2, sortable: true },
        ],
        searchColumns: ['redirect_id', 'redirect_in', 'redirect_out', 'redirect_target', 'redirect_entity'],
        emptyMessage: 'Редиректи не знайдено',
        actions: [],
    },

    crud: null,

    page: {
        containers: ['redirect-target-table-container'],
    },

    extensions: [redirectExpandableExtension, redirectUIExtension],
};

// ═══════════════════════════════════════════════════════════════════════════
// EXTENSIONS
// ═══════════════════════════════════════════════════════════════════════════

function redirectExpandableExtension({ state, plugins, data, config }) {
    // Set expandable config on the table config before table init
    // Extensions run during createEntity(), before page.init()
    config.table.expandable = {
        renderContent: (row) => renderEditRow(row, data.getAll()),
        renderFooterLeft: () => `
            <button type="button" class="btn-icon danger" data-action="expand-delete" aria-label="Видалити">
                <span class="material-symbols-outlined">delete</span>
            </button>`,
        showOpenFullButton: false,
        onExpand: (rowEl) => initCustomSelects(rowEl),
        onSave: async (rowEl, row) => {
            const saveBtn = rowEl.querySelector('[data-action="expand-save"]');
            if (saveBtn) { saveBtn.classList.add('loading'); saveBtn.disabled = true; }
            try {
                const updates = {
                    redirect_in: rowEl.querySelector('[name="redirect_in"]').value.trim(),
                    redirect_out: rowEl.querySelector('[name="redirect_out"]').value.trim(),
                    redirect_target: rowEl.querySelector('[name="redirect_target"]').value.trim(),
                    redirect_entity: rowEl.querySelector('[name="redirect_entity"]').value.trim()
                };
                await data.update(row.redirect_id, updates);
                state.managedTable?.refilter?.();
                rowEl.querySelector('[data-action="expand-close"]')?.click();
                showToast('Редирект оновлено', 'success');
            } catch (err) {
                console.error('Помилка збереження редиректу:', err);
                showToast('Помилка збереження редиректу', 'error');
            } finally {
                if (saveBtn) { saveBtn.classList.remove('loading'); saveBtn.disabled = false; }
            }
        },
        onDelete: async (rowEl, row) => {
            const deleteBtn = rowEl.querySelector('[data-action="expand-delete"]');
            if (deleteBtn) { deleteBtn.classList.add('loading'); deleteBtn.disabled = true; }
            try {
                const confirmed = await showConfirmModal({
                    action: 'видалити', entity: 'редирект', name: row.redirect_id
                });
                if (!confirmed) return;
                await data.remove(row.redirect_id);
                state.managedTable?.updateData?.(data.getAll());
                showToast(`Редирект ${row.redirect_id} видалено`, 'success');
            } catch (err) {
                console.error('Помилка видалення:', err);
                showToast('Помилка видалення редиректу', 'error');
            } finally {
                if (deleteBtn) { deleteBtn.classList.remove('loading'); deleteBtn.disabled = false; }
            }
        }
    };
}

function redirectUIExtension({ state, plugins, data }) {
    plugins.registerHook('onInit', () => {
        const tableContainer = document.getElementById('redirect-target-table-container');
        if (tableContainer && !tableContainer._redirectRefreshInit) {
            tableContainer._redirectRefreshInit = true;
            tableContainer.addEventListener('charm:refresh', (e) => {
                const refreshTask = (async () => {
                    await data.load();
                    plugins.runHook('onInit');
                    showToast('Дані оновлено', 'success');
                })();
                if (e?.detail?.waitUntil) e.detail.waitUntil(refreshTask);
            });
        }
    });
}
