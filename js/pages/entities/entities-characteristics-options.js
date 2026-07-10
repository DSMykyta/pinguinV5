// js/pages/entities/entities-characteristics-options.js

/**
 * Related options section inside the characteristic CRUD modal.
 */

import { getOptions, updateOption, addOption } from '../../data/entities-data.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import { initPaginationCharm } from '../../components/charms/pagination/pagination-main.js';
import { initSearchCharm } from '../../components/charms/charm-search.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';
import {
    createModalOverlay,
    closeModalOverlay,
    setupModalCloseHandlers
} from './entities-utils.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';

let relatedOptionsTableAPI = null;

export function clearRelatedOptions() {
    const container = document.getElementById('char-related-options');
    if (!container) return;

    relatedOptionsTableAPI = null;
    container.innerHTML = renderAvatarState('empty', { message: "Опції з'являться після збереження", size: 'medium', containerClass: 'empty-state', avatarClass: 'empty-state-avatar', messageClass: 'avatar-state-message', showMessage: true });
    const searchInput = container._charmSearchInput;
    if (searchInput) searchInput.value = '';
}

export function populateRelatedOptions(characteristicId) {
    if (!document.getElementById('char-related-options')) return;

    const loadData = () => getOptions().filter(opt => opt.characteristic_id === characteristicId);

    registerActionHandlers('characteristic-options', {
        edit: async (rowId) => {
            const { showEditOptionModal } = await import('./entities-options.js');
            await showEditOptionModal(rowId);
        },
        unlink: async (rowId) => {
            const options = getOptions();
            const option = options.find(o => o.id === rowId);
            const optionName = option?.value_ua || rowId;

            const confirmed = await showConfirmModal({
                action: 'від\'язати',
                entity: 'опцію',
                name: optionName,
            });

            if (confirmed) {
                try {
                    await updateOption(rowId, { characteristic_id: '' });
                    showToast('Опцію відв\'язано', 'success');
                    managed.setData(loadData());
                } catch (error) {
                    console.error('❌ Помилка відв\'язування опції:', error);
                    showToast('Помилка відв\'язування опції', 'error');
                }
            }
        }
    });

    let charOptsCleanup = null;

    const managed = createManagedTable({
        container: 'char-related-options',
        columns: [
            { ...col('id', 'ID', 'tag'), searchable: true },
            { ...col('value_ua', 'Значення', 'name', { span: 5 }), searchable: true },
            { ...col('value_ru', 'Назва (RU)', 'text', { span: 3 }), searchable: true, checked: true },
            col('action', ' ', 'action', {
                render: (value, row) => actionButton({
                    action: 'unlink', rowId: row.id,
                    data: { name: row.value_ua || row.id }
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
            emptyState: { message: 'Опції відсутні' },
            withContainer: false,
            onAfterRender: (cont) => {
                if (charOptsCleanup) charOptsCleanup();
                charOptsCleanup = initActionHandlers(cont, 'characteristic-options');
            },
            plugins: {
                sorting: { columnTypes: { id: 'id-text', value_ua: 'string' } }
            }
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'char-opts'
    });

    initPaginationCharm();
    initSearchCharm();
    initColumnsCharm();

    const container = document.getElementById('char-related-options');
    if (container) {
        container.addEventListener('charm:refresh', () => {
            managed.setData(loadData());
        });
    }

    const addOptionBtn = document.getElementById('btn-add-char-option');
    if (addOptionBtn) {
        addOptionBtn.onclick = () => {
            showAddOptionToCharacteristicModal(characteristicId, () => managed.setData(loadData()));
        };
    }
}

function showAddOptionToCharacteristicModal(characteristicId, onSuccess) {
    const modalHtml = `
        <div class="modal-overlay open">
            <div class="modal-container modal-small">
                <div class="modal-header">
                    <h2 class="modal-title">Додати опцію</h2>
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
                        <label for="inline-option-value-ua">
                            Значення (UA) <span class="required">*</span>
                        </label>
                        <input type="text" id="inline-option-value-ua" class="input-main" placeholder="Значення українською" required>
                    </div>
                    <div class="group column">
                        <label for="inline-option-value-ru">Значення (RU)</label>
                        <input type="text" id="inline-option-value-ru" class="input-main" placeholder="Значення російською">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary modal-close-btn">Скасувати</button>
                    <button class="btn-primary" id="inline-option-confirm">
                        <span class="material-symbols-outlined">add</span>
                        <span>Додати</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    const modalOverlay = createModalOverlay(modalHtml);
    const cleanup = () => closeModalOverlay(modalOverlay);

    setupModalCloseHandlers(modalOverlay, cleanup);

    const confirmBtn = document.getElementById('inline-option-confirm');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const valueUa = document.getElementById('inline-option-value-ua')?.value.trim();
            const valueRu = document.getElementById('inline-option-value-ru')?.value.trim();

            if (!valueUa) {
                showToast('Введіть значення опції', 'error');
                return;
            }

            try {
                await addOption({
                    characteristic_id: characteristicId,
                    value_ua: valueUa,
                    value_ru: valueRu || '',
                    sort_order: '0'
                });
                showToast('Опцію додано', 'success');
                cleanup();
                if (onSuccess) onSuccess();
            } catch (error) {
                console.error('❌ Помилка додавання опції:', error);
                showToast('Помилка додавання опції', 'error');
            }
        });
    }
}
