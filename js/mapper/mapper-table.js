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
    getMapCategories, getMapCharacteristics, getMapOptions
} from './mapper-data.js';
import { getBatchBar } from '../common/ui-batch-actions.js';
import { createCachedFn } from '../common/util-lazy-load.js';

// ═══════════════════════════════════════════════════════════════════════════
// КЕШОВАНІ LOOKUP MAP-И (O(1) замість O(n) для пошуку батьків)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Побудувати Map-и для швидкого пошуку категорій по id/_jsonId/external_id.
 * Викликається один раз і кешується до invalidate().
 */
const getCategoryLookupMaps = createCachedFn(() => {
    const byId = new Map();           // sheet id → category
    const byMpJsonId = new Map();     // "mpId:jsonId" → category
    const byMpExtId = new Map();      // "mpId:extId" → category
    const byExtId = new Map();        // extId → category (для own)

    // Власні категорії
    getCategories().forEach(cat => {
        byId.set(cat.id, cat);
        if (cat.external_id) byExtId.set(String(cat.external_id), cat);
    });

    // ВСІ MP категорії (включаючи замаплені)
    getMpCategories().forEach(mpCat => {
        const data = typeof mpCat.data === 'string'
            ? (() => { try { return JSON.parse(mpCat.data); } catch { return {}; } })()
            : (mpCat.data || {});

        const cat = {
            id: mpCat.id,
            external_id: mpCat.external_id,
            marketplace_id: mpCat.marketplace_id,
            _jsonId: mpCat._jsonId || '',
            name_ua: extractName(data),
            parent_id: data.parent_id || data.parentId || ''
        };

        byId.set(cat.id, cat);
        if (cat._jsonId && cat.marketplace_id) {
            byMpJsonId.set(`${cat.marketplace_id}:${cat._jsonId}`, cat);
        }
        if (cat.external_id && cat.marketplace_id) {
            byMpExtId.set(`${cat.marketplace_id}:${String(cat.external_id)}`, cat);
        }
        if (cat.external_id) {
            byExtId.set(String(cat.external_id), cat);
        }
    });

    return { byId, byMpJsonId, byMpExtId, byExtId };
});

/**
 * Знайти батьківську категорію за parent_id — O(1) замість O(n)
 */
function findParentCategory(pid, mpId) {
    const maps = getCategoryLookupMaps();
    pid = String(pid);

    // 1. По sheet id
    if (maps.byId.has(pid)) return maps.byId.get(pid);

    // 2. По _jsonId в межах маркетплейсу
    if (mpId && maps.byMpJsonId.has(`${mpId}:${pid}`)) {
        return maps.byMpJsonId.get(`${mpId}:${pid}`);
    }

    // 3. По external_id в межах маркетплейсу
    if (mpId && maps.byMpExtId.has(`${mpId}:${pid}`)) {
        return maps.byMpExtId.get(`${mpId}:${pid}`);
    }

    // 4. По external_id глобально (тільки для власних категорій, де mpId = null)
    if (!mpId && maps.byExtId.has(pid)) return maps.byExtId.get(pid);

    return null;
}

/**
 * Інвалідувати всі кеші (викликати після зміни даних)
 */
export function invalidateLookupCaches() {
    getCategoryLookupMaps.invalidate();
    getMpEntityMaps.invalidate();
    _cachedCategoryLabelMap.invalidate();
    _cachedCharacteristicLabelMap.invalidate();
}

// Кешовані label maps
const _cachedCategoryLabelMap = createCachedFn(() => {
    const labelMap = {};
    getCategories().forEach(cat => {
        labelMap[cat.id] = cat.name_ua || cat.name || cat.id;
    });
    getMpCategories().forEach(cat => {
        const externalId = cat.external_id || cat.mp_id;
        const name = extractName(cat) || externalId;
        if (externalId && !labelMap[externalId]) {
            labelMap[externalId] = name;
        }
    });
    return labelMap;
});

