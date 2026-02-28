// js/pages/mapper/mapper-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - EVENT HANDLERS                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Обробники подій для Marketplace Mapper.
 * Пошук та колонки тепер керуються через createManagedTable (mapper-table.js).
 */

import { mapperState } from './mapper-state.js';
import { renderCurrentTab } from './mapper-table.js';
import {
    loadMapperData,
    loadMpCategories, loadMpCharacteristics, loadMpOptions,
    loadMapCategories, loadMapCharacteristics, loadMapOptions
} from './mapper-data.js';
import { createBatchActionsBar, getBatchBar } from '../../components/actions/actions-batch.js';
import { resetSnapshots } from './mapper-polling.js';
import { showToast } from '../../components/feedback/toast.js';

/**
 * Ініціалізувати всі обробники подій
 */
export function initMapperEvents() {
    initRefreshHandlers();
    initAddButtons();
    initImportButton();
    initMapperBatchActions();
    initBindingChipClicks();
}

/**
 * Ініціалізувати обробник кліку по чіпам прив'язок
 */
function initBindingChipClicks() {
    const mainContent = document.querySelector('.app-main-content');
    if (!mainContent) return;

    mainContent.addEventListener('click', async (e) => {
        const chip = e.target.closest('[data-entity-type]');
        if (!chip) return;

        const entityType = chip.dataset.entityType;
        const entityId = chip.dataset.entityId;
        const entityName = chip.dataset.entityName;

        if (!entityType || !entityId) return;

        if (entityType === 'category') {
            const { showBindingsModal } = await import('./mapper-categories.js');
            showBindingsModal(entityId, entityName);
        } else if (entityType === 'characteristic') {
            const { showBindingsModal } = await import('./mapper-characteristics.js');
            showBindingsModal(entityId, entityName);
        } else if (entityType === 'option') {
            const { showBindingsModal } = await import('./mapper-options.js');
            showBindingsModal(entityId, entityName);
        }
    });
}

// initColumnSelectors — видалено, createManagedTable керує колонками через columnsListId
// initMapperSearch — видалено, search charm на контейнері керує пошуком автоматично

/**
 * Обробники charm:refresh на контейнерах
 */
function initRefreshHandlers() {
    const tabs = ['categories', 'characteristics', 'options', 'marketplaces'];

    // Modal-level charm:refresh — кожен модал перезавантажує свої дані
    [
        ['mapper-category-edit',       () => import('./mapper-data-own.js').then(m => m.loadCategories())],
        ['mapper-characteristic-edit', () => import('./mapper-data-own.js').then(m => m.loadCharacteristics())],
        ['mapper-option-edit',         () => import('./mapper-data-own.js').then(m => m.loadOptions())],
        ['mapper-mp-data',             () => import('./mapper-data-own.js').then(m => m.loadMarketplaces())],
    ].forEach(([modalId, loader]) => {
        const container = document.querySelector(`[data-modal-id="${modalId}"] > .modal-fullscreen-container`);
        if (container) {
            container.addEventListener('charm:refresh', (e) => {
                e.detail.waitUntil((async () => {
                    await loader();
                    showToast('Дані оновлено', 'success');
                })());
            });
        }
    });

    // Tab-level charm:refresh
    tabs.forEach(tab => {
        const container = document.getElementById(`mapper-${tab}-table-container`);
        if (container) {
            container.addEventListener('charm:refresh', (e) => {
                e.detail.waitUntil((async () => {
                    await Promise.allSettled([
                        loadMapperData(),
                        loadMpCategories(),
                        loadMpCharacteristics(),
                        loadMpOptions(),
                        loadMapCategories(),
                        loadMapCharacteristics(),
                        loadMapOptions()
                    ]);
                    renderCurrentTab();
                    resetSnapshots();
                })());
            });
        }
    });
}

/**
 * Ініціалізувати кнопки додавання
 */
function initAddButtons() {
    const addCategoryBtn = document.getElementById('btn-add-mapper-category');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', async () => {
            const { showAddCategoryModal } = await import('./mapper-categories.js');
            showAddCategoryModal();
        });
    }

    const addCharacteristicBtn = document.getElementById('btn-add-mapper-characteristic');
    if (addCharacteristicBtn) {
        addCharacteristicBtn.addEventListener('click', async () => {
            const { showAddCharacteristicModal } = await import('./mapper-characteristics.js');
            showAddCharacteristicModal();
        });
    }

    const addOptionBtn = document.getElementById('btn-add-mapper-option');
    if (addOptionBtn) {
        addOptionBtn.addEventListener('click', async () => {
            const { showAddOptionModal } = await import('./mapper-options.js');
            showAddOptionModal();
        });
    }

}

