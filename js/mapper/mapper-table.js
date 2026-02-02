// js/mapper/mapper-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - TABLE RENDERING                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Рендеринг таблиць для Marketplace Mapper з підтримкою пагінації,
 * сортування та фільтрації.
 *
 * Використовує createPseudoTable API (як brands-table.js та price-table.js)
 */

import { mapperState, runHook } from './mapper-state.js';
import {
    getCategories, getCharacteristics, getOptions, getMarketplaces,
    getMpCategories, getMpCharacteristics, getMpOptions,
    getMapCharacteristics, getMapOptions,
    isMpCharacteristicMapped, isMpOptionMapped, isMpCategoryMapped
} from './mapper-data.js';
import { getBatchBar } from '../common/ui-batch-actions.js';

/**
 * Отримати назви категорій за списком ID
 * @param {string} categoryIdsStr - Рядок з ID категорій через кому
 * @returns {string} - Назви категорій
 */
function getCategoryNames(categoryIdsStr) {
    if (!categoryIdsStr) return '-';

    const categories = getCategories();
    const ids = categoryIdsStr.split(',').map(id => id.trim()).filter(id => id);

    if (ids.length === 0) return '-';

    const names = ids.map(id => {
        const cat = categories.find(c => c.id === id);
        return cat ? cat.name_ua : id;
    });

    return names.join(', ');
}
import { createPseudoTable } from '../common/ui-table.js';
import { escapeHtml } from '../utils/text-utils.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../common/ui-actions.js';
import { initTableSorting, filterData, updateSortIndicators } from '../common/ui-table-controls.js';

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ОБРОБНИКІВ ДІЙ
// ═══════════════════════════════════════════════════════════════════════════

// Категорії
registerActionHandlers('mapper-categories', {
    edit: async (rowId) => {
        const { showEditCategoryModal } = await import('./mapper-categories.js');
        await showEditCategoryModal(rowId);
    },
    view: async (rowId) => {
        const { showViewMpCategoryModal } = await import('./mapper-categories.js');
        await showViewMpCategoryModal(rowId);
    }
});

// Характеристики
registerActionHandlers('mapper-characteristics', {
    edit: async (rowId) => {
        const { showEditCharacteristicModal } = await import('./mapper-characteristics.js');
        await showEditCharacteristicModal(rowId);
    },
    view: async (rowId) => {
        const { showViewMpCharacteristicModal } = await import('./mapper-characteristics.js');
        await showViewMpCharacteristicModal(rowId);
    }
});

// Опції
registerActionHandlers('mapper-options', {
    edit: async (rowId) => {
        const { showEditOptionModal } = await import('./mapper-options.js');
        await showEditOptionModal(rowId);
    },
    view: async (rowId) => {
        const { showViewMpOptionModal } = await import('./mapper-options.js');
        await showViewMpOptionModal(rowId);
    }
});

// Маркетплейси
registerActionHandlers('mapper-marketplaces', {
    edit: async (rowId) => {
        const { showEditMarketplaceModal } = await import('./mapper-marketplaces.js');
        await showEditMarketplaceModal(rowId);
    },
    view: async (rowId) => {
        const { showMarketplaceDataModal } = await import('./mapper-marketplaces.js');
        await showMarketplaceDataModal(rowId);
    }
});

// Map для зберігання tableAPI для кожного табу mapper
const mapperTableAPIs = new Map();

/**
 * Рендерити поточний активний таб
 */
export function renderCurrentTab() {
    const activeTab = mapperState.activeTab;

    switch (activeTab) {
        case 'categories':
            renderCategoriesTable();
            break;
        case 'characteristics':
            renderCharacteristicsTable();
            break;
        case 'options':
            renderOptionsTable();
            break;
        case 'marketplaces':
            renderMarketplacesTable();
            break;
        default:
            console.warn(`⚠️ Невідомий таб: ${activeTab}`);
    }
}

/**
 * Отримати дані категорій (власні + MP)
 */
function getCategoriesData() {
    const marketplaces = getMarketplaces();

    // Отримати власні категорії
    const ownCategories = getCategories().map(cat => ({
        ...cat,
        _source: 'own',
        _sourceLabel: 'Власний',
        _editable: true
    }));

    // Отримати MP категорії - тільки незамаплені
    const mpCategories = getMpCategories()
        .filter(mpCat => !isMpCategoryMapped(mpCat.id))
        .map(mpCat => {
            const data = typeof mpCat.data === 'string' ? JSON.parse(mpCat.data || '{}') : (mpCat.data || {});
            const marketplace = marketplaces.find(m => m.id === mpCat.marketplace_id);
            return {
                id: mpCat.id,
                external_id: mpCat.external_id,
                marketplace_id: mpCat.marketplace_id,
                name_ua: data.name || '',
                name_ru: '',
                parent_id: data.parent_id || '',
                our_category_id: data.our_category_id || '',
                _source: mpCat.marketplace_id,
                _sourceLabel: marketplace?.name || mpCat.marketplace_id,
                _editable: false,
                _mpData: data
            };
        });

    return { categories: [...ownCategories, ...mpCategories], marketplaces };
}

/**
 * Отримати конфігурацію колонок для категорій
 */
