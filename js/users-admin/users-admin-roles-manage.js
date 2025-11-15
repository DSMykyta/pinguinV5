// js/users-admin/users-admin-roles-manage.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║         USERS ADMIN - ROLES MANAGEMENT MODULE                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за відображення та управління таблицею ролей.
 * Рендерить таблицю через renderPseudoTable, обробляє події Edit/Delete.
 */

import { renderPseudoTable } from '../common/ui-table.js';

/**
 * Рендерить таблицю ролей
 * @param {Array} roles - Масив ролей з API
 */
export async function renderRolesTable(roles) {
    const container = document.getElementById('roles-manage-container');
    if (!container) {
        console.error('❌ Контейнер #roles-manage-container не знайдено');
        return;
    }

    console.log(`📋 Рендеринг таблиці ролей (${roles.length} ролей)`);

    // Оновити статистику
    updateRolesStats(roles.length, roles.length);

    // Рендерити таблицю
    renderPseudoTable(container, {
        data: roles,
        columns: [
            {
                id: 'role_name',
                label: 'Назва ролі',
                sortable: true,
                className: 'cell-main-name',
                render: (value, row) => {
                    const systemBadge = row.is_system
                        ? '<span class="chip chip-info" style="margin-left: 8px; font-size: 11px;">СИСТЕМНА</span>'
                        : '';
                    return `<strong>${escapeHtml(value || '—')}</strong>${systemBadge}`;
                }
            },
            {
                id: 'role_id',
                label: 'ID',
                sortable: true,
                render: (value) => `<code style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(value || '—')}</code>`
            },
            {
                id: 'role_description',
                label: 'Опис',
                sortable: false,
                render: (value) => escapeHtml(value || '—')
            },
            {
                id: 'permissions',
                label: 'Кількість прав',
                sortable: true,
                render: (value) => {
                    const count = Array.isArray(value) ? value.length : 0;
                    return `<span class="chip">${count}</span>`;
                }
            },
            {
                id: 'created_at',
                label: 'Створено',
                sortable: true,
                render: (value) => formatDate(value)
            }
        ],
        visibleColumns: ['role_name', 'role_id', 'role_description', 'permissions', 'created_at'],
        rowActionsCustom: (row) => {
            const deleteBtn = row.is_system
                ? '' // Не показувати кнопку видалення для системних ролей
                : `<button class="btn-icon btn-delete-role" data-role-id="${escapeHtml(row.role_id)}" data-action="delete" title="Видалити">
                    <span class="material-symbols-outlined">delete</span>
                </button>`;

            return `
                <button class="btn-icon btn-edit-role" data-role-id="${escapeHtml(row.role_id)}" data-action="edit" title="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>
                ${deleteBtn}
            `;
        },
        emptyState: {
            icon: 'shield_person',
            message: 'Ролей не знайдено'
        },
        withContainer: false
    });

    // Додати обробники подій
    attachRoleEventHandlers(roles);
}

/**
 * Оновлює статистику ролей
 */
function updateRolesStats(displayed, total) {
    const statsElement = document.getElementById('tab-stats-roles');
    if (statsElement) {
        statsElement.textContent = `Показано ${displayed} з ${total}`;
    }
}

/**
 * Додає обробники подій до кнопок дій
 */
function attachRoleEventHandlers(roles) {
    // Кнопки редагування
    document.querySelectorAll('.btn-edit-role').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const roleId = e.currentTarget.dataset.roleId;
            const role = roles.find(r => r.role_id === roleId);
            if (role) {
                document.dispatchEvent(new CustomEvent('open-role-modal', { detail: { role } }));
            }
        });
    });

    // Кнопки видалення
    document.querySelectorAll('.btn-delete-role').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const roleId = e.currentTarget.dataset.roleId;
            const role = roles.find(r => r.role_id === roleId);
            if (role) {
                document.dispatchEvent(new CustomEvent('delete-role', { detail: { role } }));
            }
        });
    });
}

/**
 * Форматує дату
 */
function formatDate(isoString) {
    if (!isoString) return '—';

    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '—';

        return date.toLocaleString('uk-UA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return '—';
    }
}

/**
 * Екранує HTML для безпечного відображення
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}