/**
 * Ініціалізувати кнопку імпорту
 */
function initImportButton() {
    const importBtn = document.getElementById('btn-import-mapper');
    if (importBtn) {
        importBtn.addEventListener('click', async () => {
            const { showImportModal } = await import('./mapper-import.js');
            showImportModal();
        });
    }
}

/**
 * Ініціалізувати batch actions bar для категорій, характеристик та опцій
 */
function initMapperBatchActions() {
    // Batch bar для категорій
    createBatchActionsBar({
        tabId: 'mapper-categories',
        actions: [
            {
                id: 'map-to',
                label: 'Замапити до...',
                icon: 'link',
                primary: true,
                handler: async (selectedIds, tabId) => {
                    const ownIds = [];
                    const mpIds = [];
                    selectedIds.forEach(id => {
                        const checkbox = document.querySelector(`[data-row-id="${id}"][data-tab="categories"]`);
                        const source = checkbox?.dataset.source;
                        if (source === 'own') {
                            ownIds.push(id);
                        } else {
                            mpIds.push(id);
                        }
                    });

                    if (mpIds.length === 0) {
                        const { showToast } = await import('../../components/feedback/toast.js');
                        showToast('Оберіть MP категорії для маппінгу', 'warning');
                        return;
                    }

                    if (ownIds.length === 1) {
                        const { batchCreateCategoryMapping, getCategories } = await import('./mapper-data.js');
                        const { showToast } = await import('../../components/feedback/toast.js');
                        const { showConfirmModal } = await import('../../components/modal/modal-main.js');
                        const { renderCurrentTab } = await import('./mapper-table.js');
                        const { getBatchBar } = await import('../../components/actions/actions-batch.js');

                        const ownCat = getCategories().find(c => c.id === ownIds[0]);
                        const ownName = ownCat?.name_ua || ownIds[0];

                        const confirmed = await showConfirmModal({
                            title: 'Замапити?',
                            message: `Прив'язати ${mpIds.length} MP категорій до "${ownName}"?`,
                            confirmText: 'Замапити',
                            cancelText: 'Скасувати'
                        });

                        if (!confirmed) return;

                        await batchCreateCategoryMapping(mpIds, ownIds[0]);

                        mapperState.selectedRows.categories.clear();
                        const batchBar = getBatchBar('mapper-categories');
                        if (batchBar) batchBar.deselectAll();

                        showToast(`Замаплено ${mpIds.length} категорій`, 'success');
                        renderCurrentTab();
                        return;
                    }

                    if (ownIds.length > 1) {
                        const { showToast } = await import('../../components/feedback/toast.js');
                        showToast('Оберіть тільки одну власну категорію', 'warning');
                        return;
                    }

                    const { showSelectOwnCategoryModal } = await import('./mapper-categories.js');
                    await showSelectOwnCategoryModal(mpIds);
                }
            }
        ],
        onSelectionChange: (count) => {}
    });

    // Batch bar для характеристик
    createBatchActionsBar({
        tabId: 'mapper-characteristics',
        actions: [
            {
                id: 'map-to',
                label: 'Замапити до...',
                icon: 'link',
                primary: true,
                handler: async (selectedIds, tabId) => {
                    const ownIds = [];
                    const mpIds = [];
                    selectedIds.forEach(id => {
                        const checkbox = document.querySelector(`[data-row-id="${id}"][data-tab="characteristics"]`);
                        const source = checkbox?.dataset.source;
                        if (source === 'own') {
                            ownIds.push(id);
                        } else {
                            mpIds.push(id);
                        }
                    });

                    if (mpIds.length === 0) {
                        const { showToast } = await import('../../components/feedback/toast.js');
                        showToast('Оберіть MP характеристики для маппінгу', 'warning');
                        return;
                    }

                    if (ownIds.length === 1) {
                        const { batchCreateCharacteristicMapping, getCharacteristics } = await import('./mapper-data.js');
                        const { showToast } = await import('../../components/feedback/toast.js');
                        const { showConfirmModal } = await import('../../components/modal/modal-main.js');
                        const { renderCurrentTab } = await import('./mapper-table.js');
                        const { getBatchBar } = await import('../../components/actions/actions-batch.js');

                        const ownChar = getCharacteristics().find(c => c.id === ownIds[0]);
                        const ownName = ownChar?.name_ua || ownIds[0];

                        const confirmed = await showConfirmModal({
                            title: 'Замапити?',
                            message: `Прив'язати ${mpIds.length} MP характеристик до "${ownName}"?`,
                            confirmText: 'Замапити',
                            cancelText: 'Скасувати'
                        });

                        if (!confirmed) return;

                        await batchCreateCharacteristicMapping(mpIds, ownIds[0]);

                        mapperState.selectedRows.characteristics.clear();
                        const batchBar = getBatchBar('mapper-characteristics');
                        if (batchBar) batchBar.deselectAll();

                        showToast(`Замаплено ${mpIds.length} характеристик`, 'success');
                        renderCurrentTab();
                        return;
                    }

                    if (ownIds.length > 1) {
                        const { showToast } = await import('../../components/feedback/toast.js');
                        showToast('Оберіть тільки одну власну характеристику', 'warning');
                        return;
                    }

                    const { showSelectOwnCharacteristicModal } = await import('./mapper-characteristics.js');
                    await showSelectOwnCharacteristicModal(mpIds);
                }
            },
            {
                id: 'auto-map',
                label: 'Авто-маппінг',
                icon: 'auto_fix_high',
                handler: async (selectedIds, tabId) => {
                    const { handleAutoMapCharacteristics } = await import('./mapper-characteristics.js');
                    await handleAutoMapCharacteristics(selectedIds);
                }
            }
        ],
        onSelectionChange: (count) => {}
    });

    // Batch bar для опцій
    createBatchActionsBar({
        tabId: 'mapper-options',
        actions: [
            {
                id: 'map-to',
                label: 'Замапити до...',
                icon: 'link',
                primary: true,
                handler: async (selectedIds, tabId) => {
                    const ownIds = [];
                    const mpIds = [];
                    selectedIds.forEach(id => {
                        const checkbox = document.querySelector(`[data-row-id="${id}"][data-tab="options"]`);
                        const source = checkbox?.dataset.source;
                        if (source === 'own') {
                            ownIds.push(id);
                        } else {
                            mpIds.push(id);
                        }
                    });

                    if (mpIds.length === 0) {
                        const { showToast } = await import('../../components/feedback/toast.js');
                        showToast('Оберіть MP опції для маппінгу', 'warning');
                        return;
                    }

                    if (ownIds.length === 1) {
                        const { batchCreateOptionMapping, getOptions } = await import('./mapper-data.js');
                        const { showToast } = await import('../../components/feedback/toast.js');
                        const { showConfirmModal } = await import('../../components/modal/modal-main.js');
                        const { renderCurrentTab } = await import('./mapper-table.js');
                        const { getBatchBar } = await import('../../components/actions/actions-batch.js');

                        const ownOpt = getOptions().find(o => o.id === ownIds[0]);
                        const ownName = ownOpt?.value_ua || ownIds[0];

                        const confirmed = await showConfirmModal({
                            title: 'Замапити?',
                            message: `Прив'язати ${mpIds.length} MP опцій до "${ownName}"?`,
                            confirmText: 'Замапити',
                            cancelText: 'Скасувати'
                        });

                        if (!confirmed) return;

                        await batchCreateOptionMapping(mpIds, ownIds[0]);

                        mapperState.selectedRows.options.clear();
                        const batchBar = getBatchBar('mapper-options');
                        if (batchBar) batchBar.deselectAll();

                        showToast(`Замаплено ${mpIds.length} опцій`, 'success');
                        renderCurrentTab();
                        return;
                    }

                    if (ownIds.length > 1) {
                        const { showToast } = await import('../../components/feedback/toast.js');
                        showToast('Оберіть тільки одну власну опцію', 'warning');
                        return;
                    }

                    const { showSelectOwnOptionModal } = await import('./mapper-options.js');
                    await showSelectOwnOptionModal(mpIds);
                }
            },
            {
                id: 'auto-map',
                label: 'Авто-маппінг',
                icon: 'auto_fix_high',
                handler: async (selectedIds, tabId) => {
                    const { handleAutoMapOptions } = await import('./mapper-options.js');
                    await handleAutoMapOptions(selectedIds);
                }
            }
        ],
        onSelectionChange: (count) => {}
    });
}

// initMapperSorting — видалено, createManagedTable керує сортуванням через plugins.sorting
export function initMapperSorting() {}
// initMapperSearch — видалено, createManagedTable керує пошуком
export function initMapperSearch() {}
// initColumnSelectors — видалено, createManagedTable керує колонками
export function initColumnSelectors() {}