const _cachedCharacteristicLabelMap = createCachedFn(() => {
    const labelMap = {};
    getCharacteristics().forEach(c => {
        labelMap[c.id] = c.name_ua || c.name || c.id;
    });
    getMpCharacteristics().forEach(c => {
        const externalId = c.external_id;
        const name = extractName(c) || externalId;
        if (externalId && !labelMap[externalId]) {
            labelMap[externalId] = name;
        }
    });
    return labelMap;
});

/**
 * Побудувати Map<id|external_id, entity> для будь-якого масиву MP сутностей
 */
const getMpEntityMaps = createCachedFn(() => {
    const build = (arr) => {
        const map = new Map();
        arr.forEach(e => {
            if (e.id) map.set(e.id, e);
            if (e.external_id) map.set(e.external_id, e);
        });
        return map;
    };
    return {
        categories: build(getMpCategories()),
        characteristics: build(getMpCharacteristics()),
        options: build(getMpOptions()),
        marketplaces: (() => {
            const m = new Map();
            getMarketplaces().forEach(mp => m.set(mp.id, mp));
            return m;
        })()
    };
});

// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати назви категорій за списком ID
 * @param {string} categoryIdsStr - Рядок з ID категорій через кому
 * @returns {string} - Назви категорій
 */
function getCategoryNames(categoryIdsStr) {
    if (!categoryIdsStr) return '-';

    const labelMap = _cachedCategoryLabelMap();
    const ids = categoryIdsStr.split(',').map(id => id.trim()).filter(id => id);

    if (ids.length === 0) return '-';

    const names = ids.map(id => labelMap[id] || id);

    return names.join(', ');
}

/**
 * Отримати інформацію про прив'язки для сутності
 * @param {string} entityType - Тип сутності: 'category', 'characteristic', 'option'
 * @param {string} entityId - ID сутності
 * @returns {Object} - { count: число прив'язок, details: [{ marketplace, items }] }
 */
function getBindingsInfo(entityType, entityId) {
    const maps = getMpEntityMaps();
    let mapData = [];

    switch (entityType) {
        case 'category':
            mapData = getMapCategories().filter(m => m.category_id === entityId);
            break;
        case 'characteristic':
            mapData = getMapCharacteristics().filter(m => m.characteristic_id === entityId);
            break;
        case 'option':
            mapData = getMapOptions().filter(m => m.option_id === entityId);
            break;
    }

    // Вибираємо потрібну Map для пошуку MP сутності
    const entityMap = entityType === 'category' ? maps.categories
        : entityType === 'characteristic' ? maps.characteristics
        : maps.options;

    const mpIdKey = entityType === 'category' ? 'mp_category_id'
        : entityType === 'characteristic' ? 'mp_characteristic_id'
        : 'mp_option_id';

    // Групуємо по маркетплейсах
    const byMarketplace = {};
    mapData.forEach(mapping => {
        const mpEntity = entityMap.get(mapping[mpIdKey]) || null;
        const mpId = mpEntity?.marketplace_id || 'unknown';
        if (!byMarketplace[mpId]) {
            byMarketplace[mpId] = [];
        }

        // Отримуємо назву MP сутності
        let entityName = '';
        if (mpEntity) {
            entityName = extractName(mpEntity);
            if (!entityName && mpEntity.data) {
                try {
                    const d = typeof mpEntity.data === 'string' ? JSON.parse(mpEntity.data) : mpEntity.data;
                    entityName = extractName(d);
                } catch (e) {}
            }
        }

        byMarketplace[mpId].push({ ...mapping, _entityName: entityName || mpEntity?.external_id || '' });
    });

    const details = Object.entries(byMarketplace).map(([mpId, items]) => {
        const mp = maps.marketplaces.get(mpId);
        return {
            marketplace: mp?.name || mpId,
            marketplaceId: mpId,
            count: items.length,
            items: items
        };
    });

    return {
        count: mapData.length,
        details: details
    };
}

/**
 * Створити HTML для тултіпа прив'язок
 */
