// js/price/price-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - TABLE RENDERING                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Рендеринг таблиці прайсу з використанням універсального ui-table.
 */

import { priceState } from './price-init.js';
import { renderPseudoTable, renderBadge } from '../common/ui-table.js';
import { escapeHtml } from '../utils/text-utils.js';

/**
 * Рендерити таблицю прайсу
 */
export async function renderPriceTable() {
    const container = document.getElementById('price-table-container');
    if (!container) return;

    const items = priceState.filteredItems;

    // Якщо немає даних
    if (!items || items.length === 0) {
        renderPseudoTable(container, {
            data: [],
            columns: getColumns(),
            emptyState: {
                icon: 'receipt_long',
                message: 'Немає даних для відображення'
            },
            withContainer: false
        });
        updateStats(0, 0);
        return;
    }

    // Отримуємо пагіновані дані
    const { currentPage, pageSize } = priceState.pagination;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, items.length);
    const pageItems = items.slice(startIndex, endIndex);

    // Оновити пагінацію
    if (priceState.paginationAPI) {
        priceState.paginationAPI.update({
            currentPage,
            pageSize,
            totalItems: items.length
        });
    }

    // Рендерити таблицю через універсальний компонент
    renderPseudoTable(container, {
        data: pageItems,
        columns: getColumns(),
        visibleColumns: priceState.visibleColumns.length > 0
            ? priceState.visibleColumns
            : ['code', 'article', 'product', 'shiping_date', 'status', 'check', 'payment', 'update_date', 'reserve'],
        rowActionsHeader: '<input type="checkbox" class="header-select-all" id="select-all-price">',
        rowActionsCustom: (row) => `
            <input type="checkbox" class="row-checkbox" data-code="${escapeHtml(row.code)}">
            <button class="btn-icon btn-edit" data-code="${escapeHtml(row.code)}" title="Редагувати">
                <span class="material-symbols-outlined">edit</span>
            </button>
        `,
        emptyState: {
            icon: 'receipt_long',
            message: 'Немає даних для відображення'
        },
        withContainer: false
    });

    updateStats(items.length, priceState.priceItems.length);
}

/**
 * Отримати конфігурацію колонок
 * Порядок: Код, Артикул, Товар, Відправка, Викладено, Перевірено, Оплата, Оновлено, Резерв
 */
function getColumns() {
    return [
        {
            id: 'code',
            label: 'Код',
            className: 'cell-id',
            sortable: true,
            render: (value) => `<span class="word-chip">${escapeHtml(value || '')}</span>`
        },
        {
            id: 'article',
            label: 'Артикул',
            className: 'cell-article',
            sortable: true,
            render: (value, row) => {
                if (value) {
                    return `<span class="article-value">${escapeHtml(value)}</span>`;
                }
                return `<input type="text" class="input-inline input-article" data-code="${escapeHtml(row.code)}" placeholder="Артикул">`;
            }
        },
        {
            id: 'product',
            label: 'Товар',
            className: 'cell-main-name',
            sortable: true,
            sortKey: 'name',
            render: (value, row) => formatProductDisplay(row)
        },
        {
            id: 'shiping_date',
            label: 'Відправка',
            sortable: true,
            render: (value) => {
                if (value === 'ненаявно') {
                    return '<span class="badge badge-warning">ненаявно</span>';
                }
                return escapeHtml(value || '-');
            }
        },
        {
            id: 'status',
            label: 'Викладено',
            className: 'cell-bool',
            sortable: true,
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
            render: (value, row) => renderBadge(value, 'checked', {
                clickable: true,
                id: `${row.code}:payment`
            })
        },
        {
            id: 'update_date',
            label: 'Оновлено',
            sortable: true,
            render: (value) => escapeHtml(value || '-')
        },
        {
            id: 'reserve',
            label: 'Резерв',
            sortable: true,
            render: (value) => value
                ? `<span class="chip chip-small">${escapeHtml(value)}</span>`
                : '<span class="text-muted">-</span>'
        }
    ];
}

/**
 * Форматувати відображення товару
 * Формат: Brand name, packaging - flavor
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
        display += `, <span class="text-muted">${escapeHtml(details.join(' - '))}</span>`;
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

// Експорт для window
window.renderPriceTable = renderPriceTable;
