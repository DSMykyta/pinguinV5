// js/pages/redirect-target/redirect-target-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    REDIRECT TARGET - CRUD & FORMS                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { updateRedirect } from './redirect-target-data.js';

export function renderRedirectEditRow(row) {
    return `
        <div class="grid">
            <div class="col-3">
                <div class="form-group">
                    <label class="input-label">Вхідний URL (redirect_in)</label>
                    <input type="text" class="input-box" name="redirect_in" value="${row.redirect_in || ''}">
                </div>
            </div>
            <div class="col-3">
                <div class="form-group">
                    <label class="input-label">Вихідний URL (redirect_out)</label>
                    <input type="text" class="input-box" name="redirect_out" value="${row.redirect_out || ''}">
                </div>
            </div>
            <div class="col-2">
                <div class="form-group">
                    <label class="input-label">Ціль (redirect_target)</label>
                    <input type="text" class="input-box" name="redirect_target" value="${row.redirect_target || ''}">
                </div>
            </div>
            <div class="col-2">
                <div class="form-group">
                    <label class="input-label">Сутність (redirect_entity)</label>
                    <input type="text" class="input-box" name="redirect_entity" value="${row.redirect_entity || ''}">
                </div>
            </div>
        </div>
    `;
}

export async function handleRedirectSave(rowEl, row, tableAPI) {
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
        
        if (tableAPI) {
            tableAPI.updateRow(row.redirect_id, updates);
            
            const closeBtn = rowEl.querySelector('[data-action="expand-close"]');
            if (closeBtn) closeBtn.click();
        }
    } catch (err) {
        console.error('Помилка збереження редиректу:', err);
    } finally {
        if (saveBtn) {
            saveBtn.classList.remove('loading');
            saveBtn.disabled = false;
        }
    }
}