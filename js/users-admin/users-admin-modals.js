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
import { renderAvatarSelector, getAvailableAvatars } from '../utils/avatar-loader.js';
import { populateSelect, initCustomSelects } from '../common/ui-select.js';

// =========================================================================
// HELPER: ЗАВАНТАЖЕННЯ РОЛЕЙ
// =========================================================================

/**
 * Завантажує доступні ролі з API
 * @returns {Array} Масив ролей
 */
async function loadAvailableRoles() {
    try {
        const response = await window.apiClient.get('/api/roles');

        if (response.success && response.roles) {
            return response.roles.map(role => ({
                id: role.role_id,
                name: `${role.role_name}${role.role_description ? ' - ' + role.role_description : ''}`,
                description: role.role_description
            }));
        }

        console.warn('⚠️ Не вдалося завантажити ролі, використовуємо дефолтні');
        return [
            { id: 'admin', name: 'Admin (повний доступ)', description: 'Повний доступ до всіх функцій' },
            { id: 'editor', name: 'Editor (читання + запис)', description: 'Може читати та редагувати контент' },
            { id: 'viewer', name: 'Viewer (тільки читання)', description: 'Тільки перегляд контенту' }
        ];
    } catch (error) {
        console.error('❌ Помилка завантаження ролей:', error);
        return [
            { id: 'admin', name: 'Admin (повний доступ)', description: 'Повний доступ до всіх функцій' },
            { id: 'editor', name: 'Editor (читання + запис)', description: 'Може читати та редагувати контент' },
            { id: 'viewer', name: 'Viewer (тільки читання)', description: 'Тільки перегляд контенту' }
        ];
    }
}

/**
 * Рендерить опції ролей в select елемент використовуючи кастомний селект
 * @param {string} selectId - ID селекту
 * @param {string|null} selectedValue - Поточне вибране значення
 */
async function renderRoleOptions(selectId, selectedValue = null) {
    const roles = await loadAvailableRoles();

    // Підготувати дані для populateSelect
    const items = roles.map(role => ({
        value: role.id,
        text: role.name
    }));

    // Заповнити селект та реініціалізувати custom select
    populateSelect(selectId, items, {
        placeholder: '-- Оберіть роль --',
        selectedValue: selectedValue,
        reinit: true
    });

    console.log(`✅ Ролі завантажено в #${selectId}:`, roles.map(r => r.id).join(', '));
}

/**
 * Ініціалізує систему модальних вікон
 */
export function initModals() {
    // Слухати кастомні події для відкриття модалок
    document.addEventListener('open-user-modal', (e) => openUserModal(e.detail?.user || null));

    // Слухати подію відкриття модалу для ініціалізації обробників
    document.addEventListener('modal-opened', handleModalOpened);

    console.log('✅ Модальні вікна для Users Admin ініціалізовані');
}

/**
 * Обробляє подію відкриття модалу
 */
function handleModalOpened(event) {
    const { modalId } = event.detail;

    if (modalId === 'user-modal') {
        initUserModalHandlers();
    } else if (modalId === 'user-reset-password') {
        initResetPasswordHandlers();
    }
}

// =========================================================================
// МОДАЛКА: КОРИСТУВАЧ (СТВОРЕННЯ / РЕДАГУВАННЯ)
// =========================================================================

let currentEditUser = null;

/**
 * Відкриває модалку для створення або редагування користувача
 * @param {Object|null} userData - Дані користувача для редагування (null для створення)
 */
