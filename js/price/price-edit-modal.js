// js/price/price-edit-modal.js

/**
 * Модал редагування товару прайсу
 * Структура: Header (title + reserve dropdown + save + close), Body (2 columns), Footer (code + date)
 */

import { priceState } from './price-init.js';
import { updateItemStatus, updateItemArticle, reserveItem } from './price-data.js';
import { renderPriceTable } from './price-table.js';
import { showToast } from '../common/ui-toast.js';
import { initDropdowns } from '../common/ui-dropdown.js';

let currentItem = null;

/**
 * Відкрити модал редагування
 */
export function openEditModal(item) {
    currentItem = item;

    // Створюємо модал якщо його ще немає
    let modal = document.getElementById('price-edit-modal');
    if (!modal) {
        modal = createModal();
        document.getElementById('modal-placeholder').appendChild(modal);
    }

    // Заповнюємо дані
    fillModalData(item);

    // Ініціалізуємо dropdowns
    initDropdowns();

    // Показуємо модал
    modal.classList.add('is-open');
    document.body.classList.add('is-modal-open');
}

/**
 * Закрити модал
 */
export function closeEditModal() {
    const modal = document.getElementById('price-edit-modal');
    if (modal) {
        modal.classList.remove('is-open');
        document.body.classList.remove('is-modal-open');
    }
    currentItem = null;
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
 * Форматувати назву продукту
 */
function formatProductName(item) {
    let display = '';
    if (item.brand) display += item.brand + ' ';
    display += item.name || '';

    const details = [];
    if (item.packaging) details.push(item.packaging);
    if (item.flavor) details.push(item.flavor);

    if (details.length > 0) {
        display += ', ' + details.join(' - ');
    }

    return display || 'Без назви';
}

/**
 * Створити DOM модалу
 */
function createModal() {
    const modal = document.createElement('div');
    modal.id = 'price-edit-modal';
    modal.className = 'modal-overlay';

    modal.innerHTML = `
        <div class="modal-container modal-medium">
            <!-- Header -->
            <div class="modal-header">
                <h2 class="modal-title"><span id="edit-modal-title">Товар</span></h2>
                <div class="modal-header-actions">
                    <div class="connected-button-group-square">
                        <!-- Reserve dropdown -->
                        <div class="dropdown-wrapper">
                            <button type="button" class="segment" id="reserve-dropdown-trigger" data-dropdown-trigger
                                aria-label="Змінити резерв">
                                <span id="reserve-trigger-content">
                                    <span class="material-symbols-outlined">person</span>
                                </span>
                            </button>
                            <div class="dropdown-menu" id="reserve-dropdown-menu" style="min-width: 160px;">
                                <button class="dropdown-item" data-reserve-value="" title="Зняти резерв">
                                    <span class="material-symbols-outlined">person_off</span>
                                    <span>Не зарезервовано</span>
                                </button>
                                <div class="dropdown-separator"></div>
                                <div id="reserve-users-list"></div>
                            </div>
                        </div>

                        <!-- Save button -->
                        <button id="edit-save-btn" class="segment" aria-label="Зберегти">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">save</span>
                            </div>
                        </button>

                        <!-- Close button -->
                        <button class="segment" data-modal-close aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Body -->
            <div class="modal-body">
                <input type="hidden" id="edit-reserve-value">

                <div class="grid2" style="gap: 24px;">
                    <!-- Left column: article + name fields -->
                    <div class="form-grid" style="display: flex; flex-direction: column; gap: 16px;">
                        <div class="form-group">
                            <label for="edit-article">Артикул</label>
                            <input type="text" id="edit-article" class="input-main" placeholder="Введіть артикул...">
                        </div>
                        <div class="form-group">
                            <label>Бренд</label>
                            <div id="edit-brand" class="input-main input-readonly"></div>
                        </div>
                        <div class="form-group">
                            <label>Назва</label>
                            <div id="edit-name" class="input-main input-readonly"></div>
                        </div>
                        <div class="form-group">
                            <label>Категорія</label>
                            <div id="edit-category" class="input-main input-readonly"></div>
                        </div>
                        <div class="form-group">
                            <label>Фасування</label>
                            <div id="edit-packaging" class="input-main input-readonly"></div>
                        </div>
                        <div class="form-group">
                            <label>Смак</label>
                            <div id="edit-flavor" class="input-main input-readonly"></div>
                        </div>
                    </div>

                    <!-- Right column: toggle switches -->
                    <div class="form-grid" style="display: flex; flex-direction: column; gap: 24px;">
                        <div class="form-group">
                            <label>Викладено</label>
                            <label class="toggle-switch">
                                <input type="checkbox" id="edit-status">
                                <span class="slider"></span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label>Перевірено</label>
                            <label class="toggle-switch">
                                <input type="checkbox" id="edit-check">
                                <span class="slider"></span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label>Оплачено</label>
                            <label class="toggle-switch">
                                <input type="checkbox" id="edit-payment">
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="modal-footer" style="justify-content: space-between;">
                <span class="text-muted" id="edit-footer-code"></span>
                <span class="text-muted" id="edit-footer-date"></span>
            </div>
        </div>
    `;

    // Event listeners
    modal.querySelectorAll('[data-modal-close]').forEach(el => {
        el.addEventListener('click', closeEditModal);
    });

    // Закриття при кліку на overlay
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeEditModal();
        }
    });

    // Save button
    modal.querySelector('#edit-save-btn').addEventListener('click', saveChanges);

    // Reserve dropdown items
    modal.addEventListener('click', (e) => {
        const reserveItem = e.target.closest('[data-reserve-value]');
        if (reserveItem) {
            const value = reserveItem.dataset.reserveValue;
            selectReserve(value);
            // Закриваємо dropdown
            const dropdown = modal.querySelector('#reserve-dropdown-trigger');
            if (dropdown) {
                dropdown.closest('.dropdown-wrapper')?.querySelector('.dropdown-menu')?.classList.remove('is-open');
            }
        }
    });

    return modal;
}

