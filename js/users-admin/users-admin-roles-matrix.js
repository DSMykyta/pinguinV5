// js/users-admin/users-admin-roles-matrix.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║         USERS ADMIN - ROLES MATRIX MODULE                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за відображення матриці доступів (read-only).
 * Показує таблицю: Permissions (рядки) × Roles (колонки).
 */

/**
 * Рендерить матрицю доступів
 * @param {Array} roles - Масив ролей з правами
 * @param {Object} permissionsCatalog - Каталог всіх можливих прав
 */
export async function renderPermissionsMatrix(roles, permissionsCatalog) {
    const container = document.getElementById('roles-matrix-container');
    if (!container) {
        console.error('❌ Контейнер #roles-matrix-container не знайдено');
        return;
    }

    console.log(`🔲 Рендеринг матриці доступів (${roles.length} ролей)`);

    // Побудувати плоский список всіх прав
    const allPermissions = buildPermissionsList(permissionsCatalog);

    // Побудувати HTML матриці
    const matrixHTML = `
        <div class="permissions-matrix">
            <table class="matrix-table">
                <thead>
                    <tr>
                        <th class="matrix-header-category">Категорія</th>
                        <th class="matrix-header-permission">Право</th>
                        ${roles.map(role => `
                            <th class="matrix-header-role">
                                <div class="matrix-role-name">${escapeHtml(role.role_name)}</div>
                                <div class="matrix-role-id">${escapeHtml(role.role_id)}</div>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${renderMatrixRows(allPermissions, roles)}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = matrixHTML;
}

/**
 * Будує плоский список всіх прав з каталогу
 */
function buildPermissionsList(catalog) {
    const permissions = [];

    // Додати права зі сторінок
    if (catalog.pages) {
        catalog.pages.forEach(perm => {
            permissions.push({
                key: perm.key,
                label: perm.label,
                category: 'Доступ до Сторінок',
                categoryIcon: 'language'
            });
        });
    }

    // Додати права з панелей
    if (catalog.panels) {
        catalog.panels.forEach(perm => {
            permissions.push({
                key: perm.key,
                label: perm.label,
                category: 'Доступ до Панелей',
                categoryIcon: 'palette'
            });
        });
    }

    // Додати права з дій
    if (catalog.actions) {
        Object.keys(catalog.actions).forEach(groupKey => {
            const groupName = {
                users: 'Користувачі',
                bannedWords: 'Заборонені слова',
                entities: 'Сутності'
            }[groupKey] || groupKey;

            catalog.actions[groupKey].forEach(perm => {
                permissions.push({
                    key: perm.key,
                    label: perm.label,
                    category: 'Доступ до Дій',
                    categoryIcon: 'settings',
                    subgroup: groupName
                });
            });
        });
    }

    return permissions;
}

/**
 * Рендерить рядки матриці
 */
function renderMatrixRows(permissions, roles) {
    let currentCategory = null;
    let currentSubgroup = null;
    let rows = '';

    permissions.forEach((perm, index) => {
        let categoryCell = '';
        let categoryClass = '';

        // Додати рядок категорії якщо змінилася
        if (perm.category !== currentCategory) {
            currentCategory = perm.category;
            currentSubgroup = null; // Скинути підгрупу
            categoryClass = 'matrix-category-start';
            categoryCell = `
                <td class="matrix-cell-category" rowspan="1">
                    <span class="material-symbols-outlined">${perm.categoryIcon}</span>
                    <span>${perm.category}</span>
                </td>
            `;
        } else {
            categoryCell = '';
        }

        // Додати рядок підгрупи якщо є і змінилася
        let subgroupCell = '';
        if (perm.subgroup && perm.subgroup !== currentSubgroup) {
            currentSubgroup = perm.subgroup;
            subgroupCell = `<div class="matrix-subgroup-label">${perm.subgroup}</div>`;
        }

        // Перевірити які ролі мають це право
        const permissionCells = roles.map(role => {
            const hasPermission = role.permissions && role.permissions.some(p => p.permission_key === perm.key);
            const icon = hasPermission
                ? '<span class="matrix-icon-granted">✅</span>'
                : '<span class="matrix-icon-denied">❌</span>';
            return `<td class="matrix-cell-permission">${icon}</td>`;
        }).join('');

        rows += `
            <tr class="${categoryClass}">
                ${categoryCell}
                <td class="matrix-cell-label">
                    ${subgroupCell}
                    <code>${escapeHtml(perm.key)}</code>
                    <span class="matrix-label-text">${escapeHtml(perm.label)}</span>
                </td>
                ${permissionCells}
            </tr>
        `;
    });

    return rows;
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
