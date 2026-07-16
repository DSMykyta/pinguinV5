// js/pages/entities/entities-categories-characteristics.js

/**
 * Related characteristics section inside the category CRUD modal.
 */

import {
    getCharacteristics,
    getOptions,
    updateCharacteristic
} from '../../data/entities-data.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';
import { initCustomSelects } from '../../components/forms/select.js';
import { escapeHtml } from '../../utils/utils-text.js';
import { createModalOverlay } from './entities-utils.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import { initPaginationCharm } from '../../components/charms/pagination/pagination-main.js';
import { initSearchCharm } from '../../components/charms/charm-search.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';

async function showAddCharacteristicToCategoryModal(categoryId, onSuccess) {
    const allCharacteristics = getCharacteristics();

    const availableChars = allCharacteristics.filter(char => {
        if (!char.category_ids) return true;
        const ids = Array.isArray(char.category_ids)
            ? char.category_ids
            : String(char.category_ids).split(',').map(id => id.trim());
        return !ids.includes(categoryId);
    });

    if (availableChars.length === 0) {
        showToast('Всi характеристики вже прив\'язанi до цiєї категорiї', 'info');
        return;
    }

    const modalHtml = `
        <div class="modal-overlay open">
            <div class="modal-container modal-small">
                <div class="modal-header">
                    <h2 class="modal-title">Додати характеристику</h2>
                    <div class="group">
                        <button class="btn-icon modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="group column">
                        <label for="select-char-to-add">Оберiть характеристику</label>
                        <select id="select-char-to-add" data-custom-select placeholder="Оберiть характеристику">
                            <option value="">-- Оберiть --</option>
                            ${availableChars.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name_ua || c.id)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-outline modal-cancel-btn">Скасувати</button>
                    <button class="btn-primary modal-confirm-btn">Додати</button>
                </div>
            </div>
        </div>
    `;

    const overlay = createModalOverlay(modalHtml);
    document.body.appendChild(overlay);
    initCustomSelects(overlay);

    const closeBtn = overlay.querySelector('.modal-close-btn');
    const cancelBtn = overlay.querySelector('.modal-cancel-btn');
    const confirmBtn = overlay.querySelector('.modal-confirm-btn');
    const selectEl = overlay.querySelector('#select-char-to-add');

    const cleanup = () => {
        overlay.remove();
    };

    closeBtn?.addEventListener('click', cleanup);
    cancelBtn?.addEventListener('click', cleanup);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup();
    });

    confirmBtn?.addEventListener('click', async () => {
        const charId = selectEl?.value;
        if (!charId) {
            showToast('Оберiть характеристику', 'warning');
            return;
        }

        try {
            const char = allCharacteristics.find(c => c.id === charId);
            if (!char) return;

            let categoryIds = [];
            if (char.category_ids) {
                categoryIds = Array.isArray(char.category_ids)
                    ? [...char.category_ids]
                    : String(char.category_ids).split(',').map(id => id.trim());
            }
            categoryIds.push(categoryId);

            await updateCharacteristic(charId, { category_ids: categoryIds.join(',') });
            showToast('Характеристику прив\'язано', 'success');
            cleanup();
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Помилка прив\'язування:', error);
            showToast('Помилка прив\'язування характеристики', 'error');
        }
    });
}

export function populateRelatedCharacteristics(categoryId) {
    if (!document.getElementById('category-related-chars')) return;

    const loadData = () => {
        const characteristics = getCharacteristics();
        return characteristics.filter(char => {
            if (!char.category_ids) return false;
            const ids = Array.isArray(char.category_ids)
                ? char.category_ids
                : String(char.category_ids).split(',').map(id => id.trim());
            return ids.includes(categoryId);
        });
    };

    const allOptions = getOptions();

    registerActionHandlers('category-characteristics', {
        edit: async (rowId) => {
            const { showEditCharacteristicModal } = await import('./entities-characteristics.js');
            await showEditCharacteristicModal(rowId);
        },
        unlink: async (rowId, data) => {
            await handleUnlinkCharacteristic(rowId, data.name, categoryId);
        }
    });

    let catCharsCleanup = null;

    const managed = createManagedTable({
        container: 'category-related-chars',
        columns: [
            { ...col('id', 'ID', 'tag', { span: 1 }), searchable: true },
            { ...col('category_ids', 'Категорiя', 'binding-chip', { span: 2 }), searchable: true, searchChecked: false },
            { ...col('name_ua', 'Назва', 'name', { span: 4 }), searchable: true },
            { ...col('type', 'Тип', 'code'), searchable: true, searchChecked: false },
            col('optCount', 'Опцiї', 'counter', {
                sortable: true,
                render: (value, row) => {
                    const count = allOptions.filter(o => o.characteristic_id === row.id).length;
                    const cls = count === 0 ? 'chip' : 'chip c-secondary';
                    return `<span class="${cls}">${count}</span>`;
                }
            }),
            col('action', ' ', 'action', {
                render: (value, row) => actionButton({
                    action: 'unlink',
                    rowId: row.id,
                    data: { name: row.name_ua || row.id }
                })
            })
        ],
        data: loadData(),
        statsId: null,
        paginationId: null,
        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: (row) => actionButton({ action: 'edit', rowId: row.id }),
            getRowId: (row) => row.id,
            emptyState: { message: 'Характеристики вiдсутнi' },
            withContainer: false,
            onAfterRender: (cont) => {
                if (catCharsCleanup) catCharsCleanup();
                catCharsCleanup = initActionHandlers(cont, 'category-characteristics');
            },
            plugins: {
                sorting: { columnTypes: { id: 'id-text', name_ua: 'string' } }
            }
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'cat-chars'
    });

    initPaginationCharm();
    initSearchCharm();
    initColumnsCharm();

    const container = document.getElementById('category-related-chars');
    if (container) {
        container.addEventListener('charm:refresh', () => {
            managed.setData(loadData());
        });
    }

    const handleUnlinkCharacteristic = async (charId, charName, catId) => {
        const confirmed = await showConfirmModal({
            action: 'вiд\'язати',
            entity: 'характеристику',
            name: charName,
        });

        if (confirmed) {
            try {
                const characteristics = getCharacteristics();
                const char = characteristics.find(c => c.id === charId);
                if (!char) return;

                const currentIds = char.category_ids
                    ? String(char.category_ids).split(',').map(id => id.trim()).filter(id => id)
                    : [];
                const newIds = currentIds.filter(id => id !== catId);

                await updateCharacteristic(charId, { category_ids: newIds.join(',') });
                showToast('Характеристику вiдв\'язано', 'success');
                managed.setData(loadData());
            } catch (error) {
                console.error('Помилка вiдв\'язування:', error);
                showToast('Помилка вiдв\'язування характеристики', 'error');
            }
        }
    };

    const addBtn = document.getElementById('btn-add-category-char');
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            await showAddCharacteristicToCategoryModal(categoryId, () => {
                managed.setData(loadData());
            });
        });
    }
}