function getCategoriesColumns(allCategories) {
    return [
        {
            id: 'id',
            label: 'ID',
            className: 'cell-id',
            sortable: true,
            render: (value, row) => {
                const displayId = row._source === 'own' ? value : (row.external_id || value);
                return `<span class="word-chip">${escapeHtml(displayId || '')}</span>`;
            }
        },
        {
            id: '_sourceLabel',
            label: 'Джерело',
            sortable: true,
            filterable: true,
            className: 'cell-source',
            render: (value, row) => {
                if (row._source === 'own') {
                    return `<span class="chip chip-success">Власний</span>`;
                }
                return `<span class="chip chip-active">${escapeHtml(value)}</span>`;
            }
        },
        {
            id: '_nestingLevel',
            label: 'Рів.',
            className: 'cell-nesting-level',
            render: (value, row) => {
                let level = 0;
                let current = row;
                const path = [row.name_ua || row.id];

                while (current && current.parent_id) {
                    level++;
                    const parent = allCategories.find(c => c.id === current.parent_id);
                    if (parent) {
                        path.unshift(parent.name_ua || parent.id);
                        current = parent;
                    } else {
                        break;
                    }
                    if (level > 10) break;
                }

                const tooltipText = level === 0 ? 'Коренева категорія' : path.join(' → ');
                const chipClass = level === 0 ? 'chip-active' : '';

                return `<span class="chip ${chipClass}" data-tooltip="${escapeHtml(tooltipText)}" data-tooltip-always>${level}</span>`;
            }
        },
        {
            id: 'name_ua',
            label: 'Назва UA',
            sortable: true,
            className: 'cell-main-name',
            render: (value) => `<strong>${escapeHtml(value || '')}</strong>`
        },
        {
            id: 'name_ru',
            label: 'Назва RU',
            sortable: true,
            render: (value) => escapeHtml(value || '-')
        },
        {
            id: 'parent_id',
            label: 'Батьківська',
            sortable: true,
            render: (value, row) => {
                if (!value) return '-';
                const parent = allCategories.find(c => c.id === value);
                return parent ? escapeHtml(parent.name_ua || value) : escapeHtml(value);
            }
        }
    ];
}

/**
 * Ініціалізувати Table API для категорій
 */
function initCategoriesTableAPI(container, allCategories) {
    // Якщо API вже існує - не створюємо знову
    if (mapperTableAPIs.has('categories')) return;

    const visibleCols = mapperState.visibleColumns.categories?.length > 0
        ? [...mapperState.visibleColumns.categories, '_sourceLabel']
        : ['id', '_sourceLabel', 'name_ua', 'parent_id'];

    const tableAPI = createPseudoTable(container, {
        columns: getCategoriesColumns(allCategories),
        visibleColumns: visibleCols,
        rowActionsHeader: '<input type="checkbox" class="select-all-checkbox" data-tab="categories">',
        rowActionsCustom: (row) => {
            const action = row._editable ? 'edit' : 'view';
            return `
                <input type="checkbox" class="row-checkbox" data-row-id="${escapeHtml(row.id)}" data-tab="categories" data-source="${row._source}">
                ${actionButton({ action, rowId: row.id, context: 'mapper-categories' })}
            `;
        },
        getRowId: (row) => row.id,
        emptyState: {
            icon: 'folder',
            message: 'Категорії відсутні'
        },
        withContainer: false,
        onAfterRender: (cont) => {
            initActionHandlers(cont, 'mapper-categories');
            // Отримуємо поточні пагіновані дані для чекбоксів
            const { categories } = getCategoriesData();
            const filteredData = applyFilters(categories, 'categories');
            const { paginatedData } = applyPagination(filteredData);
            initTableCheckboxes(cont, 'categories', paginatedData);
            initMapperColumnFilters(cont, 'categories', categories);

            // Відновити індикатори сортування
            const sortState = mapperState.sortState?.categories;
            if (sortState?.column && sortState?.direction) {
                updateSortIndicators(cont, sortState.column, sortState.direction);
            }
        }
    });

    mapperTableAPIs.set('categories', tableAPI);
}

/**
 * Рендерити таблицю категорій
 */
export function renderCategoriesTable() {
    const container = document.getElementById('mapper-categories-table-container');
    if (!container) return;

    const { categories, marketplaces } = getCategoriesData();

    if (categories.length === 0) {
        renderEmptyState(container, 'categories');
        updateSourceFilterButtons('categories', marketplaces);
        return;
    }

    // Ініціалізуємо API якщо потрібно (або оновлюємо колонки)
    // Скидаємо API щоб оновити колонки з актуальними даними
    mapperTableAPIs.delete('categories');
    initCategoriesTableAPI(container, categories);

    const tableAPI = mapperTableAPIs.get('categories');
    if (!tableAPI) return;

    // Застосувати фільтри
    let filteredData = applyFilters(categories, 'categories');

    // Застосувати пагінацію
    const { paginatedData, totalItems } = applyPagination(filteredData);

    // Оновити пагінацію
    updatePagination(totalItems);

    // Оновити фільтр-кнопки джерела
    updateSourceFilterButtons('categories', marketplaces);

    // Рендерити таблицю через API
    tableAPI.render(paginatedData);

    // Оновити статистику
    updateStats('categories', filteredData.length, categories.length);
}

/**
 * Отримати дані характеристик (власні + MP)
 */
function getCharacteristicsData() {
    const marketplaces = getMarketplaces();
    const categoriesList = getCategories();

    // Отримати власні характеристики
    const ownCharacteristics = getCharacteristics().map(char => ({
        ...char,
        _source: 'own',
        _sourceLabel: 'Власний',
        _editable: true
    }));

    // Отримати MP характеристики - тільки незамаплені
    const mpCharacteristics = getMpCharacteristics()
        .filter(mpChar => !isMpCharacteristicMapped(mpChar.id))
        .map(mpChar => {
            const data = typeof mpChar.data === 'string' ? JSON.parse(mpChar.data) : (mpChar.data || {});
            const marketplace = marketplaces.find(m => m.id === mpChar.marketplace_id);
            return {
                id: mpChar.id,
                external_id: mpChar.external_id,
                marketplace_id: mpChar.marketplace_id,
                name_ua: data.name || '',
                name_ru: '',
                type: data.type || '',
                unit: data.unit || '',
                is_global: data.is_global === 'Так' || data.is_global === true,
                category_ids: data.category_id || '',
                filter_type: data.filter_type || '',
                our_char_id: data.our_char_id || '',
                _source: mpChar.marketplace_id,
                _sourceLabel: marketplace?.name || mpChar.marketplace_id,
                _editable: false,
                _mpData: data
            };
        });

    return {
        characteristics: [...ownCharacteristics, ...mpCharacteristics],
        marketplaces,
        categories: categoriesList
    };
}

/**
 * Отримати конфігурацію колонок для характеристик
 */
