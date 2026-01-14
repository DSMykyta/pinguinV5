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
import { getCategories, getCharacteristics, getOptions, getMarketplaces, getMpCharacteristics, getMpOptions, getMapCharacteristics, getMapOptions, loadMpCharacteristics, loadMpOptions } from './mapper-data.js';

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
export async function renderCurrentTab() {
    const activeTab = mapperState.activeTab;

    switch (activeTab) {
        case 'categories':
            renderCategoriesTable();
            break;
        case 'characteristics':
            await renderCharacteristicsTable();
            break;
        case 'options':
            await renderOptionsTable();
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
 * Рендерити таблицю характеристик (об'єднана - власні + MP)
 */
export async function renderCharacteristicsTable() {
    console.log('🎨 Рендеринг таблиці характеристик (unified)...');

    const container = document.getElementById('mapper-characteristics-table-container');
    if (!container) return;

    // Завантажуємо MP дані якщо ще не завантажено
    if (getMpCharacteristics().length === 0) {
        try {
            await loadMpCharacteristics();
        } catch (e) {
            console.warn('⚠️ Не вдалося завантажити MP характеристики:', e);
        }
    }

    // Отримуємо всі джерела
    const ownCharacteristics = getCharacteristics();
    const mpCharacteristics = getMpCharacteristics();
    const marketplaces = getMarketplaces();
    const mappings = getMapCharacteristics();

    // Створюємо Map маппінгів для швидкого доступу
    const mappingsByOwnId = new Map();
    const mappedMpKeys = new Set();
    mappings.forEach(m => {
        if (!mappingsByOwnId.has(m.own_id)) {
            mappingsByOwnId.set(m.own_id, []);
        }
        mappingsByOwnId.get(m.own_id).push(m);
        mappedMpKeys.add(`${m.mp_marketplace_id}:${m.mp_external_id}`);
    });

    // Об'єднуємо дані в один список
    let unifiedData = [];

    // Додаємо власні характеристики
    ownCharacteristics.forEach(char => {
        const linkedMp = mappingsByOwnId.get(char.id) || [];
        unifiedData.push({
            ...char,
            _source: 'own',
            _sourceLabel: 'Власна',
            _uniqueKey: `own:${char.id}`,
            _linkedItems: linkedMp.map(m => {
                const mpItem = mpCharacteristics.find(mc =>
                    mc.marketplace_id === m.mp_marketplace_id && mc.external_id === m.mp_external_id
                );
                const mp = marketplaces.find(mp => mp.id === m.mp_marketplace_id);
                return mpItem ? { ...mpItem, _mpName: mp?.name || m.mp_marketplace_id } : null;
            }).filter(Boolean)
        });
    });

    // Додаємо MP характеристики (тільки не замаплені)
    mpCharacteristics.forEach(char => {
        const mpKey = `${char.marketplace_id}:${char.external_id}`;
        if (!mappedMpKeys.has(mpKey)) {
            const mp = marketplaces.find(m => m.id === char.marketplace_id);
            unifiedData.push({
                ...char,
                id: char.external_id, // показуємо external_id як ID
                name_ua: char.name || char.name_ua || '-',
                _source: 'mp',
                _sourceLabel: mp?.name || char.marketplace_id,
                _uniqueKey: `mp:${char.marketplace_id}:${char.external_id}`,
                _marketplaceId: char.marketplace_id,
                _linkedItems: []
            });
        }
    });

    if (unifiedData.length === 0) {
        renderEmptyState(container, 'characteristics');
        updateMappingToolbar('characteristics');
        return;
    }

    // Застосувати фільтри
    let filteredData = applyFilters(unifiedData, 'characteristics');

    // Застосувати пагінацію
    const { paginatedData, totalItems } = applyPagination(filteredData);

    // Оновити пагінацію
    updatePagination(totalItems);

    // Рендерити таблицю з чекбоксами
    renderPseudoTable(container, {
        data: paginatedData,
        columns: [
            {
                id: '_select',
                label: '',
                className: 'cell-checkbox',
                sortable: false,
                render: (value, row) => {
                    const isSelected = mapperState.selectedItems.characteristics.has(row._uniqueKey);
                    return `<input type="checkbox" class="char-select-checkbox" data-key="${escapeHtml(row._uniqueKey)}" ${isSelected ? 'checked' : ''}>`;
                }
            },
            {
                id: '_sourceLabel',
                label: 'Джерело',
                className: 'cell-source',
                sortable: true,
                render: (value, row) => {
                    const isOwn = row._source === 'own';
                    const badgeClass = isOwn ? 'severity-badge severity-info' : 'severity-badge severity-warning';
                    return `<span class="${badgeClass}">${escapeHtml(value)}</span>`;
                }
            },
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
                render: (value, row) => {
                    let html = `<strong>${escapeHtml(value || '')}</strong>`;
                    // Показуємо вкладені замаплені елементи
                    if (row._linkedItems && row._linkedItems.length > 0) {
                        html += '<div class="linked-items u-mt-4">';
                        row._linkedItems.forEach(linked => {
                            html += `<div class="linked-item"><span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-text-tertiary)">subdirectory_arrow_right</span> <span class="word-chip word-chip-small">${escapeHtml(linked._mpName)}</span> ${escapeHtml(linked.name || linked.name_ua || '-')}</div>`;
                        });
                        html += '</div>';
                    }
                    return html;
                }
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
                render: (value) => `<code>${escapeHtml(value || '-')}</code>`
            },
            {
                id: 'is_global',
                label: 'Глобальна',
                sortable: true,
                className: 'cell-bool',
                render: (value, row) => {
                    if (row._source !== 'own') return '-';
                    const isGlobal = value === true || String(value).toLowerCase() === 'true';
                    return isGlobal
                        ? '<span class="material-symbols-outlined" style="color: var(--color-success)">check_circle</span>'
                        : '<span class="material-symbols-outlined" style="color: var(--color-text-tertiary)">radio_button_unchecked</span>';
                }
            },
            {
                id: 'category_ids',
                label: 'Категорії',
                sortable: false,
                render: (value, row) => {
                    if (row._source !== 'own' || !value) return '-';
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
        visibleColumns: ['_select', '_sourceLabel', 'id', 'name_ua', 'type', 'is_global', 'category_ids'],
        rowActionsHeader: ' ',
        rowActionsCustom: (row) => {
            if (row._source === 'own') {
                return `
                    <button class="btn-icon btn-edit-characteristic" data-id="${escapeHtml(row.id)}" title="Редагувати">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                `;
            } else {
                return `
                    <button class="btn-icon btn-view-mp-characteristic" data-marketplace-id="${escapeHtml(row._marketplaceId)}" data-external-id="${escapeHtml(row.external_id)}" title="Переглянути">
                        <span class="material-symbols-outlined">visibility</span>
                    </button>
                `;
            }
        },
        emptyState: {
            icon: 'tune',
            message: 'Характеристики не знайдено'
        },
        withContainer: false
    });

    // Обробники чекбоксів
    container.querySelectorAll('.char-select-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const key = checkbox.dataset.key;
            if (checkbox.checked) {
                mapperState.selectedItems.characteristics.add(key);
            } else {
                mapperState.selectedItems.characteristics.delete(key);
            }
            updateMappingToolbar('characteristics');
        });
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

    // Обробники для перегляду MP
    container.querySelectorAll('.btn-view-mp-characteristic').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const marketplaceId = button.dataset.marketplaceId;
            const externalId = button.dataset.externalId;
            if (marketplaceId && externalId) {
                const { showViewMpCharacteristicModal } = await import('./mapper-crud.js');
                await showViewMpCharacteristicModal(marketplaceId, externalId);
            }
        });
    });

    // Оновити статистику
    updateStats('characteristics', filteredData.length, unifiedData.length);
    updateMappingToolbar('characteristics');

    console.log(`✅ Відрендерено ${paginatedData.length} з ${filteredData.length} характеристик (${ownCharacteristics.length} власних + ${mpCharacteristics.length} MP)`);
}

