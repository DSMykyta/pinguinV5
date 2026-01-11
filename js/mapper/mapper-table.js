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
import { getCategories, getCharacteristics, getOptions, getMarketplaces, getMpCategories, getMpCharacteristics, getMpOptions } from './mapper-data.js';

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
        case 'mp-categories':
            renderMpCategoriesTable();
            break;
        case 'mp-characteristics':
            renderMpCharacteristicsTable();
            break;
        case 'mp-options':
            renderMpOptionsTable();
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

    const categories = getCategories();
    if (!categories || categories.length === 0) {
        renderEmptyState(container, 'categories');
        return;
    }

    // Застосувати фільтри
    let filteredData = applyFilters(categories, 'categories');

    // Застосувати пагінацію
    const { paginatedData, totalItems } = applyPagination(filteredData);

    // Оновити пагінацію
    updatePagination(totalItems);

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
        visibleColumns: mapperState.visibleColumns.categories,
        rowActionsHeader: ' ',
        rowActionsCustom: (row) => `
            <button class="btn-icon btn-edit-category" data-id="${escapeHtml(row.id)}" title="Редагувати">
                <span class="material-symbols-outlined">edit</span>
            </button>
        `,
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

    // Оновити статистику
    updateStats('categories', filteredData.length, categories.length);

    console.log(`✅ Відрендерено ${paginatedData.length} з ${filteredData.length} категорій`);
}

/**
 * Рендерити таблицю характеристик
 */
export function renderCharacteristicsTable() {
    console.log('🎨 Рендеринг таблиці характеристик...');

    const container = document.getElementById('mapper-characteristics-table-container');
    if (!container) return;

    const characteristics = getCharacteristics();
    if (!characteristics || characteristics.length === 0) {
        renderEmptyState(container, 'characteristics');
        return;
    }

    // Застосувати фільтри
    let filteredData = applyFilters(characteristics, 'characteristics');

    // Застосувати пагінацію
    const { paginatedData, totalItems } = applyPagination(filteredData);

    // Оновити пагінацію
    updatePagination(totalItems);

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
                id: 'type',
                label: 'Тип',
                sortable: true,
                render: (value) => {
                    const types = {
                        'text': 'Текст',
                        'number': 'Число',
                        'select': 'Вибір',
                        'multiselect': 'Множинний вибір',
                        'boolean': 'Так/Ні'
                    };
                    return types[value] || escapeHtml(value || '-');
                }
            },
            {
                id: 'is_global',
                label: 'Глобальна',
                sortable: true,
                className: 'cell-bool',
                render: (value) => {
                    const isGlobal = value === 'true' || value === true;
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
                id: 'category_ids',
                label: 'Категорії',
                sortable: false,
                render: (value) => {
                    const names = getCategoryNames(value);
                    if (names === '-') return '-';
                    // Показуємо чіпи для категорій
                    const categories = getCategories();
                    const ids = value.split(',').map(id => id.trim()).filter(id => id);
                    return ids.map(id => {
                        const cat = categories.find(c => c.id === id);
                        const name = cat ? escapeHtml(cat.name_ua) : escapeHtml(id);
                        return `<span class="word-chip word-chip-small">${name}</span>`;
                    }).join(' ');
                }
            }
        ],
        visibleColumns: mapperState.visibleColumns.characteristics,
        rowActionsHeader: ' ',
        rowActionsCustom: (row) => `
            <button class="btn-icon btn-edit-characteristic" data-id="${escapeHtml(row.id)}" title="Редагувати">
                <span class="material-symbols-outlined">edit</span>
            </button>
        `,
        emptyState: {
            icon: 'tune',
            message: 'Характеристики не знайдено'
        },
        withContainer: false
    });

    // Додати обробники для кнопок редагування
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

    // Оновити статистику
    updateStats('characteristics', filteredData.length, characteristics.length);

    console.log(`✅ Відрендерено ${paginatedData.length} з ${filteredData.length} характеристик`);
}

/**
 * Рендерити таблицю опцій
 */