function getCharacteristicsColumns(categoriesList) {
    return [
        {
            id: 'id',
            label: 'ID',
            className: 'cell-id',
            sortable: true,
            render: (value, row) => {
                const displayId = row._source === 'own' ? value : (row.external_id || value);
                return `<span class="word-chip">${escapeHtml(displayId || '')}</span>`;
            }
        },
        {
            id: '_sourceLabel',
            label: 'Джерело',
            sortable: true,
            filterable: true,
            className: 'cell-source',
            render: (value, row) => {
                if (row._source === 'own') {
                    return `<span class="chip chip-success">Власний</span>`;
                }
                return `<span class="chip chip-active">${escapeHtml(value)}</span>`;
            }
        },
        {
            id: 'category_ids',
            label: 'Категорія',
            sortable: true,
            filterable: true,
            className: 'cell-category-count',
            render: (value, row) => {
                const isGlobal = row.is_global === true || String(row.is_global).toLowerCase() === 'true' || row.is_global === 'Так';
                if (isGlobal) {
                    return `<span class="chip chip-active" data-tooltip="Глобальна характеристика для всіх категорій" data-tooltip-always>∞</span>`;
                }

                const categoryIdsStr = value || row.category_ids || '';
                const categoryIdsList = categoryIdsStr.split(',').map(id => id.trim()).filter(id => id);
                const count = categoryIdsList.length;

                if (count === 0) {
                    return `<span class="chip" data-tooltip="Не прив'язано до категорій" data-tooltip-always>0</span>`;
                }

                const categoryNames = categoryIdsList.map(id => {
                    const cat = categoriesList.find(c => c.id === id);
                    return cat ? cat.name_ua : id;
                }).join('\n');

                return `<span class="chip" data-tooltip="${escapeHtml(categoryNames)}" data-tooltip-always>${count}</span>`;
            }
        },
        {
            id: 'name_ua',
            label: 'Назва',
            sortable: true,
            className: 'cell-main-name',
            render: (value) => `<strong>${escapeHtml(value || '')}</strong>`
        },
        {
            id: 'type',
            label: 'Тип',
            sortable: true,
            filterable: true,
            render: (value) => `<code>${escapeHtml(value || '-')}</code>`
        },
        {
            id: 'is_global',
            label: 'Глобальна',
            sortable: true,
            filterable: true,
            className: 'cell-bool',
            render: (value) => {
                const isGlobal = value === true || String(value).toLowerCase() === 'true' || value === 'Так';
                return isGlobal
                    ? '<span class="material-symbols-outlined" style="color: var(--color-success)">check_circle</span>'
                    : '<span class="material-symbols-outlined" style="color: var(--color-text-tertiary)">radio_button_unchecked</span>';
            }
        },
        {
            id: 'unit',
            label: 'Одиниця',
            sortable: true,
            render: (value) => escapeHtml(value || '-')
        }
    ];
}

/**
 * Ініціалізувати Table API для характеристик
 */
function initCharacteristicsTableAPI(container, categoriesList) {
    if (mapperTableAPIs.has('characteristics')) return;

    const visibleCols = mapperState.visibleColumns.characteristics?.length > 0
        ? [...mapperState.visibleColumns.characteristics, '_sourceLabel']
        : ['id', '_sourceLabel', 'category_ids', 'name_ua', 'type', 'is_global'];

    const tableAPI = createPseudoTable(container, {
        columns: getCharacteristicsColumns(categoriesList),
        visibleColumns: visibleCols,
        rowActionsHeader: '<input type="checkbox" class="select-all-checkbox" data-tab="characteristics">',
        rowActionsCustom: (row) => {
            const action = row._editable ? 'edit' : 'view';
            return `
                <input type="checkbox" class="row-checkbox" data-row-id="${escapeHtml(row.id)}" data-tab="characteristics" data-source="${row._source}">
                ${actionButton({ action, rowId: row.id, context: 'mapper-characteristics' })}
            `;
        },
        getRowId: (row) => row.id,
        emptyState: {
            icon: 'tune',
            message: 'Характеристики відсутні'
        },
        withContainer: false,
        onAfterRender: (cont) => {
            initActionHandlers(cont, 'mapper-characteristics');
            const { characteristics } = getCharacteristicsData();
            const filteredData = applyFilters(characteristics, 'characteristics');
            const { paginatedData } = applyPagination(filteredData);
            initTableCheckboxes(cont, 'characteristics', paginatedData);
            initMapperColumnFilters(cont, 'characteristics', characteristics);

            const sortState = mapperState.sortState?.characteristics;
            if (sortState?.column && sortState?.direction) {
                updateSortIndicators(cont, sortState.column, sortState.direction);
            }
        }
    });

    mapperTableAPIs.set('characteristics', tableAPI);
}

/**
 * Рендерити таблицю характеристик (власні + MP)
 */
export function renderCharacteristicsTable() {
    const container = document.getElementById('mapper-characteristics-table-container');
    if (!container) return;

    const { characteristics, marketplaces, categories } = getCharacteristicsData();

    if (characteristics.length === 0) {
        renderEmptyState(container, 'characteristics');
        updateSourceFilterButtons('characteristics', marketplaces);
        return;
    }

    // Скидаємо API щоб оновити колонки з актуальними даними
    mapperTableAPIs.delete('characteristics');
    initCharacteristicsTableAPI(container, categories);

    const tableAPI = mapperTableAPIs.get('characteristics');
    if (!tableAPI) return;

    let filteredData = applyFilters(characteristics, 'characteristics');
    const { paginatedData, totalItems } = applyPagination(filteredData);

    updatePagination(totalItems);
    updateSourceFilterButtons('characteristics', marketplaces);
    tableAPI.render(paginatedData);
    updateStats('characteristics', filteredData.length, characteristics.length);
}

/**
 * Отримати дані опцій (власні + MP)
 */
