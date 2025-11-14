// js/users-admin/users-admin-modals.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            USERS ADMIN - MODALS MODULE                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за відображення модальних вікон для CRUD операцій з користувачами.
 * Використовує глобальну систему модалок через ui-modal.js та HTML шаблони.
 */

import { usersAdminState } from './users-admin-init.js';
import { renderUsersTable } from './users-admin-manage.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';

/**
 * Ініціалізує систему модальних вікон
 */
export function initModals() {
    // Слухати кастомні події для відкриття модалок
    document.addEventListener('open-add-user-modal', () => openAddUserModal());
    document.addEventListener('open-edit-user-modal', (e) => openEditUserModal(e.detail.user));

    // Слухати подію відкриття модалу для ініціалізації обробників
    document.addEventListener('modal-opened', handleModalOpened);

    console.log('✅ Модальні вікна для Users Admin ініціалізовані');
}

/**
 * Обробляє подію відкриття модалу
 */
function handleModalOpened(event) {
    const { modalId } = event.detail;

    if (modalId === 'user-add') {
        initAddUserHandlers();
    } else if (modalId === 'user-edit') {
        initEditUserHandlers();
    } else if (modalId === 'user-reset-password') {
        initResetPasswordHandlers();
    }
}

// =========================================================================
// МОДАЛКА: ДОДАВАННЯ КОРИСТУВАЧА
// =========================================================================

/**
 * Відкриває модалку додавання користувача
 */
async function openAddUserModal() {
    await showModal('user-add');
}

/**
 * Ініціалізує обробники для модалки додавання
 */
function initAddUserHandlers() {
    const saveBtn = document.getElementById('save-user');
    if (!saveBtn) return;

    saveBtn.onclick = handleAddUser;
}

/**
 * Обробляє створення нового користувача
 */
async function handleAddUser() {
    const username = document.getElementById('add-username').value.trim();
    const password = document.getElementById('add-password').value;
    const role = document.getElementById('add-role').value;

    // Валідація
    if (!username || !password || !role) {
        showToast('Заповніть всі обов\'язкові поля', 'error');
        return;
    }

    try {
        const saveBtn = document.getElementById('save-user');
        const originalText = saveBtn.querySelector('.label').textContent;
        saveBtn.disabled = true;
        saveBtn.querySelector('.label').textContent = 'Створення...';

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
        const saveBtn = document.getElementById('save-user');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.querySelector('.label').textContent = 'Створити';
        }
    }
}

// =========================================================================
// МОДАЛКА: РЕДАГУВАННЯ КОРИСТУВАЧА
// =========================================================================

let currentEditUser = null;

/**
 * Відкриває модалку редагування користувача
 */
async function openEditUserModal(user) {
    currentEditUser = user;
    await showModal('user-edit');

    // Заповнити поля даними користувача
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-username').value = user.username;
    document.getElementById('edit-role').value = user.role;
}

/**
 * Ініціалізує обробники для модалки редагування
 */
function initEditUserHandlers() {
    const saveBtn = document.getElementById('save-user-edit');
    const resetPasswordBtn = document.getElementById('reset-user-password');
    const deleteBtn = document.getElementById('delete-user');

    if (saveBtn) saveBtn.onclick = handleEditUser;
    if (resetPasswordBtn) resetPasswordBtn.onclick = () => openResetPasswordModal(currentEditUser);
    if (deleteBtn) deleteBtn.onclick = () => handleDeleteUser(currentEditUser);
}

/**
 * Обробляє оновлення користувача
 */
async function handleEditUser() {
    const id = document.getElementById('edit-user-id').value;
    const username = document.getElementById('edit-username').value.trim();
    const role = document.getElementById('edit-role').value;

    // Валідація
    if (!username || !role) {
        showToast('Заповніть всі обов\'язкові поля', 'error');
        return;
    }

    try {
        const saveBtn = document.getElementById('save-user-edit');
        saveBtn.disabled = true;
        saveBtn.querySelector('.label').textContent = 'Збереження...';

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
        const saveBtn = document.getElementById('save-user-edit');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.querySelector('.label').textContent = 'Зберегти';
        }
    }
}

// =========================================================================
// МОДАЛКА: ЗМІНА ПАРОЛЯ
// =========================================================================

/**
 * Відкриває модалку зміни пароля
 */
async function openResetPasswordModal(user) {
    await showModal('user-reset-password');

    // Заповнити дані
    document.getElementById('reset-password-user-id').value = user.id;
    document.getElementById('reset-password-username').textContent = user.username;
    document.getElementById('reset-new-password').value = '';
    document.getElementById('reset-confirm-password').value = '';
}

/**
 * Ініціалізує обробники для модалки зміни пароля
 */
function initResetPasswordHandlers() {
    const saveBtn = document.getElementById('save-password-reset');
    if (!saveBtn) return;

    saveBtn.onclick = handleResetPassword;
}

/**
 * Обробляє зміну пароля
 */
async function handleResetPassword() {
    const id = document.getElementById('reset-password-user-id').value;
    const newPassword = document.getElementById('reset-new-password').value;
    const confirmPassword = document.getElementById('reset-confirm-password').value;

    // Валідація
    if (!newPassword || !confirmPassword) {
        showToast('Заповніть всі поля', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('Паролі не збігаються', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showToast('Пароль має бути мінімум 6 символів', 'error');
        return;
    }

    try {
        const saveBtn = document.getElementById('save-password-reset');
        saveBtn.disabled = true;
        saveBtn.querySelector('.label').textContent = 'Зміна...';

        const response = await window.apiClient.put('/api/users', {
            id,
            newPassword
        });

        if (response.success) {
            console.log('✅ Пароль змінено');

            closeModal();
            showToast('Пароль успішно змінено', 'success');
        } else {
            throw new Error(response.error || 'Failed to reset password');
        }
    } catch (error) {
        console.error('❌ Помилка зміни пароля:', error);
        showToast(error.message || 'Не вдалося змінити пароль', 'error');
    } finally {
        const saveBtn = document.getElementById('save-password-reset');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.querySelector('.label').textContent = 'Змінити пароль';
        }
    }
}

// =========================================================================
// ВИДАЛЕННЯ КОРИСТУВАЧА
// =========================================================================

/**
 * Обробляє видалення користувача
 */
async function handleDeleteUser(user) {
    const { showConfirmModal } = await import('../common/ui-modal.js');

    const confirmed = await showConfirmModal({
        title: 'Видалити користувача?',
        message: `Ви впевнені що хочете видалити користувача <strong>${user.username}</strong>? Цю дію неможливо відмінити.`,
        confirmText: 'Видалити',
        cancelText: 'Скасувати',
        confirmClass: 'btn-danger'
    });

    if (!confirmed) return;

    try {
        const response = await window.apiClient.delete('/api/users', { id: user.id });

        if (response.success) {
            console.log('✅ Користувача видалено');

            // Видалити з state
            usersAdminState.users = usersAdminState.users.filter(u => u.id !== user.id);
            usersAdminState.pagination.totalItems = usersAdminState.users.length;

            // Оновити пагінацію
            if (usersAdminState.paginationAPI) {
                usersAdminState.paginationAPI.updateTotalItems(usersAdminState.users.length);
            }

            // Перерендерити таблицю
            await renderUsersTable();

            closeModal();
            showToast('Користувача видалено', 'success');
        } else {
            throw new Error(response.error || 'Failed to delete user');
        }
    } catch (error) {
        console.error('❌ Помилка видалення користувача:', error);
        showToast(error.message || 'Не вдалося видалити користувача', 'error');
    }
}
