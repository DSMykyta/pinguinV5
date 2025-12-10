// js/price/price-edit-modal.js

/**
 * Модал редагування товару прайсу
 */

import { priceState } from './price-init.js';
import { updateItemStatus, updateItemArticle, reserveItem } from './price-data.js';
import { renderPriceTable } from './price-table.js';

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

    // Показуємо модал
    modal.classList.add('is-active');
    document.body.classList.add('modal-open');
}

/**
 * Закрити модал
 */
export function closeEditModal() {
    const modal = document.getElementById('price-edit-modal');
    if (modal) {
        modal.classList.remove('is-active');
        document.body.classList.remove('modal-open');
    }
    currentItem = null;
}

/**
 * Створити DOM модалу
 */
function createModal() {
    const modal = document.createElement('div');
    modal.id = 'price-edit-modal';
    modal.className = 'modal';

    modal.innerHTML = `
        <div class="modal-backdrop" data-modal-close></div>
        <div class="modal-container modal-medium">
            <div class="modal-header">
                <h3 id="edit-modal-title">Редагування товару</h3>
                <button class="btn-icon" data-modal-close aria-label="Закрити">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Код</label>
                    <input type="text" id="edit-code" class="input-main" readonly>
                </div>
                <div class="form-group">
                    <label>Назва</label>
                    <input type="text" id="edit-name" class="input-main" readonly>
                </div>
                <div class="form-group">
                    <label>Артикул</label>
                    <input type="text" id="edit-article" class="input-main" placeholder="Введіть артикул...">
                </div>
                <div class="form-group">
                    <label>Резерв</label>
                    <select id="edit-reserve" class="input-main">
                        <option value="">Не зарезервовано</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="edit-status">
                            <span>Викладено</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="edit-check">
                            <span>Перевірено</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="edit-payment">
                            <span>Оплачено</span>
                        </label>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" data-modal-close>Скасувати</button>
                <button class="btn btn-primary" id="edit-save-btn">
                    <span class="material-symbols-outlined">save</span>
                    <span class="label">Зберегти</span>
                </button>
            </div>
        </div>
    `;

    // Event listeners
    modal.querySelectorAll('[data-modal-close]').forEach(el => {
        el.addEventListener('click', closeEditModal);
    });

    modal.querySelector('#edit-save-btn').addEventListener('click', saveChanges);

    return modal;
}

/**
 * Заповнити модал даними
 */
function fillModalData(item) {
    document.getElementById('edit-code').value = item.code || '';
    document.getElementById('edit-name').value = item.name || '';
    document.getElementById('edit-article').value = item.article || '';

    // Статуси
    document.getElementById('edit-status').checked = item.status === 'TRUE' || item.status === true;
    document.getElementById('edit-check').checked = item.check === 'TRUE' || item.check === true;
    document.getElementById('edit-payment').checked = item.payment === 'TRUE' || item.payment === true;

    // Резерв - заповнюємо опції
    const reserveSelect = document.getElementById('edit-reserve');
    reserveSelect.innerHTML = '<option value="">Не зарезервовано</option>';

    // Додаємо унікальні резерви
    priceState.reserveNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        reserveSelect.appendChild(option);
    });

    // Встановлюємо поточне значення
    reserveSelect.value = item.reserve || '';
}

/**
 * Зберегти зміни
 */
async function saveChanges() {
    if (!currentItem) return;

    const saveBtn = document.getElementById('edit-save-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = `
        <span class="material-symbols-outlined rotating">progress_activity</span>
        <span class="label">Збереження...</span>
    `;

    try {
        const code = currentItem.code;

        // Артикул
        const newArticle = document.getElementById('edit-article').value.trim();
        if (newArticle !== currentItem.article) {
            await updateItemArticle(code, newArticle);
        }

        // Резерв
        const newReserve = document.getElementById('edit-reserve').value;
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

    } catch (error) {
        console.error('Error saving:', error);
        alert('Помилка збереження: ' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `
            <span class="material-symbols-outlined">save</span>
            <span class="label">Зберегти</span>
        `;
    }
}