function getOptionsData() {
    const marketplaces = getMarketplaces();
    const characteristicsList = getCharacteristics();
    const mpCharacteristicsList = getMpCharacteristics();

    // Отримати власні опції
    const ownOptions = getOptions().map(opt => ({
        ...opt,
        _source: 'own',
        _sourceLabel: 'Власний',
        _editable: true
    }));

    // Отримати MP опції - тільки незамаплені
    const mpOptions = getMpOptions()
        .filter(mpOpt => !isMpOptionMapped(mpOpt.id))
        .map(mpOpt => {
            let data = {};
            if (mpOpt.data) {
                try {
                    data = typeof mpOpt.data === 'string' ? JSON.parse(mpOpt.data) : mpOpt.data;
                } catch (e) {
                    console.warn(`⚠️ Помилка парсингу data для MP опції ${mpOpt.id}:`, e);
                    data = {};
                }
            }
            const marketplace = marketplaces.find(m => m.id === mpOpt.marketplace_id);

            let charName = data.char_id || '';
            const mpChar = mpCharacteristicsList.find(c =>
                c.marketplace_id === mpOpt.marketplace_id && c.external_id === data.char_id
            );
            if (mpChar) {
                const charData = typeof mpChar.data === 'string' ? JSON.parse(mpChar.data) : (mpChar.data || {});
                charName = charData.name || data.char_id;
            }

            return {
                id: mpOpt.id,
                external_id: mpOpt.external_id,
                marketplace_id: mpOpt.marketplace_id,
                characteristic_id: data.char_id || '',
                characteristic_name: charName,
                value_ua: data.name || '',
                value_ru: '',
                sort_order: '0',
                our_option_id: data.our_option_id || '',
                _source: mpOpt.marketplace_id,
                _sourceLabel: marketplace?.name || mpOpt.marketplace_id,
                _editable: false,
                _mpData: data
            };
        });

    return {
        options: [...ownOptions, ...mpOptions],
        marketplaces,
        characteristics: characteristicsList
    };
}

/**
 * Отримати конфігурацію колонок для опцій
 */
function getOptionsColumns(characteristicsList) {
    return [
        {
            id: 'id',
            label: 'ID',
            className: 'cell-id',
            sortable: true,
            render: (value, row) => {
                const displayId = row._source === 'own' ? value : (row.external_id || value);
                return `<span class="word-chip">${escapeHtml(displayId || '')}</span>`;
            }
        },
        {
            id: '_sourceLabel',
            label: 'Джерело',
            sortable: true,
            filterable: true,
            className: 'cell-source',
            render: (value, row) => {
                if (row._source === 'own') {
                    return `<span class="chip chip-success">Власний</span>`;
                }
                return `<span class="chip chip-active">${escapeHtml(value)}</span>`;
            }
        },
        {
            id: 'characteristic_id',
            label: 'Характеристика',
            sortable: true,
            render: (value, row) => {
                if (row._source === 'own') {
                    const char = characteristicsList.find(c => c.id === value);
                    return char ? escapeHtml(char.name_ua || value) : escapeHtml(value || '-');
                }
                return escapeHtml(row.characteristic_name || value || '-');
            }
        },
        {
            id: 'value_ua',
            label: 'Значення',
            sortable: true,
            className: 'cell-main-name',
            render: (value) => `<strong>${escapeHtml(value || '')}</strong>`
        }
    ];
}

/**
 * Ініціалізувати Table API для опцій
 */
function initOptionsTableAPI(container, characteristicsList) {
    if (mapperTableAPIs.has('options')) return;

    const visibleCols = mapperState.visibleColumns.options?.length > 0
        ? [...mapperState.visibleColumns.options, '_sourceLabel']
        : ['id', '_sourceLabel', 'characteristic_id', 'value_ua'];

    const tableAPI = createPseudoTable(container, {
        columns: getOptionsColumns(characteristicsList),
        visibleColumns: visibleCols,
        rowActionsHeader: '<input type="checkbox" class="select-all-checkbox" data-tab="options">',
        rowActionsCustom: (row) => {
            const action = row._editable ? 'edit' : 'view';
            return `
                <input type="checkbox" class="row-checkbox" data-row-id="${escapeHtml(row.id)}" data-tab="options" data-source="${row._source}">
                ${actionButton({ action, rowId: row.id, context: 'mapper-options' })}
            `;
        },
        getRowId: (row) => row.id,
        emptyState: {
            icon: 'check_box',
            message: 'Опції відсутні'
        },
        withContainer: false,
        onAfterRender: (cont) => {
            initActionHandlers(cont, 'mapper-options');
            const { options } = getOptionsData();
            const filteredData = applyFilters(options, 'options');
            const { paginatedData } = applyPagination(filteredData);
            initTableCheckboxes(cont, 'options', paginatedData);
            initMapperColumnFilters(cont, 'options', options);

            const sortState = mapperState.sortState?.options;
            if (sortState?.column && sortState?.direction) {
                updateSortIndicators(cont, sortState.column, sortState.direction);
            }
        }
    });

    mapperTableAPIs.set('options', tableAPI);
}

/**
 * Рендерити таблицю опцій (власні + MP)
 */
export function renderOptionsTable() {
    const container = document.getElementById('mapper-options-table-container');
    if (!container) return;

    const { options, marketplaces, characteristics } = getOptionsData();

    if (options.length === 0) {
        renderEmptyState(container, 'options');
        updateSourceFilterButtons('options', marketplaces);
        return;
    }

    mapperTableAPIs.delete('options');
    initOptionsTableAPI(container, characteristics);

    const tableAPI = mapperTableAPIs.get('options');
    if (!tableAPI) return;

    let filteredData = applyFilters(options, 'options');
    const { paginatedData, totalItems } = applyPagination(filteredData);

    updatePagination(totalItems);
    updateSourceFilterButtons('options', marketplaces);
    tableAPI.render(paginatedData);
    updateStats('options', filteredData.length, options.length);
}

/**
 * Отримати дані маркетплейсів
 */
function getMarketplacesData() {
    const marketplaces = getMarketplaces().map(mp => ({
        ...mp,
        _source: 'own',
        _sourceLabel: 'Власний',
        _editable: true
    }));

    return { marketplaces };
}

/**
 * Отримати конфігурацію колонок для маркетплейсів
 */
