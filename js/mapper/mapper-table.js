// js/mapper/mapper-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - TABLE RENDERING                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Рендеринг таблиць для Marketplace Mapper з підтримкою пагінації,
 * сортування та фільтрації.
 */

import { mapperState } from './mapper-init.js';
import {
    getCategories, getCharacteristics, getOptions, getMarketplaces,
    getMpCharacteristics, getMpOptions, getMapCharacteristics, getMapOptions
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
import { renderPseudoTable } from '../common/ui-table.js';
import { escapeHtml } from '../utils/text-utils.js';
import { renderAvatarState } from '../utils/avatar-states.js';

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
 * Рендерити таблицю категорій
 */
export function renderCategoriesTable() {
    console.log('🎨 Рендеринг таблиці категорій...');

    const container = document.getElementById('mapper-categories-table-container');
    if (!container) return;

    const marketplaces = getMarketplaces();

    // Отримати категорії та додати мітку джерела
    const categories = getCategories().map(cat => ({
        ...cat,
        _source: 'own',
        _sourceLabel: 'Власний',
        _editable: true
    }));

    if (categories.length === 0) {
        renderEmptyState(container, 'categories');
        updateSourceFilterButtons('categories', marketplaces);
        return;
    }

    // Застосувати фільтри
    let filteredData = applyFilters(categories, 'categories');

    // Застосувати пагінацію
    const { paginatedData, totalItems } = applyPagination(filteredData);

    // Оновити пагінацію
    updatePagination(totalItems);

    // Оновити фільтр-кнопки джерела
    updateSourceFilterButtons('categories', marketplaces);

    // Рендерити таблицю
    renderPseudoTable(container, {
        data: paginatedData,
        columns: [
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
                className: 'cell-source',
                render: (value, row) => {
                    if (row._source === 'own') {
                        return `<span class="chip chip-success">Власний</span>`;
                    }
                    return `<span class="chip chip-active">${escapeHtml(value)}</span>`;
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
                    const parent = categories.find(c => c.id === value);
                    return parent ? escapeHtml(parent.name_ua || value) : escapeHtml(value);
                }
            }
        ],
        visibleColumns: [...(mapperState.visibleColumns.categories || []), '_sourceLabel'],
        rowActionsHeader: '<input type="checkbox" class="select-all-checkbox" data-tab="categories">',
        rowActionsCustom: (row) => {
            const selectedSet = mapperState.selectedRows.categories || new Set();
            const isChecked = selectedSet.has(row.id);
            return `
                <input type="checkbox" class="row-checkbox" data-row-id="${escapeHtml(row.id)}" data-tab="categories" ${isChecked ? 'checked' : ''}>
                <button class="btn-icon btn-edit-category" data-id="${escapeHtml(row.id)}" title="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            `;
        },
        emptyState: {
            icon: 'folder',
            message: 'Категорії не знайдено'
        },
        withContainer: false
    });

    // Додати обробники для кнопок редагування
    container.querySelectorAll('.btn-edit-category').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = button.dataset.id;
            if (id) {
                const { showEditCategoryModal } = await import('./mapper-crud.js');
                await showEditCategoryModal(id);
            }
        });
    });

    // Ініціалізувати чекбокси
    initTableCheckboxes(container, 'categories', paginatedData);

    // Оновити статистику
    updateStats('categories', filteredData.length, categories.length);

    console.log(`✅ Відрендерено ${paginatedData.length} з ${filteredData.length} категорій`);
}

/**
 * Рендерити таблицю характеристик (власні + MP)
 */
