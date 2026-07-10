// js/pages/marketplaces/marketplaces-crud-references.js

/**
 * Довідники маркетплейсу: список, завантаження та видалення файлів.
 */

import { getMpCategories } from '../../data/mp-data.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import { initPaginationCharm } from '../../components/charms/pagination/pagination-main.js';
import {
    listReferenceFiles,
    deleteReferenceFile,
    callSheetsAPI
} from '../../utils/utils-api-client.js';
import { createBatchActionsBar, getBatchBar } from '../../components/actions/actions-batch.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { escapeHtml } from '../../utils/utils-text.js';

/**
 * Очистити file_id у категоріях, що посилаються на видалений файл
 */
async function clearCategoryFileIds(fileIds, marketplaceId) {
    const mpCats = getMpCategories().filter(c => c.marketplace_id === marketplaceId);
    for (const cat of mpCats) {
        if (cat.file_id && fileIds.includes(cat.file_id) && cat._rowIndex) {
            await callSheetsAPI('update', {
                range: `Mapper_MP_Categories!H${cat._rowIndex}`,
                values: [['']],
                spreadsheetType: 'main'
            });
            cat.file_id = '';
        }
    }
}

export async function populateMpReferences(slug, marketplaceId) {
    const container = document.getElementById('mp-data-ref-container');
    if (!container) return;

    container.innerHTML = renderAvatarState('loading', {
        message: 'Завантаження...', size: 'small',
        containerClass: 'empty-state', avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message', showMessage: true
    });

    let allFiles = [];
    try {
        allFiles = await listReferenceFiles(slug);
    } catch (err) {
        console.error('Failed to load reference files:', err);
        container.innerHTML = renderAvatarState('error', {
            message: 'Помилка завантаження файлів', size: 'small',
            containerClass: 'empty-state', avatarClass: 'empty-state-avatar',
            messageClass: 'avatar-state-message', showMessage: true
        });
        return;
    }

    const countEl = document.getElementById('mp-data-ref-count');
    if (countEl) countEl.textContent = allFiles.length;

    // Побудувати mapу fileId → назва категорії
    const fileIdToCat = {};
    if (marketplaceId) {
        const mpCats = getMpCategories().filter(c => c.marketplace_id === marketplaceId);
        mpCats.forEach(cat => {
            if (cat.file_id) {
                fileIdToCat[cat.file_id] = cat.name || cat.name_ua || cat.external_id || '';
            }
        });
    }

    // Підготувати дані
    const allData = allFiles.map(f => {
        const sizeBytes = Number(f.size) || 0;
        const sizeKb = Math.round(sizeBytes / 1024);
        return {
            ...f,
            id: f.fileId,
            file_size: sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`,
            file_date: f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString('uk-UA') : '',
            ref_category: fileIdToCat[f.fileId] || ''
        };
    });

    // Batch bar
    const BATCH_TAB = 'mp-references';
    const existingBar = getBatchBar(BATCH_TAB);
    if (existingBar) existingBar.destroy();

    const batchBar = createBatchActionsBar({
        tabId: BATCH_TAB,
        actions: [
            {
                label: 'Завантажити', icon: 'download', primary: true,
                handler: (selectedIds) => {
                    allData.filter(f => selectedIds.includes(f.id)).forEach(f => window.open(f.downloadUrl, '_blank'));
                    batchBar.deselectAll();
                }
            },
            {
                label: 'Видалити', icon: 'delete',
                handler: async (selectedIds) => {
                    const confirmed = await showConfirmModal({
                        action: 'видалити',
                        entity: 'довідники',
                        name: `${selectedIds.length} файлів`,
                    });
                    if (!confirmed) return;
                    try {
                        for (const fId of selectedIds) await deleteReferenceFile(fId);
                        await clearCategoryFileIds(selectedIds, marketplaceId);
                        showToast(`Видалено ${selectedIds.length} файлів`, 'success');
                        batchBar.deselectAll();
                        await populateMpReferences(slug, marketplaceId);
                    } catch (err) {
                        showToast('Помилка видалення', 'error');
                    }
                }
            }
        ]
    });

    createManagedTable({
        container: 'mp-data-ref-container',
        columns: [
            { ...col('ref_category', 'Категорія', 'text', { span: 3 }), searchable: true },
            { ...col('name', 'Назва', 'name', { span: 5 }), searchable: true },
            { ...col('file_size', 'Розмір', 'code', { span: 1 }), searchable: true },
            { ...col('file_date', 'Дата', 'text', { span: 1 }), searchable: true },
            col('action', ' ', 'action', {
                render: (value, row) => `
                    <div class="group">
                        <a href="${escapeHtml(row.downloadUrl)}" target="_blank" class="btn-icon" title="Завантажити" aria-label="Завантажити">
                            <span class="material-symbols-outlined">download</span>
                        </a>
                        <button class="btn-icon ref-delete-btn" data-file-id="${escapeHtml(row.fileId)}" data-file-name="${escapeHtml(row.name)}" title="Видалити" aria-label="Видалити">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                `
            })
        ],
        data: allData,
        statsId: null,
        paginationId: null,
        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: () => '',
            getRowId: row => row.id,
            emptyState: { message: 'Довідники відсутні' },
            withContainer: false,
            onAfterRender: (cont) => {
                cont.querySelectorAll('.ref-delete-btn').forEach(btn => {
                    btn.onclick = async (e) => {
                        e.stopPropagation();
                        const fileId = btn.dataset.fileId;
                        const fileName = btn.dataset.fileName;
                        const confirmed = await showConfirmModal({
                            action: 'видалити',
                            entity: 'довідник',
                            name: fileName,
                        });
                        if (!confirmed) return;
                        try {
                            await deleteReferenceFile(fileId);
                            await clearCategoryFileIds([fileId], marketplaceId);
                            showToast('Файл видалено', 'success');
                            await populateMpReferences(slug, marketplaceId);
                        } catch (err) {
                            showToast('Помилка видалення файлу', 'error');
                        }
                    };
                });
            },
            plugins: {
                sorting: { columnTypes: { ref_category: 'string', name: 'string', file_size: 'string', file_date: 'string' } },
                checkboxes: { batchBar: () => getBatchBar(BATCH_TAB) }
            }
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'mp-ref'
    });

    initPaginationCharm();
}

