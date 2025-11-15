// js/users-admin/users-admin-permissions-catalog-modal.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║      USERS ADMIN - PERMISSIONS CATALOG MODAL MODULE                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за CRUD модалку для прав (створення/редагування).
 */

import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { initCustomSelects } from '../common/ui-select.js';

let currentMode = 'create'; // 'create' або 'edit'
let currentPermission = null;

/**
 * Ініціалізує систему модалок для каталогу прав
 */
export function initPermissionsCatalogModals() {
    // Слухати події відкриття модалки
    document.addEventListener('open-permission-catalog-modal', async (event) => {
        const { permission, mode } = event.detail || {};
        await openPermissionCatalogModal(permission, mode || 'create');
    });

    console.log('✅ Модалка каталогу прав ініціалізована');
}

/**
 * Відкриває модалку CRUD права
 */
async function openPermissionCatalogModal(permission = null, mode = 'create') {
    currentMode = mode;
    currentPermission = permission;

    console.log(`🔄 Відкриття модалки (${mode}):`, permission);

    // Завантажити HTML модалки
    const modalContainer = document.getElementById('modal-container');
    const response = await fetch('templates/modals/permission-catalog-modal.html');
    const html = await response.text();
    modalContainer.innerHTML = html;

    // Заповнити дані
    fillModalData(permission, mode);

    // Ініціалізувати кастомні селекти
    initCustomSelects();

    // Ініціалізувати обробники
    initModalHandlers();

    // Показати модалку
    await showModal('permission-catalog-modal');
}

/**
 * Заповнює дані в модалку
 */
function fillModalData(permission, mode) {
    // Встановити режим
    document.getElementById('permission-catalog-mode').value = mode;

    // Змінити заголовок
    const titleEl = document.getElementById('permission-catalog-modal-title');
    if (titleEl) {
        titleEl.textContent = mode === 'edit' ? 'Редагувати право' : 'Додати право';
    }

    if (mode === 'edit' && permission) {
        // Режим редагування - заповнити поля
        document.getElementById('permission-catalog-key').value = permission.permission_key;
        document.getElementById('permission-catalog-original-key').value = permission.permission_key;
        document.getElementById('permission-catalog-label').value = permission.permission_label || '';
        document.getElementById('permission-catalog-category').value = permission.category || '';
        document.getElementById('permission-catalog-subcategory').value = permission.subcategory || '';
        document.getElementById('permission-catalog-description').value = permission.description || '';

        // Зробити ключ readonly при редагуванні
        document.getElementById('permission-catalog-key').setAttribute('readonly', 'readonly');
        document.getElementById('permission-catalog-key').style.backgroundColor = 'var(--color-surface-c-low)';
    } else {
        // Режим створення - очистити поля
        document.getElementById('permission-catalog-key').value = '';
        document.getElementById('permission-catalog-original-key').value = '';
        document.getElementById('permission-catalog-label').value = '';
        document.getElementById('permission-catalog-category').value = '';
        document.getElementById('permission-catalog-subcategory').value = '';
        document.getElementById('permission-catalog-description').value = '';

        // Зробити ключ editable
        document.getElementById('permission-catalog-key').removeAttribute('readonly');
        document.getElementById('permission-catalog-key').style.backgroundColor = '';
    }
}

/**
 * Ініціалізує обробники для модалки
 */
function initModalHandlers() {
    const modal = document.getElementById('permission-catalog-modal');
    if (!modal) return;

    // Кнопка закриття
    const closeBtns = modal.querySelectorAll('.modal-close');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => closeModal('permission-catalog-modal'));
    });

    // Кнопка збереження
    const saveBtn = document.getElementById('save-permission-catalog-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleSavePermission);
    }

    console.log('✅ Обробники модалки права ініціалізовані');
}

/**
 * Обробник збереження права
 */
async function handleSavePermission() {
    try {
        const mode = document.getElementById('permission-catalog-mode').value;
        const permissionKey = document.getElementById('permission-catalog-key').value.trim();
        const permissionLabel = document.getElementById('permission-catalog-label').value.trim();
        const category = document.getElementById('permission-catalog-category').value;
        const subcategory = document.getElementById('permission-catalog-subcategory').value.trim();
        const description = document.getElementById('permission-catalog-description').value.trim();

        // Валідація
        if (!permissionKey || !permissionLabel || !category) {
            showToast('Заповніть обов\'язкові поля: Ключ, Назва, Категорія', 'error');
            return;
        }

        // Валідація формату ключа
        if (!/^[a-z0-9]+:[a-z0-9-]+$/.test(permissionKey)) {
            showToast('Ключ має бути у форматі category:name (тільки a-z, 0-9, -)', 'error');
            return;
        }

        console.log(`💾 Збереження права (${mode}):`, permissionKey);

        let response;

        if (mode === 'create') {
            // Створення нового права
            response = await window.apiClient.post('/api/permissions', {
                action: 'create',
                permission_key: permissionKey,
                permission_label: permissionLabel,
                category,
                subcategory: subcategory || null,
                description: description || null
            });
        } else {
            // Оновлення існуючого права
            response = await window.apiClient.put('/api/permissions', {
                action: 'update',
                permission_key: permissionKey,
                permission_label: permissionLabel,
                category,
                subcategory: subcategory || null,
                description: description || null
            });
        }

        if (response.success) {
            showToast(mode === 'create' ? 'Право успішно створено' : 'Право успішно оновлено', 'success');
            closeModal('permission-catalog-modal');

            // Сигналізувати про зміни
            document.dispatchEvent(new CustomEvent('permissions-catalog-changed'));
        } else {
            throw new Error(response.error || 'Failed to save permission');
        }
    } catch (error) {
        console.error('❌ Помилка збереження права:', error);
        showToast(error.message || 'Не вдалося зберегти право', 'error');
    }
}
