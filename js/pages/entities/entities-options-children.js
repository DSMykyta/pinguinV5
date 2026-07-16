// js/pages/entities/entities-options-children.js

/**
 * Related child options section inside the option CRUD modal.
 */

import { getOptions, updateOption } from '../../data/entities-data.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import { initPaginationCharm } from '../../components/charms/pagination/pagination-main.js';
import { initSearchCharm } from '../../components/charms/charm-search.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';

export function populateRelatedChildOptions(optionId) {
    if (!document.getElementById('option-related-chars')) return;

    const navItem = document.getElementById('nav-option-dependent');
    const section = document.getElementById('section-option-dependent');

    const loadData = () => getOptions().filter(opt => opt.parent_option_id === optionId);
    const initialData = loadData();

    // Приховуємо/показуємо секцію залежно від наявності дочірніх опцій
    const updateVisibility = (data) => {
        if (data.length === 0) {
            navItem?.classList.add('u-hidden');
            section?.classList.add('u-hidden');
        } else {
            navItem?.classList.remove('u-hidden');
            section?.classList.remove('u-hidden');
        }
    };

    updateVisibility(initialData);
    if (initialData.length === 0) {
        return;
    }

    registerActionHandlers('option-child-options', {
        edit: async (rowId) => {
            const { showEditOptionModal } = await import('./entities-options.js');
            await showEditOptionModal(rowId);
        },
        unlink: async (rowId, data) => {
            const confirmed = await showConfirmModal({
                action: 'від\'язати',
                entity: 'дочірню опцію',
                name: data.name,
            });

            if (confirmed) {
                try {
                    await updateOption(rowId, { parent_option_id: '' });
                    showToast('Опцію відв\'язано', 'success');
                    const newData = loadData();
                    updateVisibility(newData);
                    managed.setData(newData);
                } catch (error) {
                    console.error('❌ Помилка відв\'язування опції:', error);
                    showToast('Помилка відв\'язування опції', 'error');
                }
            }
        }
    });

    let optChildCleanup = null;

    const managed = createManagedTable({
        container: 'option-related-chars',
        columns: [
            { ...col('id', 'ID', 'tag'), searchable: true },
            { ...col('value_ua', 'Значення', 'name', { span: 5 }), searchable: true },
            { ...col('value_ru', 'Назва (RU)', 'text', { span: 3 }), searchable: true, checked: true },
            col('action', ' ', 'action', {
                render: (value, row) => actionButton({
                    action: 'unlink',
                    rowId: row.id,
                    data: { name: row.value_ua || row.id }
                })
            })
        ],
        data: initialData,
        statsId: null,
        paginationId: null,
        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: (row) => actionButton({ action: 'edit', rowId: row.id }),
            getRowId: (row) => row.id,
            emptyState: { message: 'Дочірні опції відсутні' },
            withContainer: false,
            onAfterRender: (cont) => {
                if (optChildCleanup) optChildCleanup();
                optChildCleanup = initActionHandlers(cont, 'option-child-options');
            },
            plugins: {
                sorting: { columnTypes: { id: 'id-text', value_ua: 'string' } }
            }
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'opt-chars'
    });

    initPaginationCharm();
    initSearchCharm();
    initColumnsCharm();

    const container = document.getElementById('option-related-chars');
    if (container) {
        container.addEventListener('charm:refresh', () => {
            const newData = loadData();
            updateVisibility(newData);
            managed.setData(newData);
        });
    }
}
