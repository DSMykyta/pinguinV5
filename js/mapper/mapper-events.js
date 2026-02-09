// js/mapper/mapper-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - EVENT HANDLERS                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Обробники подій для Marketplace Mapper.
 */

import { mapperState } from './mapper-state.js';
import { renderCurrentTab } from './mapper-table.js';
import {
    loadMapperData,
    loadMpCategories, loadMpCharacteristics, loadMpOptions,
    loadMapCategories, loadMapCharacteristics, loadMapOptions
} from './mapper-data.js';
import { createColumnSelector } from '../common/ui-table-columns.js';
import { createBatchActionsBar, getBatchBar } from '../common/ui-batch-actions.js';

/**
 * Конфігурація колонок для кожного табу
 */
const columnConfigs = {
    categories: [
        { id: 'id', label: 'ID', checked: true },
        { id: 'name_ua', label: 'Назва UA', checked: true },
        { id: 'name_ru', label: 'Назва RU', checked: false },
        { id: 'parent_id', label: 'Батьківська', checked: true }
    ],
    characteristics: [
        { id: 'id', label: 'ID', checked: true },
        { id: 'name_ua', label: 'Назва UA', checked: true },
        { id: 'name_ru', label: 'Назва RU', checked: false },
        { id: 'type', label: 'Тип', checked: true },
        { id: 'is_global', label: 'Глобальна', checked: true },
        { id: 'unit', label: 'Одиниця', checked: false },
        { id: 'category_ids', label: 'Категорії', checked: false }
    ],
    options: [
        { id: 'id', label: 'ID', checked: true },
        { id: 'characteristic_id', label: 'Характеристика', checked: true },
        { id: 'value_ua', label: 'Значення UA', checked: true },
        { id: 'value_ru', label: 'Значення RU', checked: false },
        { id: 'sort_order', label: 'Порядок', checked: false }
    ],
    marketplaces: [
        { id: 'id', label: 'ID', checked: true },
        { id: 'name', label: 'Назва', checked: true },
        { id: 'slug', label: 'Slug', checked: true },
        { id: 'is_active', label: 'Активний', checked: true }
    ]
};

/**
 * Ініціалізувати всі обробники подій
 */
export function initMapperEvents() {

    // Кнопки оновлення табів
    initRefreshButtons();

    // Кнопки додавання
    initAddButtons();

    // Кнопка імпорту
    initImportButton();

    // Селектори колонок
    initColumnSelectors();

    // Batch actions bars
    initMapperBatchActions();

    // Клік по чіпу прив'язок → модал прив'язок
    initBindingChipClicks();

}

/**
 * Ініціалізувати обробник кліку по чіпам прив'язок
 */
function initBindingChipClicks() {
    const mainContent = document.querySelector('.app-main-content');
    if (!mainContent) return;

    mainContent.addEventListener('click', async (e) => {
        const chip = e.target.closest('.binding-chip');
        if (!chip) return;

        const entityType = chip.dataset.entityType;
        const entityId = chip.dataset.entityId;
        const entityName = chip.dataset.entityName;

        if (!entityType || !entityId) return;

        if (entityType === 'category') {
            const { showBindingsModal } = await import('./mapper-categories.js');
            showBindingsModal(entityId, entityName);
        }
        // TODO: характеристики та опції — аналогічно
    });
}

/**
 * Ініціалізувати селектори колонок для всіх табів
 */
function initColumnSelectors() {
    const tabs = ['categories', 'characteristics', 'options', 'marketplaces'];

    tabs.forEach(tab => {
        const containerId = `table-columns-list-mapper-${tab}`;
        const columns = columnConfigs[tab];

        if (!columns) return;

        // Встановити початкові видимі колонки зі стану
        const initialVisible = mapperState.visibleColumns[tab] || columns.filter(c => c.checked).map(c => c.id);
        const columnsWithState = columns.map(col => ({
            ...col,
            checked: initialVisible.includes(col.id)
        }));

        createColumnSelector(containerId, columnsWithState, {
            checkboxPrefix: `mapper-${tab}-col`,
            onChange: (selectedIds) => {
                mapperState.visibleColumns[tab] = selectedIds;
                renderCurrentTab();
            }
        });
    });

}

/**
 * Ініціалізувати пошук
 */
export function initMapperSearch(searchInput) {
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        mapperState.searchQuery = e.target.value.toLowerCase();
        mapperState.pagination.currentPage = 1;
        renderCurrentTab();
    });

    // Enter для пошуку
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            renderCurrentTab();
        }
    });

}

/**
 * Ініціалізувати кнопки оновлення
 */