/**
 * Рендерити таблицю опцій (об'єднана - власні + MP)
 */
export async function renderOptionsTable() {
    console.log('🎨 Рендеринг таблиці опцій (unified)...');

    const container = document.getElementById('mapper-options-table-container');
    if (!container) return;

    // Завантажуємо MP дані якщо ще не завантажено
    if (getMpOptions().length === 0) {
        try {
            await loadMpOptions();
        } catch (e) {
            console.warn('⚠️ Не вдалося завантажити MP опції:', e);
        }
    }

    // Отримуємо всі джерела
    const ownOptions = getOptions();
    const mpOptions = getMpOptions();
    const marketplaces = getMarketplaces();
    const characteristics = getCharacteristics();
    const mappings = getMapOptions();

    // Створюємо Map маппінгів для швидкого доступу
    const mappingsByOwnId = new Map();
    const mappedMpKeys = new Set();
    mappings.forEach(m => {
        if (!mappingsByOwnId.has(m.own_id)) {
            mappingsByOwnId.set(m.own_id, []);
        }
        mappingsByOwnId.get(m.own_id).push(m);
        mappedMpKeys.add(`${m.mp_marketplace_id}:${m.mp_external_id}`);
    });

    // Об'єднуємо дані в один список
    let unifiedData = [];

    // Додаємо власні опції
    ownOptions.forEach(opt => {
        const linkedMp = mappingsByOwnId.get(opt.id) || [];
        const char = characteristics.find(c => c.id === opt.characteristic_id);
        unifiedData.push({
            ...opt,
            _source: 'own',
            _sourceLabel: 'Власна',
            _uniqueKey: `own:${opt.id}`,
            _characteristicName: char?.name_ua || opt.characteristic_id || '-',
            _linkedItems: linkedMp.map(m => {
                const mpItem = mpOptions.find(mo =>
                    mo.marketplace_id === m.mp_marketplace_id && mo.external_id === m.mp_external_id
                );
                const mp = marketplaces.find(mp => mp.id === m.mp_marketplace_id);
                return mpItem ? { ...mpItem, _mpName: mp?.name || m.mp_marketplace_id } : null;
            }).filter(Boolean)
        });
    });

    // Додаємо MP опції (тільки не замаплені)
    mpOptions.forEach(opt => {
        const mpKey = `${opt.marketplace_id}:${opt.external_id}`;
        if (!mappedMpKeys.has(mpKey)) {
            const mp = marketplaces.find(m => m.id === opt.marketplace_id);
            unifiedData.push({
                ...opt,
                id: opt.external_id,
                value_ua: opt.name || opt.value_ua || '-',
                _source: 'mp',
                _sourceLabel: mp?.name || opt.marketplace_id,
                _uniqueKey: `mp:${opt.marketplace_id}:${opt.external_id}`,
                _marketplaceId: opt.marketplace_id,
                _characteristicName: opt.characteristic_name || '-',
                _linkedItems: []
            });
        }
    });

    if (unifiedData.length === 0) {
        renderEmptyState(container, 'options');
        updateMappingToolbar('options');
        return;
    }

    // Застосувати фільтри
    let filteredData = applyFilters(unifiedData, 'options');

    // Застосувати пагінацію
    const { paginatedData, totalItems } = applyPagination(filteredData);

    // Оновити пагінацію
    updatePagination(totalItems);

    // Рендерити таблицю з чекбоксами
    renderPseudoTable(container, {
        data: paginatedData,
        columns: [
            {
                id: '_select',
                label: '',
                className: 'cell-checkbox',
                sortable: false,
                render: (value, row) => {
                    const isSelected = mapperState.selectedItems.options.has(row._uniqueKey);
                    return `<input type="checkbox" class="opt-select-checkbox" data-key="${escapeHtml(row._uniqueKey)}" ${isSelected ? 'checked' : ''}>`;
                }
            },
            {
                id: '_sourceLabel',
                label: 'Джерело',
                className: 'cell-source',
                sortable: true,
                render: (value, row) => {
                    const isOwn = row._source === 'own';
                    const badgeClass = isOwn ? 'severity-badge severity-info' : 'severity-badge severity-warning';
                    return `<span class="${badgeClass}">${escapeHtml(value)}</span>`;
                }
            },
            {
                id: 'id',
                label: 'ID',
                className: 'cell-id',
                sortable: true,
                render: (value) => `<span class="word-chip">${escapeHtml(value || '')}</span>`
            },
            {
                id: '_characteristicName',
                label: 'Характеристика',
                sortable: true,
                render: (value) => escapeHtml(value || '-')
            },
            {
                id: 'value_ua',
                label: 'Значення UA',
                sortable: true,
                className: 'cell-main-name',
                render: (value, row) => {
                    let html = `<strong>${escapeHtml(value || '')}</strong>`;
                    // Показуємо вкладені замаплені елементи
                    if (row._linkedItems && row._linkedItems.length > 0) {
                        html += '<div class="linked-items u-mt-4">';
                        row._linkedItems.forEach(linked => {
                            html += `<div class="linked-item"><span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-text-tertiary)">subdirectory_arrow_right</span> <span class="word-chip word-chip-small">${escapeHtml(linked._mpName)}</span> ${escapeHtml(linked.name || linked.value_ua || '-')}</div>`;
                        });
                        html += '</div>';
                    }
                    return html;
                }
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
                render: (value, row) => {
                    if (row._source !== 'own') return '-';
                    return escapeHtml(value || '0');
                }
            }
        ],
        visibleColumns: ['_select', '_sourceLabel', 'id', '_characteristicName', 'value_ua', 'sort_order'],
        rowActionsHeader: ' ',
        rowActionsCustom: (row) => {
            if (row._source === 'own') {
                return `
                    <button class="btn-icon btn-edit-option" data-id="${escapeHtml(row.id)}" title="Редагувати">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                `;
            } else {
                return `
                    <button class="btn-icon btn-view-mp-option" data-marketplace-id="${escapeHtml(row._marketplaceId)}" data-external-id="${escapeHtml(row.external_id)}" title="Переглянути">
                        <span class="material-symbols-outlined">visibility</span>
                    </button>
                `;
            }
        },
        emptyState: {
            icon: 'check_box',
            message: 'Опції не знайдено'
        },
        withContainer: false
    });

    // Обробники чекбоксів
    container.querySelectorAll('.opt-select-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const key = checkbox.dataset.key;
            if (checkbox.checked) {
                mapperState.selectedItems.options.add(key);
            } else {
                mapperState.selectedItems.options.delete(key);
            }
            updateMappingToolbar('options');
        });
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

    // Обробники для перегляду MP
    container.querySelectorAll('.btn-view-mp-option').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const marketplaceId = button.dataset.marketplaceId;
            const externalId = button.dataset.externalId;
            if (marketplaceId && externalId) {
                const { showViewMpOptionModal } = await import('./mapper-crud.js');
                await showViewMpOptionModal(marketplaceId, externalId);
            }
        });
    });

    // Оновити статистику
    updateStats('options', filteredData.length, unifiedData.length);
    updateMappingToolbar('options');

    console.log(`✅ Відрендерено ${paginatedData.length} з ${filteredData.length} опцій (${ownOptions.length} власних + ${mpOptions.length} MP)`);
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
                    const isActive = value === true || String(value).toLowerCase() === 'true';
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

