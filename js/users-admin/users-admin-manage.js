// js/users-admin/users-admin-manage.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            USERS ADMIN - TABLE RENDERING MODULE                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за рендеринг таблиці користувачів та обробку дій.
 */

import { usersAdminState } from './users-admin-init.js';
import { getAvatarPath } from '../utils/avatar-loader.js';
import { renderPseudoTable, renderBadge } from '../common/ui-table.js';
import { escapeHtml } from '../utils/text-utils.js';

/**
 * Рендерить таблицю користувачів з пагінацією
 */
export async function renderUsersTable() {
    const container = document.getElementById('users-table-container');
    if (!container) {
        console.error('❌ Контейнер #users-table-container не знайдено');
        return;
    }

    const { users, pagination, visibleColumns } = usersAdminState;

    // Фільтрація та пагінація
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    const paginatedUsers = users.slice(startIndex, endIndex);

    // Оновити статистику
    updateStats(paginatedUsers.length, users.length);

    // Визначити які колонки показувати
    const visibleCols = (visibleColumns && visibleColumns.length > 0)
        ? visibleColumns
        : ['avatar', 'display_name', 'username', 'role', 'last_login'];

    // Рендеринг таблиці через універсальний компонент
    renderPseudoTable(container, {
        data: paginatedUsers,
        columns: [
            {
                id: 'avatar',
                label: ' ',
                sortable: false, // Аватар не сортується
                className: 'cell-severity',
                render: (value) => {
                    if (value) {
                        const avatarPath = getAvatarPath(value, 'calm');
                        return `<div class="table-avatar"><img src="${avatarPath}" alt="${value}" onerror="this.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\' style=\\'font-size: 20px;\\'>person</span>'"></div>`;
                    }
                    return `<span class="material-symbols-outlined" style="font-size: 20px; color: var(--text-secondary);">person</span>`;
                }
            },
            {
                id: 'display_name',
                label: 'Повне ім\'я',
                sortable: true,
                className: 'cell-main-name',
                render: (value) => `<strong>${escapeHtml(value || '—')}</strong>`
            },
            {
                id: 'username',
                label: 'Ім\'я користувача',
                sortable: true,
                render: (value) => escapeHtml(value || '—')
            },
            {
                id: 'role',
                label: 'Роль',
                sortable: true,
                render: (value) => getRoleBadge(value)
            },
            {
                id: 'last_login',
                label: 'Останній вхід',
                sortable: true,
                render: (value) => formatDate(value)
            }
        ],
        visibleColumns: visibleCols,
        rowActionsCustom: (row) => {
            return `
                <button class="btn-icon btn-edit-user" data-user-id="${escapeHtml(row.id)}" data-action="edit" title="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            `;
        },
        emptyState: {
            icon: 'person_off',
            message: 'Користувачів не знайдено'
        },
        withContainer: false
    });

    // Додати обробники подій
    attachEventHandlers();
}

/**
 * Повертає HTML бейдж для ролі
 */
function getRoleBadge(role) {
    const badges = {
        admin: '<span class="badge badge-error">Admin</span>',
        editor: '<span class="badge badge-warning">Editor</span>',
        viewer: '<span class="badge badge-info">Viewer</span>'
    };
    return badges[role] || '<span class="badge">Unknown</span>';
}

/**
 * Форматує дату в зручний вигляд
 */
function formatDate(isoString) {
    if (!isoString) return '—';

    try {
        const date = new Date(isoString);

        // Перевірка чи валідна дата
        if (isNaN(date.getTime())) {
            return '—';
        }

        const now = new Date();

        // Скидаємо час до початку дня для обох дат
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        const diffMs = today - checkDate;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        const timeStr = date.toLocaleTimeString('uk-UA', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        // Якщо сьогодні
        if (diffDays === 0) {
            return `Сьогодні, ${timeStr}`;
        }

        // Якщо вчора
        if (diffDays === 1) {
            return `Вчора, ${timeStr}`;
        }

        // Інакше показати повну дату
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
 * Оновлює статистику
 */
function updateStats(displayed, total) {
    const statsElement = document.getElementById('tab-stats-users');
    if (statsElement) {
        statsElement.textContent = `Показано ${displayed} з ${total}`;
    }
}

/**
 * Додає обробники подій до кнопок дій
 */
function attachEventHandlers() {
    // Кнопки редагування
    document.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = e.currentTarget.dataset.userId;
            const user = usersAdminState.users.find(u => u.id === userId);
            if (user) {
                document.dispatchEvent(new CustomEvent('open-user-modal', { detail: { user } }));
            }
        });
    });
}
