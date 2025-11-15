// js/users-admin/users-admin-permissions-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║         USERS ADMIN - PERMISSIONS TABLE MODULE                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за рендеринг таблиці прав доступу.
 */

import { renderPseudoTable } from '../common/ui-table.js';
import { escapeHtml } from '../utils/text-utils.js';

// Поточна активна категорія прав
let currentCategory = 'pages';

// Всі права (завантажені з API)
let allPermissions = [];

/**
 * Завантажує всі права з API
 */
export async function loadPermissions() {
    try {
        console.log('📥 Завантаження прав...');

        const response = await window.apiClient.get('/api/permissions');

        if (response.success) {
            allPermissions = response.permissions;
            console.log(`✅ Завантажено ${allPermissions.length} прав`);
            return true;
        } else {
            throw new Error(response.error || 'Failed to load permissions');
        }
    } catch (error) {
        console.error('❌ Помилка завантаження прав:', error);
        showError('Не вдалося завантажити права');
        return false;
    }
}

/**
 * Рендерить таблицю прав для вибраної категорії
 */
export function renderPermissionsTable(category = 'pages') {
    currentCategory = category;

    const container = document.getElementById('permissions-table-container');
    if (!container) {
        console.error('❌ Контейнер #permissions-table-container не знайдено');
        return;
    }

    // Фільтрувати права за категорією
    const filteredPermissions = allPermissions.filter(p => p.category === category);

    console.log(`🔄 Рендер прав категорії "${category}": ${filteredPermissions.length} шт.`);

    // Оновити статистику
    updateStats(filteredPermissions.length, allPermissions.length);

    // Рендеринг таблиці
    renderPseudoTable(container, {
        data: filteredPermissions,
        columns: [
            {
                id: 'label',
                label: 'Назва права',
                sortable: true,
                className: 'cell-main-name',
                render: (value) => `<strong>${escapeHtml(value || '—')}</strong>`
            },
            {
                id: 'key',
                label: 'Ключ',
                sortable: true,
                render: (value) => `<code style="font-size: 12px; color: var(--color-on-surface-v);">${escapeHtml(value || '—')}</code>`
            },
            {
                id: 'roles',
                label: 'Ролі з доступом',
                sortable: false,
                render: (value) => renderRolesList(value || [])
            }
        ],
        rowActionsCustom: (row) => {
            return `
                <button class="btn-icon btn-edit-permission" data-permission-key="${escapeHtml(row.key)}" data-action="edit" title="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            `;
        },
        emptyState: {
            icon: 'shield_off',
            message: 'Прав не знайдено'
        },
        withContainer: false
    });

    // Додати обробники подій
    attachEventHandlers();
}

/**
 * Рендерить список ролей як чіпси
 */
function renderRolesList(roles) {
    if (!roles || roles.length === 0) {
        return `<span style="color: var(--color-on-surface-v); font-style: italic;">Немає доступу</span>`;
    }

    const roleLabels = {
        guest: { label: 'Гість', class: 'badge-info' },
        viewer: { label: 'Viewer', class: 'badge-info' },
        editor: { label: 'Editor', class: 'badge-warning' },
        admin: { label: 'Admin', class: 'badge-error' }
    };

    const chips = roles.map(roleId => {
        const roleInfo = roleLabels[roleId] || { label: roleId, class: 'badge' };
        return `<span class="badge ${roleInfo.class}">${roleInfo.label}</span>`;
    });

    return `<div style="display: flex; gap: 4px; flex-wrap: wrap;">${chips.join('')}</div>`;
}

/**
 * Оновлює статистику
 */
function updateStats(displayed, total) {
    const statsElement = document.getElementById('tab-stats-permissions');
    if (statsElement) {
        statsElement.textContent = `Показано ${displayed} з ${total}`;
    }
}

/**
 * Показує помилку
 */
function showError(message) {
    const container = document.getElementById('permissions-table-container');
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
    document.querySelectorAll('.btn-edit-permission').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const permissionKey = e.currentTarget.dataset.permissionKey;
            const permission = allPermissions.find(p => p.key === permissionKey);
            if (permission) {
                document.dispatchEvent(new CustomEvent('open-permission-modal', { detail: { permission } }));
            }
        });
    });
}

/**
 * Ініціалізує фільтри категорій
 */
export function initCategoryFilters() {
    const filterButtons = document.querySelectorAll('[data-permission-category]');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Оновити активні стани кнопок
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Рендерити таблицю для обраної категорії
            const category = btn.dataset.permissionCategory;
            renderPermissionsTable(category);
        });
    });

    console.log('✅ Фільтри категорій ініціалізовані');
}
