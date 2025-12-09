// js/price/price-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - TABLE RENDERING                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Рендеринг таблиці прайсу з badge-кнопками для статусів.
 */

import { priceState } from './price-init.js';
import { renderAvatarState } from '../utils/avatar-states.js';

/**
 * Рендерити таблицю прайсу
 */
export async function renderPriceTable() {
    const container = document.getElementById('price-table-container');
    if (!container) return;

    const items = priceState.filteredItems;

    // Якщо немає даних
    if (!items || items.length === 0) {
        container.innerHTML = renderAvatarState('empty', {
            message: 'Немає даних для відображення',
            size: 'medium',
            containerClass: 'empty-state-container',
            avatarClass: 'empty-state-avatar',
            messageClass: 'avatar-state-message',
            showMessage: true
        });
        updateStats(0, 0);
        return;
    }

    // Отримуємо пагіновані дані
    const { currentPage, pageSize } = priceState.pagination;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, items.length);
    const pageItems = items.slice(startIndex, endIndex);

    // Генеруємо HTML таблиці
    const html = `
        <table class="pseudo-table">
            <thead>
                <tr>
                    <th class="col-checkbox"><input type="checkbox" id="select-all-price"></th>
                    <th class="col-actions"></th>
                    <th>Резерв</th>
                    <th>Код</th>
                    <th>Артикул</th>
                    <th>Товар</th>
                    <th>Відправка</th>
                    <th>Викладено</th>
                    <th>Перевірено</th>
                    <th>Оплата</th>
                    <th>Дата</th>
                </tr>
            </thead>
            <tbody>
                ${pageItems.map(item => renderTableRow(item)).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
    updateStats(items.length, priceState.priceItems.length);
}

/**
 * Рендерити один рядок таблиці
 */
function renderTableRow(item) {
    const statusBadge = renderStatusBadge(item.status, 'status', item.code);
    const checkBadge = renderStatusBadge(item.check, 'check', item.code);
    const paymentIndicator = renderPaymentIndicator(item.payment);
    const productDisplay = formatProductDisplay(item);

    return `
        <tr data-code="${item.code}" data-row-index="${item._rowIndex}">
            <td class="col-checkbox">
                <input type="checkbox" class="row-checkbox" data-code="${item.code}">
            </td>
            <td class="col-actions">
                <button class="btn-icon btn-edit-item" data-code="${item.code}" aria-label="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            </td>
            <td class="col-reserve">
                ${item.reserve ? `<span class="chip chip-small">${escapeHtml(item.reserve)}</span>` : '<span class="text-muted">-</span>'}
            </td>
            <td class="col-code">${escapeHtml(item.code)}</td>
            <td class="col-article">
                ${item.article
                    ? `<span class="article-value">${escapeHtml(item.article)}</span>`
                    : `<input type="text" class="input-article" data-code="${item.code}" placeholder="Вставте артикул">`
                }
            </td>
            <td class="col-product">${productDisplay}</td>
            <td class="col-shipping">${escapeHtml(item.shiping_date || '-')}</td>
            <td class="col-status">${statusBadge}</td>
            <td class="col-check">${checkBadge}</td>
            <td class="col-payment">${paymentIndicator}</td>
            <td class="col-date">${escapeHtml(item.status_date || '-')}</td>
        </tr>
    `;
}

/**
 * Рендерити badge статусу (клікабельний)
 */
function renderStatusBadge(value, type, code) {
    const isTrue = value === 'TRUE' || value === true;
    const badgeClass = isTrue ? 'badge-success' : 'badge-secondary';
    const label = type === 'status' ? (isTrue ? 'Викладено' : 'Не викладено')
                : (isTrue ? 'Перевірено' : 'Не перевірено');
    const icon = isTrue ? 'check' : 'close';

    return `
        <span class="badge ${badgeClass} clickable"
              data-code="${code}"
              data-field="${type}"
              data-value="${isTrue}">
            <span class="material-symbols-outlined">${icon}</span>
            <span class="badge-label">${label}</span>
        </span>
    `;
}

/**
 * Рендерити індикатор оплати
 */
function renderPaymentIndicator(value) {
    const isPaid = value === 'TRUE' || value === true;
    return isPaid
        ? '<span class="payment-indicator paid" title="Оплачено">&#128994;</span>'
        : '<span class="payment-indicator unpaid" title="Не оплачено">&#128308;</span>';
}

/**
 * Форматувати відображення товару
 */
function formatProductDisplay(item) {
    const brand = item.brand || '';
    const name = item.name || '';
    const packaging = item.packaging || '';
    const flavor = item.flavor || '';

    let display = '';
    if (brand) display += `<strong>${escapeHtml(brand)}</strong> `;
    display += escapeHtml(name);

    const details = [];
    if (packaging) details.push(packaging);
    if (flavor) details.push(flavor);

    if (details.length > 0) {
        display += ` <span class="text-muted">(${escapeHtml(details.join(' - '))})</span>`;
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
 * Escape HTML для безпечного виводу
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Експорт для window
window.renderPriceTable = renderPriceTable;
