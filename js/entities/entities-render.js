// js/entities/entities-render.js
// Рендеринг таблиць для сутностей

import { getEnrichedData, getMarketplaces, getMpColumns } from './entities-data.js';
import { entitiesState, updateStats, setupColumnCheckboxes } from './entities-init.js';

/**
 * Отримати назву entity type з ID табу
 * @param {string} tabId - ID табу (напр. 'tab-categories')
 * @returns {string} - Назва entity type (напр. 'categories')
 */
function getEntityTypeFromTabId(tabId) {
    return tabId.replace('tab-', '');
}

/**
 * Відрендерити таблицю для вказаного табу
 */
export function renderTable(tabId) {
    console.log(`🎨 Рендеримо таблицю: ${tabId}`);

    const entityType = getEntityTypeFromTabId(tabId);
    const data = getEnrichedData(entityType);
    if (!data) {
        console.warn(`Немає даних для ${entityType}`);
        return;
    }

    // Оновити state
    entitiesState[entityType] = data;
    entitiesState.currentTab = tabId;

    // Отримати pagination state
    const pagination = entitiesState.pagination[tabId];
    const { currentPage, pageSize } = pagination;

    // Застосувати пагінацію
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    // Оновити totalItems в pagination
    pagination.totalItems = data.length;
    const paginationInstance = entitiesState.paginationInstances[tabId];
    if (paginationInstance) {
        paginationInstance.updateTotalItems(data.length);
    }

    // Рендерити рядки
    const tableBody = document.querySelector(`[data-tab-content="${tabId}"] .pseudo-table-body`);
    if (!tableBody) {
        console.error(`Таблиця для ${tabId} не знайдена`);
        return;
    }

    tableBody.innerHTML = '';

    paginatedData.forEach((item, index) => {
        const row = createTableRow(entityType, item, startIndex + index);
        tableBody.appendChild(row);
    });

    // Оновити статистику
    updateStats();

    // Оновити кнопки колонок в aside (включаючи маркетплейс колонки)
    setupColumnCheckboxes(entityType);

    console.log(`✅ Таблиця ${entityType} відрендерена (${paginatedData.length} рядків)`);
}

/**
 * Створити HTML рядок таблиці
 */
function createTableRow(entityType, item, globalIndex) {
    const row = document.createElement('div');
    row.className = 'pseudo-table-row';
    row.dataset.entityType = entityType;
    row.dataset.index = globalIndex;

    // Отримати local_id або brand_id
    const itemId = item.local_id || item.brand_id;
    row.dataset.id = itemId;

    // Checkbox
    const checkboxCell = createCell('cell-actions');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'row-checkbox';
    checkbox.dataset.id = itemId;
    checkboxCell.appendChild(checkbox);
    row.appendChild(checkboxCell);

    // Колонки залежно від типу сутності
    switch (entityType) {
        case 'categories':
            row.appendChild(createCell('cell-id', item.local_id, 'local_id'));
            row.appendChild(createCell('', item.parent_name, 'parent_name'));
            row.appendChild(createCell('cell-main-name', item.name_uk, 'name_uk'));
            row.appendChild(createCell('', item.name_ru, 'name_ru'));
            row.appendChild(createCell('', item.category_type, 'category_type'));

            // Computed колонки
            row.appendChild(createCell('', item.level || '—', 'level'));
            row.appendChild(createCell('', item.children_count || '0', 'children_count'));
            break;

        case 'characteristics':
            row.appendChild(createCell('cell-id', item.local_id, 'local_id'));
            row.appendChild(createCell('cell-main-name', item.name_uk, 'name_uk'));
            row.appendChild(createCell('', item.category_names, 'category_names'));
            row.appendChild(createCell('', item.param_type, 'param_type'));
            row.appendChild(createCell('', item.is_global ? 'Так' : 'Ні', 'is_global'));

            // Computed колонки
            row.appendChild(createCell('', item.option_count || '0', 'option_count'));
            break;

        case 'options':
            row.appendChild(createCell('cell-id', item.local_id, 'local_id'));
            row.appendChild(createCell('', item.char_name, 'char_name'));
            row.appendChild(createCell('cell-main-name', item.name_uk, 'name_uk'));
            row.appendChild(createCell('', item.name_ru, 'name_ru'));
            break;
    }

    // Додати динамічні колонки маркетплейсів
    const marketplaces = getMarketplaces();
    const entityTypeCap = entityType.charAt(0).toUpperCase() + entityType.slice(1);

    marketplaces.forEach(mp => {
        const mpId = mp.marketplace_id || mp.mp_id;
        const mpColumns = getMpColumns(mpId, entityTypeCap);

        mpColumns.forEach(colMeta => {
            const columnName = colMeta.column_name;
            const value = item[columnName] || '—';
            row.appendChild(createCell('', value, columnName));
        });
    });

    return row;
}

/**
 * Створити комірку таблиці
 */
function createCell(className, content, columnName = '') {
    const cell = document.createElement('div');
    cell.className = `pseudo-table-cell ${className}`.trim();
    if (columnName) {
        cell.dataset.column = columnName;
    }
    cell.innerHTML = content || '—';
    return cell;
}

/**
 * Оновити відображення після зміни даних
 */
export function refreshCurrentTable() {
    renderTable(entitiesState.currentTab);
}
