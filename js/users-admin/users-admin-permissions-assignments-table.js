// js/users-admin/users-admin-permissions-assignments-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║      USERS ADMIN - PERMISSIONS ASSIGNMENTS TABLE MODULE                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за рендеринг таблиці призначень прав (які ролі мають доступ).
 * Таб "Доступи" - призначення прав ролям.
 */

import { renderPseudoTable } from '../common/ui-table.js';
import { escapeHtml } from '../utils/text-utils.js';

// Поточна активна категорія
let currentCategory = 'pages';

// Всі призначення прав
let allAssignments = [];

/**
 * Завантажує всі призначення прав
 */
export async function loadPermissionAssignments() {
    try {
        console.log('📥 Завантаження призначень прав...');

        const response = await window.apiClient.get('/api/permissions?action=assignments');

        if (response.success) {
            allAssignments = response.permissions;
            console.log(`✅ Завантажено ${allAssignments.length} призначень`);
            return true;
        } else {
            throw new Error(response.error || 'Failed to load permission assignments');
        }
    } catch (error) {
        console.error('❌ Помилка завантаження призначень:', error);
        showError('Не вдалося завантажити призначення прав');
        return false;
    }
}

/**
 * Рендерить таблицю призначень для вибраної категорії
 */
export function renderPermissionAssignmentsTable(category = 'pages') {
    currentCategory = category;

    const container = document.getElementById('permissions-assignments-container');
    if (!container) {
        console.error('❌ Контейнер #permissions-assignments-container не знайдено');
        return;
    }

    // Фільтрувати призначення за категорією
    const filteredAssignments = allAssignments.filter(p => p.category === category);

    console.log(`🔄 Рендер призначень категорії "${category}": ${filteredAssignments.length} шт.`);

    // Оновити статистику
    updateStats(filteredAssignments.length, allAssignments.length);

    // Рендеринг таблиці
    renderPseudoTable(container, {
        data: filteredAssignments,
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
                id: 'roles',
                label: 'Ролі з доступом',
                sortable: false,
                render: (value) => renderRolesList(value || [])
            }
        ],
        rowActionsCustom: (row) => {
            return `
                <button class="btn-icon btn-assign-permission" data-permission-key="${escapeHtml(row.permission_key)}" data-action="assign" title="Призначити доступ">
                    <span class="material-symbols-outlined">lock_open</span>
                </button>
            `;
        },
        emptyState: {
            icon: 'lock_person_off',
            message: 'Призначень не знайдено'
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
    const statsElement = document.getElementById('tab-stats-permissions-assignments');
    if (statsElement) {
        statsElement.textContent = `Показано ${displayed} з ${total}`;
    }
}

/**
 * Показує помилку
 */
function showError(message) {
    const container = document.getElementById('permissions-assignments-container');
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
    // Кнопки призначення
    document.querySelectorAll('.btn-assign-permission').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const permissionKey = e.currentTarget.dataset.permissionKey;
            const assignment = allAssignments.find(p => p.permission_key === permissionKey);
            if (assignment) {
                document.dispatchEvent(new CustomEvent('open-permission-assignment-modal', {
                    detail: { permission: assignment }
                }));
            }
        });
    });
}

/**
 * Ініціалізує фільтри категорій для призначень
 */
export function initAssignmentCategoryFilters() {
    const filterButtons = document.querySelectorAll('[data-permission-assignment-category]');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Оновити активні стани кнопок
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Рендерити таблицю для обраної категорії
            const category = btn.dataset.permissionAssignmentCategory;
            renderPermissionAssignmentsTable(category);
        });
    });

    console.log('✅ Фільтри категорій (assignments) ініціалізовані');
}