/**
 * Оновити панель інструментів маппінгу
 */
function updateMappingToolbar(tabName) {
    const selectedSet = mapperState.selectedItems[tabName];
    const count = selectedSet ? selectedSet.size : 0;

    // Знаходимо або створюємо тулбар
    let toolbar = document.getElementById(`mapping-toolbar-${tabName}`);
    const sectionHeader = document.querySelector(`#tab-mapper-${tabName} .section-header`);

    if (!sectionHeader) return;

    if (count === 0) {
        // Ховаємо тулбар
        if (toolbar) {
            toolbar.remove();
        }
        return;
    }

    // Показуємо тулбар
    if (!toolbar) {
        toolbar = document.createElement('div');
        toolbar.id = `mapping-toolbar-${tabName}`;
        toolbar.className = 'mapping-toolbar';
        toolbar.innerHTML = `
            <div class="mapping-toolbar-info">
                <span class="material-symbols-outlined">checklist</span>
                <span class="mapping-toolbar-count">Вибрано: <strong id="mapping-count-${tabName}">0</strong></span>
            </div>
            <div class="mapping-toolbar-actions">
                <button class="btn-outline btn-sm" id="mapping-clear-${tabName}">
                    <span class="material-symbols-outlined">close</span>
                    <span>Скинути</span>
                </button>
                <button class="btn-primary btn-sm" id="mapping-link-${tabName}">
                    <span class="material-symbols-outlined">link</span>
                    <span>Прив'язати</span>
                </button>
            </div>
        `;
        sectionHeader.after(toolbar);

        // Обробники
        document.getElementById(`mapping-clear-${tabName}`).addEventListener('click', () => {
            mapperState.selectedItems[tabName].clear();
            renderCurrentTab();
        });

        document.getElementById(`mapping-link-${tabName}`).addEventListener('click', async () => {
            await handleMapSelected(tabName);
        });
    }

    // Оновлюємо кількість
    const countEl = document.getElementById(`mapping-count-${tabName}`);
    if (countEl) {
        countEl.textContent = count;
    }

    // Активуємо/деактивуємо кнопку прив'язки
    const linkBtn = document.getElementById(`mapping-link-${tabName}`);
    if (linkBtn) {
        linkBtn.disabled = count < 2;
    }
}

