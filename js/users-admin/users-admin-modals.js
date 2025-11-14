// js/users-admin/users-admin-modals.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            USERS ADMIN - MODALS MODULE                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за відображення модальних вікон для CRUD операцій з користувачами.
 * Використовує програмне створення модалок (без HTML шаблонів).
 */

import { usersAdminState } from './users-admin-init.js';
import { renderUsersTable } from './users-admin-manage.js';

let modalWrapper = null;

/**
 * Ініціалізує систему модальних вікон
 */
export function initModals() {
    createModalStructure();

    // Слухати кастомні події для відкриття модалок
    document.addEventListener('open-add-user-modal', () => openAddUserModal());
    document.addEventListener('open-edit-user-modal', (e) => openEditUserModal(e.detail.user));
    document.addEventListener('open-delete-user-modal', (e) => openDeleteUserModal(e.detail.user));
    document.addEventListener('open-reset-password-modal', (e) => openResetPasswordModal(e.detail.user));

    console.log('✅ Модальні вікна для Users Admin ініціалізовані');
}

/**
 * Створює структуру модального вікна
 */
function createModalStructure() {
    if (document.getElementById('users-admin-modal-wrapper')) return;

    modalWrapper = document.createElement('div');
    modalWrapper.id = 'users-admin-modal-wrapper';
    modalWrapper.className = 'modal-overlay';
    modalWrapper.style.display = 'none';
    modalWrapper.innerHTML = `
        <div class="modal-container" role="dialog" aria-modal="true">
            <div class="modal-header">
                <h2 class="modal-title"></h2>
                <button class="btn-icon" id="modal-close-btn" aria-label="Закрити">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="modal-body"></div>
            <div class="modal-footer">
                <button class="btn-secondary" id="modal-cancel-btn">Скасувати</button>
                <button class="btn-primary" id="modal-submit-btn">Зберегти</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalWrapper);

    // Закриття по кліку на backdrop
    modalWrapper.addEventListener('click', (e) => {
        if (e.target === modalWrapper) {
            closeModal();
        }
    });

    // Закриття по кнопці
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
}

/**
 * Закриває модальне вікно
 */
function closeModal() {
    if (modalWrapper) {
        modalWrapper.style.display = 'none';
        modalWrapper.querySelector('.modal-body').innerHTML = '';
    }
}

/**
 * Показує модальне вікно
 */
function showModal() {
    if (modalWrapper) {
        modalWrapper.style.display = 'flex';
    }
}

// =========================================================================
// МОДАЛКА: ДОДАВАННЯ КОРИСТУВАЧА
// =========================================================================

/**
 * Відкриває модалку додавання користувача
 */
function openAddUserModal() {
    console.log('📝 openAddUserModal() викликано');
    console.log('modalWrapper:', modalWrapper);

    const titleEl = modalWrapper.querySelector('.modal-title');
    const bodyEl = modalWrapper.querySelector('.modal-body');
    const submitBtn = document.getElementById('modal-submit-btn');

    titleEl.textContent = 'Додати користувача';
    bodyEl.innerHTML = `
        <form id="add-user-form" class="modal-form">
            <div class="form-group">
                <label for="add-username">Ім'я користувача <span class="required">*</span></label>
                <input type="text" id="add-username" class="form-input" required minlength="3" placeholder="username123">
            </div>

            <div class="form-group">
                <label for="add-password">Пароль <span class="required">*</span></label>
                <input type="password" id="add-password" class="form-input" required minlength="6" placeholder="Мінімум 6 символів">
            </div>

            <div class="form-group">
                <label for="add-role">Роль <span class="required">*</span></label>
                <select id="add-role" class="form-input" required>
                    <option value="">Оберіть роль...</option>
                    <option value="viewer">Viewer (тільки читання)</option>
                    <option value="editor">Editor (читання + запис)</option>
                    <option value="admin">Admin (повний доступ)</option>
                </select>
            </div>
        </form>
    `;

    submitBtn.textContent = 'Створити';
    submitBtn.onclick = handleAddUser;

    showModal();
}

/**
 * Обробляє створення нового користувача
 */
async function handleAddUser() {
    const form = document.getElementById('add-user-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const username = document.getElementById('add-username').value.trim();
    const password = document.getElementById('add-password').value;
    const role = document.getElementById('add-role').value;

    try {
        const submitBtn = document.getElementById('modal-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Створення...';

        const response = await window.apiClient.post('/api/users', {
            action: 'create',
            username,
            password,
            role
        });

        if (response.success) {
            console.log('✅ Користувача створено:', response.user);

            // Додати нового користувача до state
            usersAdminState.users.push(response.user);
            usersAdminState.pagination.totalItems = usersAdminState.users.length;

            // Оновити пагінацію
            if (usersAdminState.paginationAPI) {
                usersAdminState.paginationAPI.updateTotalItems(usersAdminState.users.length);
            }

            // Перерендерити таблицю
            await renderUsersTable();

            closeModal();
            showToast('Користувача успішно створено', 'success');
        } else {
            throw new Error(response.error || 'Failed to create user');
        }
    } catch (error) {
        console.error('❌ Помилка створення користувача:', error);
        showToast(error.message || 'Не вдалося створити користувача', 'error');
    } finally {
        const submitBtn = document.getElementById('modal-submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Створити';
    }
}

// =========================================================================
// МОДАЛКА: РЕДАГУВАННЯ КОРИСТУВАЧА
// =========================================================================

/**
 * Відкриває модалку редагування користувача
 */
function openEditUserModal(user) {
    console.log('✏️ openEditUserModal() викликано для користувача:', user);
    console.log('modalWrapper:', modalWrapper);

    const titleEl = modalWrapper.querySelector('.modal-title');
    const bodyEl = modalWrapper.querySelector('.modal-body');
    const submitBtn = document.getElementById('modal-submit-btn');

    titleEl.textContent = 'Редагувати користувача';
    bodyEl.innerHTML = `
        <form id="edit-user-form" class="modal-form">
            <input type="hidden" id="edit-user-id" value="${user.id}">

            <div class="form-group">
                <label for="edit-username">Ім'я користувача <span class="required">*</span></label>
                <input type="text" id="edit-username" class="form-input" required minlength="3" value="${escapeHtml(user.username)}">
            </div>

            <div class="form-group">
                <label for="edit-role">Роль <span class="required">*</span></label>
                <select id="edit-role" class="form-input" required>
                    <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>Viewer (тільки читання)</option>
                    <option value="editor" ${user.role === 'editor' ? 'selected' : ''}>Editor (читання + запис)</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin (повний доступ)</option>
                </select>
            </div>
        </form>
    `;

    submitBtn.textContent = 'Зберегти';
    submitBtn.onclick = handleEditUser;

    showModal();
}

/**
 * Обробляє оновлення користувача
 */
async function handleEditUser() {
    const form = document.getElementById('edit-user-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = document.getElementById('edit-user-id').value;
    const username = document.getElementById('edit-username').value.trim();
    const role = document.getElementById('edit-role').value;

    try {
        const submitBtn = document.getElementById('modal-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Збереження...';

        const response = await window.apiClient.put('/api/users', {
            id,
            username,
            role
        });

        if (response.success) {
            console.log('✅ Користувача оновлено:', response.user);

            // Оновити користувача в state
            const userIndex = usersAdminState.users.findIndex(u => u.id === id);
            if (userIndex !== -1) {
                usersAdminState.users[userIndex] = {
                    ...usersAdminState.users[userIndex],
                    username: response.user.username,
                    role: response.user.role
                };
            }

            // Перерендерити таблицю
            await renderUsersTable();

            closeModal();
            showToast('Дані користувача оновлено', 'success');
        } else {
            throw new Error(response.error || 'Failed to update user');
        }
    } catch (error) {
        console.error('❌ Помилка оновлення користувача:', error);
        showToast(error.message || 'Не вдалося оновити користувача', 'error');
    } finally {
        const submitBtn = document.getElementById('modal-submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Зберегти';
    }
}

// =========================================================================
// МОДАЛКА: ВИДАЛЕННЯ КОРИСТУВАЧА
// =========================================================================

/**
 * Відкриває модалку видалення користувача
 */
function openDeleteUserModal(user) {
    const titleEl = modalWrapper.querySelector('.modal-title');
    const bodyEl = modalWrapper.querySelector('.modal-body');
    const submitBtn = document.getElementById('modal-submit-btn');

    titleEl.textContent = 'Видалити користувача';
    bodyEl.innerHTML = `
        <div class="modal-form">
            <input type="hidden" id="delete-user-id" value="${user.id}">
            <p style="margin: 0 0 16px 0;">Ви впевнені що хочете видалити користувача <strong>${escapeHtml(user.username)}</strong>?</p>
            <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">Цю дію неможливо відмінити.</p>
        </div>
    `;

    submitBtn.textContent = 'Видалити';
    submitBtn.className = 'btn-error';
    submitBtn.onclick = handleDeleteUser;

    // Зробити Cancel кнопку primary
    const cancelBtn = document.getElementById('modal-cancel-btn');
    cancelBtn.className = 'btn-primary';

    showModal();

    // Повернути класи назад при закритті
    modalWrapper.addEventListener('click', resetButtonStyles, { once: true });
}

/**
 * Обробляє видалення користувача
 */
async function handleDeleteUser() {
    const id = document.getElementById('delete-user-id').value;

    try {
        const submitBtn = document.getElementById('modal-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Видалення...';

        const response = await window.apiClient.delete('/api/users', { id });

        if (response.success) {
            console.log('✅ Користувача видалено');

            // Видалити користувача з state
            usersAdminState.users = usersAdminState.users.filter(u => u.id !== id);
            usersAdminState.pagination.totalItems = usersAdminState.users.length;

            // Оновити пагінацію
            if (usersAdminState.paginationAPI) {
                usersAdminState.paginationAPI.updateTotalItems(usersAdminState.users.length);
            }

            // Перерендерити таблицю
            await renderUsersTable();

            closeModal();
            resetButtonStyles();
            showToast('Користувача видалено', 'success');
        } else {
            throw new Error(response.error || 'Failed to delete user');
        }
    } catch (error) {
        console.error('❌ Помилка видалення користувача:', error);
        showToast(error.message || 'Не вдалося видалити користувача', 'error');
    } finally {
        const submitBtn = document.getElementById('modal-submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Видалити';
    }
}

// =========================================================================
// МОДАЛКА: СКИДАННЯ ПАРОЛЯ
// =========================================================================

/**
 * Відкриває модалку скидання пароля
 */
function openResetPasswordModal(user) {
    const titleEl = modalWrapper.querySelector('.modal-title');
    const bodyEl = modalWrapper.querySelector('.modal-body');
    const submitBtn = document.getElementById('modal-submit-btn');

    titleEl.textContent = 'Скинути пароль';
    bodyEl.innerHTML = `
        <form id="reset-password-form" class="modal-form">
            <input type="hidden" id="reset-user-id" value="${user.id}">

            <p style="margin: 0 0 16px 0;">Скидання пароля для користувача <strong>${escapeHtml(user.username)}</strong></p>

            <div class="form-group">
                <label for="reset-new-password">Новий пароль <span class="required">*</span></label>
                <input type="password" id="reset-new-password" class="form-input" required minlength="6" placeholder="Мінімум 6 символів">
            </div>

            <div class="form-group">
                <label for="reset-confirm-password">Підтвердити пароль <span class="required">*</span></label>
                <input type="password" id="reset-confirm-password" class="form-input" required minlength="6" placeholder="Повторіть пароль">
            </div>
        </form>
    `;

    submitBtn.textContent = 'Скинути пароль';
    submitBtn.onclick = handleResetPassword;

    showModal();
}

/**
 * Обробляє скидання пароля
 */
async function handleResetPassword() {
    const form = document.getElementById('reset-password-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = document.getElementById('reset-user-id').value;
    const newPassword = document.getElementById('reset-new-password').value;
    const confirmPassword = document.getElementById('reset-confirm-password').value;

    // Перевірка збігу паролів
    if (newPassword !== confirmPassword) {
        showToast('Паролі не збігаються', 'error');
        return;
    }

    try {
        const submitBtn = document.getElementById('modal-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Скидання...';

        const response = await window.apiClient.post('/api/users', {
            action: 'reset-password',
            id,
            newPassword
        });

        if (response.success) {
            console.log('✅ Пароль скинуто');

            closeModal();
            showToast('Пароль успішно скинуто', 'success');
        } else {
            throw new Error(response.error || 'Failed to reset password');
        }
    } catch (error) {
        console.error('❌ Помилка скидання пароля:', error);
        showToast(error.message || 'Не вдалося скинути пароль', 'error');
    } finally {
        const submitBtn = document.getElementById('modal-submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Скинути пароль';
    }
}

// =========================================================================
// УТИЛІТИ
// =========================================================================

/**
 * Повертає стилі кнопок до початкового стану
 */
function resetButtonStyles() {
    const submitBtn = document.getElementById('modal-submit-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');

    if (submitBtn) submitBtn.className = 'btn-primary';
    if (cancelBtn) cancelBtn.className = 'btn-secondary';
}

/**
 * Екранує HTML спецсимволи
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Показує toast повідомлення
 */
function showToast(message, type = 'info') {
    // TODO: Використати глобальну систему toast якщо є
    console.log(`[${type.toUpperCase()}] ${message}`);
    alert(message);
}