function getMarketplacesColumns() {
    return [
        {
            id: 'id',
            label: 'ID',
            className: 'cell-id',
            sortable: true,
            render: (value) => `<span class="word-chip">${escapeHtml(value || '')}</span>`
        },
        {
            id: '_sourceLabel',
            label: 'Джерело',
            sortable: true,
            filterable: true,
            className: 'cell-source',
            render: (value, row) => {
                if (row._source === 'own') {
                    return `<span class="chip chip-success">Власний</span>`;
                }
                return `<span class="chip chip-active">${escapeHtml(value)}</span>`;
            }
        },
        {
            id: 'name',
            label: 'Назва',
            sortable: true,
            className: 'cell-main-name',
            render: (value) => `<strong>${escapeHtml(value || '')}</strong>`
        },
        {
            id: 'slug',
            label: 'Slug',
            sortable: true,
            render: (value) => `<code>${escapeHtml(value || '')}</code>`
        },
        {
            id: 'is_active',
            label: 'Активний',
            sortable: true,
            filterable: true,
            className: 'cell-bool',
            render: (value) => {
                const isActive = value === true || String(value).toLowerCase() === 'true';
                return isActive
                    ? '<span class="severity-badge severity-low">Активний</span>'
                    : '<span class="severity-badge severity-high">Неактивний</span>';
            }
        }
    ];
}

/**
 * Ініціалізувати Table API для маркетплейсів
 */
function initMarketplacesTableAPI(container) {
    if (mapperTableAPIs.has('marketplaces')) return;

    const visibleCols = mapperState.visibleColumns.marketplaces?.length > 0
        ? [...mapperState.visibleColumns.marketplaces, '_sourceLabel']
        : ['id', '_sourceLabel', 'name', 'slug', 'is_active'];

    const tableAPI = createPseudoTable(container, {
        columns: getMarketplacesColumns(),
        visibleColumns: visibleCols,
        rowActionsHeader: '<input type="checkbox" class="select-all-checkbox" data-tab="marketplaces">',
        rowActionsCustom: (row) => {
            return `
                <input type="checkbox" class="row-checkbox" data-row-id="${escapeHtml(row.id)}" data-tab="marketplaces">
                ${actionButton({ action: 'view', rowId: row.id, context: 'mapper-marketplaces' })}
                ${actionButton({ action: 'edit', rowId: row.id, context: 'mapper-marketplaces' })}
            `;
        },
        getRowId: (row) => row.id,
        emptyState: {
            icon: 'storefront',
            message: 'Маркетплейси відсутні'
        },
        withContainer: false,
        onAfterRender: (cont) => {
            initActionHandlers(cont, 'mapper-marketplaces');
            const { marketplaces } = getMarketplacesData();
            const filteredData = applyFilters(marketplaces, 'marketplaces');
            const { paginatedData } = applyPagination(filteredData);
            initTableCheckboxes(cont, 'marketplaces', paginatedData);
            initMapperColumnFilters(cont, 'marketplaces', marketplaces);

            const sortState = mapperState.sortState?.marketplaces;
            if (sortState?.column && sortState?.direction) {
                updateSortIndicators(cont, sortState.column, sortState.direction);
            }
        }
    });

    mapperTableAPIs.set('marketplaces', tableAPI);
}

/**
 * Рендерити таблицю маркетплейсів
 */
export function renderMarketplacesTable() {
    const container = document.getElementById('mapper-marketplaces-table-container');
    if (!container) return;

    const { marketplaces } = getMarketplacesData();

    if (marketplaces.length === 0) {
        renderEmptyState(container, 'marketplaces');
        updateSourceFilterButtons('marketplaces', marketplaces);
        return;
    }

    mapperTableAPIs.delete('marketplaces');
    initMarketplacesTableAPI(container);

    const tableAPI = mapperTableAPIs.get('marketplaces');
    if (!tableAPI) return;

    let filteredData = applyFilters(marketplaces, 'marketplaces');
    const { paginatedData, totalItems } = applyPagination(filteredData);

    updatePagination(totalItems);
    updateSourceFilterButtons('marketplaces', marketplaces);
    tableAPI.render(paginatedData);
    updateStats('marketplaces', filteredData.length, marketplaces.length);
}

/**
 * Локальна функція сортування масиву
 */
function sortArrayLocal(array, column, direction) {
    if (!column || !direction) return array;

    return [...array].sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        // Перетворюємо в рядки для порівняння
        aVal = (aVal || '').toString();
        bVal = (bVal || '').toString();

        // Обробка пустих значень - завжди в кінець
        if (!aVal && !bVal) return 0;
        if (!aVal) return 1;
        if (!bVal) return -1;

        // Порівняння з українською локаллю
        const comparison = aVal.localeCompare(bVal, 'uk', { sensitivity: 'base' });
        return direction === 'asc' ? comparison : -comparison;
    });
}

/**
 * Застосувати фільтри
 */
function applyFilters(data, tabName) {
    let filtered = [...data];

    // Пошук
    if (mapperState.searchQuery) {
        const query = mapperState.searchQuery.toLowerCase();
        const columns = mapperState.searchColumns[tabName] || [];

        filtered = filtered.filter(item => {
            return columns.some(column => {
                const value = item[column];
                return value?.toString().toLowerCase().includes(query);
            });
        });
    }

    // Отримати налаштування фільтрів
    const filter = mapperState.filters[tabName];

    // Фільтр по джерелу (source) - для всіх табів (кнопки)
    if (filter && typeof filter === 'object' && filter.source && filter.source !== 'all') {
        if (filter.source === 'own') {
            filtered = filtered.filter(item => item._source === 'own');
        } else {
            // Фільтр по конкретному маркетплейсу (наприклад, mp-001)
            const marketplaceId = filter.source.replace('mp-', '');
            filtered = filtered.filter(item => item._source === marketplaceId || item.marketplace_id === marketplaceId);
        }
    }

    // Колонкові фільтри (hover dropdown)
    const columnFilters = mapperState.columnFilters[tabName];
    if (columnFilters && Object.keys(columnFilters).length > 0) {
        const filterColumns = getFilterColumnsConfig(tabName);
        filtered = filterData(filtered, columnFilters, filterColumns);
    }

    // Застосувати сортування
    const sortState = mapperState.sortState?.[tabName];
    if (sortState?.column && sortState?.direction) {
        filtered = sortArrayLocal(filtered, sortState.column, sortState.direction);
    }

    return filtered;
}