export function renderCharacteristicsTable() {
    console.log('🎨 Рендеринг таблиці характеристик...');

    const container = document.getElementById('mapper-characteristics-table-container');
    if (!container) return;

    const marketplaces = getMarketplaces();
    const categories = getCategories();

    // Отримати власні характеристики
    const ownCharacteristics = getCharacteristics().map(char => ({
        ...char,
        _source: 'own',
        _sourceLabel: 'Власний',
        _editable: true
    }));

    // Отримати MP характеристики та конвертувати в уніфікований формат
    const mpCharacteristics = getMpCharacteristics().map(mpChar => {
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

    // Об'єднати
    const allCharacteristics = [...ownCharacteristics, ...mpCharacteristics];

    if (allCharacteristics.length === 0) {
        renderEmptyState(container, 'characteristics');
        return;
    }

    // Застосувати фільтри
    let filteredData = applyFilters(allCharacteristics, 'characteristics');

    // Застосувати пагінацію
    const { paginatedData, totalItems } = applyPagination(filteredData);

    // Оновити пагінацію
    updatePagination(totalItems);

    // Оновити фільтр-кнопки джерела
    updateSourceFilterButtons('characteristics', marketplaces);

    // Рендерити таблицю
    renderPseudoTable(container, {
        data: paginatedData,
        columns: [
            {
                id: 'id',
                label: 'ID',
                className: 'cell-id',
                sortable: true,
                render: (value, row) => {
                    // Для MP показуємо external_id
                    const displayId = row._source === 'own' ? value : (row.external_id || value);
                    return `<span class="word-chip">${escapeHtml(displayId || '')}</span>`;
                }
            },
            {
                id: '_sourceLabel',
                label: 'Джерело',
                sortable: true,
                className: 'cell-source',
                render: (value, row) => {
                    if (row._source === 'own') {
                        return `<span class="chip chip-success">Власний</span>`;
                    }
                    return `<span class="chip chip-active">${escapeHtml(value)}</span>`;
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
                render: (value) => `<code>${escapeHtml(value || '-')}</code>`
            },
            {
                id: 'is_global',
                label: 'Глобальна',
                sortable: true,
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
            },
            {
                id: 'our_char_id',
                label: 'Маппінг',
                sortable: false,
                className: 'cell-mapping',
                render: (value, row) => {
                    if (row._source === 'own') return '-';
                    if (!value) {
                        return '<span class="severity-badge severity-high">Не прив\'язано</span>';
                    }
                    const ownChar = ownCharacteristics.find(c => c.id === value);
                    return `<span class="severity-badge severity-low">${escapeHtml(ownChar?.name_ua || value)}</span>`;
                }
            }
        ],
        visibleColumns: [...(mapperState.visibleColumns.characteristics || []), '_sourceLabel', 'our_char_id'],
        rowActionsHeader: '<input type="checkbox" class="select-all-checkbox" data-tab="characteristics">',
        rowActionsCustom: (row) => {
            const selectedSet = mapperState.selectedRows.characteristics || new Set();
            const isChecked = selectedSet.has(row.id);
            const actionBtn = row._editable
                ? `<button class="btn-icon btn-edit-characteristic" data-id="${escapeHtml(row.id)}" title="Редагувати">
                       <span class="material-symbols-outlined">edit</span>
                   </button>`
                : `<button class="btn-icon btn-view-mp-characteristic" data-id="${escapeHtml(row.id)}" title="Переглянути">
                       <span class="material-symbols-outlined">visibility</span>
                   </button>`;
            return `
                <input type="checkbox" class="row-checkbox" data-row-id="${escapeHtml(row.id)}" data-tab="characteristics" data-source="${row._source}" ${isChecked ? 'checked' : ''}>
                ${actionBtn}
            `;
        },
        emptyState: {
            icon: 'tune',
            message: 'Характеристики не знайдено'
        },
        withContainer: false
    });

    // Додати обробники для кнопок редагування власних
    container.querySelectorAll('.btn-edit-characteristic').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = button.dataset.id;
            if (id) {
                const { showEditCharacteristicModal } = await import('./mapper-crud.js');
                await showEditCharacteristicModal(id);
            }
        });
    });

    // Додати обробники для кнопок перегляду MP
    container.querySelectorAll('.btn-view-mp-characteristic').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = button.dataset.id;
            console.log(`👁️ Клік на перегляд MP характеристики: ${id}`);
            if (id) {
                const { showViewMpCharacteristicModal } = await import('./mapper-crud.js');
                await showViewMpCharacteristicModal(id);
            }
        });
    });

    // Ініціалізувати чекбокси
    initTableCheckboxes(container, 'characteristics', paginatedData);

    // Оновити статистику
    updateStats('characteristics', filteredData.length, allCharacteristics.length);

    console.log(`✅ Відрендерено ${paginatedData.length} з ${filteredData.length} характеристик (власних: ${ownCharacteristics.length}, MP: ${mpCharacteristics.length})`);
}

/**
 * Рендерити таблицю опцій (власні + MP)
 */