function renderBindingsTooltip(bindingsInfo, entityType) {
    if (bindingsInfo.count === 0) {
        return 'Немає прив\'язок до маркетплейсів';
    }

    const lines = [];
    bindingsInfo.details.forEach(detail => {
        detail.items.forEach(item => {
            const name = item._entityName || '—';
            lines.push(`${detail.marketplace}: ${name}`);
        });
    });

    return lines.join('\n');
}

/**
 * Створити колонку прив'язок для таблиці
 */
function createBindingsColumn(entityType) {
    return {
        id: 'bindings',
        label: 'Прів.',
        sortable: true,
        className: 'cell-xs cell-center',
        render: (value, row) => {
            const bindingsInfo = getBindingsInfo(entityType, row.id);
            const tooltipContent = renderBindingsTooltip(bindingsInfo, entityType);
            const cls = bindingsInfo.count === 0 ? 'chip' : 'chip chip-active';

            return `<span class="${cls} binding-chip" data-entity-type="${entityType}" data-entity-id="${escapeHtml(row.id)}" data-entity-name="${escapeHtml(row.name_ua || row.value_ua || row.id)}" data-tooltip="${escapeHtml(tooltipContent)}" data-tooltip-always style="cursor:pointer">${bindingsInfo.count}</span>`;
        }
    };
}

import { createTable, filterData, col } from '../common/table/table-main.js';
import { escapeHtml } from '../utils/text-utils.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../common/ui-actions.js';

/**
 * Витягнути назву з об'єкта (JSON data або merged entity).
 * Шукає перше поле, ключ якого містить "name" (ігноруючи регістр).
 * Пріоритет: name → name_ua → nameUa → nameRu → name_ru → будь-яке *name*
 */
function extractName(obj) {
    if (!obj || typeof obj !== 'object') return '';
    // Пріоритет: українська → загальна → російська
    if (obj.name_ua) return obj.name_ua;
    if (obj.nameUa) return obj.nameUa;
    // Maudau: titleUk/titleRu
    if (obj.titleUk) return obj.titleUk;
    if (obj.titleRu) return obj.titleRu;
    if (obj.name) return obj.name;
    if (obj.name_ru) return obj.name_ru;
    if (obj.nameRu) return obj.nameRu;
    // Fallback: будь-який ключ з "name" або "title"
    const nameKey = Object.keys(obj).find(k => {
        const lower = k.toLowerCase();
        return lower.includes('name') || lower.includes('title');
    });
    return nameKey ? obj[nameKey] : '';
}

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

// Спільні типи колонок для сортування
const mapperColumnTypes = {
    id: 'string',
    name_ua: 'string',
    name_ru: 'string',
    type: 'string',
    is_global: 'string',
    is_active: 'string',
    value_ua: 'string',
    name: 'string',
    slug: 'string',
    parent_id: 'string',
    characteristic_id: 'string',
    grouping: 'string',
    _nestingLevel: 'binding-chip',
    category_ids: 'binding-chip',
    bindings: 'binding-chip'
};

/**
 * Рендерити поточний активний таб
 */
