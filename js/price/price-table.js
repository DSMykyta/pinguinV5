// js/price/price-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - TABLE RENDERING                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Використовує createManagedTable для таблиці + пошуку + колонок.
 */

import { priceState } from './price-init.js';
import { createManagedTable, col } from '../common/table/table-main.js';
import { escapeHtml } from '../utils/text-utils.js';
import { getAvatarPath } from '../common/avatar/avatar-user.js';
import { getInitials, getAvatarColor } from '../common/avatar/avatar-text.js';

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

export function getColumns() {
    return [
        col('code', 'Код', 'word-chip'),
        col('article', 'Артикул', 'input', { className: 'cell-s', sortable: true, searchable: true }),
        col('product', 'Товар', 'name', { sortKey: 'product' }),
        col('shiping_date', 'Відправка', 'word-chip', { className: '', searchable: false, filterable: true }),
        col('status', 'Викладено', 'badge-toggle', { filterable: true }),
        col('check', 'Перевірено', 'badge-toggle', { filterable: true }),
        col('payment', 'Оплата', 'badge-toggle', { filterable: true }),
        col('update_date', 'Оновлено', 'text', { searchable: false, filterable: true }),
        col('reserve', 'Резерв', 'reserve', { filterable: true, resolveAvatar: renderReserveCell })
    ];
}

/**
 * Рендерити комірку резерву з аватаркою або ініціалами (БЕЗ імені)
 */
function renderReserveCell(value) {
    if (!value) return null;

    const name = value.trim();
    if (!name) return null;

    const userAvatar = priceState.usersMap?.[name] || priceState.usersMap?.[name.toLowerCase()];

    if (userAvatar) {
        const avatarPath = getAvatarPath(userAvatar, 'calm');
        return `<img src="${avatarPath}" alt="" class="avatar avatar-xs" data-tooltip="${escapeHtml(name)}">`;
    } else {
        const initials = getInitials(name);
        const avatarColor = getAvatarColor(name);
        return `<span class="avatar avatar-xs avatar-initials" style="background-color: ${avatarColor};" data-tooltip="${escapeHtml(name)}">${initials}</span>`;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SUGGESTIONS (для preFilter)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати пропозиції - варіації товарів, де інші смаки/розміри вже викладені
 * Товар вважається варіацією якщо brand + name + packaging однакові
 */
function getSuggestions(items) {
    const groups = new Map();

    for (const item of items) {
        const key = `${item.brand || ''}|${item.name || ''}|${item.packaging || ''}`.toLowerCase();
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(item);
    }

    const suggestions = [];

    for (const [key, groupItems] of groups) {
        const hasPosted = groupItems.some(item => item.article && item.article.trim() !== '');
        if (hasPosted) {
            const notPosted = groupItems.filter(item => !item.article || item.article.trim() === '');
            suggestions.push(...notPosted);
        }
    }

    return suggestions;
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGED TABLE
// ═══════════════════════════════════════════════════════════════════════════

let priceManagedTable = null;

function initPriceTable() {
    const visibleCols = priceState.visibleColumns.length > 0
        ? priceState.visibleColumns
        : ['code', 'article', 'product', 'shiping_date', 'status', 'check', 'payment', 'update_date', 'reserve'];

    const searchCols = priceState.searchColumns.length > 0
        ? priceState.searchColumns
        : ['code', 'article', 'product', 'reserve'];

    priceManagedTable = createManagedTable({
        container: 'price-table-container',
        columns: getColumns().map(c => ({
            ...c,
            searchable: searchCols.includes(c.id) || c.searchable === true,
            checked: visibleCols.includes(c.id)
        })),
        data: priceState.priceItems,

        // DOM IDs
        searchInputId: 'search-price',
        statsId: null,
        paginationId: null,

        tableConfig: {
            rowActionsHeader: '<input type="checkbox" class="header-select-all" id="select-all-price">',
            rowActions: (row) => `
                <input type="checkbox" class="row-checkbox" data-code="${escapeHtml(row.code)}">
                <button class="btn-icon btn-edit" data-code="${escapeHtml(row.code)}" title="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            `,
            getRowId: (row) => row.code,
            emptyState: { message: 'Немає даних для відображення' },
            withContainer: false,
            plugins: {
                sorting: {
                    columnTypes: {
                        code: 'string',
                        article: 'string',
                        product: 'string',
                        reserve: 'string',
                        status: 'boolean',
                        check: 'boolean',
                        payment: 'boolean',
                        shiping_date: 'string',
                        update_date: 'date'
                    }
                },
                filters: {
                    filterColumns: [
                        { id: 'shiping_date', label: 'Відправка', filterType: 'values' },
                        { id: 'status', label: 'Викладено', filterType: 'values' },
                        { id: 'check', label: 'Перевірено', filterType: 'values' },
                        { id: 'payment', label: 'Оплата', filterType: 'values' },
                        { id: 'update_date', label: 'Оновлено', filterType: 'values' },
                        { id: 'reserve', label: 'Резерв', filterType: 'values' }
                    ]
                }
            }
        },

        dataTransform: (data) => data.map(item => ({
            ...item,
            product: [item.brand, item.name, item.packaging, item.flavor]
                .filter(Boolean)
                .join(' ')
        })),

        preFilter: (data) => {
            // 1. Reserve filter
            const reserveFilter = priceState.currentReserveFilter || 'all';
            if (reserveFilter === 'not_posted') {
                data = data.filter(item => !item.article || item.article.trim() === '');
            } else if (reserveFilter === 'suggestions') {
                data = getSuggestions(data);
            } else if (reserveFilter !== 'all') {
                data = data.filter(item => (item.reserve || '').trim() === reserveFilter);
            }

            // 2. Status filter
            const statusFilter = priceState.currentStatusFilter || 'all';
            if (statusFilter !== 'all') {
                switch (statusFilter) {
                    case 'reserved':
                        data = data.filter(item => item.reserve && item.reserve.trim() !== '');
                        break;
                    case 'posted':
                        data = data.filter(item => item.status === 'TRUE' || item.status === true);
                        break;
                    case 'checked':
                        data = data.filter(item => item.check === 'TRUE' || item.check === true);
                        break;
                    case 'paid':
                        data = data.filter(item => item.payment === 'TRUE' || item.payment === true);
                        break;
                }
            }

            return data;
        },

        pageSize: null,
        checkboxPrefix: 'price'
    });

    priceState.tableAPI = priceManagedTable.tableAPI;
    priceState.priceManagedTable = priceManagedTable;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC RENDER
// ═══════════════════════════════════════════════════════════════════════════

export function renderPriceTable() {
    if (!priceManagedTable) {
        initPriceTable();
        return;
    }
    priceManagedTable.updateData(priceState.priceItems);
}

export function renderPriceTableRowsOnly() {
    if (priceManagedTable) {
        priceManagedTable.refilter();
    } else {
        renderPriceTable();
    }
}

export function resetTableAPI() {
    if (priceManagedTable) {
        priceManagedTable.destroy();
        priceManagedTable = null;
    }
    priceState.tableAPI = null;
    priceState.priceManagedTable = null;
}

// Експорт для window
window.renderPriceTable = renderPriceTable;
