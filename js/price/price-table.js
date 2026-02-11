// js/price/price-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - TABLE RENDERING                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Використовує універсальний createPseudoTable API для рендерингу таблиці.
 */

import { priceState } from './price-init.js';
import { createTable, renderBadge, col } from '../common/table/table-main.js';
import { escapeHtml } from '../utils/text-utils.js';
import { getAvatarPath } from '../common/avatar/avatar-user.js';
import { getInitials, getAvatarColor } from '../common/avatar/avatar-text.js';

// Table API instance
let tableAPI = null;

/**
 * Застосувати фільтри до рядків таблиці БЕЗ перемальовування
 * Просто ховає/показує рядки через CSS
 */
export function applyFiltersToTableRows() {
    const container = document.getElementById('price-table-container');
    if (!container) return;

    // Отримуємо Set з code відфільтрованих елементів
    const filteredCodes = new Set(priceState.filteredItems.map(item => item.code));

    // Проходимо по всіх рядках і ховаємо/показуємо
    let visibleCount = 0;
    const { currentPage, pageSize } = priceState.pagination;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    container.querySelectorAll('.pseudo-table-row').forEach(row => {
        const code = row.dataset.rowId;
        const shouldShow = filteredCodes.has(code);

        if (shouldShow && visibleCount >= startIndex && visibleCount < endIndex) {
            row.style.display = '';
            visibleCount++;
        } else if (shouldShow) {
            row.style.display = 'none'; // Поза пагінацією
            visibleCount++;
        } else {
            row.style.display = 'none'; // Не проходить фільтр
        }
    });

    updateStats(priceState.filteredItems.length, priceState.priceItems.length);
}

/**
 * Ініціалізувати таблицю (викликається один раз)
 */
function initTableAPI() {
    const container = document.getElementById('price-table-container');
    if (!container || tableAPI) return;

    const visibleCols = priceState.visibleColumns.length > 0
        ? priceState.visibleColumns
        : ['code', 'article', 'product', 'shiping_date', 'status', 'check', 'payment', 'update_date', 'reserve'];

    const columns = getColumns();

    // Колонки з фільтрами (для hover dropdown)
    const filterColumns = columns
        .filter(col => col.filterable)
        .map(col => ({
            id: col.id,
            label: col.label,
            filterType: col.filterType || 'values'
        }));

    tableAPI = createTable(container, {
        columns: columns,
        visibleColumns: visibleCols,
        rowActionsHeader: '<input type="checkbox" class="header-select-all" id="select-all-price">',
        rowActions: (row) => `
            <input type="checkbox" class="row-checkbox" data-code="${escapeHtml(row.code)}">
            <button class="btn-icon btn-edit" data-code="${escapeHtml(row.code)}" title="Редагувати">
                <span class="material-symbols-outlined">edit</span>
            </button>
        `,
        getRowId: (row) => row.code,
        emptyState: {
            message: 'Немає даних для відображення'
        },
        withContainer: false,
        plugins: {
            sorting: {
                dataSource: () => priceState.priceItems,
                onSort: async (sortedData) => {
                    // Зберігаємо стан сортування (фактична фільтрація через applyAllFilters)
                    const sortState = tableAPI.getSort?.() || {};
                    priceState.sortState = {
                        column: sortState.column,
                        direction: sortState.direction
                    };

                    // Застосовуємо фільтри (які включають сортування)
                    const { applyAllFilters } = await import('./price-events.js');
                    applyAllFilters();

                    // Перерендерюємо ТІЛЬКИ рядки
                    await renderPriceTableRowsOnly();
                },
                columnTypes: {
                    code: 'string',
                    article: 'string',
                    product: 'product',
                    reserve: 'string',
                    status: 'boolean',
                    check: 'boolean',
                    payment: 'boolean',
                    shiping_date: 'string',
                    update_date: 'date'
                }
            },
            filters: {
                dataSource: () => priceState.priceItems,
                filterColumns: filterColumns,
                onFilter: async (filters) => {
                    priceState.columnFilters = filters;

                    // Застосовуємо всі фільтри
                    const { applyAllFilters } = await import('./price-events.js');
                    applyAllFilters();

                    // Скидаємо пагінацію
                    priceState.pagination.currentPage = 1;

                    // Перерендерюємо ТІЛЬКИ рядки
                    await renderPriceTableRowsOnly();

                    // Оновлюємо пагінацію
                    if (priceState.paginationAPI) {
                        priceState.paginationAPI.update({
                            totalItems: priceState.filteredItems.length,
                            currentPage: 1
                        });
                    }
                }
            }
        }
    });

    // Зберігаємо в state для доступу з інших модулів
    priceState.tableAPI = tableAPI;
}

