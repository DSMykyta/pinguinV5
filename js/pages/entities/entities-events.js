// js/pages/entities/entities-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    ENTITIES - EVENT HANDLERS                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Обробники подiй для Entities (Categories, Characteristics, Options).
 * Пошук та колонки тепер керуються через createManagedTable (entities-table.js).
 */

import { loadAllEntities } from '../../data/entities-data.js';
import { loadMpCategories, loadMpCharacteristics, loadMpOptions } from '../../data/mp-data.js';
import { loadMapCategories, loadMapCharacteristics, loadMapOptions } from '../../data/mappings-data.js';
import { createBatchActionsBar, getBatchBar } from '../../components/actions/actions-batch.js';
import { resetSnapshots } from './entities-polling.js';
import { showToast } from '../../components/feedback/toast.js';

let _state = null;

/**
 * Plugin init — отримує state з main
 */
export function init(state) {
    _state = state;
    initEntitiesEvents();
}

/**
 * Iнiцiалiзувати всi обробники подiй
 */
export function initEntitiesEvents() {
    initRefreshHandlers();
    initAddButtons();
    initEntitiesBatchActions();
    initBindingChipClicks();
}

/**
 * Iнiцiалiзувати обробник клiку по чiпам прив'язок
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
            const { showBindingsModal } = await import('./entities-categories.js');
            showBindingsModal(entityId, entityName);
        } else if (entityType === 'characteristic') {
            const { showBindingsModal } = await import('./entities-characteristics.js');
            showBindingsModal(entityId, entityName);
        } else if (entityType === 'option') {
            const { showBindingsModal } = await import('./entities-options.js');
            showBindingsModal(entityId, entityName);
        }
    });
}

/**
 * Обробники charm:refresh на контейнерах
 */
function initRefreshHandlers() {
    const tabs = ['categories', 'characteristics', 'options'];

    // Modal-level charm:refresh
    const modalLoaders = {
        'mapper-category-edit':       () => import('../../data/entities-data.js').then(m => m.loadCategories()),
        'mapper-characteristic-edit': () => import('../../data/entities-data.js').then(m => m.loadCharacteristics()),
        'mapper-option-edit':         () => import('../../data/entities-data.js').then(m => m.loadOptions()),
    };
    document.addEventListener('modal-opened', (e) => {
        const loader = modalLoaders[e.detail.modalId];
        if (!loader) return;
        const container = e.detail.modalElement?.querySelector('.modal-container');
        if (!container || container._entitiesRefreshInit) return;
        container._entitiesRefreshInit = true;
        container.addEventListener('charm:refresh', (ev) => {
            ev.detail.waitUntil((async () => {
                await loader();
                showToast('Данi оновлено', 'success');
            })());
        });
    });

    // Tab-level charm:refresh
    tabs.forEach(tab => {
        const container = document.getElementById(`entities-${tab}-table-container`);
        if (container) {
            container.addEventListener('charm:refresh', (e) => {
                e.detail.waitUntil((async () => {
                    await Promise.allSettled([
                        loadAllEntities(),
                        loadMpCategories(),
                        loadMpCharacteristics(),
                        loadMpOptions(),
                        loadMapCategories(),
                        loadMapCharacteristics(),
                        loadMapOptions()
                    ]);
                    const { renderCurrentTab } = await import('./entities-table.js');
                    renderCurrentTab();
                    resetSnapshots();
                })());
            });
        }
    });
}

/**
 * Iнiцiалiзувати кнопки додавання
 */
function initAddButtons() {
    const addCategoryBtn = document.getElementById('btn-add-entities-category');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', async () => {
            const { showAddCategoryModal } = await import('./entities-categories.js');
            showAddCategoryModal();
        });
    }

    const addCharacteristicBtn = document.getElementById('btn-add-entities-characteristic');
    if (addCharacteristicBtn) {
        addCharacteristicBtn.addEventListener('click', async () => {
            const { showAddCharacteristicModal } = await import('./entities-characteristics.js');
            showAddCharacteristicModal();
        });
    }

    const addOptionBtn = document.getElementById('btn-add-entities-option');
    if (addOptionBtn) {
        addOptionBtn.addEventListener('click', async () => {
            const { showAddOptionModal } = await import('./entities-options.js');
            showAddOptionModal();
        });
    }
}

/**
 * Iнiцiалiзувати batch actions bar для категорiй, характеристик та опцiй
 */