/**
 * Оновити кнопки фільтра по джерелу
 * @param {string} tabName - Назва табу
 * @param {Array} marketplaces - Список маркетплейсів
 */
function updateSourceFilterButtons(tabName, marketplaces) {
    const containerId = `filter-source-mapper-${tabName}`;
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentFilter = mapperState.filters[tabName]?.source || 'all';

    // Базові кнопки
    let html = `
        <button class="nav-icon ${currentFilter === 'all' ? 'active' : ''}" data-filter-source="all" data-tab="${tabName}">
            <span class="label">Всі</span>
        </button>
        <button class="nav-icon ${currentFilter === 'own' ? 'active' : ''}" data-filter-source="own" data-tab="${tabName}">
            <span class="label">Власні</span>
        </button>
    `;

    // Додати кнопки для кожного активного маркетплейсу
    const activeMarketplaces = marketplaces.filter(m => m.is_active === true || String(m.is_active).toLowerCase() === 'true');
    activeMarketplaces.forEach(mp => {
        const isActive = currentFilter === `mp-${mp.id}`;
        html += `
            <button class="nav-icon ${isActive ? 'active' : ''}" data-filter-source="mp-${mp.id}" data-tab="${tabName}">
                <span class="label">${escapeHtml(mp.name)}</span>
            </button>
        `;
    });

    container.innerHTML = html;

    // Додати обробники подій
    container.querySelectorAll('.nav-icon').forEach(btn => {
        btn.addEventListener('click', () => {
            const source = btn.dataset.filterSource;
            const tab = btn.dataset.tab;

            // Оновити стан фільтра
            if (!mapperState.filters[tab] || typeof mapperState.filters[tab] !== 'object') {
                mapperState.filters[tab] = { mapped: 'all', source: 'all' };
            }
            mapperState.filters[tab].source = source;
            mapperState.pagination.currentPage = 1;

            // Перерендерити таблицю
            renderCurrentTab();

        });
    });
}

/**
 * Застосувати пагінацію
 */
function applyPagination(data) {
    const { currentPage, pageSize } = mapperState.pagination;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;

    return {
        paginatedData: data.slice(start, end),
        totalItems: data.length
    };
}

/**
 * Оновити пагінацію
 */
function updatePagination(totalItems) {
    if (mapperState.paginationAPI) {
        mapperState.paginationAPI.update({
            currentPage: mapperState.pagination.currentPage,
            pageSize: mapperState.pagination.pageSize,
            totalItems
        });
    }
}

/**
 * Відрендерити порожній стан
 */
function renderEmptyState(container, tabName) {
    const icons = {
        categories: 'folder',
        characteristics: 'tune',
        options: 'check_box',
        marketplaces: 'storefront'
    };

    const messages = {
        categories: 'Категорії відсутні',
        characteristics: 'Характеристики відсутні',
        options: 'Опції відсутні',
        marketplaces: 'Маркетплейси відсутні'
    };

    const avatarHtml = renderAvatarState('empty', {
        message: messages[tabName] || 'Дані відсутні',
        size: 'medium',
        containerClass: 'empty-state-container',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });

    container.innerHTML = avatarHtml;
    updateStats(tabName, 0, 0);
}

/**
 * Оновити статистику
 */
function updateStats(tabName, visible, total) {
    const statsEl = document.getElementById(`tab-stats-mapper-${tabName}`);
    if (!statsEl) return;

    statsEl.textContent = `Показано ${visible} з ${total}`;
}

/**
 * Скинути всі mapperTableAPIs (для реініціалізації)
 */
export function resetMapperTableAPIs() {
    mapperTableAPIs.clear();
}

/**
 * Очистити checkbox delegation handlers для табу
 * @param {string} tabName - Назва табу (опціонально, якщо не вказано - очистити всі)
 */
export function clearCheckboxHandlers(tabName) {
    if (tabName) {
        const handler = checkboxDelegationHandlers.get(tabName);
        if (handler) {
            const container = document.getElementById(`mapper-${tabName}-table-container`);
            if (container) {
                container.removeEventListener('change', handler);
            }
            checkboxDelegationHandlers.delete(tabName);
        }
    } else {
        // Очистити всі handlers
        checkboxDelegationHandlers.forEach((handler, tab) => {
            const container = document.getElementById(`mapper-${tab}-table-container`);
            if (container) {
                container.removeEventListener('change', handler);
            }
        });
        checkboxDelegationHandlers.clear();
    }
}

/**
 * Отримати tableAPI для табу
 * @param {string} tabName - Назва табу
 * @returns {Object|null} tableAPI або null
 */
export function getMapperTableAPI(tabName) {
    return mapperTableAPIs.get(tabName) || null;
}

/**
 * Рендерити тільки рядки поточного активного табу (заголовок залишається)
 */
export function renderCurrentTabRowsOnly() {
    const activeTab = mapperState.activeTab;
    const tableAPI = mapperTableAPIs.get(activeTab);

    if (!tableAPI) {
        // Якщо API ще не створено - робимо повний рендер
        renderCurrentTab();
        return;
    }

    // Отримуємо дані залежно від табу
    switch (activeTab) {
        case 'categories':
            renderCategoriesTableRowsOnly();
            break;
        case 'characteristics':
            renderCharacteristicsTableRowsOnly();
            break;
        case 'options':
            renderOptionsTableRowsOnly();
            break;
        case 'marketplaces':
            renderMarketplacesTableRowsOnly();
            break;
    }
}

/**
 * Оновити тільки рядки таблиці категорій
 */
export function renderCategoriesTableRowsOnly() {
    const tableAPI = mapperTableAPIs.get('categories');
    if (!tableAPI) {
        renderCategoriesTable();
        return;
    }

    const { categories } = getCategoriesData();
    let filteredData = applyFilters(categories, 'categories');
    const { paginatedData, totalItems } = applyPagination(filteredData);

    updatePagination(totalItems);
    tableAPI.updateRows(paginatedData);
    updateStats('categories', filteredData.length, categories.length);
}

