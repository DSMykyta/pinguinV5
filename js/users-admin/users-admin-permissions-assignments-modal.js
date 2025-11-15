// js/users-admin/users-admin-permissions-assignments-modal.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║      USERS ADMIN - PERMISSIONS ASSIGNMENTS MODAL MODULE                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за модалку призначення прав ролям.
 */

import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { initCustomSelects } from '../common/ui-select.js';

let currentPermission = null;

/**
 * Ініціалізує систему модалок для призначень
 */
export function initPermissionAssignmentsModals() {
    // Слухати події відкриття модалки
    document.addEventListener('open-permission-assignment-modal', async (event) => {
        const permission = event.detail?.permission || null;
        await openPermissionAssignmentModal(permission);
    });

    console.log('✅ Модалка призначень прав ініціалізована');
}

/**
 * Відкриває модалку призначення права
 */
async function openPermissionAssignmentModal(permission) {
    currentPermission = permission;

    console.log('🔄 Відкриття модалки призначення права:', permission);

    // Завантажити HTML модалки
    const modalContainer = document.getElementById('modal-container');
    const response = await fetch('templates/modals/permission-modal.html');
    const html = await response.text();
    modalContainer.innerHTML = html;

    // Завантажити ролі з API та заповнити селект
    await loadRolesIntoSelect();

    // Заповнити дані
    if (permission) {
        document.getElementById('permission-assignment-key').value = permission.permission_key;
        document.getElementById('permission-assignment-label').textContent = permission.permission_label || '';
        document.getElementById('permission-assignment-key-display').textContent = permission.permission_key || '';

        // Встановити вибрані ролі
        setSelectedRoles(permission.roles || []);
    }

    // Ініціалізувати кастомні селекти
    initCustomSelects();

    // Ініціалізувати обробники
    initPermissionAssignmentModalHandlers();

    // Показати модалку
    await showModal('permission-assignment-modal');
}

/**
 * Завантажує ролі з API та заповнює селект
 */
async function loadRolesIntoSelect() {
    try {
        const rolesResponse = await window.apiClient.get('/api/roles');

        if (rolesResponse.success) {
            const selectEl = document.getElementById('permission-assignment-roles');
            if (!selectEl) return;

            // Очистити селект
            selectEl.innerHTML = '';

            // Додати guest як псевдо-роль
            const guestOption = document.createElement('option');
            guestOption.value = 'guest';
            guestOption.textContent = 'Гість (неавторизований)';
            selectEl.appendChild(guestOption);

            // Додати ролі з API
            rolesResponse.roles.forEach(role => {
                const option = document.createElement('option');
                option.value = role.role_id;
                option.textContent = `${role.role_name} (${role.role_id})`;
                selectEl.appendChild(option);
            });

            console.log(`✅ Завантажено ${rolesResponse.roles.length + 1} ролей у селект`);
        }
    } catch (error) {
        console.error('❌ Помилка завантаження ролей у селект:', error);
    }
}

/**
 * Встановлює вибрані ролі в мультиселекті
 */
function setSelectedRoles(roles) {
    const selectEl = document.getElementById('permission-assignment-roles');
    if (!selectEl) return;

    Array.from(selectEl.options).forEach(option => {
        option.selected = roles.includes(option.value);
    });

    // Викликати change для оновлення custom select
    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Отримує обрані ролі з мультиселекта
 */
function getSelectedRoles() {
    const selectEl = document.getElementById('permission-assignment-roles');
    if (!selectEl) return [];

    const selected = [];
    Array.from(selectEl.selectedOptions).forEach(option => {
        if (option.value) {
            selected.push(option.value);
        }
    });

    return selected;
}

/**
 * Ініціалізує обробники для модалки
 */
function initPermissionAssignmentModalHandlers() {
    const modal = document.getElementById('permission-assignment-modal');
    if (!modal) return;

    // Кнопка закриття
    const closeBtns = modal.querySelectorAll('.modal-close');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => closeModal('permission-assignment-modal'));
    });

    // Кнопка збереження
    const saveBtn = document.getElementById('save-permission-assignment-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleSaveAssignment);
    }

    console.log('✅ Обробники модалки призначення ініціалізовані');
}

/**
 * Обробник збереження призначення
 */
async function handleSaveAssignment() {
    try {
        const permissionKey = document.getElementById('permission-assignment-key').value;
        const selectedRoles = getSelectedRoles();

        console.log('💾 Збереження призначення:', permissionKey, selectedRoles);

        // Відправити запит на сервер
        const response = await window.apiClient.put('/api/permissions', {
            action: 'assign',
            permission_key: permissionKey,
            roles: selectedRoles
        });

        if (response.success) {
            showToast('Призначення успішно оновлено', 'success');
            closeModal('permission-assignment-modal');

            // Сигналізувати про зміни
            document.dispatchEvent(new CustomEvent('permissions-assignments-changed'));
        } else {
            throw new Error(response.error || 'Failed to assign permission');
        }
    } catch (error) {
        console.error('❌ Помилка збереження призначення:', error);
        showToast(error.message || 'Не вдалося зберегти призначення', 'error');
    }
}
