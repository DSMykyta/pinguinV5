// js/pages/price/price-edit-modal.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE EDIT MODAL                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Модал редагування товару прайсу з резервуванням            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { priceState } from './price-state.js';
import { updateItemStatus, updateItemArticle, reserveItem } from './price-data.js';
import { showToast } from '../../components/feedback/toast.js';
import { initDropdowns } from '../../components/forms/dropdown.js';
import { renderAvatar, getAvatarPath } from '../../components/avatar/avatar-user.js';
import { getInitials, getAvatarColor } from '../../components/avatar/avatar-text.js';

/** Plugin init */
export function init(state) { }

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
    modal.classList.add('open');
    document.body.classList.add('modal-open');
}

/**
 * Закрити модал
 */
export function closeEditModal() {
    const modal = document.getElementById('price-edit-modal');
    if (modal) {
        modal.classList.remove('open');
        document.body.classList.remove('modal-open');
    }
    currentItem = null;
}

/**
 * Отримати аватар користувача з usersMap або fallback на ініціали
 */
function getUserAvatar(displayName, size = 'sm') {
    // Перевіряємо чи є користувач в мапі
    const userAvatar = priceState.usersMap?.[displayName];

    if (userAvatar) {
        const avatarPath = getAvatarPath(userAvatar, 'calm');
        return `<img src="${avatarPath}" alt="${displayName}" class="avatar avatar-${size}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">`;
    }

    // Fallback на ініціали
    const initials = getInitials(displayName);
    const color = getAvatarColor(displayName);
    return `<span class="avatar avatar-${size}" style="background-color: ${color}; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; width: 24px; height: 24px; border-radius: 50%;">${initials}</span>`;
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
                <div class="group">
                    <div class="group">
                        <!-- Reserve dropdown -->
                        <div class="dropdown-wrapper">
                            <button type="button" class="btn-icon" id="reserve-dropdown-trigger" data-dropdown-trigger
                                aria-label="Змінити резерв">
                                <span id="reserve-trigger-content">
                                    <span class="material-symbols-outlined">person</span>
                                </span>
                            </button>
                            <div class="dropdown-panel" id="reserve-dropdown-panel" style="min-width: 160px;">
                                <button class="dropdown-option" data-reserve-value="" title="Зняти резерв">
                                    <span class="material-symbols-outlined">person_off</span>
                                    <span>Не зарезервовано</span>
                                </button>
                                <div class="dropdown-separator"></div>
                                <div id="reserve-users-list"></div>
                            </div>
                        </div>

                        <!-- Save button -->
                        <button id="edit-save-btn" class="btn-icon" aria-label="Зберегти">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">save</span>
                            </div>
                        </button>

                        <!-- Close button -->
                        <button class="btn-icon" data-modal-close aria-label="Закрити">
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

                <div class="grid">
                    <!-- Left column: editable fields -->
                    <div class="col-6" style="display: flex; flex-direction: column; gap: 16px;">
                        <div class="group column">
                            <label for="edit-article">Артикул</label>
                            <input type="text" id="edit-article" class="input-main" placeholder="Введіть артикул...">
                        </div>
                        <div class="group column">
                            <label for="edit-brand">Бренд</label>
                            <input type="text" id="edit-brand" class="input-main" placeholder="Бренд">
                        </div>
                        <div class="group column">
                            <label for="edit-name">Назва</label>
                            <input type="text" id="edit-name" class="input-main" placeholder="Назва товару">
                        </div>
                        <div class="group column">
                            <label for="edit-category">Категорія</label>
                            <input type="text" id="edit-category" class="input-main" placeholder="Категорія">
                        </div>
                        <div class="group column">
                            <label for="edit-packaging">Фасування</label>
                            <input type="text" id="edit-packaging" class="input-main" placeholder="Фасування">
                        </div>
                        <div class="group column">
                            <label for="edit-flavor">Смак</label>
                            <input type="text" id="edit-flavor" class="input-main" placeholder="Смак">
                        </div>
                    </div>

                    <!-- Right column: toggle switches -->
                    <div class="col-6" style="display: flex; flex-direction: column; gap: 16px;">
                        <div class="group column">
                            <label>Викладено</label>
                            <div class="switch switch-outline switch-fit">
                                <input type="radio" id="edit-status-off" name="edit-status" value="FALSE" checked>
                                <label for="edit-status-off" class="switch-label">Ні</label>
                                <input type="radio" id="edit-status-on" name="edit-status" value="TRUE">
                                <label for="edit-status-on" class="switch-label">Так</label>
                            </div>
                        </div>
                        <div class="group column">
                            <label>Перевірено</label>
                            <div class="switch switch-outline switch-fit">
                                <input type="radio" id="edit-check-off" name="edit-check" value="FALSE" checked>
                                <label for="edit-check-off" class="switch-label">Ні</label>
                                <input type="radio" id="edit-check-on" name="edit-check" value="TRUE">
                                <label for="edit-check-on" class="switch-label">Так</label>
                            </div>
                        </div>
                        <div class="group column">
                            <label>Оплачено</label>
                            <div class="switch switch-outline switch-fit">
                                <input type="radio" id="edit-payment-off" name="edit-payment" value="FALSE" checked>
                                <label for="edit-payment-off" class="switch-label">Ні</label>
                                <input type="radio" id="edit-payment-on" name="edit-payment" value="TRUE">
                                <label for="edit-payment-on" class="switch-label">Так</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="modal-footer">
                <span class="text-muted" id="edit-footer-code"></span>
                <span class="text-muted" id="edit-footer-date" style="margin-left: auto;"></span>
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
                dropdown.closest('.dropdown-wrapper')?.querySelector('.dropdown-panel')?.classList.remove('open');
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
        triggerContent.innerHTML = getUserAvatar(value, 'sm');
    } else {
        triggerContent.innerHTML = `<span class="material-symbols-outlined">person_off</span>`;
    }

    // Оновити активний стан в dropdown
    document.querySelectorAll('#reserve-dropdown-panel [data-reserve-value]').forEach(item => {
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

    // Editable fields
    document.getElementById('edit-article').value = item.article || '';
    document.getElementById('edit-brand').value = item.brand || '';
    document.getElementById('edit-name').value = item.name || '';
    document.getElementById('edit-category').value = item.category || '';
    document.getElementById('edit-packaging').value = item.packaging || '';
    document.getElementById('edit-flavor').value = item.flavor || '';

    // Toggles (radio switches)
    const setSwitch = (name, value) => {
        const isTrue = value === 'TRUE' || value === true;
        const radio = document.getElementById(`${name}-${isTrue ? 'on' : 'off'}`);
        if (radio) radio.checked = true;
    };
    setSwitch('edit-status', item.status);
    setSwitch('edit-check', item.check);
    setSwitch('edit-payment', item.payment);

    // Reserve dropdown - populate users
    const usersList = document.getElementById('reserve-users-list');
    if (usersList) {
        usersList.innerHTML = priceState.reserveNames.map(name => {
            return `
                <button class="dropdown-option" data-reserve-value="${name}" title="${name}">
                    ${getUserAvatar(name, 'sm')}
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

        // Збираємо всі поля для оновлення
        const updates = {};

        // Артикул
        const newArticle = document.getElementById('edit-article').value.trim();
        if (newArticle !== (currentItem.article || '')) {
            updates.article = newArticle;
        }

        // Інші поля
        const newBrand = document.getElementById('edit-brand').value.trim();
        if (newBrand !== (currentItem.brand || '')) {
            updates.brand = newBrand;
        }

        const newName = document.getElementById('edit-name').value.trim();
        if (newName !== (currentItem.name || '')) {
            updates.name = newName;
        }

        const newCategory = document.getElementById('edit-category').value.trim();
        if (newCategory !== (currentItem.category || '')) {
            updates.category = newCategory;
        }

        const newPackaging = document.getElementById('edit-packaging').value.trim();
        if (newPackaging !== (currentItem.packaging || '')) {
            updates.packaging = newPackaging;
        }

        const newFlavor = document.getElementById('edit-flavor').value.trim();
        if (newFlavor !== (currentItem.flavor || '')) {
            updates.flavor = newFlavor;
        }

        // Оновлюємо поля якщо є зміни
        if (Object.keys(updates).length > 0) {
            const { updateItemFields } = await import('./price-data.js');
            await updateItemFields(code, updates);
        }

        // Резерв
        const newReserve = document.getElementById('edit-reserve-value').value;
        if (newReserve !== (currentItem.reserve || '')) {
            await reserveItem(code, newReserve);
        }

        // Статуси (radio switches)
        const getSwitch = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value || 'FALSE';

        const newStatus = getSwitch('edit-status');
        const currentStatus = (currentItem.status === 'TRUE' || currentItem.status === true) ? 'TRUE' : 'FALSE';
        if (newStatus !== currentStatus) {
            await updateItemStatus(code, 'status', newStatus);
        }

        const newCheck = getSwitch('edit-check');
        const currentCheck = (currentItem.check === 'TRUE' || currentItem.check === true) ? 'TRUE' : 'FALSE';
        if (newCheck !== currentCheck) {
            await updateItemStatus(code, 'check', newCheck);
        }

        const newPayment = getSwitch('edit-payment');
        const currentPayment = (currentItem.payment === 'TRUE' || currentItem.payment === true) ? 'TRUE' : 'FALSE';
        if (newPayment !== currentPayment) {
            await updateItemStatus(code, 'payment', newPayment);
        }

        // Тільки рядки - заголовок з dropdown-ами НЕ чіпаємо!
        const { renderPriceTableRowsOnly } = await import('./price-table.js');
        await renderPriceTableRowsOnly();

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