/**
 * Оновити тільки рядки таблиці характеристик
 */
export function renderCharacteristicsTableRowsOnly() {
    const tableAPI = mapperTableAPIs.get('characteristics');
    if (!tableAPI) {
        renderCharacteristicsTable();
        return;
    }

    const { characteristics } = getCharacteristicsData();
    let filteredData = applyFilters(characteristics, 'characteristics');
    const { paginatedData, totalItems } = applyPagination(filteredData);

    updatePagination(totalItems);
    tableAPI.updateRows(paginatedData);
    updateStats('characteristics', filteredData.length, characteristics.length);
}

/**
 * Оновити тільки рядки таблиці опцій
 */
export function renderOptionsTableRowsOnly() {
    const tableAPI = mapperTableAPIs.get('options');
    if (!tableAPI) {
        renderOptionsTable();
        return;
    }

    const { options } = getOptionsData();
    let filteredData = applyFilters(options, 'options');
    const { paginatedData, totalItems } = applyPagination(filteredData);

    updatePagination(totalItems);
    tableAPI.updateRows(paginatedData);
    updateStats('options', filteredData.length, options.length);
}

/**
 * Оновити тільки рядки таблиці маркетплейсів
 */
export function renderMarketplacesTableRowsOnly() {
    const tableAPI = mapperTableAPIs.get('marketplaces');
    if (!tableAPI) {
        renderMarketplacesTable();
        return;
    }

    const { marketplaces } = getMarketplacesData();
    let filteredData = applyFilters(marketplaces, 'marketplaces');
    const { paginatedData, totalItems } = applyPagination(filteredData);

    updatePagination(totalItems);
    tableAPI.updateRows(paginatedData);
    updateStats('marketplaces', filteredData.length, marketplaces.length);
}

// Сховище для event delegation handlers (для cleanup)
const checkboxDelegationHandlers = new Map();

/**
 * Ініціалізувати чекбокси для таблиці
 * Використовує event delegation для уникнення накопичення listeners
 *
 * @param {HTMLElement} container - Контейнер таблиці
 * @param {string} tabName - Назва табу (categories, characteristics, options, marketplaces)
 * @param {Array} data - Дані поточної сторінки
 */
function initTableCheckboxes(container, tabName, data) {
    const selectAllCheckbox = container.querySelector('.select-all-checkbox');
    const rowCheckboxes = container.querySelectorAll('.row-checkbox');

    if (!selectAllCheckbox || rowCheckboxes.length === 0) return;

    // Ініціалізувати Set якщо не існує
    if (!mapperState.selectedRows[tabName]) {
        mapperState.selectedRows[tabName] = new Set();
    }

    const selectedSet = mapperState.selectedRows[tabName];
    const batchBarId = `mapper-${tabName}`;

    // Отримати batch bar (один раз)
    const batchBar = getBatchBar(batchBarId);

    // --- КРОК 1: Відновити візуальний стан чекбоксів з selectedSet ---
    rowCheckboxes.forEach(checkbox => {
        const rowId = checkbox.dataset.rowId;
        checkbox.checked = selectedSet.has(rowId);
    });

    // --- КРОК 2: Оновити стан "select all" чекбокса ---
    const updateSelectAllState = () => {
        const allIds = data.map(row => row.id);
        const allSelected = allIds.length > 0 && allIds.every(id => selectedSet.has(id));
        const someSelected = allIds.some(id => selectedSet.has(id));

        selectAllCheckbox.checked = allSelected;
        selectAllCheckbox.indeterminate = someSelected && !allSelected;
    };

    updateSelectAllState();

    // --- КРОК 3: Оновити batch bar з поточним станом ---
    if (batchBar) {
        // Batch bar вже має свій selectedItems - синхронізуємо з mapperState
        const batchSelected = new Set(batchBar.getSelected());

        // Додаємо в batch bar тільки ті що є в selectedSet але немає в batch
        selectedSet.forEach(id => {
            if (!batchSelected.has(id)) {
                batchBar.selectItem(id);
            }
        });

        // Видаляємо з batch bar ті що немає в selectedSet
        batchSelected.forEach(id => {
            if (!selectedSet.has(id)) {
                batchBar.deselectItem(id);
            }
        });
    }

    // --- КРОК 4: Event delegation (один listener на контейнер) ---
    // Видаляємо попередній handler якщо є
    const prevHandler = checkboxDelegationHandlers.get(tabName);
    if (prevHandler) {
        container.removeEventListener('change', prevHandler);
    }

    // Створюємо новий handler з актуальними data
    const delegationHandler = (e) => {
        const target = e.target;

        // Обробка "select all" чекбокса
        if (target.classList.contains('select-all-checkbox') && target.dataset.tab === tabName) {
            const allIds = data.map(row => row.id);
            const currentBatchBar = getBatchBar(batchBarId);

            if (target.checked) {
                // Вибрати всі на поточній сторінці
                allIds.forEach(id => selectedSet.add(id));
                container.querySelectorAll('.row-checkbox').forEach(cb => {
                    cb.checked = true;
                });
                // Sync batch bar
                if (currentBatchBar) {
                    allIds.forEach(id => currentBatchBar.selectItem(id));
                }
            } else {
                // Зняти вибір з усіх на поточній сторінці
                allIds.forEach(id => selectedSet.delete(id));
                container.querySelectorAll('.row-checkbox').forEach(cb => {
                    cb.checked = false;
                });
                // Sync batch bar
                if (currentBatchBar) {
                    allIds.forEach(id => currentBatchBar.deselectItem(id));
                }
            }

            // Виконати хук
            runHook('onRowSelect', tabName, Array.from(selectedSet));
            return;
        }

        // Обробка row чекбоксів
        if (target.classList.contains('row-checkbox') && target.dataset.tab === tabName) {
            const rowId = target.dataset.rowId;
            const currentBatchBar = getBatchBar(batchBarId);

            if (target.checked) {
                selectedSet.add(rowId);
                if (currentBatchBar) currentBatchBar.selectItem(rowId);
            } else {
                selectedSet.delete(rowId);
                if (currentBatchBar) currentBatchBar.deselectItem(rowId);
            }

            // Оновити select all state
            const allIds = data.map(row => row.id);
            const allSelected = allIds.length > 0 && allIds.every(id => selectedSet.has(id));
            const someSelected = allIds.some(id => selectedSet.has(id));

            const selectAll = container.querySelector('.select-all-checkbox');
            if (selectAll) {
                selectAll.checked = allSelected;
                selectAll.indeterminate = someSelected && !allSelected;
            }

            // Виконати хук
            runHook('onRowSelect', tabName, Array.from(selectedSet));
        }
    };

    // Зберігаємо handler для можливості cleanup
    checkboxDelegationHandlers.set(tabName, delegationHandler);
    container.addEventListener('change', delegationHandler);
}