/**
 * Обробка маппінгу вибраних елементів
 */
async function handleMapSelected(tabName) {
    const selectedSet = mapperState.selectedItems[tabName];

    if (selectedSet.size < 2) {
        const { showToast } = await import('../common/ui-toast.js');
        showToast('Виберіть щонайменше 2 елементи для прив\'язки', 'warning');
        return;
    }

    // Розбираємо вибрані ключі
    const selected = Array.from(selectedSet);
    const ownItems = selected.filter(k => k.startsWith('own:'));
    const mpItems = selected.filter(k => k.startsWith('mp:'));

    // Для прив'язки потрібен хоча б 1 власний елемент
    if (ownItems.length === 0) {
        const { showToast } = await import('../common/ui-toast.js');
        showToast('Виберіть хоча б один власний елемент для прив\'язки', 'warning');
        return;
    }

    if (ownItems.length > 1) {
        const { showToast } = await import('../common/ui-toast.js');
        showToast('Можна прив\'язати до одного власного елемента', 'warning');
        return;
    }

    // Беремо власний елемент як "головний"
    const ownKey = ownItems[0];
    const ownId = ownKey.replace('own:', '');

    // Формуємо список MP елементів для прив'язки
    const mpToLink = mpItems.map(k => {
        const parts = k.replace('mp:', '').split(':');
        return {
            marketplace_id: parts[0],
            external_id: parts[1]
        };
    });

    if (mpToLink.length === 0) {
        const { showToast } = await import('../common/ui-toast.js');
        showToast('Виберіть MP елементи для прив\'язки до власного', 'warning');
        return;
    }

    // Викликаємо функцію збереження маппінгу
    const { createMappings } = await import('./mapper-crud.js');
    const success = await createMappings(tabName, ownId, mpToLink);

    if (success) {
        // Очищаємо вибір
        mapperState.selectedItems[tabName].clear();
        renderCurrentTab();
    }
}
