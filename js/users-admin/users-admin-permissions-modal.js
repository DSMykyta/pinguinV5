// js/users-admin/users-admin-permissions-modal.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║         USERS ADMIN - PERMISSIONS MODAL MODULE                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за відображення модального вікна для редагування прав доступу.
 */

import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { initCustomSelects } from '../common/ui-select.js';

let currentPermission = null;

/**
 * Ініціалізує систему модалок для прав
 */
export function initPermissionsModals() {
    // Слухати події відкриття модалки
    document.addEventListener('open-permission-modal', async (event) => {
        const permission = event.detail?.permission || null;
        await openPermissionModal(permission);
    });

    console.log('✅ Модалка прав ініціалізована');
}

/**
 * Відкриває модалку редагування права
 */
async function openPermissionModal(permission) {
    currentPermission = permission;

    console.log('🔄 Відкриття модалки редагування права:', permission);

    // Завантажити HTML модалки
    const modalContainer = document.getElementById('modal-container');
    const response = await fetch('templates/modals/permission-modal.html');
    const html = await response.text();
    modalContainer.innerHTML = html;

    // Завантажити ролі з API та заповнити селект
    await loadRolesIntoSelect();

    // Заповнити дані
    if (permission) {
        document.getElementById('permission-key-hidden').value = permission.key;
        document.getElementById('permission-label').value = permission.label || '';
        document.getElementById('permission-key').value = permission.key || '';

        // Встановити вибрані ролі
        setSelectedRoles(permission.roles || []);
    }

    // Ініціалізувати кастомні селекти
    initCustomSelects();

    // Ініціалізувати обробники
    initPermissionModalHandlers();

    // Показати модалку
    await showModal('permission-modal');
}

/**
 * Завантажує ролі з API та заповнює селект
 */
async function loadRolesIntoSelect() {
    try {
        const rolesResponse = await window.apiClient.get('/api/roles');

        if (rolesResponse.success) {
            const selectEl = document.getElementById('permission-roles');
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
    const selectEl = document.getElementById('permission-roles');
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
    const selectEl = document.getElementById('permission-roles');
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
 * Ініціалізує обробники для модалки права
 */
function initPermissionModalHandlers() {
    const modal = document.getElementById('permission-modal');
    if (!modal) return;

    // Кнопка закриття
    const closeBtns = modal.querySelectorAll('.modal-close');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => closeModal('permission-modal'));
    });

    // Форма
    const form = modal.querySelector('fieldset');
    if (form) {
        // Створити кнопку "Зберегти"
        const existingSaveBtn = modal.querySelector('.modal-save-btn');
        if (!existingSaveBtn) {
            const saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.className = 'btn-primary modal-save-btn';
            saveBtn.innerHTML = `
                <span class="material-symbols-outlined">save</span>
                <span>Зберегти</span>
            `;
            form.appendChild(saveBtn);

            saveBtn.addEventListener('click', handleSavePermission);
        } else {
            existingSaveBtn.addEventListener('click', handleSavePermission);
        }
    }

    console.log('✅ Обробники модалки права ініціалізовані');
}

/**
 * Обробник збереження права
 */
async function handleSavePermission() {
    try {
        const permissionKey = document.getElementById('permission-key-hidden').value;
        const selectedRoles = getSelectedRoles();

        console.log('💾 Збереження права:', permissionKey, selectedRoles);

        // Відправити запит на сервер
        const response = await window.apiClient.put('/api/permissions', {
            permission_key: permissionKey,
            roles: selectedRoles
        });

        if (response.success) {
            showToast('Право успішно оновлено', 'success');
            closeModal('permission-modal');

            // Сигналізувати про зміни
            document.dispatchEvent(new CustomEvent('permissions-data-changed'));
        } else {
            throw new Error(response.error || 'Failed to update permission');
        }
    } catch (error) {
        console.error('❌ Помилка збереження права:', error);
        showToast(error.message || 'Не вдалося зберегти право', 'error');
    }
}