// ═══════════════════════════════════════════════════════════════════════════
// ІНІЦІАЛІЗАЦІЯ HOVER ФІЛЬТРІВ ДЛЯ КОЛОНОК
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Конфігурація колонок з фільтрами для кожного табу
 */
/**
 * Отримати конфігурацію колонок з фільтрами для табу
 * @param {string} tabName - Назва табу
 * @returns {Array} Конфігурація фільтрів
 */
function getFilterColumnsConfig(tabName) {
    const baseConfig = {
        categories: [
            { id: '_sourceLabel', label: 'Джерело', filterType: 'values' }
        ],
        characteristics: [
            { id: '_sourceLabel', label: 'Джерело', filterType: 'values' },
            { id: 'category_ids', label: 'Категорія', filterType: 'contains', labelMap: getCategoryLabelMap() },
            { id: 'type', label: 'Тип', filterType: 'values' },
            { id: 'is_global', label: 'Глобальна', filterType: 'values', labelMap: { 'true': 'Так', 'false': 'Ні' } }
        ],
        options: [
            { id: '_sourceLabel', label: 'Джерело', filterType: 'values' }
        ],
        marketplaces: [
            { id: '_sourceLabel', label: 'Джерело', filterType: 'values' },
            { id: 'is_active', label: 'Активний', filterType: 'values', labelMap: { 'true': 'Активний', 'false': 'Неактивний' } }
        ]
    };

    return baseConfig[tabName] || [];
}

/**
 * Створити labelMap для категорій (ID -> Назва)
 */
function getCategoryLabelMap() {
    const categories = getCategories();
    const labelMap = {};
    categories.forEach(cat => {
        labelMap[cat.id] = cat.name_ua || cat.id;
    });
    return labelMap;
}

// Для зворотної сумісності
const filterColumnsConfig = {
    categories: [
        { id: '_sourceLabel', label: 'Джерело', filterType: 'values' }
    ],
    characteristics: [
        { id: '_sourceLabel', label: 'Джерело', filterType: 'values' },
        { id: 'type', label: 'Тип', filterType: 'values' },
        { id: 'is_global', label: 'Глобальна', filterType: 'values', labelMap: { 'true': 'Так', 'false': 'Ні' } }
    ],
    options: [
        { id: '_sourceLabel', label: 'Джерело', filterType: 'values' }
    ],
    marketplaces: [
        { id: '_sourceLabel', label: 'Джерело', filterType: 'values' },
        { id: 'is_active', label: 'Активний', filterType: 'values', labelMap: { 'true': 'Активний', 'false': 'Неактивний' } }
    ]
};

// Флаг для запобігання циклу при відновленні фільтрів
let isRestoringFilters = false;

/**
 * Ініціалізувати hover фільтри для колонок таблиці
 * @param {HTMLElement} container - Контейнер таблиці
 * @param {string} tabName - Назва табу
 * @param {Array} data - Повний масив даних (не пагінований!)
 */
export function initMapperColumnFilters(container, tabName, data) {
    // Зберігаємо поточні фільтри перед знищенням API
    const savedFilters = mapperState.columnFilters[tabName]
        ? { ...mapperState.columnFilters[tabName] }
        : null;

    // Знищити попередній API якщо є
    if (mapperState.columnFiltersAPI[tabName]) {
        mapperState.columnFiltersAPI[tabName].destroy();
        mapperState.columnFiltersAPI[tabName] = null;
    }

    // Використовуємо динамічну конфігурацію (з актуальним labelMap)
    const filterColumns = getFilterColumnsConfig(tabName);

    // Перевіряємо чи є заголовок таблиці
    const hasHeader = container.querySelector('.pseudo-table-header');
    if (!hasHeader) return;

    // Зберігаємо дані для сортування
    let currentData = data;

    const sortAPI = initTableSorting(container, {
        dataSource: () => currentData,
        columnTypes: {
            id: 'string',
            _sourceLabel: 'string',
            name_ua: 'string',
            name_ru: 'string',
            type: 'string',
            is_global: 'boolean',
            is_active: 'boolean',
            value_ua: 'string',
            name: 'string',
            slug: 'string',
            parent_id: 'string',
            characteristic_id: 'string',
            category_ids: 'string'
        },
        filterColumns: filterColumns || [],
        onSort: async (sortedData) => {
            // Зберігаємо стан сортування
            const sortState = sortAPI.getState();
            mapperState.sortState = mapperState.sortState || {};
            mapperState.sortState[tabName] = {
                column: sortState.column,
                direction: sortState.direction
            };

            // Скидаємо пагінацію
            mapperState.pagination.currentPage = 1;

            // Перерендерюємо таблицю
            renderCurrentTab();
        },
        onFilter: async (activeFilters) => {
            // Пропускаємо якщо це відновлення стану
            if (isRestoringFilters) return;

            // Зберігаємо фільтри в state
            mapperState.columnFilters[tabName] = activeFilters;

            // Скидаємо пагінацію
            mapperState.pagination.currentPage = 1;

            // Перерендерюємо таблицю
            renderCurrentTab();
        }
    });

    // Відновлюємо попередній стан фільтрів
    if (savedFilters && Object.keys(savedFilters).length > 0) {
        isRestoringFilters = true;
        sortAPI.setFilters(savedFilters);
        isRestoringFilters = false;
    }

    mapperState.columnFiltersAPI[tabName] = sortAPI;
}