export function renderOptionsTable() {
    console.log('🎨 Рендеринг таблиці опцій...');

    const container = document.getElementById('mapper-options-table-container');
    if (!container) return;

    const options = getOptions();
    const characteristics = getCharacteristics();

    if (!options || options.length === 0) {
        renderEmptyState(container, 'options');
        return;
    }

    // Застосувати фільтри
    let filteredData = applyFilters(options, 'options');

    // Застосувати пагінацію
    const { paginatedData, totalItems } = applyPagination(filteredData);

    // Оновити пагінацію
    updatePagination(totalItems);

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
                id: 'characteristic_id',
                label: 'Характеристика',
                sortable: true,
                render: (value) => {
                    const char = characteristics.find(c => c.id === value);
                    return char ? escapeHtml(char.name_ua || value) : escapeHtml(value || '-');
                }
            },
            {
                id: 'value_ua',
                label: 'Значення UA',
                sortable: true,
                className: 'cell-main-name',
                render: (value) => `<strong>${escapeHtml(value || '')}</strong>`
            },
            {
                id: 'value_ru',
                label: 'Значення RU',
                sortable: true,
                render: (value) => escapeHtml(value || '-')
            },
            {
                id: 'sort_order',
                label: 'Порядок',
                sortable: true,
                className: 'cell-bool',
                render: (value) => escapeHtml(value || '0')
            }
        ],
        visibleColumns: mapperState.visibleColumns.options,
        rowActionsHeader: ' ',
        rowActionsCustom: (row) => `
            <button class="btn-icon btn-edit-option" data-id="${escapeHtml(row.id)}" title="Редагувати">
                <span class="material-symbols-outlined">edit</span>
            </button>
        `,
        emptyState: {
            icon: 'check_box',
            message: 'Опції не знайдено'
        },
        withContainer: false
    });

    // Додати обробники для кнопок редагування
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

    // Оновити статистику
    updateStats('options', filteredData.length, options.length);

    console.log(`✅ Відрендерено ${paginatedData.length} з ${filteredData.length} опцій`);
}

/**
 * Рендерити таблицю маркетплейсів
 */
