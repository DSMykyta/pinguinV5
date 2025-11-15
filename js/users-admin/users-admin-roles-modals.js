// js/users-admin/users-admin-roles-modals.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║         USERS ADMIN - ROLES MODALS MODULE                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за відображення модального вікна для CRUD операцій з ролями.
 */

import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';

let currentEditRole = null;

/**
 * Ініціалізує систему модалок для ролей
 */
export function initRolesModals() {
    // Слухати події відкриття модалки
    document.addEventListener('open-role-modal', (e) => openRoleModal(e.detail?.role || null));

    // Слухати подію відкриття модалу для ініціалізації обробників
    document.addEventListener('modal-opened', handleRoleModalOpened);

    console.log('✅ Модальні вікна для ролей ініціалізовані');
}

/**
 * Обробляє подію відкриття модалу
 */
function handleRoleModalOpened(event) {
    const { modalId } = event.detail;

    if (modalId === 'role-modal') {
        initRoleModalHandlers();
    }
}

/**
 * Відкриває модалку для створення або редагування ролі
 * @param {Object|null} roleData - Дані ролі для редагування (null для створення)
 */
async function openRoleModal(roleData = null) {
    const isEdit = !!roleData;
    currentEditRole = roleData;

    console.log(isEdit ? '✏️ Редагування ролі' : '➕ Створення ролі');

    // Відкрити модал
    await showModal('role-modal');

    // Змінити заголовок
    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) {
        modalTitle.textContent = isEdit ? 'Редагувати роль' : 'Додати роль';
    }

    // Змінити текст кнопки збереження
    const saveBtn = document.getElementById('save-role');
    if (saveBtn) {
        saveBtn.querySelector('.label').textContent = isEdit ? 'Зберегти' : 'Створити';
    }

    // Умовне відображення кнопки видалення
    const deleteBtn = document.getElementById('delete-role');
    if (deleteBtn) {
        // Показати кнопку видалення тільки для не-системних ролей
        if (isEdit && !roleData.is_system) {
            deleteBtn.style.display = '';
        } else {
            deleteBtn.style.display = 'none';
        }
    }

    // Заповнити або очистити форму
    if (isEdit) {
        // Заповнити дані
        document.getElementById('role-id-hidden').value = roleData.role_id;
        document.getElementById('role-name').value = roleData.role_name || '';
        document.getElementById('role-id').value = roleData.role_id || '';
        document.getElementById('role-id').readOnly = true; // ID не можна змінювати
        document.getElementById('role-description').value = roleData.role_description || '';

        // Відзначити чекбокси прав
        setPermissionCheckboxes(roleData.permissions || []);
    } else {
        // Очистити форму
        document.getElementById('role-id-hidden').value = '';
        document.getElementById('role-name').value = '';
        document.getElementById('role-id').value = '';
        document.getElementById('role-id').readOnly = false;
        document.getElementById('role-description').value = '';

        // Очистити всі чекбокси
        document.querySelectorAll('input[name="permission"]').forEach(cb => {
            cb.checked = false;
        });
    }

    // Додати auto-generate для ID на основі назви (тільки для створення)
    if (!isEdit) {
        const roleNameInput = document.getElementById('role-name');
        const roleIdInput = document.getElementById('role-id');

        roleNameInput.addEventListener('input', () => {
            const name = roleNameInput.value.trim();
            if (name && !roleIdInput.value) {
                // Генерувати ID: lowercase, spaces to hyphens
                const generatedId = name
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-');
                roleIdInput.value = generatedId;
            }
        });
    }
}

/**
 * Встановлює стан чекбоксів прав
 */
