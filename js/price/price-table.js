// js/price/price-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - TABLE RENDERING                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Використовує універсальний createPseudoTable API для рендерингу таблиці.
 */

import { priceState } from './price-init.js';
import { createPseudoTable, renderBadge } from '../common/ui-table.js';
import { escapeHtml } from '../utils/text-utils.js';
import { getAvatarPath } from '../utils/avatar-loader.js';

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

    tableAPI = createPseudoTable(container, {
        columns: getColumns(),
        visibleColumns: visibleCols,
        rowActionsHeader: '<input type="checkbox" class="header-select-all" id="select-all-price">',
        rowActionsCustom: (row) => `
            <input type="checkbox" class="row-checkbox" data-code="${escapeHtml(row.code)}">
            <button class="btn-icon btn-edit" data-code="${escapeHtml(row.code)}" title="Редагувати">
                <span class="material-symbols-outlined">edit</span>
            </button>
        `,
        getRowId: (row) => row.code,
        emptyState: {
            icon: 'receipt_long',
            message: 'Немає даних для відображення'
        },
        withContainer: false
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
        {
            id: 'code',
            label: 'Код',
            className: 'cell-id',
            sortable: true,
            searchable: true,
            render: (value) => `<span class="word-chip">${escapeHtml(value || '')}</span>`
        },
        {
            id: 'article',
            label: 'Артикул',
            className: 'cell-article',
            sortable: true,
            searchable: true,
            render: (value, row) => {
                if (value) {
                    return `<span class="article-value">${escapeHtml(value)}</span>`;
                }
                return `<input type="text" class="input-main input-article" data-code="${escapeHtml(row.code)}" placeholder="Артикул">`;
            }
        },
        {
            id: 'product',
            label: 'Товар',
            className: 'cell-main-name',
            sortable: true,
            searchable: true,
            sortKey: 'product',
            render: (value, row) => formatProductDisplay(row)
        },
        {
            id: 'shiping_date',
            label: 'Відправка',
            sortable: true,
            filterable: true,
            render: (value) => {
                const displayValue = value || 'ненаявно';
                return `<span class="word-chip">${escapeHtml(displayValue)}</span>`;
            }
        },
        {
            id: 'status',
            label: 'Викладено',
            className: 'cell-bool',
            sortable: true,
            filterable: true,
            render: (value, row) => renderBadge(value, 'checked', {
                clickable: true,
                id: `${row.code}:status`
            })
        },
        {
            id: 'check',
            label: 'Перевірено',
            className: 'cell-bool',
            sortable: true,
            filterable: true,
            render: (value, row) => renderBadge(value, 'checked', {
                clickable: true,
                id: `${row.code}:check`
            })
        },
        {
            id: 'payment',
            label: 'Оплата',
            className: 'cell-bool',
            sortable: true,
            filterable: true,
            render: (value, row) => renderBadge(value, 'checked', {
                clickable: true,
                id: `${row.code}:payment`
            })
        },
        {
            id: 'update_date',
            label: 'Оновлено',
            sortable: true,
            filterable: true,
            render: (value) => escapeHtml(value || '-')
        },
        {
            id: 'reserve',
            label: 'Резерв',
            sortable: true,
            filterable: true,
            searchable: true,
            render: (value) => renderReserveCell(value)
        }
    ];
}

/**
 * Рендерити комірку резерву з аватаркою або ініціалами (БЕЗ імені)
 * Ім'я показується тільки в tooltip при наведенні
 */
function renderReserveCell(value) {
    if (!value) {
        return '<span class="text-muted">-</span>';
    }

    const name = value.trim();
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
 * Отримати ініціали з імені
 */
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

/**
 * Генерувати колір аватарки на основі імені
 */
function getAvatarColor(name) {
    const colors = [
        '#f44336', '#e91e63', '#9c27b0', '#673ab7',
        '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
        '#009688', '#4caf50', '#8bc34a', '#cddc39',
        '#ffc107', '#ff9800', '#ff5722', '#795548'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
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
