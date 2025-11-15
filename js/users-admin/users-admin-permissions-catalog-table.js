// js/users-admin/users-admin-permissions-catalog-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║      USERS ADMIN - PERMISSIONS CATALOG TABLE MODULE                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за рендеринг таблиці прав з каталогу (PermissionsCatalog).
 * Таб "Права" - CRUD операції з самими правами.
 */

import { renderPseudoTable } from '../common/ui-table.js';
import { escapeHtml } from '../utils/text-utils.js';

// Поточна активна категорія
let currentCategory = 'pages';

// Всі права з каталогу
let allPermissions = [];

/**
 * Завантажує всі права з каталогу
 */
export async function loadPermissionsCatalog() {
    try {
        console.log('📥 Завантаження каталогу прав...');

        const response = await window.apiClient.get('/api/permissions?action=list');

        if (response.success) {
            allPermissions = response.permissions;
            console.log(`✅ Завантажено ${allPermissions.length} прав з каталогу`);
            console.log('🔍 Перші 3 права:', allPermissions.slice(0, 3));
            console.log('🔍 Категорії:', [...new Set(allPermissions.map(p => p.category))]);
            return true;
        } else {
            throw new Error(response.error || 'Failed to load permissions catalog');
        }
    } catch (error) {
        console.error('❌ Помилка завантаження каталогу:', error);
        showError('Не вдалося завантажити каталог прав');
        return false;
    }
}

/**
 * Рендерить таблицю прав для вибраної категорії
 */
export function renderPermissionsCatalogTable(category = 'pages') {
    currentCategory = category;

    const container = document.getElementById('permissions-catalog-container');
    if (!container) {
        console.error('❌ Контейнер #permissions-catalog-container не знайдено');
        return;
    }

    // Фільтрувати права за категорією
    const filteredPermissions = allPermissions.filter(p => p.category === category);

    console.log(`🔄 Рендер каталогу прав категорії "${category}": ${filteredPermissions.length} шт.`);

    // Оновити статистику
    updateStats(filteredPermissions.length, allPermissions.length);

    // Показати кнопку "Додати право"
    const addBtn = document.getElementById('add-permission-btn');
    if (addBtn) {
        addBtn.style.display = 'flex';
    }

    // Рендеринг таблиці
    renderPseudoTable(container, {
        data: filteredPermissions,
        columns: [
            {
                id: 'permission_label',
                label: 'Назва права',
                sortable: true,
                className: 'cell-main-name',
                render: (value) => `<strong>${escapeHtml(value || '—')}</strong>`
            },
            {
                id: 'permission_key',
                label: 'Ключ',
                sortable: true,
                render: (value) => `<code style="font-size: 12px; color: var(--color-on-surface-v);">${escapeHtml(value || '—')}</code>`
            },
            {
                id: 'subcategory',
                label: 'Підкатегорія',
                sortable: true,
                render: (value) => value ? `<span class="badge badge-info">${escapeHtml(value)}</span>` : `<span style="color: var(--color-on-surface-v);">—</span>`
            },
            {
                id: 'description',
                label: 'Опис',
                sortable: false,
                render: (value) => `<span style="font-size: 13px; color: var(--color-on-surface-v);">${escapeHtml(value || '—')}</span>`
            }
        ],
        rowActionsCustom: (row) => {
            return `
                <button class="btn-icon btn-edit-permission-catalog" data-permission-key="${escapeHtml(row.permission_key)}" data-action="edit" title="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="btn-icon btn-delete-permission-catalog" data-permission-key="${escapeHtml(row.permission_key)}" data-action="delete" title="Видалити">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            `;
        },
        emptyState: {
            icon: 'key_off',
            message: 'Прав не знайдено. Додайте нове право.'
        },
        withContainer: false
    });

    // Додати обробники подій
    attachEventHandlers();
}

/**
 * Оновлює статистику
 */
function updateStats(displayed, total) {
    const statsElement = document.getElementById('tab-stats-permissions-catalog');
    if (statsElement) {
        statsElement.textContent = `Показано ${displayed} з ${total}`;
    }
}

/**
 * Показує помилку
 */
function showError(message) {
    const container = document.getElementById('permissions-catalog-container');
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state">
            <span class="material-symbols-outlined">error</span>
            <p>${message}</p>
        </div>
    `;
}

/**
 * Додає обробники подій до кнопок дій
 */
function attachEventHandlers() {
    // Кнопки редагування
    document.querySelectorAll('.btn-edit-permission-catalog').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const permissionKey = e.currentTarget.dataset.permissionKey;
            const permission = allPermissions.find(p => p.permission_key === permissionKey);
            if (permission) {
                document.dispatchEvent(new CustomEvent('open-permission-catalog-modal', {
                    detail: { permission, mode: 'edit' }
                }));
            }
        });
    });

    // Кнопки видалення
    document.querySelectorAll('.btn-delete-permission-catalog').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const permissionKey = e.currentTarget.dataset.permissionKey;
            const permission = allPermissions.find(p => p.permission_key === permissionKey);

            if (!permission) return;

            const confirmed = confirm(`Видалити право "${permission.permission_label}" (${permissionKey})?\n\nВСІ призначення цього права також будуть видалені!`);

            if (confirmed) {
                await deletePermission(permissionKey);
            }
        });
    });
}

/**
 * Видаляє право
 */
async function deletePermission(permissionKey) {
    try {
        console.log(`🗑️ Видалення права: ${permissionKey}`);

        const response = await window.apiClient.delete('/api/permissions', {
            permission_key: permissionKey
        });

        if (response.success) {
            console.log(`✅ Право ${permissionKey} видалено`);

            // Показати повідомлення
            if (typeof window.showToast === 'function') {
                window.showToast('Право успішно видалено', 'success');
            }

            // Сигналізувати про зміни
            document.dispatchEvent(new CustomEvent('permissions-catalog-changed'));
        } else {
            throw new Error(response.error || 'Failed to delete permission');
        }
    } catch (error) {
        console.error('❌ Помилка видалення права:', error);
        if (typeof window.showToast === 'function') {
            window.showToast(error.message || 'Не вдалося видалити право', 'error');
        }
    }
}

/**
 * Ініціалізує фільтри категорій
 */
export function initCatalogCategoryFilters() {
    const filterButtons = document.querySelectorAll('[data-permission-catalog-category]');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Оновити активні стани кнопок
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Рендерити таблицю для обраної категорії
            const category = btn.dataset.permissionCatalogCategory;
            renderPermissionsCatalogTable(category);
        });
    });

    console.log('✅ Фільтри категорій (catalog) ініціалізовані');
}
