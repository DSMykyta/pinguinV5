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
import { loadMapperData, getCategories, getCharacteristics, getOptions, getMarketplaces } from './mapper-data.js';
import { createColumnSelector } from '../common/ui-table-columns.js';
import { initTableSorting, updateSortIndicators } from '../common/ui-table-controls.js';
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

    // Примітка: Фільтри по джерелу тепер генеруються динамічно в mapper-table.js

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
                    await loadMapperData();
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
            const { showImportModal } = await import('./mapper-crud.js');
            showImportModal();
        });
    }
}

/**
 * Ініціалізувати фільтр-кнопки
 */
function initFilterPills() {
    const containers = [
        'filter-pills-mapper-characteristics',
        'filter-pills-mapper-options'
    ];

    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (!container) return;

        const buttons = container.querySelectorAll('.nav-icon[data-filter]');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Прибрати active з усіх
                buttons.forEach(b => b.classList.remove('active'));

                // Додати active до поточного
                btn.classList.add('active');

                // Отримати значення фільтра
                const filter = btn.dataset.filter;
                const tabId = btn.dataset.tabId;
                const tabName = tabId.replace('tab-mapper-', '');

                // Оновити стан
                mapperState.filters[tabName] = filter;
                mapperState.pagination.currentPage = 1;

                // Перерендерити
                renderCurrentTab();

            });
        });
    });
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
                        if (batchBar) batchBar.clearSelection();

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
                        if (batchBar) batchBar.clearSelection();

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
                        if (batchBar) batchBar.clearSelection();

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
 * Об'єкт для зберігання API сортування кожного табу
 */
const sortAPIs = {
    categories: null,
    characteristics: null,
    options: null,
    marketplaces: null
};

/**
 * Ініціалізувати сортування для всіх табів
 */
export function initMapperSorting() {
    initCategoriesSorting();
    initCharacteristicsSorting();
    initOptionsSorting();
    initMarketplacesSorting();
}

/**
 * Ініціалізувати сортування для категорій
 */
export function initCategoriesSorting() {
    const container = document.getElementById('mapper-categories-table-container');
    if (!container) return null;

    sortAPIs.categories = initTableSorting(container, {
        dataSource: () => getCategories(),
        onSort: async (sortedData) => {
            mapperState.categories = sortedData;
            await renderCurrentTab();

            // Відновити візуальні індикатори після рендерингу
            const sortState = sortAPIs.categories.getState();
            if (sortState.column && sortState.direction) {
                updateSortIndicators(container, sortState.column, sortState.direction);
            }
        },
        columnTypes: {
            id: 'id-number',
            name_ua: 'string',
            name_ru: 'string',
            parent_id: 'string'
        }
    });

    return sortAPIs.categories;
}

/**
 * Ініціалізувати сортування для характеристик
 */
export function initCharacteristicsSorting() {
    const container = document.getElementById('mapper-characteristics-table-container');
    if (!container) return null;

    sortAPIs.characteristics = initTableSorting(container, {
        dataSource: () => getCharacteristics(),
        onSort: async (sortedData) => {
            mapperState.characteristics = sortedData;
            await renderCurrentTab();

            // Відновити візуальні індикатори після рендерингу
            const sortState = sortAPIs.characteristics.getState();
            if (sortState.column && sortState.direction) {
                updateSortIndicators(container, sortState.column, sortState.direction);
            }
        },
        columnTypes: {
            id: 'id-number',
            name_ua: 'string',
            name_ru: 'string',
            type: 'string',
            is_global: 'boolean',
            unit: 'string'
        }
    });

    return sortAPIs.characteristics;
}

/**
 * Ініціалізувати сортування для опцій
 */
export function initOptionsSorting() {
    const container = document.getElementById('mapper-options-table-container');
    if (!container) return null;

    sortAPIs.options = initTableSorting(container, {
        dataSource: () => getOptions(),
        onSort: async (sortedData) => {
            mapperState.options = sortedData;
            await renderCurrentTab();

            // Відновити візуальні індикатори після рендерингу
            const sortState = sortAPIs.options.getState();
            if (sortState.column && sortState.direction) {
                updateSortIndicators(container, sortState.column, sortState.direction);
            }
        },
        columnTypes: {
            id: 'id-number',
            characteristic_id: 'id-number',
            value_ua: 'string',
            value_ru: 'string',
            sort_order: 'number'
        }
    });

    return sortAPIs.options;
}

/**
 * Ініціалізувати сортування для маркетплейсів
 */
export function initMarketplacesSorting() {
    const container = document.getElementById('mapper-marketplaces-table-container');
    if (!container) return null;

    sortAPIs.marketplaces = initTableSorting(container, {
        dataSource: () => getMarketplaces(),
        onSort: async (sortedData) => {
            mapperState.marketplaces = sortedData;
            await renderCurrentTab();

            // Відновити візуальні індикатори після рендерингу
            const sortState = sortAPIs.marketplaces.getState();
            if (sortState.column && sortState.direction) {
                updateSortIndicators(container, sortState.column, sortState.direction);
            }
        },
        columnTypes: {
            id: 'id-number',
            name: 'string',
            slug: 'string',
            is_active: 'boolean'
        }
    });

    return sortAPIs.marketplaces;
}