function setPermissionCheckboxes(permissions) {
    // Спочатку очистити всі
    document.querySelectorAll('input[name="permission"]').forEach(cb => {
        cb.checked = false;
    });

    // Відзначити ті що є в ролі
    permissions.forEach(perm => {
        const checkbox = document.querySelector(`input[name="permission"][value="${perm.permission_key}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
}

/**
 * Отримує обрані права з чекбоксів
 */
function getSelectedPermissions() {
    const selected = [];
    document.querySelectorAll('input[name="permission"]:checked').forEach(cb => {
        selected.push(cb.value);
    });
    return selected;
}

/**
 * Ініціалізує обробники для модалки ролі
 */
function initRoleModalHandlers() {
    const isEdit = !!currentEditRole;

    const saveBtn = document.getElementById('save-role');
    const deleteBtn = document.getElementById('delete-role');

    // Головна кнопка збереження
    if (saveBtn) {
        saveBtn.onclick = () => isEdit ? handleUpdateRole() : handleCreateRole();
    }

    // Кнопка видалення (тільки для редагування)
    if (isEdit && deleteBtn) {
        deleteBtn.onclick = () => handleDeleteRole(currentEditRole);
    }
}

/**
 * Обробляє створення нової ролі
 */
async function handleCreateRole() {
    const roleName = document.getElementById('role-name').value.trim();
    const roleId = document.getElementById('role-id').value.trim();
    const roleDescription = document.getElementById('role-description').value.trim();
    const permissions = getSelectedPermissions();

    // Валідація
    if (!roleName || !roleId) {
        showToast('Заповніть назву та ID ролі', 'error');
        return;
    }

    try {
        const saveBtn = document.getElementById('save-role');
        saveBtn.disabled = true;
        saveBtn.querySelector('.label').textContent = 'Створення...';

        const response = await window.apiClient.post('/api/roles', {
            action: 'create',
            roleId,
            roleName,
            roleDescription,
            permissions
        });

        if (response.success) {
            console.log('✅ Роль створено:', response.role);

            closeModal();
            showToast('Роль успішно створено', 'success');

            // Оновити таблицю ролей
            document.dispatchEvent(new CustomEvent('roles-data-changed'));
        } else {
            throw new Error(response.error || 'Failed to create role');
        }
    } catch (error) {
        console.error('❌ Помилка створення ролі:', error);
        showToast(error.message || 'Не вдалося створити роль', 'error');
    } finally {
        const saveBtn = document.getElementById('save-role');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.querySelector('.label').textContent = 'Створити';
        }
    }
}

/**
 * Обробляє оновлення ролі
 */
async function handleUpdateRole() {
    const roleId = document.getElementById('role-id-hidden').value;
    const roleName = document.getElementById('role-name').value.trim();
    const roleDescription = document.getElementById('role-description').value.trim();
    const permissions = getSelectedPermissions();

    // Валідація
    if (!roleName) {
        showToast('Заповніть назву ролі', 'error');
        return;
    }

    try {
        const saveBtn = document.getElementById('save-role');
        saveBtn.disabled = true;
        saveBtn.querySelector('.label').textContent = 'Збереження...';

        const response = await window.apiClient.put('/api/roles', {
            action: 'update',
            roleId,
            roleName,
            roleDescription,
            permissions
        });

        if (response.success) {
            console.log('✅ Роль оновлено:', response.role);

            closeModal();
            showToast('Роль успішно оновлено', 'success');

            // Оновити таблицю ролей
            document.dispatchEvent(new CustomEvent('roles-data-changed'));
        } else {
            throw new Error(response.error || 'Failed to update role');
        }
    } catch (error) {
        console.error('❌ Помилка оновлення ролі:', error);
        showToast(error.message || 'Не вдалося оновити роль', 'error');
    } finally {
        const saveBtn = document.getElementById('save-role');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.querySelector('.label').textContent = 'Зберегти';
        }
    }
}

/**
 * Обробляє видалення ролі
 */
async function handleDeleteRole(role) {
    const { showConfirmModal } = await import('../common/ui-modal.js');

    const confirmed = await showConfirmModal({
        title: 'Видалити роль?',
        message: `Ви впевнені що хочете видалити роль <strong>${role.role_name}</strong>? Цю дію неможливо відмінити.`,
        confirmText: 'Видалити',
        cancelText: 'Скасувати',
        confirmClass: 'btn-danger'
    });

    if (!confirmed) return;

    try {
        const response = await window.apiClient.delete('/api/roles', {
            roleId: role.role_id
        });

        if (response.success) {
            console.log('✅ Роль видалено');

            closeModal();
            showToast('Роль видалено', 'success');

            // Оновити таблицю ролей
            document.dispatchEvent(new CustomEvent('roles-data-changed'));
        } else {
            throw new Error(response.error || 'Failed to delete role');
        }
    } catch (error) {
        console.error('❌ Помилка видалення ролі:', error);
        showToast(error.message || 'Не вдалося видалити роль', 'error');
    }
}