function initRefreshButtons() {
    const tabs = ['categories', 'characteristics', 'options', 'marketplaces'];

    tabs.forEach(tab => {
        const btn = document.getElementById(`refresh-tab-mapper-${tab}`);
        if (btn) {
            btn.addEventListener('click', async () => {

                // Показати стан завантаження
                btn.disabled = true;
                btn.querySelector('.material-symbols-outlined').classList.add('is-spinning');

                try {
                    // Завантажуємо ВСІ дані: базові + MP + маппінги
                    await Promise.all([
                        loadMapperData(),
                        loadMpCategories(),
                        loadMpCharacteristics(),
                        loadMpOptions(),
                        loadMapCategories(),
                        loadMapCharacteristics(),
                        loadMapOptions()
                    ]);
                    renderCurrentTab();
                } catch (error) {
                    console.error(`❌ Помилка оновлення табу ${tab}:`, error);
                } finally {
                    btn.disabled = false;
                    btn.querySelector('.material-symbols-outlined').classList.remove('is-spinning');
                }
            });
        }
    });
}

/**
 * Ініціалізувати кнопки додавання
 */
function initAddButtons() {
    // Категорії
    const addCategoryBtn = document.getElementById('btn-add-mapper-category');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', async () => {
            const { showAddCategoryModal } = await import('./mapper-categories.js');
            showAddCategoryModal();
        });
    }

    // Характеристики
    const addCharacteristicBtn = document.getElementById('btn-add-mapper-characteristic');
    if (addCharacteristicBtn) {
        addCharacteristicBtn.addEventListener('click', async () => {
            const { showAddCharacteristicModal } = await import('./mapper-characteristics.js');
            showAddCharacteristicModal();
        });
    }

    // Опції
    const addOptionBtn = document.getElementById('btn-add-mapper-option');
    if (addOptionBtn) {
        addOptionBtn.addEventListener('click', async () => {
            const { showAddOptionModal } = await import('./mapper-options.js');
            showAddOptionModal();
        });
    }

    // Маркетплейси
    const addMarketplaceBtn = document.getElementById('btn-add-mapper-marketplace');
    if (addMarketplaceBtn) {
        addMarketplaceBtn.addEventListener('click', async () => {
            const { showAddMarketplaceModal } = await import('./mapper-marketplaces.js');
            showAddMarketplaceModal();
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
                    // Розділити на власні та MP
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

                    // Якщо тільки власні - нічого робити
                    if (mpIds.length === 0) {
                        const { showToast } = await import('../common/ui-toast.js');
                        showToast('Оберіть MP категорії для маппінгу', 'warning');
                        return;
                    }

                    // Якщо 1 власна + MP категорії - підтвердити і замапити
                    if (ownIds.length === 1) {
                        const { batchCreateCategoryMapping, getCategories } = await import('./mapper-data.js');
                        const { showToast } = await import('../common/ui-toast.js');
                        const { showConfirmModal } = await import('../common/ui-modal-confirm.js');
                        const { renderCurrentTab } = await import('./mapper-table.js');
                        const { getBatchBar } = await import('../common/ui-batch-actions.js');

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

                    // Якщо кілька власних - попередження
                    if (ownIds.length > 1) {
                        const { showToast } = await import('../common/ui-toast.js');
                        showToast('Оберіть тільки одну власну категорію', 'warning');
                        return;
                    }

                    // Тільки MP - показати модалку вибору
                    const { showSelectOwnCategoryModal } = await import('./mapper-categories.js');
                    await showSelectOwnCategoryModal(mpIds);
                }
            }
        ],
        onSelectionChange: (count) => {
        }
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
                    // Розділити на власні та MP
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
                        const { showToast } = await import('../common/ui-toast.js');
                        showToast('Оберіть MP характеристики для маппінгу', 'warning');
                        return;
                    }

                    if (ownIds.length === 1) {
                        const { batchCreateCharacteristicMapping, getCharacteristics } = await import('./mapper-data.js');
                        const { showToast } = await import('../common/ui-toast.js');
                        const { showConfirmModal } = await import('../common/ui-modal-confirm.js');
                        const { renderCurrentTab } = await import('./mapper-table.js');
                        const { getBatchBar } = await import('../common/ui-batch-actions.js');

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
                        const { showToast } = await import('../common/ui-toast.js');
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
        onSelectionChange: (count) => {
        }
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
                    // Розділити на власні та MP
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
                        const { showToast } = await import('../common/ui-toast.js');
                        showToast('Оберіть MP опції для маппінгу', 'warning');
                        return;
                    }

                    if (ownIds.length === 1) {
                        const { batchCreateOptionMapping, getOptions } = await import('./mapper-data.js');
                        const { showToast } = await import('../common/ui-toast.js');
                        const { showConfirmModal } = await import('../common/ui-modal-confirm.js');
                        const { renderCurrentTab } = await import('./mapper-table.js');
                        const { getBatchBar } = await import('../common/ui-batch-actions.js');

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
                        const { showToast } = await import('../common/ui-toast.js');
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
        onSelectionChange: (count) => {
        }
    });

}

/**
 * Ініціалізувати сортування для всіх табів
 * Сортування управляється через initMapperColumnFilters() в mapper-table.js
 */
export function initMapperSorting() {
    // no-op: сортування ініціалізується при рендері таблиць через mapper-table.js
}