/**
 * Отримати пагіновані дані
 */
function getPaginatedData() {
    const items = priceState.filteredItems;

    const { currentPage, pageSize } = priceState.pagination;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, items.length);

    return {
        all: priceState.priceItems,
        filtered: items,
        paginated: items.slice(startIndex, endIndex)
    };
}

/**
 * Перерендерити ТІЛЬКИ рядки таблиці (без заголовка)
 * Викликається при фільтрації/сортуванні щоб не знищувати dropdown-и в заголовках
 */
export async function renderPriceTableRowsOnly() {
    if (!tableAPI) {
        // Якщо API ще не створено - робимо повний рендер
        await renderPriceTable();
        return;
    }

    const { all, filtered, paginated } = getPaginatedData();

    // Оновлюємо пагінацію
    if (priceState.paginationAPI) {
        priceState.paginationAPI.update({
            currentPage: priceState.pagination.currentPage,
            pageSize: priceState.pagination.pageSize,
            totalItems: filtered.length
        });
    }

    // Оновлюємо тільки рядки
    tableAPI.updateRows(paginated);

    updateStats(filtered.length, all.length);
}

/**
 * Рендерити таблицю прайсу (повний рендер)
 */
export async function renderPriceTable() {
    const container = document.getElementById('price-table-container');
    if (!container) return;

    // Ініціалізуємо API якщо потрібно
    if (!tableAPI) {
        initTableAPI();
    }

    const { all, filtered, paginated } = getPaginatedData();

    // Оновити пагінацію
    if (priceState.paginationAPI) {
        priceState.paginationAPI.update({
            currentPage: priceState.pagination.currentPage,
            pageSize: priceState.pagination.pageSize,
            totalItems: filtered.length
        });
    }

    // Повний рендер таблиці
    tableAPI.render(paginated);

    updateStats(filtered.length, all.length);
}

/**
 * Отримати конфігурацію колонок
 * Порядок: Код, Артикул, Товар, Відправка, Викладено, Перевірено, Оплата, Оновлено, Резерв
 */
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
 * Ім'я показується тільки в tooltip при наведенні
 */
function renderReserveCell(value) {
    if (!value) return null;

    const name = value.trim();
    if (!name) return null;

    const userAvatar = priceState.usersMap?.[name] || priceState.usersMap?.[name.toLowerCase()];

    if (userAvatar) {
        // Користувач є в таблиці Users - показуємо тільки аватарку
        const avatarPath = getAvatarPath(userAvatar, 'calm');
        return `<img src="${avatarPath}" alt="" class="avatar avatar-xs" data-tooltip="${escapeHtml(name)}">`;
    } else {
        // Fallback на ініціали
        const initials = getInitials(name);
        const avatarColor = getAvatarColor(name);
        return `<span class="avatar avatar-xs avatar-initials" style="background-color: ${avatarColor};" data-tooltip="${escapeHtml(name)}">${initials}</span>`;
    }
}


/**
 * Форматувати відображення товару
 * Формат: Brand name, packaging - flavor (без стилізації)
 */
function formatProductDisplay(item) {
    const brand = item.brand || '';
    const name = item.name || '';
    const packaging = item.packaging || '';
    const flavor = item.flavor || '';

    let display = '';
    if (brand) display += escapeHtml(brand) + ' ';
    display += escapeHtml(name);

    // Додаємо packaging та flavor через кому та тире
    const details = [];
    if (packaging) details.push(packaging);
    if (flavor) details.push(flavor);

    if (details.length > 0) {
        display += ', ' + escapeHtml(details.join(' - '));
    }

    return display || '-';
}

/**
 * Оновити статистику
 */
function updateStats(shown, total) {
    const statsEl = document.getElementById('tab-stats-price');
    if (statsEl) {
        statsEl.textContent = `Показано ${shown} з ${total}`;
    }
}

/**
 * Скинути tableAPI (для реініціалізації)
 */
export function resetTableAPI() {
    tableAPI = null;
    priceState.tableAPI = null;
}

// Експорт для window
window.renderPriceTable = renderPriceTable;