export function renderOptionsTable() {
    console.log('🎨 Рендеринг таблиці опцій...');

    const container = document.getElementById('mapper-options-table-container');
    if (!container) return;

    const marketplaces = getMarketplaces();
    const characteristics = getCharacteristics();
    const mpCharacteristics = getMpCharacteristics();

    // Отримати власні опції
    const ownOptions = getOptions().map(opt => ({
        ...opt,
        _source: 'own',
        _sourceLabel: 'Власний',
        _editable: true
    }));

    // Отримати MP опції та конвертувати в уніфікований формат
    const mpOptions = getMpOptions().map(mpOpt => {
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

        // Знайти назву характеристики MP
        let charName = data.char_id || '';
        const mpChar = mpCharacteristics.find(c =>
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

    // Об'єднати
    const allOptions = [...ownOptions, ...mpOptions];

    if (allOptions.length === 0) {
        renderEmptyState(container, 'options');
        updateSourceFilterButtons('options', marketplaces);
        return;
    }

    // Застосувати фільтри
    let filteredData = applyFilters(allOptions, 'options');

    // Застосувати пагінацію
    const { paginatedData, totalItems } = applyPagination(filteredData);

    // Оновити пагінацію
    updatePagination(totalItems);

    // Оновити фільтр-кнопки джерела
    updateSourceFilterButtons('options', marketplaces);

    // Рендерити таблицю
    renderPseudoTable(container, {
        data: paginatedData,
        columns: [
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
                        const char = characteristics.find(c => c.id === value);
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
            },
            {
                id: 'our_option_id',
                label: 'Маппінг',
                sortable: false,
                className: 'cell-mapping',
                render: (value, row) => {
                    if (row._source === 'own') return '-';
                    if (!value) {
                        return '<span class="severity-badge severity-high">Не прив\'язано</span>';
                    }
                    const ownOpt = ownOptions.find(o => o.id === value);
                    return `<span class="severity-badge severity-low">${escapeHtml(ownOpt?.value_ua || value)}</span>`;
                }
            }
        ],
        visibleColumns: [...(mapperState.visibleColumns.options || []), '_sourceLabel', 'our_option_id'],
        rowActionsHeader: '<input type="checkbox" class="select-all-checkbox" data-tab="options">',
        rowActionsCustom: (row) => {
            const selectedSet = mapperState.selectedRows.options || new Set();
            const isChecked = selectedSet.has(row.id);
            const actionBtn = row._editable
                ? `<button class="btn-icon btn-edit-option" data-id="${escapeHtml(row.id)}" title="Редагувати">
                       <span class="material-symbols-outlined">edit</span>
                   </button>`
                : `<button class="btn-icon btn-view-mp-option" data-id="${escapeHtml(row.id)}" title="Переглянути">
                       <span class="material-symbols-outlined">visibility</span>
                   </button>`;
            return `
                <input type="checkbox" class="row-checkbox" data-row-id="${escapeHtml(row.id)}" data-tab="options" data-source="${row._source}" ${isChecked ? 'checked' : ''}>
                ${actionBtn}
            `;
        },
        emptyState: {
            icon: 'check_box',
            message: 'Опції не знайдено'
        },
        withContainer: false
    });

    // Додати обробники для кнопок редагування власних
    container.querySelectorAll('.btn-edit-option').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = button.dataset.id;
            if (id) {
                const { showEditOptionModal } = await import('./mapper-crud.js');
                await showEditOptionModal(id);
            }
        });
    });

    // Додати обробники для кнопок перегляду MP
    container.querySelectorAll('.btn-view-mp-option').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = button.dataset.id;
            if (id) {
                const { showViewMpOptionModal } = await import('./mapper-crud.js');
                await showViewMpOptionModal(id);
            }
        });
    });

    // Ініціалізувати чекбокси
    initTableCheckboxes(container, 'options', paginatedData);

    // Оновити статистику
    updateStats('options', filteredData.length, allOptions.length);

    console.log(`✅ Відрендерено ${paginatedData.length} з ${filteredData.length} опцій (власних: ${ownOptions.length}, MP: ${mpOptions.length})`);
}

/**
 * Рендерити таблицю маркетплейсів
 */