export function renderMarketplacesTable() {
    console.log('🎨 Рендеринг таблиці маркетплейсів...');

    const container = document.getElementById('mapper-marketplaces-table-container');
    if (!container) return;

    const marketplaces = getMarketplaces();
    if (!marketplaces || marketplaces.length === 0) {
        renderEmptyState(container, 'marketplaces');
        return;
    }

    // Застосувати фільтри
    let filteredData = applyFilters(marketplaces, 'marketplaces');

    // Застосувати пагінацію
    const { paginatedData, totalItems } = applyPagination(filteredData);

    // Оновити пагінацію
    updatePagination(totalItems);

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
                    const isActive = value === 'true' || value === true;
                    return isActive
                        ? '<span class="severity-badge severity-low">Активний</span>'
                        : '<span class="severity-badge severity-high">Неактивний</span>';
                }
            }
        ],
        visibleColumns: mapperState.visibleColumns.marketplaces,
        rowActionsHeader: ' ',
        rowActionsCustom: (row) => `
            <button class="btn-icon btn-view-marketplace" data-id="${escapeHtml(row.id)}" title="Переглянути дані">
                <span class="material-symbols-outlined">visibility</span>
            </button>
            <button class="btn-icon btn-edit-marketplace" data-id="${escapeHtml(row.id)}" title="Редагувати">
                <span class="material-symbols-outlined">edit</span>
            </button>
        `,
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

    // Оновити статистику
    updateStats('marketplaces', filteredData.length, marketplaces.length);

    console.log(`✅ Відрендерено ${paginatedData.length} з ${filteredData.length} маркетплейсів`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MP ТАБЛИЦІ (ДАНІ МАРКЕТПЛЕЙСІВ)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Рендерити таблицю категорій маркетплейсу
 */
export function renderMpCategoriesTable() {
    console.log('🎨 Рендеринг таблиці MP категорій...');

    const container = document.getElementById('mapper-mp-categories-table-container');
    if (!container) return;

    const selectedMp = mapperState.mpSelectedMarketplace['mp-categories'];
    if (!selectedMp) {
        renderMpEmptyState(container, 'mp-categories', 'Оберіть маркетплейс для перегляду категорій');
        return;
    }

    const allMpCategories = getMpCategories();
    const mpCategories = allMpCategories.filter(c => c.marketplace_id === selectedMp);

    if (!mpCategories || mpCategories.length === 0) {
        renderMpEmptyState(container, 'mp-categories', 'Категорії маркетплейсу відсутні');
        return;
    }

    // Застосувати фільтри
    let filteredData = applyMpFilters(mpCategories, 'mp-categories');

    // Застосувати пагінацію
    const { paginatedData, totalItems } = applyPagination(filteredData);

    // Оновити пагінацію
    updatePagination(totalItems);

    // Рендерити таблицю
    renderPseudoTable(container, {
        data: paginatedData,
        columns: [
            {
                id: 'external_id',
                label: 'ID',
                className: 'cell-id',
                sortable: true,
                render: (value) => `<span class="word-chip">${escapeHtml(value || '')}</span>`
            },
            {
                id: 'name',
                label: 'Назва',
                sortable: true,
                className: 'cell-main-name',
                render: (value) => `<strong>${escapeHtml(value || '')}</strong>`
            },
            {
                id: 'parent_id',
                label: 'Батьківська ID',
                sortable: true,
                render: (value) => escapeHtml(value || '-')
            },
            {
                id: 'parent_name',
                label: 'Батьківська',
                sortable: true,
                render: (value) => escapeHtml(value || '-')
            },
            {
                id: 'our_cat_id',
                label: 'Наша категорія',
                sortable: true,
                render: (value) => {
                    if (!value) {
                        return '<span class="severity-badge severity-high">Не прив\'язано</span>';
                    }
                    const cat = getCategories().find(c => c.id === value);
                    return `<span class="severity-badge severity-low">${escapeHtml(cat?.name_ua || value)}</span>`;
                }
            }
        ],
        visibleColumns: mapperState.visibleColumns['mp-categories'],
        rowActionsHeader: ' ',
        rowActionsCustom: (row) => `
            <button class="btn-icon btn-map-mp-category" data-id="${escapeHtml(row.id)}" title="Прив'язати">
                <span class="material-symbols-outlined">link</span>
            </button>
        `,
        emptyState: {
            icon: 'folder_shared',
            message: 'Категорії маркетплейсу не знайдено'
        },
        withContainer: false
    });

    // Оновити статистику
    updateStats('mp-categories', filteredData.length, mpCategories.length);

    console.log(`✅ Відрендерено ${paginatedData.length} з ${filteredData.length} MP категорій`);
}

/**
 * Рендерити таблицю характеристик маркетплейсу
 */
export function renderMpCharacteristicsTable() {
    console.log('🎨 Рендеринг таблиці MP характеристик...');

    const container = document.getElementById('mapper-mp-characteristics-table-container');
    if (!container) return;

    const selectedMp = mapperState.mpSelectedMarketplace['mp-characteristics'];
    if (!selectedMp) {
        renderMpEmptyState(container, 'mp-characteristics', 'Оберіть маркетплейс для перегляду характеристик');
        return;
    }

    const allMpChars = getMpCharacteristics();
    const mpChars = allMpChars.filter(c => c.marketplace_id === selectedMp);

    if (!mpChars || mpChars.length === 0) {
        renderMpEmptyState(container, 'mp-characteristics', 'Характеристики маркетплейсу відсутні');
        return;
    }

    // Застосувати фільтри
    let filteredData = applyMpFilters(mpChars, 'mp-characteristics');

    // Застосувати пагінацію
    const { paginatedData, totalItems } = applyPagination(filteredData);

    // Оновити пагінацію
    updatePagination(totalItems);

    // Рендерити таблицю
    renderPseudoTable(container, {
        data: paginatedData,
        columns: [
            {
                id: 'external_id',
                label: 'ID',
                className: 'cell-id',
                sortable: true,
                render: (value) => `<span class="word-chip">${escapeHtml(value || '')}</span>`
            },
            {
                id: 'name',
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
                id: 'unit',
                label: 'Одиниця',
                sortable: true,
                render: (value) => escapeHtml(value || '-')
            },
            {
                id: 'category_name',
                label: 'Категорія MP',
                sortable: true,
                render: (value) => escapeHtml(value || '-')
            },
            {
                id: 'our_char_id',
                label: 'Наша характ.',
                sortable: true,
                render: (value) => {
                    if (!value) {
                        return '<span class="severity-badge severity-high">Не прив\'язано</span>';
                    }
                    const char = getCharacteristics().find(c => c.id === value);
                    return `<span class="severity-badge severity-low">${escapeHtml(char?.name_ua || value)}</span>`;
                }
            }
        ],
        visibleColumns: mapperState.visibleColumns['mp-characteristics'],
        rowActionsHeader: ' ',
        rowActionsCustom: (row) => `
            <button class="btn-icon btn-map-mp-characteristic" data-id="${escapeHtml(row.id)}" title="Прив'язати">
                <span class="material-symbols-outlined">link</span>
            </button>
        `,
        emptyState: {
            icon: 'tune',
            message: 'Характеристики маркетплейсу не знайдено'
        },
        withContainer: false
    });

    // Оновити статистику
    updateStats('mp-characteristics', filteredData.length, mpChars.length);

    console.log(`✅ Відрендерено ${paginatedData.length} з ${filteredData.length} MP характеристик`);
}

/**
 * Рендерити таблицю опцій маркетплейсу
 */
export function renderMpOptionsTable() {
    console.log('🎨 Рендеринг таблиці MP опцій...');

    const container = document.getElementById('mapper-mp-options-table-container');
    if (!container) return;

    const selectedMp = mapperState.mpSelectedMarketplace['mp-options'];
    if (!selectedMp) {
        renderMpEmptyState(container, 'mp-options', 'Оберіть маркетплейс для перегляду опцій');
        return;
    }

    const allMpOptions = getMpOptions();
    const mpOptions = allMpOptions.filter(o => o.marketplace_id === selectedMp);

    if (!mpOptions || mpOptions.length === 0) {
        renderMpEmptyState(container, 'mp-options', 'Опції маркетплейсу відсутні');
        return;
    }

    // Застосувати фільтри
    let filteredData = applyMpFilters(mpOptions, 'mp-options');

    // Застосувати пагінацію
    const { paginatedData, totalItems } = applyPagination(filteredData);

    // Оновити пагінацію
    updatePagination(totalItems);

    // Рендерити таблицю
    renderPseudoTable(container, {
        data: paginatedData,
        columns: [
            {
                id: 'external_id',
                label: 'ID',
                className: 'cell-id',
                sortable: true,
                render: (value) => `<span class="word-chip">${escapeHtml(value || '')}</span>`
            },
            {
                id: 'name',
                label: 'Назва',
                sortable: true,
                className: 'cell-main-name',
                render: (value) => `<strong>${escapeHtml(value || '')}</strong>`
            },
            {
                id: 'char_id',
                label: 'Характеристика',
                sortable: true,
                render: (value) => escapeHtml(value || '-')
            },
            {
                id: 'our_option_id',
                label: 'Наша опція',
                sortable: true,
                render: (value) => {
                    if (!value) {
                        return '<span class="severity-badge severity-high">Не прив\'язано</span>';
                    }
                    const opt = getOptions().find(o => o.id === value);
                    return `<span class="severity-badge severity-low">${escapeHtml(opt?.value_ua || value)}</span>`;
                }
            }
        ],
        visibleColumns: mapperState.visibleColumns['mp-options'],
        rowActionsHeader: ' ',
        rowActionsCustom: (row) => `
            <button class="btn-icon btn-map-mp-option" data-id="${escapeHtml(row.id)}" title="Прив'язати">
                <span class="material-symbols-outlined">link</span>
            </button>
        `,
        emptyState: {
            icon: 'check_box',
            message: 'Опції маркетплейсу не знайдено'
        },
        withContainer: false
    });

    // Оновити статистику
    updateStats('mp-options', filteredData.length, mpOptions.length);

    console.log(`✅ Відрендерено ${paginatedData.length} з ${filteredData.length} MP опцій`);
}

/**
 * Відрендерити порожній стан для MP табів
 */
function renderMpEmptyState(container, tabName, message) {
    const avatarHtml = renderAvatarState('empty', {
        message: message,
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
 * Застосувати фільтри для MP даних
 */
function applyMpFilters(data, tabName) {
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

    // Фільтр по прив'язці
    const filter = mapperState.filters[tabName];
    if (filter && filter !== 'all') {
        if (tabName === 'mp-categories') {
            filtered = filtered.filter(item => {
                const isMapped = !!item.our_cat_id;
                return filter === 'mapped' ? isMapped : !isMapped;
            });
        } else if (tabName === 'mp-characteristics') {
            filtered = filtered.filter(item => {
                const isMapped = !!item.our_char_id;
                return filter === 'mapped' ? isMapped : !isMapped;
            });
        } else if (tabName === 'mp-options') {
            filtered = filtered.filter(item => {
                const isMapped = !!item.our_option_id;
                return filter === 'mapped' ? isMapped : !isMapped;
            });
        }
    }

    return filtered;
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

    // Фільтр по маппінгу (для characteristics та options)
    const filter = mapperState.filters[tabName];
    if (filter && filter !== 'all') {
        // TODO: Реалізувати фільтрацію по маппінгу
        // Потребує завантаження маппінгів
    }

    return filtered;
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