async function openUserModal(userData = null) {
    const isEdit = !!userData;
    currentEditUser = userData;

    console.log(isEdit ? '✏️ Редагування користувача' : '➕ Створення користувача');

    // Відкрити модал
    await showModal('user-modal');

    // Змінити заголовок
    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) {
        modalTitle.textContent = isEdit ? 'Редагувати користувача' : 'Додати користувача';
    }

    // Змінити текст кнопки збереження
    const saveBtn = document.getElementById('save-user');
    if (saveBtn) {
        saveBtn.querySelector('.label').textContent = isEdit ? 'Зберегти' : 'Створити';
    }

    // Умовне відображення елементів
    const passwordField = document.getElementById('password-field-group');
    const resetPasswordBtn = document.getElementById('reset-user-password');
    const deleteBtn = document.getElementById('delete-user');

    if (isEdit) {
        // Режим редагування
        passwordField.style.display = 'none';
        resetPasswordBtn.style.display = '';
        deleteBtn.style.display = '';

        // Заповнити дані
        document.getElementById('user-id').value = userData.id;
        document.getElementById('user-display-name').value = userData.display_name || '';
        document.getElementById('user-username').value = userData.username;
        document.getElementById('user-role').value = userData.role;
        document.getElementById('selected-avatar').value = userData.avatar || '';
    } else {
        // Режим створення
        passwordField.style.display = '';
        resetPasswordBtn.style.display = 'none';
        deleteBtn.style.display = 'none';

        // Очистити форму
        document.getElementById('user-id').value = '';
        document.getElementById('user-display-name').value = '';
        document.getElementById('user-username').value = '';
        document.getElementById('user-password').value = '';
        document.getElementById('user-role').value = '';
        document.getElementById('selected-avatar').value = '';
    }
}

/**
 * Ініціалізує обробники для модалки користувача
 */
async function initUserModalHandlers() {
    const isEdit = !!currentEditUser;

    const saveBtn = document.getElementById('save-user');
    const resetPasswordBtn = document.getElementById('reset-user-password');
    const deleteBtn = document.getElementById('delete-user');

    // Головна кнопка збереження
    if (saveBtn) {
        saveBtn.onclick = () => isEdit ? handleEditUser() : handleCreateUser();
    }

    // Кнопки тільки для режиму редагування
    if (isEdit) {
        if (resetPasswordBtn) resetPasswordBtn.onclick = () => openResetPasswordModal(currentEditUser);
        if (deleteBtn) deleteBtn.onclick = () => handleDeleteUser(currentEditUser);
    }

    // Ініціалізувати селектор аватарів
    const currentAvatar = isEdit ? (currentEditUser.avatar || null) : null;
    renderAvatarSelector(currentAvatar, 'avatar-selector');

    // Динамічно завантажити опції ролей
    const currentRole = isEdit ? currentEditUser.role : null;
    await renderRoleOptions('user-role', currentRole);
}

/**
 * Обробляє створення нового користувача
 */
async function handleCreateUser() {
    const username = document.getElementById('user-username').value.trim();
    const password = document.getElementById('user-password').value;
    const role = document.getElementById('user-role').value;
    const displayName = document.getElementById('user-display-name').value.trim();
    const avatar = document.getElementById('selected-avatar').value;

    // Валідація
    if (!username || !password || !role) {
        showToast('Заповніть всі обов\'язкові поля', 'error');
        return;
    }

    try {
        const saveBtn = document.getElementById('save-user');
        saveBtn.disabled = true;
        saveBtn.querySelector('.label').textContent = 'Створення...';

        const response = await window.apiClient.post('/api/users', {
            action: 'create',
            username,
            password,
            role,
            displayName,
            avatar
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

/**
 * Обробляє оновлення користувача
 */
async function handleEditUser() {
    const id = document.getElementById('user-id').value;
    const username = document.getElementById('user-username').value.trim();
    const role = document.getElementById('user-role').value;
    const displayName = document.getElementById('user-display-name').value.trim();
    const avatar = document.getElementById('selected-avatar').value;

    // Валідація
    if (!username || !role) {
        showToast('Заповніть всі обов\'язкові поля', 'error');
        return;
    }

    try {
        const saveBtn = document.getElementById('save-user');
        saveBtn.disabled = true;
        saveBtn.querySelector('.label').textContent = 'Збереження...';

        const response = await window.apiClient.put('/api/users', {
            id,
            username,
            role,
            displayName,
            avatar
        });

        if (response.success) {
            console.log('✅ Користувача оновлено:', response.user);

            // Оновити користувача в state
            const userIndex = usersAdminState.users.findIndex(u => u.id === id);
            if (userIndex !== -1) {
                usersAdminState.users[userIndex] = {
                    ...usersAdminState.users[userIndex],
                    username: response.user.username,
                    role: response.user.role,
                    display_name: response.user.display_name,
                    avatar: response.user.avatar
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
        const saveBtn = document.getElementById('save-user');
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