/**
 * Вибрати резерв
 */
function selectReserve(value) {
    document.getElementById('edit-reserve-value').value = value;

    const triggerContent = document.getElementById('reserve-trigger-content');
    if (!triggerContent) return;

    if (value) {
        const initials = getInitials(value);
        const color = getAvatarColor(value);
        triggerContent.innerHTML = `
            <span class="avatar avatar-sm" style="background-color: ${color}; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; width: 24px; height: 24px; border-radius: 50%;">${initials}</span>
        `;
    } else {
        triggerContent.innerHTML = `<span class="material-symbols-outlined">person_off</span>`;
    }

    // Оновити активний стан в dropdown
    document.querySelectorAll('#reserve-dropdown-menu [data-reserve-value]').forEach(item => {
        if (item.dataset.reserveValue === value) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

/**
 * Заповнити модал даними
 */
function fillModalData(item) {
    // Title = product name
    document.getElementById('edit-modal-title').textContent = formatProductName(item);

    // Article
    document.getElementById('edit-article').value = item.article || '';

    // Readonly fields
    document.getElementById('edit-brand').textContent = item.brand || '-';
    document.getElementById('edit-name').textContent = item.name || '-';
    document.getElementById('edit-category').textContent = item.category || '-';
    document.getElementById('edit-packaging').textContent = item.packaging || '-';
    document.getElementById('edit-flavor').textContent = item.flavor || '-';

    // Toggles
    document.getElementById('edit-status').checked = item.status === 'TRUE' || item.status === true;
    document.getElementById('edit-check').checked = item.check === 'TRUE' || item.check === true;
    document.getElementById('edit-payment').checked = item.payment === 'TRUE' || item.payment === true;

    // Reserve dropdown - populate users
    const usersList = document.getElementById('reserve-users-list');
    if (usersList) {
        usersList.innerHTML = priceState.reserveNames.map(name => {
            const initials = getInitials(name);
            const color = getAvatarColor(name);
            return `
                <button class="dropdown-item" data-reserve-value="${name}" title="${name}">
                    <span class="avatar avatar-sm" style="background-color: ${color}; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; width: 24px; height: 24px; border-radius: 50%;">${initials}</span>
                    <span>${name}</span>
                </button>
            `;
        }).join('');
    }

    // Set current reserve value
    selectReserve(item.reserve || '');

    // Footer
    document.getElementById('edit-footer-code').textContent = `Код: ${item.code || '-'}`;
    document.getElementById('edit-footer-date').textContent = `Оновлено: ${item.update_date || '-'}`;
}

/**
 * Зберегти зміни
 */
async function saveChanges() {
    if (!currentItem) return;

    const saveBtn = document.getElementById('edit-save-btn');
    const originalContent = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = `
        <div class="state-layer">
            <span class="material-symbols-outlined rotating">progress_activity</span>
        </div>
    `;

    try {
        const code = currentItem.code;

        // Артикул
        const newArticle = document.getElementById('edit-article').value.trim();
        if (newArticle !== currentItem.article) {
            await updateItemArticle(code, newArticle);
        }

        // Резерв
        const newReserve = document.getElementById('edit-reserve-value').value;
        if (newReserve !== currentItem.reserve) {
            await reserveItem(code, newReserve);
        }

        // Статуси
        const newStatus = document.getElementById('edit-status').checked;
        const currentStatus = currentItem.status === 'TRUE' || currentItem.status === true;
        if (newStatus !== currentStatus) {
            await updateItemStatus(code, 'status', newStatus ? 'TRUE' : 'FALSE');
        }

        const newCheck = document.getElementById('edit-check').checked;
        const currentCheck = currentItem.check === 'TRUE' || currentItem.check === true;
        if (newCheck !== currentCheck) {
            await updateItemStatus(code, 'check', newCheck ? 'TRUE' : 'FALSE');
        }

        const newPayment = document.getElementById('edit-payment').checked;
        const currentPayment = currentItem.payment === 'TRUE' || currentItem.payment === true;
        if (newPayment !== currentPayment) {
            await updateItemStatus(code, 'payment', newPayment ? 'TRUE' : 'FALSE');
        }

        // Перерендеримо таблицю
        await renderPriceTable();

        // Закриваємо модал
        closeEditModal();

        showToast('Зміни збережено', 'success');

    } catch (error) {
        console.error('Error saving:', error);
        showToast('Помилка збереження: ' + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalContent;
    }
}