function initEntitiesBatchActions() {
    // Batch bar для категорiй
    createBatchActionsBar({
        tabId: 'entities-categories',
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
                        showToast('Оберiть MP категорiї для маппiнгу', 'warning');
                        return;
                    }

                    if (ownIds.length === 1) {
                        const { batchCreateCategoryMapping } = await import('../../data/mappings-data.js');
                        const { getCategories } = await import('../../data/entities-data.js');
                        const { showToast } = await import('../../components/feedback/toast.js');
                        const { showConfirmModal } = await import('../../components/modal/modal-main.js');
                        const { renderCurrentTab } = await import('./entities-table.js');
                        const { getBatchBar } = await import('../../components/actions/actions-batch.js');

                        const ownCat = getCategories().find(c => c.id === ownIds[0]);
                        const ownName = ownCat?.name_ua || ownIds[0];

                        const confirmed = await showConfirmModal({
                            action: 'замапити',
                            entity: `${mpIds.length} MP категорiй до`,
                            name: ownName,
                        });

                        if (!confirmed) return;

                        await batchCreateCategoryMapping(mpIds, ownIds[0]);

                        _state.selectedRows.categories.clear();
                        const batchBar = getBatchBar('entities-categories');
                        if (batchBar) batchBar.deselectAll();

                        showToast(`Замаплено ${mpIds.length} категорiй`, 'success');
                        renderCurrentTab();
                        return;
                    }

                    if (ownIds.length > 1) {
                        const { showToast } = await import('../../components/feedback/toast.js');
                        showToast('Оберiть тiльки одну власну категорiю', 'warning');
                        return;
                    }

                    const { showSelectOwnCategoryModal } = await import('./entities-categories.js');
                    await showSelectOwnCategoryModal(mpIds);
                }
            }
        ],
        onSelectionChange: (count) => {}
    });

    // Batch bar для характеристик
    createBatchActionsBar({
        tabId: 'entities-characteristics',
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
                        showToast('Оберiть MP характеристики для маппiнгу', 'warning');
                        return;
                    }

                    if (ownIds.length === 1) {
                        const { batchCreateCharacteristicMapping } = await import('../../data/mappings-data.js');
                        const { getCharacteristics } = await import('../../data/entities-data.js');
                        const { showToast } = await import('../../components/feedback/toast.js');
                        const { showConfirmModal } = await import('../../components/modal/modal-main.js');
                        const { renderCurrentTab } = await import('./entities-table.js');
                        const { getBatchBar } = await import('../../components/actions/actions-batch.js');

                        const ownChar = getCharacteristics().find(c => c.id === ownIds[0]);
                        const ownName = ownChar?.name_ua || ownIds[0];

                        const confirmed = await showConfirmModal({
                            action: 'замапити',
                            entity: `${mpIds.length} MP характеристик до`,
                            name: ownName,
                        });

                        if (!confirmed) return;

                        await batchCreateCharacteristicMapping(mpIds, ownIds[0]);

                        _state.selectedRows.characteristics.clear();
                        const batchBar = getBatchBar('entities-characteristics');
                        if (batchBar) batchBar.deselectAll();

                        showToast(`Замаплено ${mpIds.length} характеристик`, 'success');
                        renderCurrentTab();
                        return;
                    }

                    if (ownIds.length > 1) {
                        const { showToast } = await import('../../components/feedback/toast.js');
                        showToast('Оберiть тiльки одну власну характеристику', 'warning');
                        return;
                    }

                    const { showSelectOwnCharacteristicModal } = await import('./entities-characteristics.js');
                    await showSelectOwnCharacteristicModal(mpIds);
                }
            },
            {
                id: 'auto-map',
                label: 'Авто-маппiнг',
                icon: 'auto_fix_high',
                handler: async (selectedIds, tabId) => {
                    const { handleAutoMapCharacteristics } = await import('./entities-characteristics.js');
                    await handleAutoMapCharacteristics(selectedIds);
                }
            }
        ],
        onSelectionChange: (count) => {}
    });

    // Batch bar для опцiй
    createBatchActionsBar({
        tabId: 'entities-options',
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
                        showToast('Оберiть MP опцiї для маппiнгу', 'warning');
                        return;
                    }

                    if (ownIds.length === 1) {
                        const { batchCreateOptionMapping } = await import('../../data/mappings-data.js');
                        const { getOptions } = await import('../../data/entities-data.js');
                        const { showToast } = await import('../../components/feedback/toast.js');
                        const { showConfirmModal } = await import('../../components/modal/modal-main.js');
                        const { renderCurrentTab } = await import('./entities-table.js');
                        const { getBatchBar } = await import('../../components/actions/actions-batch.js');

                        const ownOpt = getOptions().find(o => o.id === ownIds[0]);
                        const ownName = ownOpt?.value_ua || ownIds[0];

                        const confirmed = await showConfirmModal({
                            action: 'замапити',
                            entity: `${mpIds.length} MP опцiй до`,
                            name: ownName,
                        });

                        if (!confirmed) return;

                        await batchCreateOptionMapping(mpIds, ownIds[0]);

                        _state.selectedRows.options.clear();
                        const batchBar = getBatchBar('entities-options');
                        if (batchBar) batchBar.deselectAll();

                        showToast(`Замаплено ${mpIds.length} опцiй`, 'success');
                        renderCurrentTab();
                        return;
                    }

                    if (ownIds.length > 1) {
                        const { showToast } = await import('../../components/feedback/toast.js');
                        showToast('Оберiть тiльки одну власну опцiю', 'warning');
                        return;
                    }

                    const { showSelectOwnOptionModal } = await import('./entities-options.js');
                    await showSelectOwnOptionModal(mpIds);
                }
            },
            {
                id: 'auto-map',
                label: 'Авто-маппiнг',
                icon: 'auto_fix_high',
                handler: async (selectedIds, tabId) => {
                    const { handleAutoMapOptions } = await import('./entities-options.js');
                    await handleAutoMapOptions(selectedIds);
                }
            }
        ],
        onSelectionChange: (count) => {}
    });
}

// Legacy stubs
export function initEntitiesSorting() {}
export function initEntitiesSearch() {}
export function initColumnSelectors() {}