export function renderMarketplacesTable() {
    console.log('🎨 Рендеринг таблиці маркетплейсів...');

    const container = document.getElementById('mapper-marketplaces-table-container');
    if (!container) return;

    // Отримати маркетплейси та додати мітку джерела
    const marketplaces = getMarketplaces().map(mp => ({
        ...mp,
        _source: 'own',
        _sourceLabel: 'Власний',
        _editable: true
    }));

    if (marketplaces.length === 0) {
        renderEmptyState(container, 'marketplaces');
        updateSourceFilterButtons('marketplaces', marketplaces);
        return;
    }

    // Застосувати фільтри
    let filteredData = applyFilters(marketplaces, 'marketplaces');

    // Застосувати пагінацію
    const { paginatedData, totalItems } = applyPagination(filteredData);

    // Оновити пагінацію
    updatePagination(totalItems);

    // Оновити фільтр-кнопки джерела
    updateSourceFilterButtons('marketplaces', marketplaces);

    // Рендерити таблицю
    renderPseudoTable(container, {
        data: paginatedData,
        columns: [
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
                className: 'cell-bool',
                render: (value) => {
                    const isActive = value === true || String(value).toLowerCase() === 'true';
                    return isActive
                        ? '<span class="severity-badge severity-low">Активний</span>'
                        : '<span class="severity-badge severity-high">Неактивний</span>';
                }
            }
        ],
        visibleColumns: [...(mapperState.visibleColumns.marketplaces || []), '_sourceLabel'],
        rowActionsHeader: '<input type="checkbox" class="select-all-checkbox" data-tab="marketplaces">',
        rowActionsCustom: (row) => {
            const selectedSet = mapperState.selectedRows.marketplaces || new Set();
            const isChecked = selectedSet.has(row.id);
            return `
                <input type="checkbox" class="row-checkbox" data-row-id="${escapeHtml(row.id)}" data-tab="marketplaces" ${isChecked ? 'checked' : ''}>
                <button class="btn-icon btn-view-marketplace" data-id="${escapeHtml(row.id)}" title="Переглянути дані">
                    <span class="material-symbols-outlined">visibility</span>
                </button>
                <button class="btn-icon btn-edit-marketplace" data-id="${escapeHtml(row.id)}" title="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            `;
        },
        emptyState: {
            icon: 'storefront',
            message: 'Маркетплейси не знайдено'
        },
        withContainer: false
    });

    // Додати обробники для кнопок
    container.querySelectorAll('.btn-edit-marketplace').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = button.dataset.id;
            if (id) {
                const { showEditMarketplaceModal } = await import('./mapper-crud.js');
                await showEditMarketplaceModal(id);
            }
        });
    });

    container.querySelectorAll('.btn-view-marketplace').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = button.dataset.id;
            if (id) {
                const { showMarketplaceDataModal } = await import('./mapper-crud.js');
                await showMarketplaceDataModal(id);
            }
        });
    });

    // Ініціалізувати чекбокси
    initTableCheckboxes(container, 'marketplaces', paginatedData);

    // Оновити статистику
    updateStats('marketplaces', filteredData.length, marketplaces.length);

    console.log(`✅ Відрендерено ${paginatedData.length} з ${filteredData.length} маркетплейсів`);
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

    // Фільтр по джерелу (source) - для всіх табів
    if (filter && typeof filter === 'object' && filter.source && filter.source !== 'all') {
        if (filter.source === 'own') {
            filtered = filtered.filter(item => item._source === 'own');
        } else {
            // Фільтр по конкретному маркетплейсу (наприклад, mp-001)
            const marketplaceId = filter.source.replace('mp-', '');
            filtered = filtered.filter(item => item._source === marketplaceId || item.marketplace_id === marketplaceId);
        }
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

            console.log(`🔍 Фільтр джерела ${tab}: ${source}`);
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
 * Ініціалізувати чекбокси для таблиці
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

    // Оновити batch bar якщо він є (отримуємо динамічно кожен раз)
    const updateBatchBar = () => {
        const batchBar = getBatchBar(batchBarId);
        if (batchBar) {
            // Синхронізуємо batch bar з selectedSet
            console.log(`🔄 Синхронізація batch bar: ${selectedSet.size} елементів`);
            batchBar.deselectAll();
            selectedSet.forEach(id => batchBar.selectItem(id));
        } else {
            console.log(`⚠️ Batch bar для ${batchBarId} ще не створено`);
        }
    };

    // Оновити стан "select all" чекбокса
    const updateSelectAllState = () => {
        const allIds = data.map(row => row.id);
        const allSelected = allIds.every(id => selectedSet.has(id));
        const someSelected = allIds.some(id => selectedSet.has(id));

        selectAllCheckbox.checked = allSelected;
        selectAllCheckbox.indeterminate = someSelected && !allSelected;
    };

    // Обробник для "select all" чекбокса
    selectAllCheckbox.addEventListener('change', (e) => {
        const allIds = data.map(row => row.id);

        if (e.target.checked) {
            allIds.forEach(id => selectedSet.add(id));
        } else {
            allIds.forEach(id => selectedSet.delete(id));
        }

        // Оновити всі рядкові чекбокси
        rowCheckboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });

        updateBatchBar();
        console.log(`📦 Вибрано ${selectedSet.size} ${tabName}`);
    });

    // Обробник для рядкових чекбоксів
    rowCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const rowId = checkbox.dataset.rowId;

            if (checkbox.checked) {
                selectedSet.add(rowId);
            } else {
                selectedSet.delete(rowId);
            }

            updateSelectAllState();
            updateBatchBar();
            console.log(`📦 Вибрано ${selectedSet.size} ${tabName}`);
        });
    });

    // Встановити початковий стан
    updateSelectAllState();
    updateBatchBar();
}
