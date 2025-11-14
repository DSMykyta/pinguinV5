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

    // Згенерувати HTML таблиці
    const tableHTML = generateTableHTML(paginatedUsers, visibleColumns);
    container.innerHTML = tableHTML;

    // Додати обробники подій
    attachEventHandlers();
}

/**
 * Генерує HTML для таблиці користувачів
 */
function generateTableHTML(users, visibleColumns) {
    const columnConfig = {
        actions: { label: 'Дії', width: '80px' },
        avatar: { label: '', width: '50px' },
        username: { label: 'Ім\'я користувача', width: '250px' },
        role: { label: 'Роль', width: '120px' },
        last_login: { label: 'Останній вхід', width: '180px' }
    };

    // Генерація header
    let headerHTML = '<div class="pseudo-table-row pseudo-table-header">';
    visibleColumns.forEach(columnId => {
        const config = columnConfig[columnId];
        if (config) {
            const cellClass = columnId === 'actions' ? 'cell-actions' : 'sortable-header';
            const dataSort = columnId !== 'actions' ? `data-sort="${columnId}"` : '';

            headerHTML += `
                <div class="pseudo-table-cell ${cellClass}" ${dataSort}>
                    <span>${config.label}</span>
                    ${columnId !== 'actions' ? '<span class="sort-indicator"></span>' : ''}
                </div>
            `;
        }
    });
    headerHTML += '</div>';

    // Генерація рядків
    let rowsHTML = '';
    if (users.length === 0) {
        rowsHTML = `
            <div class="loading-state">
                <span class="material-symbols-outlined">person_off</span>
                <p>Користувачів не знайдено</p>
            </div>
        `;
    } else {
        users.forEach(user => {
            rowsHTML += generateUserRow(user, visibleColumns);
        });
    }

    return `
        <div class="pseudo-table">
            ${headerHTML}
            ${rowsHTML}
        </div>
    `;
}

/**
 * Генерує HTML для одного рядка користувача
 */
function generateUserRow(user, visibleColumns) {
    const columnConfig = {
        actions: { label: 'Дії', width: '80px' },
        avatar: { label: '', width: '50px' },
        username: { label: 'Ім\'я користувача', width: '250px' },
        role: { label: 'Роль', width: '120px' },
        last_login: { label: 'Останній вхід', width: '180px' }
    };

    let rowHTML = `<div class="pseudo-table-row" data-user-id="${user.id}">`;

    visibleColumns.forEach(columnId => {
        const config = columnConfig[columnId];
        if (!config) return;

        if (columnId === 'actions') {
            rowHTML += `
                <div class="pseudo-table-cell cell-actions">
                    <button class="btn-icon btn-edit-user" data-user-id="${user.id}" aria-label="Редагувати">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                </div>
            `;
        } else if (columnId === 'avatar') {
            const avatarHtml = user.avatar
                ? `<div class="table-avatar"><img src="${getAvatarPath(user.avatar, 'calm')}" alt="${user.avatar}" onerror="this.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\' style=\\'font-size: 20px;\\'>person</span>'"></div>`
                : `<span class="material-symbols-outlined" style="font-size: 20px; color: var(--text-secondary);">person</span>`;
            rowHTML += `
                <div class="pseudo-table-cell" style="width: ${config.width}; text-align: center;">
                    ${avatarHtml}
                </div>
            `;
        } else if (columnId === 'username') {
            rowHTML += `
                <div class="pseudo-table-cell" style="width: ${config.width};">
                    <span class="cell-text">${escapeHtml(user.username)}</span>
                </div>
            `;
        } else if (columnId === 'role') {
            const roleBadge = getRoleBadge(user.role);
            rowHTML += `
                <div class="pseudo-table-cell" style="width: ${config.width};">
                    ${roleBadge}
                </div>
            `;
        } else if (columnId === 'last_login') {
            const formattedDate = user.last_login ? formatDate(user.last_login) : '—';
            rowHTML += `
                <div class="pseudo-table-cell" style="width: ${config.width};">
                    <span class="cell-text">${formattedDate}</span>
                </div>
            `;
        }
    });

    rowHTML += '</div>';
    return rowHTML;
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
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        // Якщо сьогодні
        if (diffDays === 0) {
            return `Сьогодні, ${date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`;
        }

        // Якщо вчора
        if (diffDays === 1) {
            return `Вчора, ${date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`;
        }

        // Інакше показати дату
        return date.toLocaleDateString('uk-UA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return isoString;
    }
}

/**
 * Екранує HTML спецсимволи
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
                document.dispatchEvent(new CustomEvent('open-edit-user-modal', { detail: { user } }));
            }
        });
    });

    // Сортування колонок
    document.querySelectorAll('.sortable-header').forEach(header => {
        header.addEventListener('click', (e) => {
            const sortBy = e.currentTarget.dataset.sort;
            handleSort(sortBy);
        });
    });
}

/**
 * Обробляє сортування таблиці
 */
function handleSort(columnId) {
    const { sortBy, sortDirection } = usersAdminState;

    // Визначити напрямок сортування
    let newDirection = 'asc';
    if (sortBy === columnId && sortDirection === 'asc') {
        newDirection = 'desc';
    }

    usersAdminState.sortBy = columnId;
    usersAdminState.sortDirection = newDirection;

    // Сортувати дані
    usersAdminState.users.sort((a, b) => {
        let aVal = a[columnId] || '';
        let bVal = b[columnId] || '';

        // Сортування дат
        if (columnId === 'last_login') {
            aVal = aVal ? new Date(aVal).getTime() : 0;
            bVal = bVal ? new Date(bVal).getTime() : 0;
        }

        if (aVal < bVal) return newDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return newDirection === 'asc' ? 1 : -1;
        return 0;
    });

    // Оновити індикатори сортування
    document.querySelectorAll('.sortable-header').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
    });

    const activeHeader = document.querySelector(`.sortable-header[data-sort="${columnId}"]`);
    if (activeHeader) {
        activeHeader.classList.add(`sort-${newDirection}`);
    }

    // Перерендерити таблицю
    renderUsersTable();
}