export function renderCurrentTab() {
    // Інвалідуємо кеші при кожному повному рендері
    invalidateLookupCaches();

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
 * Отримати дані категорій (тільки власні)
 * Трансформує дані для стандартних типів колонок:
 * - _nestingLevel: обчислює глибину вкладеності
 * - parent_id: резолвить ID → назва батьківської категорії
 * - grouping: нормалізує boolean для status-dot
 */
function getCategoriesData() {
    const categories = getCategories().map(cat => {
        // Обчислити рівень вкладеності + breadcrumb шлях
        let level = 0;
        let current = cat;
        const path = [cat.name_ua || cat.id];

        while (current && current.parent_id) {
            level++;
            const parent = findParentCategory(current.parent_id, null);
            if (parent) {
                path.unshift(parent.name_ua || parent.id);
                current = parent;
            } else {
                break;
            }
            if (level > 10) break;
        }

        const nestingTooltip = level === 0 ? 'Коренева категорія' : path.join(' → ');

        // Резолвити parent_id → назва
        const parentName = cat.parent_id
            ? (findParentCategory(cat.parent_id, null)?.name_ua || cat.parent_id)
            : '';

        // Нормалізувати grouping для status-dot
        const grouping = String(cat.grouping ?? '').toLowerCase() === 'true' ? 'active' : 'inactive';

        return {
            ...cat,
            _nestingLevel: { count: level, tooltip: nestingTooltip },
            parent_id: parentName,
            grouping,
            _editable: true
        };
    });

    return { categories };
}

/**
 * Отримати конфігурацію колонок для категорій
 */
export function getCategoriesColumns(allCategories) {
    return [
        col('id', 'ID', 'word-chip'),
        col('_nestingLevel', 'Рів.', 'binding-chip'),
        col('name_ua', 'Назва UA', 'name'),
        col('name_ru', 'Назва RU', 'text'),
        col('parent_id', 'Батьківська', 'text', { filterable: true }),
        col('grouping', 'Групуюча', 'status-dot', { filterable: true }),
        createBindingsColumn('category')
    ];
}

/**
 * Ініціалізувати Table API для категорій
 */
function initCategoriesTableAPI(container, allCategories) {
    // Якщо API вже існує - не створюємо знову
    if (mapperTableAPIs.has('categories')) return;

    const visibleCols = mapperState.visibleColumns.categories?.length > 0
        ? mapperState.visibleColumns.categories
        : ['id', '_nestingLevel', 'name_ua', 'parent_id', 'grouping', 'bindings'];

    const tableAPI = createTable(container, {
        columns: getCategoriesColumns(allCategories),
        visibleColumns: visibleCols,
        rowActionsHeader: '<input type="checkbox" class="select-all-checkbox" data-tab="categories">',
        rowActions: (row) => {
            return `
                <input type="checkbox" class="row-checkbox" data-row-id="${escapeHtml(row.id)}" data-tab="categories">
                ${actionButton({ action: 'edit', rowId: row.id, context: 'mapper-categories' })}
            `;
        },
        getRowId: (row) => row.id,
        emptyState: {
            message: 'Категорії відсутні'
        },
        withContainer: false,
        onAfterRender: (cont) => {
            initActionHandlers(cont, 'mapper-categories');
            const { categories } = getCategoriesData();
            const filteredData = applyFilters(categories, 'categories');
            const { paginatedData } = applyPagination(filteredData);
            initTableCheckboxes(cont, 'categories', paginatedData);
        },
        plugins: {
            sorting: {
                dataSource: () => {
                    const { categories } = getCategoriesData();
                    return categories;
                },
                onSort: (sortedData) => {
                    const sortState = tableAPI?.getSort?.() || {};
                    mapperState.sortState = mapperState.sortState || {};
                    mapperState.sortState.categories = {
                        column: sortState.column,
                        direction: sortState.direction
                    };
                    mapperState.pagination.currentPage = 1;
                    renderCurrentTab();
                },
                columnTypes: mapperColumnTypes,
                initialSort: mapperState.sortState?.categories || null
            },
            filters: {
                dataSource: () => {
                    const { categories } = getCategoriesData();
                    return categories;
                },
                filterColumns: getFilterColumnsConfig('categories'),
                onFilter: (filters) => {
                    mapperState.columnFilters.categories = filters;
                    mapperState.pagination.currentPage = 1;
                    renderCurrentTab();
                },
                initialFilters: mapperState.columnFilters?.categories || null
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

    const { categories } = getCategoriesData();

    if (categories.length === 0) {
        renderEmptyState(container, 'categories');
        return;
    }

    mapperTableAPIs.delete('categories');
    initCategoriesTableAPI(container, categories);

    const tableAPI = mapperTableAPIs.get('categories');
    if (!tableAPI) return;

    let filteredData = applyFilters(categories, 'categories');
    const { paginatedData, totalItems } = applyPagination(filteredData);

    updatePagination(totalItems);
    tableAPI.render(paginatedData);
    updateStats('categories', filteredData.length, categories.length);
}

/**
 * Отримати дані характеристик (тільки власні)
 * Трансформує дані для стандартних типів колонок:
 * - category_ids: резолвить ID → { count, tooltip } для binding-chip
 * - is_global: нормалізує boolean для status-dot
 */
function getCharacteristicsData() {
    const categoriesList = getCategories();
    const labelMap = _cachedCategoryLabelMap();

    const characteristics = getCharacteristics().map(char => {
        const isGlobal = String(char.is_global ?? '').toLowerCase() === 'true' || char.is_global === true;

        // Резолвити category_ids → { count, tooltip } для binding-chip
        let categoryDisplay;
        if (isGlobal) {
            categoryDisplay = { count: '∞', tooltip: 'Глобальна характеристика для всіх категорій' };
        } else {
            const ids = (char.category_ids || '').split(',').map(s => s.trim()).filter(Boolean);
            const names = ids.map(id => labelMap[id] || id);
            categoryDisplay = {
                count: ids.length,
                tooltip: names.join('\n') || "Не прив'язано до категорій"
            };
        }

        return {
            ...char,
            category_ids: categoryDisplay,
            is_global: isGlobal ? 'active' : 'inactive',
            _editable: true
        };
    });

    return {
        characteristics,
        categories: categoriesList
    };
}

/**
 * Отримати конфігурацію колонок для характеристик
 */
export function getCharacteristicsColumns(categoriesList) {
    return [
        col('id', 'ID', 'word-chip'),
        col('category_ids', 'Категорія', 'binding-chip'),
        col('name_ua', 'Назва', 'name'),
        col('type', 'Тип', 'code', { filterable: true }),
        col('is_global', 'Глобальна', 'status-dot', { filterable: true, className: 'cell-s cell-center' }),
        col('unit', 'Одиниця', 'text'),
        createBindingsColumn('characteristic')
    ];
}

/**
 * Ініціалізувати Table API для характеристик
 */
function initCharacteristicsTableAPI(container, categoriesList) {
    if (mapperTableAPIs.has('characteristics')) return;

    const visibleCols = mapperState.visibleColumns.characteristics?.length > 0
        ? mapperState.visibleColumns.characteristics
        : ['id', 'category_ids', 'name_ua', 'type', 'is_global', 'bindings'];

    const tableAPI = createTable(container, {
        columns: getCharacteristicsColumns(categoriesList),
        visibleColumns: visibleCols,
        rowActionsHeader: '<input type="checkbox" class="select-all-checkbox" data-tab="characteristics">',
        rowActions: (row) => {
            return `
                <input type="checkbox" class="row-checkbox" data-row-id="${escapeHtml(row.id)}" data-tab="characteristics">
                ${actionButton({ action: 'edit', rowId: row.id, context: 'mapper-characteristics' })}
            `;
        },
        getRowId: (row) => row.id,
        emptyState: {
            message: 'Характеристики відсутні'
        },
        withContainer: false,
        onAfterRender: (cont) => {
            initActionHandlers(cont, 'mapper-characteristics');
            const { characteristics } = getCharacteristicsData();
            const filteredData = applyFilters(characteristics, 'characteristics');
            const { paginatedData } = applyPagination(filteredData);
            initTableCheckboxes(cont, 'characteristics', paginatedData);
        },
        plugins: {
            sorting: {
                dataSource: () => {
                    const { characteristics } = getCharacteristicsData();
                    return characteristics;
                },
                onSort: (sortedData) => {
                    const sortState = tableAPI?.getSort?.() || {};
                    mapperState.sortState = mapperState.sortState || {};
                    mapperState.sortState.characteristics = {
                        column: sortState.column,
                        direction: sortState.direction
                    };
                    mapperState.pagination.currentPage = 1;
                    renderCurrentTab();
                },
                columnTypes: mapperColumnTypes,
                initialSort: mapperState.sortState?.characteristics || null
            },
            filters: {
                dataSource: () => {
                    const { characteristics } = getCharacteristicsData();
                    return characteristics;
                },
                filterColumns: getFilterColumnsConfig('characteristics'),
                onFilter: (filters) => {
                    mapperState.columnFilters.characteristics = filters;
                    mapperState.pagination.currentPage = 1;
                    renderCurrentTab();
                },
                initialFilters: mapperState.columnFilters?.characteristics || null
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

    const { characteristics, categories } = getCharacteristicsData();

    if (characteristics.length === 0) {
        renderEmptyState(container, 'characteristics');
        return;
    }

    mapperTableAPIs.delete('characteristics');
    initCharacteristicsTableAPI(container, categories);

    const tableAPI = mapperTableAPIs.get('characteristics');
    if (!tableAPI) return;

    let filteredData = applyFilters(characteristics, 'characteristics');
    const { paginatedData, totalItems } = applyPagination(filteredData);

    updatePagination(totalItems);
    tableAPI.render(paginatedData);
    updateStats('characteristics', filteredData.length, characteristics.length);
}

/**
 * Отримати дані опцій (тільки власні)
 * Трансформує дані для стандартних типів колонок:
 * - characteristic_id: резолвить ID → назва характеристики
 * - category_ids: резолвить через батьківську характеристику → { count, tooltip }
 */
function getOptionsData() {
    const characteristicsList = getCharacteristics();
    const charLabelMap = _cachedCharacteristicLabelMap();
    const catLabelMap = _cachedCategoryLabelMap();

    const options = getOptions().map(opt => {
        // Резолвити characteristic_id → назва
        const charName = opt.characteristic_id
            ? (charLabelMap[opt.characteristic_id] || opt.characteristic_id)
            : '';

        // Резолвити category_ids через батьківську характеристику
        let categoryDisplay;
        if (opt.characteristic_id) {
            const parentChar = characteristicsList.find(c => c.id === opt.characteristic_id);
            if (parentChar) {
                const isGlobal = String(parentChar.is_global ?? '').toLowerCase() === 'true' || parentChar.is_global === true;
                if (isGlobal) {
                    categoryDisplay = { count: '∞', tooltip: 'Глобальна характеристика' };
                } else {
                    const ids = (parentChar.category_ids || '').split(',').map(s => s.trim()).filter(Boolean);
                    const names = ids.map(id => catLabelMap[id] || id);
                    categoryDisplay = { count: ids.length, tooltip: names.join('\n') || '-' };
                }
            }
        }

        if (!categoryDisplay) {
            const ids = (opt.category_ids || '').split(',').map(s => s.trim()).filter(Boolean);
            if (ids.length) {
                const names = ids.map(id => catLabelMap[id] || id);
                categoryDisplay = { count: ids.length, tooltip: names.join('\n') };
            } else {
                categoryDisplay = { count: 0, tooltip: '-' };
            }
        }

        return {
            ...opt,
            characteristic_id: charName,
            category_ids: categoryDisplay,
            _editable: true
        };
    });

    return {
        options,
        characteristics: characteristicsList
    };
}

/**
 * Отримати конфігурацію колонок для опцій
 */
export function getOptionsColumns(characteristicsList) {
    return [
        col('id', 'ID', 'word-chip'),
        col('characteristic_id', 'Характеристика', 'text', { filterable: true }),
        col('value_ua', 'Значення', 'name'),
        col('category_ids', 'Категорія', 'binding-chip'),
        createBindingsColumn('option')
    ];
}

/**
 * Ініціалізувати Table API для опцій
 */
function initOptionsTableAPI(container, characteristicsList) {
    if (mapperTableAPIs.has('options')) return;

    const visibleCols = mapperState.visibleColumns.options?.length > 0
        ? mapperState.visibleColumns.options
        : ['id', 'characteristic_id', 'value_ua', 'bindings'];

    const tableAPI = createTable(container, {
        columns: getOptionsColumns(characteristicsList),
        visibleColumns: visibleCols,
        rowActionsHeader: '<input type="checkbox" class="select-all-checkbox" data-tab="options">',
        rowActions: (row) => {
            return `
                <input type="checkbox" class="row-checkbox" data-row-id="${escapeHtml(row.id)}" data-tab="options">
                ${actionButton({ action: 'edit', rowId: row.id, context: 'mapper-options' })}
            `;
        },
        getRowId: (row) => row.id,
        emptyState: {
            message: 'Опції відсутні'
        },
        withContainer: false,
        onAfterRender: (cont) => {
            initActionHandlers(cont, 'mapper-options');
            const { options } = getOptionsData();
            const filteredData = applyFilters(options, 'options');
            const { paginatedData } = applyPagination(filteredData);
            initTableCheckboxes(cont, 'options', paginatedData);
        },
        plugins: {
            sorting: {
                dataSource: () => {
                    const { options } = getOptionsData();
                    return options;
                },
                onSort: (sortedData) => {
                    const sortState = tableAPI?.getSort?.() || {};
                    mapperState.sortState = mapperState.sortState || {};
                    mapperState.sortState.options = {
                        column: sortState.column,
                        direction: sortState.direction
                    };
                    mapperState.pagination.currentPage = 1;
                    renderCurrentTab();
                },
                columnTypes: mapperColumnTypes,
                initialSort: mapperState.sortState?.options || null
            },
            filters: {
                dataSource: () => {
                    const { options } = getOptionsData();
                    return options;
                },
                filterColumns: getFilterColumnsConfig('options'),
                onFilter: (filters) => {
                    mapperState.columnFilters.options = filters;
                    mapperState.pagination.currentPage = 1;
                    renderCurrentTab();
                },
                initialFilters: mapperState.columnFilters?.options || null
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

    const { options, characteristics } = getOptionsData();

    if (options.length === 0) {
        renderEmptyState(container, 'options');
        return;
    }

    mapperTableAPIs.delete('options');
    initOptionsTableAPI(container, characteristics);

    const tableAPI = mapperTableAPIs.get('options');
    if (!tableAPI) return;

    let filteredData = applyFilters(options, 'options');
    const { paginatedData, totalItems } = applyPagination(filteredData);

    updatePagination(totalItems);
    tableAPI.render(paginatedData);
    updateStats('options', filteredData.length, options.length);
}

/**
 * Отримати дані маркетплейсів
 * Трансформує дані для стандартних типів колонок:
 * - is_active: нормалізує boolean для status-dot
 */
function getMarketplacesData() {
    const marketplaces = getMarketplaces().map(mp => ({
        ...mp,
        is_active: String(mp.is_active ?? '').toLowerCase() === 'true' ? 'active' : 'inactive',
        _editable: true
    }));

    return { marketplaces };
}

/**
 * Отримати конфігурацію колонок для маркетплейсів
 */
export function getMarketplacesColumns() {
    return [
        col('id', 'ID', 'word-chip'),
        col('name', 'Назва', 'name'),
        col('slug', 'Slug', 'code'),
        col('is_active', 'Активний', 'status-dot', { filterable: true, className: 'cell-s cell-center' })
    ];
}

/**
 * Ініціалізувати Table API для маркетплейсів
 */
function initMarketplacesTableAPI(container) {
    if (mapperTableAPIs.has('marketplaces')) return;

    const visibleCols = mapperState.visibleColumns.marketplaces?.length > 0
        ? mapperState.visibleColumns.marketplaces
        : ['id', 'name', 'slug', 'is_active'];

    const tableAPI = createTable(container, {
        columns: getMarketplacesColumns(),
        visibleColumns: visibleCols,
        rowActionsHeader: '<input type="checkbox" class="select-all-checkbox" data-tab="marketplaces">',
        rowActions: (row) => {
            return `
                <input type="checkbox" class="row-checkbox" data-row-id="${escapeHtml(row.id)}" data-tab="marketplaces">
                ${actionButton({ action: 'view', rowId: row.id, context: 'mapper-marketplaces' })}
                ${actionButton({ action: 'edit', rowId: row.id, context: 'mapper-marketplaces' })}
            `;
        },
        getRowId: (row) => row.id,
        emptyState: {
            message: 'Маркетплейси відсутні'
        },
        withContainer: false,
        onAfterRender: (cont) => {
            initActionHandlers(cont, 'mapper-marketplaces');
            const { marketplaces } = getMarketplacesData();
            const filteredData = applyFilters(marketplaces, 'marketplaces');
            const { paginatedData } = applyPagination(filteredData);
            initTableCheckboxes(cont, 'marketplaces', paginatedData);
        },
        plugins: {
            sorting: {
                dataSource: () => {
                    const { marketplaces } = getMarketplacesData();
                    return marketplaces;
                },
                onSort: (sortedData) => {
                    const sortState = tableAPI?.getSort?.() || {};
                    mapperState.sortState = mapperState.sortState || {};
                    mapperState.sortState.marketplaces = {
                        column: sortState.column,
                        direction: sortState.direction
                    };
                    mapperState.pagination.currentPage = 1;
                    renderCurrentTab();
                },
                columnTypes: mapperColumnTypes,
                initialSort: mapperState.sortState?.marketplaces || null
            },
            filters: {
                dataSource: () => {
                    const { marketplaces } = getMarketplacesData();
                    return marketplaces;
                },
                filterColumns: getFilterColumnsConfig('marketplaces'),
                onFilter: (filters) => {
                    mapperState.columnFilters.marketplaces = filters;
                    mapperState.pagination.currentPage = 1;
                    renderCurrentTab();
                },
                initialFilters: mapperState.columnFilters?.marketplaces || null
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
        return;
    }

    mapperTableAPIs.delete('marketplaces');
    initMarketplacesTableAPI(container);

    const tableAPI = mapperTableAPIs.get('marketplaces');
    if (!tableAPI) return;

    let filteredData = applyFilters(marketplaces, 'marketplaces');
    const { paginatedData, totalItems } = applyPagination(filteredData);

    updatePagination(totalItems);
    tableAPI.render(paginatedData);
    updateStats('marketplaces', filteredData.length, marketplaces.length);
}

/**
 * Локальна функція сортування масиву
 */
function sortArrayLocal(array, column, direction) {
    if (!column || !direction) return array;

    const colType = mapperColumnTypes[column];

    return [...array].sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        // binding-chip: витягнути .count з об'єкта { count, tooltip }
        if (colType === 'binding-chip') {
            if (aVal && typeof aVal === 'object' && 'count' in aVal) aVal = aVal.count;
            if (bVal && typeof bVal === 'object' && 'count' in bVal) bVal = bVal.count;
            aVal = aVal === '∞' ? Infinity : (parseFloat(aVal) || 0);
            bVal = bVal === '∞' ? Infinity : (parseFloat(bVal) || 0);
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Перетворюємо в рядки для порівняння
        aVal = (aVal ?? '').toString();
        bVal = (bVal ?? '').toString();

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
        categories: 'square',
        characteristics: 'change_history',
        options: 'circle',
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
            { id: 'parent_id', label: 'Батьківська', filterType: 'values' },
            { id: 'grouping', label: 'Групуюча', filterType: 'values', labelMap: { 'active': 'Так', 'inactive': 'Ні' } }
        ],
        characteristics: [
            { id: 'type', label: 'Тип', filterType: 'values' },
            { id: 'is_global', label: 'Глобальна', filterType: 'values', labelMap: { 'active': 'Так', 'inactive': 'Ні' } }
        ],
        options: [
            { id: 'characteristic_id', label: 'Характеристика', filterType: 'values' }
        ],
        marketplaces: [
            { id: 'is_active', label: 'Активний', filterType: 'values', labelMap: { 'active': 'Активний', 'inactive': 'Неактивний' } }
        ]
    };

    return baseConfig[tabName] || [];
}

// initMapperColumnFilters — тепер сортування та фільтри
// обробляються через Table LEGO плагіни в кожній initXxxTableAPI()
