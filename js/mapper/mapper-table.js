// js/mapper/mapper-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - TABLE RENDERING                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Рендеринг таблиць для Marketplace Mapper.
 * Використовує createManagedTable для всіх 4 табів.
 * Спільний пошук (#search-mapper) + спільна пагінація (footer) —
 * через activate()/deactivate().
 */

import { mapperState, runHook } from './mapper-state.js';
import {
    getCategories, getCharacteristics, getOptions, getMarketplaces,
    getMpCategories, getMpCharacteristics, getMpOptions,
    getMapCategories, getMapCharacteristics, getMapOptions
} from './mapper-data.js';
import { getBatchBar } from '../common/ui-batch-actions.js';
import { createCachedFn } from '../common/util-lazy-load.js';
import { createManagedTable } from '../common/table/table-managed.js';
import { col } from '../common/table/table-main.js';
import { escapeHtml } from '../utils/text-utils.js';

import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../common/ui-actions.js';

// ═══════════════════════════════════════════════════════════════════════════
// КЕШОВАНІ LOOKUP MAP-И (O(1) замість O(n) для пошуку батьків)
// ═══════════════════════════════════════════════════════════════════════════

const getCategoryLookupMaps = createCachedFn(() => {
    const byId = new Map();
    const byMpJsonId = new Map();
    const byMpExtId = new Map();
    const byExtId = new Map();

    getCategories().forEach(cat => {
        byId.set(cat.id, cat);
        if (cat.external_id) byExtId.set(String(cat.external_id), cat);
    });

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

function findParentCategory(pid, mpId) {
    const maps = getCategoryLookupMaps();
    pid = String(pid);
    if (maps.byId.has(pid)) return maps.byId.get(pid);
    if (mpId && maps.byMpJsonId.has(`${mpId}:${pid}`)) return maps.byMpJsonId.get(`${mpId}:${pid}`);
    if (mpId && maps.byMpExtId.has(`${mpId}:${pid}`)) return maps.byMpExtId.get(`${mpId}:${pid}`);
    if (!mpId && maps.byExtId.has(pid)) return maps.byExtId.get(pid);
    return null;
}

export function invalidateLookupCaches() {
    getCategoryLookupMaps.invalidate();
    getMpEntityMaps.invalidate();
    _cachedCategoryLabelMap.invalidate();
    _cachedCharacteristicLabelMap.invalidate();
}

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

function extractName(obj) {
    if (!obj || typeof obj !== 'object') return '';
    if (obj.name_ua) return obj.name_ua;
    if (obj.nameUa) return obj.nameUa;
    if (obj.titleUk) return obj.titleUk;
    if (obj.titleRu) return obj.titleRu;
    if (obj.name) return obj.name;
    if (obj.name_ru) return obj.name_ru;
    if (obj.nameRu) return obj.nameRu;
    const nameKey = Object.keys(obj).find(k => {
        const lower = k.toLowerCase();
        return lower.includes('name') || lower.includes('title');
    });
    return nameKey ? obj[nameKey] : '';
}

function getCategoryNames(categoryIdsStr) {
    if (!categoryIdsStr) return '-';
    const labelMap = _cachedCategoryLabelMap();
    const ids = categoryIdsStr.split(',').map(id => id.trim()).filter(id => id);
    if (ids.length === 0) return '-';
    return ids.map(id => labelMap[id] || id).join(', ');
}

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

    const entityMap = entityType === 'category' ? maps.categories
        : entityType === 'characteristic' ? maps.characteristics
        : maps.options;

    const mpIdKey = entityType === 'category' ? 'mp_category_id'
        : entityType === 'characteristic' ? 'mp_characteristic_id'
        : 'mp_option_id';

    const byMarketplace = {};
    mapData.forEach(mapping => {
        const mpEntity = entityMap.get(mapping[mpIdKey]) || null;
        const mpId = mpEntity?.marketplace_id || 'unknown';
        if (!byMarketplace[mpId]) byMarketplace[mpId] = [];

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

    return { count: mapData.length, details };
}

function renderBindingsTooltip(bindingsInfo) {
    if (bindingsInfo.count === 0) return 'Немає прив\'язок до маркетплейсів';
    const lines = [];
    bindingsInfo.details.forEach(detail => {
        detail.items.forEach(item => {
            lines.push(`${detail.marketplace}: ${item._entityName || '—'}`);
        });
    });
    return lines.join('\n');
}

function createBindingsColumn(entityType) {
    return {
        id: 'bindings',
        label: 'Прів.',
        sortable: true,
        span: 1,
        align: 'center',
        render: (value, row) => {
            const bindingsInfo = getBindingsInfo(entityType, row.id);
            const tooltipContent = renderBindingsTooltip(bindingsInfo);
            const cls = bindingsInfo.count === 0 ? 'chip' : 'chip c-main';
            return `<span class="${cls}" data-entity-type="${entityType}" data-entity-id="${escapeHtml(row.id)}" data-entity-name="${escapeHtml(row.name_ua || row.value_ua || row.id)}" data-tooltip="${escapeHtml(tooltipContent)}" data-tooltip-always style="cursor:pointer">${bindingsInfo.count}</span>`;
        }
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ОБРОБНИКІВ ДІЙ
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// Managed Tables — одна інстанція на таб
// ═══════════════════════════════════════════════════════════════════════════

const managedTables = {};
const actionCleanups = new Map();
const checkboxDelegationHandlers = new Map();

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

// ═══════════════════════════════════════════════════════════════════════════
// DATA TRANSFORM FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function transformCategories(data) {
    return data.map(cat => {
        let level = 0;
        let current = cat;
        const path = [cat.name_ua || cat.id];

        while (current && current.parent_id) {
            level++;
            const parent = findParentCategory(current.parent_id, null);
            if (parent) {
                path.unshift(parent.name_ua || parent.id);
                current = parent;
            } else break;
            if (level > 10) break;
        }

        const nestingTooltip = level === 0 ? 'Коренева категорія' : path.join(' → ');
        const parentName = cat.parent_id
            ? (findParentCategory(cat.parent_id, null)?.name_ua || cat.parent_id)
            : '';
        const grouping = String(cat.grouping ?? '').toLowerCase() === 'true' ? 'active' : 'inactive';

        return {
            ...cat,
            _nestingLevel: { count: level, tooltip: nestingTooltip },
            parent_id: parentName,
            grouping,
            _editable: true
        };
    });
}

function transformCharacteristics(data) {
    const labelMap = _cachedCategoryLabelMap();

    return data.map(char => {
        const isGlobal = String(char.is_global ?? '').toLowerCase() === 'true' || char.is_global === true;

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
            _raw_category_ids: char.category_ids || '',
            category_ids: categoryDisplay,
            is_global: isGlobal ? 'active' : 'inactive',
            _editable: true
        };
    });
}

function transformOptions(data) {
    const characteristicsList = getCharacteristics();
    const charLabelMap = _cachedCharacteristicLabelMap();
    const catLabelMap = _cachedCategoryLabelMap();

    return data.map(opt => {
        const charName = opt.characteristic_id
            ? (charLabelMap[opt.characteristic_id] || opt.characteristic_id)
            : '';

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
}

function transformMarketplaces(data) {
    return data.map(mp => ({
        ...mp,
        is_active: String(mp.is_active ?? '').toLowerCase() === 'true' ? 'active' : 'inactive',
        _editable: true
    }));
}

// ═══════════════════════════════════════════════════════════════════════════
// COLUMN CONFIGS
// ═══════════════════════════════════════════════════════════════════════════

export function getCategoriesColumns() {
    return [
        { ...col('id', 'ID', 'tag'), searchable: true },
        col('_nestingLevel', 'Рів.', 'binding-chip'),
        { ...col('name_ua', 'Назва UA', 'name'), searchable: true },
        { ...col('name_ru', 'Назва RU', 'text'), searchable: true, checked: false },
        { ...col('parent_id', 'Батьківська', 'text', { filterable: true }) },
        { ...col('grouping', 'Групуюча', 'status-dot', { filterable: true }) },
        createBindingsColumn('category')
    ];
}

export function getCharacteristicsColumns() {
    return [
        { ...col('id', 'ID', 'tag'), searchable: true },
        {
            id: '_raw_category_ids', label: 'Категорія',
            span: 1, align: 'center', sortable: false, filterable: true,
            render: (value, row) => {
                const display = row.category_ids;
                if (!display || display.count == null) return '';
                const cls = (display.count === 0 || display.count === '0') ? 'chip' : 'chip c-main';
                return `<span class="${cls}" data-tooltip="${escapeHtml(display.tooltip || '')}" data-tooltip-always style="cursor:pointer">${display.count}</span>`;
            }
        },
        { ...col('name_ua', 'Назва', 'name'), searchable: true },
        { ...col('type', 'Тип', 'code', { filterable: true }), searchable: true },
        col('is_global', 'Глобальна', 'status-dot', { filterable: true }),
        col('unit', 'Одиниця', 'text'),
        createBindingsColumn('characteristic')
    ];
}

export function getOptionsColumns() {
    return [
        { ...col('id', 'ID', 'tag'), searchable: true },
        { ...col('characteristic_id', 'Характеристика', 'text', { filterable: true }) },
        { ...col('value_ua', 'Значення', 'name'), searchable: true },
        col('category_ids', 'Категорія', 'binding-chip'),
        createBindingsColumn('option')
    ];
}

export function getMarketplacesColumns() {
    return [
        { ...col('id', 'ID', 'tag'), searchable: true },
        { ...col('name', 'Назва', 'name'), searchable: true },
        { ...col('slug', 'Slug', 'code'), searchable: true },
        col('is_active', 'Активний', 'status-dot', { filterable: true })
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTER COLUMNS CONFIG
// ═══════════════════════════════════════════════════════════════════════════

function getFilterColumnsConfig(tabName) {
    const baseConfig = {
        categories: [
            { id: 'parent_id', label: 'Батьківська', filterType: 'values' },
            { id: 'grouping', label: 'Групуюча', filterType: 'values', labelMap: { 'active': 'Так', 'inactive': 'Ні' } }
        ],
        characteristics: [
            { id: '_raw_category_ids', label: 'Категорія', filterType: 'contains', labelMap: _cachedCategoryLabelMap() },
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

// ═══════════════════════════════════════════════════════════════════════════
// CHECKBOX INIT (onAfterRender)
// ═══════════════════════════════════════════════════════════════════════════

function initTableCheckboxes(container, tabName) {
    const selectAllCheckbox = container.querySelector('.select-all-checkbox');
    const rowCheckboxes = container.querySelectorAll('.row-checkbox');
    if (!selectAllCheckbox || rowCheckboxes.length === 0) return;

    if (!mapperState.selectedRows[tabName]) {
        mapperState.selectedRows[tabName] = new Set();
    }

    const selectedSet = mapperState.selectedRows[tabName];
    const batchBarId = `mapper-${tabName}`;
    const batchBar = getBatchBar(batchBarId);

    // Отримати ID з DOM
    const pageIds = [...rowCheckboxes].map(cb => cb.dataset.rowId);

    // Відновити стан чекбоксів
    rowCheckboxes.forEach(checkbox => {
        checkbox.checked = selectedSet.has(checkbox.dataset.rowId);
    });

    const updateSelectAllState = () => {
        const allSelected = pageIds.length > 0 && pageIds.every(id => selectedSet.has(id));
        const someSelected = pageIds.some(id => selectedSet.has(id));
        selectAllCheckbox.checked = allSelected;
        selectAllCheckbox.indeterminate = someSelected && !allSelected;
    };

    updateSelectAllState();

    // Sync batch bar
    if (batchBar) {
        const batchSelected = new Set(batchBar.getSelected());
        selectedSet.forEach(id => { if (!batchSelected.has(id)) batchBar.selectItem(id); });
        batchSelected.forEach(id => { if (!selectedSet.has(id)) batchBar.deselectItem(id); });
    }

    // Event delegation
    const prevHandler = checkboxDelegationHandlers.get(tabName);
    if (prevHandler) container.removeEventListener('change', prevHandler);

    const delegationHandler = (e) => {
        const target = e.target;

        if (target.classList.contains('select-all-checkbox') && target.dataset.tab === tabName) {
            const currentBatchBar = getBatchBar(batchBarId);
            if (target.checked) {
                pageIds.forEach(id => selectedSet.add(id));
                container.querySelectorAll('.row-checkbox').forEach(cb => { cb.checked = true; });
                if (currentBatchBar) pageIds.forEach(id => currentBatchBar.selectItem(id));
            } else {
                pageIds.forEach(id => selectedSet.delete(id));
                container.querySelectorAll('.row-checkbox').forEach(cb => { cb.checked = false; });
                if (currentBatchBar) pageIds.forEach(id => currentBatchBar.deselectItem(id));
            }
            runHook('onRowSelect', tabName, Array.from(selectedSet));
            return;
        }

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

            const allSelected = pageIds.length > 0 && pageIds.every(id => selectedSet.has(id));
            const someSelected = pageIds.some(id => selectedSet.has(id));
            const selectAll = container.querySelector('.select-all-checkbox');
            if (selectAll) {
                selectAll.checked = allSelected;
                selectAll.indeterminate = someSelected && !allSelected;
            }
            runHook('onRowSelect', tabName, Array.from(selectedSet));
        }
    };

    checkboxDelegationHandlers.set(tabName, delegationHandler);
    container.addEventListener('change', delegationHandler);
}

// ═══════════════════════════════════════════════════════════════════════════
// СТВОРЕННЯ MANAGED TABLE ДЛЯ КОЖНОГО ТАБУ
// ═══════════════════════════════════════════════════════════════════════════

function createMapperManagedTable(tabName, rawData, columnsGetter, dataTransformFn) {
    const columns = columnsGetter();

    // Визначити видимі колонки зі state
    const defaultVisible = columns.filter(c => c.checked !== false).map(c => c.id);
    const stateVisible = mapperState.visibleColumns[tabName];
    if (stateVisible?.length > 0) {
        columns.forEach(c => { c.checked = stateVisible.includes(c.id); });
    }

    const isActive = mapperState.activeTab === tabName;

    const mt = createManagedTable({
        container: `mapper-${tabName}-table-container`,
        columns: columns,
        data: rawData,
        searchInputId: isActive ? 'search-mapper' : null,
        statsId: null,
        paginationId: null,
        tableConfig: {
            rowActionsHeader: `<input type="checkbox" class="select-all-checkbox" data-tab="${tabName}">`,
            rowActions: (row) => `
                <input type="checkbox" class="row-checkbox" data-row-id="${escapeHtml(row.id)}" data-tab="${tabName}">
                ${actionButton({ action: 'edit', rowId: row.id, context: `mapper-${tabName}` })}
            `,
            getRowId: (row) => row.id,
            emptyState: { message: getEmptyMessage(tabName) },
            withContainer: false,
            onAfterRender: (cont) => {
                if (actionCleanups.has(tabName)) actionCleanups.get(tabName)();
                actionCleanups.set(tabName, initActionHandlers(cont, `mapper-${tabName}`));
                initTableCheckboxes(cont, tabName);
            },
            plugins: {
                sorting: {
                    columnTypes: mapperColumnTypes,
                    initialSort: mapperState.sortState?.[tabName] || null
                },
                filters: {
                    filterColumns: getFilterColumnsConfig(tabName),
                    initialFilters: mapperState.columnFilters?.[tabName] || null
                }
            }
        },
        dataTransform: dataTransformFn,
        pageSize: null,
        checkboxPrefix: `mapper-${tabName}`
    });

    managedTables[tabName] = mt;
    mapperState.managedTables = managedTables;

    if (!isActive) {
        mt.deactivate();
    }

    return mt;
}

function getEmptyMessage(tabName) {
    const messages = {
        categories: 'Категорії відсутні',
        characteristics: 'Характеристики відсутні',
        options: 'Опції відсутні',
        marketplaces: 'Маркетплейси відсутні'
    };
    return messages[tabName] || 'Дані відсутні';
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Створити всі 4 managed tables (при першому рендері після завантаження даних)
 */
export function initAllMapperTables() {
    invalidateLookupCaches();

    // Categories — завжди є дані
    if (!managedTables.categories) {
        createMapperManagedTable('categories', getCategories(), getCategoriesColumns, transformCategories);
    }

    // Marketplaces — завжди є дані
    if (!managedTables.marketplaces) {
        createMapperManagedTable('marketplaces', getMarketplaces(), getMarketplacesColumns, transformMarketplaces);
    }
}

/**
 * Ініціалізувати managed table для табу (lazy — при першому відкритті)
 */
export function ensureTabManagedTable(tabName) {
    if (managedTables[tabName]) return;

    const config = {
        categories: () => createMapperManagedTable('categories', getCategories(), getCategoriesColumns, transformCategories),
        characteristics: () => createMapperManagedTable('characteristics', getCharacteristics(), getCharacteristicsColumns, transformCharacteristics),
        options: () => createMapperManagedTable('options', getOptions(), getOptionsColumns, transformOptions),
        marketplaces: () => createMapperManagedTable('marketplaces', getMarketplaces(), getMarketplacesColumns, transformMarketplaces)
    };

    if (config[tabName]) config[tabName]();
}

/**
 * Рендерити поточний активний таб
 */
export function renderCurrentTab() {
    invalidateLookupCaches();

    const activeTab = mapperState.activeTab;
    const mt = managedTables[activeTab];

    if (!mt) {
        ensureTabManagedTable(activeTab);
        return;
    }

    // Оновити дані
    const dataGetters = {
        categories: getCategories,
        characteristics: getCharacteristics,
        options: getOptions,
        marketplaces: getMarketplaces
    };

    const getter = dataGetters[activeTab];
    if (getter) {
        mt.updateData(getter());
    }

}

/**
 * Оновити тільки рядки (refilter)
 */
export function renderCurrentTabRowsOnly() {
    const activeTab = mapperState.activeTab;
    const mt = managedTables[activeTab];

    if (!mt) {
        renderCurrentTab();
        return;
    }

    mt.refilter();
}

/**
 * Переключити активний таб (activate/deactivate)
 */
export function switchMapperTab(newTab, oldTab) {
    if (oldTab && managedTables[oldTab]) {
        managedTables[oldTab].deactivate();
    }
    if (managedTables[newTab]) {
        managedTables[newTab].activate();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// BACKWARD COMPAT EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export function renderCategoriesTable() {
    ensureTabManagedTable('categories');
    const mt = managedTables.categories;
    if (mt) mt.updateData(getCategories());
}

export function renderCharacteristicsTable() {
    ensureTabManagedTable('characteristics');
    const mt = managedTables.characteristics;
    if (mt) mt.updateData(getCharacteristics());
}

export function renderOptionsTable() {
    ensureTabManagedTable('options');
    const mt = managedTables.options;
    if (mt) mt.updateData(getOptions());
}

export function renderMarketplacesTable() {
    ensureTabManagedTable('marketplaces');
    const mt = managedTables.marketplaces;
    if (mt) mt.updateData(getMarketplaces());
}

export function renderCategoriesTableRowsOnly() {
    managedTables.categories?.refilter();
}

export function renderCharacteristicsTableRowsOnly() {
    managedTables.characteristics?.refilter();
}

export function renderOptionsTableRowsOnly() {
    managedTables.options?.refilter();
}

export function renderMarketplacesTableRowsOnly() {
    managedTables.marketplaces?.refilter();
}

export function resetMapperTableAPIs() {
    Object.keys(managedTables).forEach(key => {
        managedTables[key]?.destroy();
        delete managedTables[key];
    });
}

export function clearCheckboxHandlers(tabName) {
    if (tabName) {
        const handler = checkboxDelegationHandlers.get(tabName);
        if (handler) {
            const container = document.getElementById(`mapper-${tabName}-table-container`);
            if (container) container.removeEventListener('change', handler);
            checkboxDelegationHandlers.delete(tabName);
        }
    } else {
        checkboxDelegationHandlers.forEach((handler, tab) => {
            const container = document.getElementById(`mapper-${tab}-table-container`);
            if (container) container.removeEventListener('change', handler);
        });
        checkboxDelegationHandlers.clear();
    }
}

export function getMapperTableAPI(tabName) {
    return managedTables[tabName]?.tableAPI || null;
}

export function getMapperManagedTable(tabName) {
    return managedTables[tabName] || null;
}
