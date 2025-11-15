// js/users-admin/users-admin-init.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            USERS ADMIN - MAIN INITIALIZATION MODULE                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Головний файл ініціалізації системи адміністрування користувачів.
 * Відповідає тільки за координацію ініціалізації всіх модулів.
 * Уся логіка винесена в окремі модулі.
 */

import { initTooltips } from '../common/ui-tooltip.js';
import { renderUsersTable } from './users-admin-manage.js';
import { initModals } from './users-admin-modals.js';
import { initPaginationForUsers } from './users-admin-pagination.js';
import { renderRolesTable } from './users-admin-roles-manage.js';
import { initRolesModals } from './users-admin-roles-modals.js';

// TODO: Permissions UI files were deleted - recreate if needed
// import { loadPermissionsCatalog, renderPermissionsCatalogTable, initCatalogCategoryFilters } from './users-admin-permissions-catalog-table.js';
// import { initPermissionsCatalogModals } from './users-admin-permissions-catalog-modal.js';
// import { loadPermissionAssignments, renderPermissionAssignmentsTable, initAssignmentCategoryFilters } from './users-admin-permissions-assignments-table.js';
// import { initPermissionAssignmentsModals } from './users-admin-permissions-assignments-modal.js';

/**
 * Глобальний state для users admin модуля
 */
export const usersAdminState = {
    // Дані користувачів
    users: [],                 // Список користувачів з Users Database

    // Дані ролей
    roles: [],                 // Список ролей з Roles Database
    permissionsCatalog: null,  // Каталог всіх можливих прав

    // Поточний таб
    currentTab: 'tab-users',   // 'tab-users', 'tab-roles-manage', 'tab-permissions-catalog', 'tab-permissions-assignments'

    // Пошук
    searchQuery: '',           // Пошук в таблиці користувачів
    searchColumns: [],         // Колонки для пошуку

    // Видимість колонок
    visibleColumns: [],        // Видимі колонки таблиці

    // Сортування
    sortBy: null,              // Колонка для сортування
    sortDirection: 'asc',      // Напрямок сортування ('asc' або 'desc')

    // Пагінація
    pagination: {
        currentPage: 1,
        pageSize: 10,
        totalItems: 0
    },

    // Pagination API (зберігається для оновлення)
    paginationAPI: null
};

/**
 * Головна функція ініціалізації модуля Users Admin
 */
export function initUsersAdmin() {
    console.log('👥 Ініціалізація Users Admin...');

    // Ініціалізувати tooltip систему
    initTooltips();

    // Показати початковий стан (чекаємо авторизацію)
    showLoadingState();

    // Ініціалізувати таби (section-navigator)
    initTabs();

    // Ініціалізувати модалки користувачів
    initModals();

    // Ініціалізувати модалки ролей
    initRolesModals();

    // TODO: Permissions UI initialization - recreate if needed
    // initPermissionsCatalogModals();
    // initPermissionAssignmentsModals();
    // initCatalogCategoryFilters();
    // initAssignmentCategoryFilters();

    // Ініціалізувати кнопки для табу користувачів
    initRefreshButton();
    initAddUserButton();

    // Ініціалізувати кнопки для табу ролей
    initRolesTabButtons();

    // TODO: Permissions buttons - recreate if needed
    // initPermissionsTabButtons();

    // Слухати події зміни авторизації
    document.addEventListener('auth-state-changed', (event) => {
        console.log('🔐 Подія auth-state-changed:', event.detail);
        if (event.detail.isAuthorized && event.detail.user) {
            checkAuthAndLoadData(event.detail.user);
        } else {
            showUnauthorizedState();
        }
    });

    // Слухати подію оновлення даних ролей
    document.addEventListener('roles-data-changed', async () => {
        await loadRolesData();

        // Перерендерити поточний активний таб ролей
        if (usersAdminState.currentTab === 'tab-roles-manage') {
            renderRolesTable(usersAdminState.roles);
        }
    });

    // TODO: Permissions events - recreate if needed
    // document.addEventListener('permissions-catalog-changed', async () => {
    //     const success = await loadPermissionsCatalog();
    //     if (success && usersAdminState.currentTab === 'tab-permissions-catalog') {
    //         const activeFilter = document.querySelector('[data-permission-catalog-category].active');
    //         const category = activeFilter ? activeFilter.dataset.permissionCatalogCategory : 'pages';
    //         renderPermissionsCatalogTable(category);
    //     }
    // });

    // document.addEventListener('permissions-assignments-changed', async () => {
    //     const success = await loadPermissionAssignments();
    //     if (success && usersAdminState.currentTab === 'tab-permissions-assignments') {
    //         const activeFilter = document.querySelector('[data-permission-assignment-category].active');
    //         const category = activeFilter ? activeFilter.dataset.permissionAssignmentCategory : 'pages';
    //         renderPermissionAssignmentsTable(category);
    //     }
    // });
}

/**
 * Показує стан завантаження
 */
function showLoadingState() {
    const container = document.getElementById('users-table-container');
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state">
            <span class="material-symbols-outlined">manage_accounts</span>
            <p>Завантаження користувачів...</p>
        </div>
    `;
}

/**
 * Показує стан неавторизованого користувача
 */
function showUnauthorizedState() {
    const container = document.getElementById('users-table-container');
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state">
            <span class="material-symbols-outlined">key</span>
            <p>Авторизуйтесь для доступу до адмін панелі</p>
        </div>
    `;
}

/**
 * Показує стан помилки доступу
 */
function showAccessDeniedState() {
    const container = document.getElementById('users-table-container');
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state">
            <span class="material-symbols-outlined">block</span>
            <p>Доступ заборонено. Потрібна роль admin.</p>
        </div>
    `;
}

/**
 * Перевіряє авторизацію та завантажує дані
 * @param {Object} user - Дані користувача з події auth-state-changed
 */
async function checkAuthAndLoadData(user) {
    if (!user) {
        console.log('❌ Користувач не авторизований');
        showUnauthorizedState();
        return;
    }

    // Перевірити роль admin
    if (user.role !== 'admin') {
        console.log('❌ Доступ заборонено. Потрібна роль admin.');
        showAccessDeniedState();
        return;
    }

    console.log('✅ Користувач авторизований як admin:', user.username);

    // Завантажити дані
    await loadUsers();

    // Ініціалізувати пагінацію
    initPaginationForUsers();

    // Ініціалізувати контроль видимості колонок
    initColumnVisibility();

    // Відобразити таблицю
    await renderUsersTable();
}

/**
 * Завантажує список користувачів з API
 */
async function loadUsers() {
    try {
        console.log('📥 Завантаження користувачів...');

        const response = await window.apiClient.get('/api/users');

        if (response.success) {
            usersAdminState.users = response.users;
            usersAdminState.pagination.totalItems = response.users.length;
            console.log(`✅ Завантажено ${response.users.length} користувачів`);
        } else {
            throw new Error(response.error || 'Failed to load users');
        }
    } catch (error) {
        console.error('❌ Помилка завантаження користувачів:', error);
        showError('Не вдалося завантажити користувачів');
    }
}

/**
 * Показує помилку
 */
function showError(message) {
    const container = document.getElementById('users-table-container');
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state">
            <span class="material-symbols-outlined">error</span>
            <p>${message}</p>
        </div>
    `;
}

/**
 * Ініціалізує кнопку оновлення
 */
function initRefreshButton() {
    const refreshBtn = document.getElementById('refresh-tab-users');
    if (!refreshBtn) return;

    refreshBtn.addEventListener('click', async () => {
        const user = window.currentUser;
        if (user) {
            await checkAuthAndLoadData(user);
        } else {
            showUnauthorizedState();
        }
    });
}

/**
 * Ініціалізує кнопку додавання користувача
 */
function initAddUserButton() {
    const addBtn = document.getElementById('add-user-btn');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
        // Викликати модалку користувача без даних (режим створення)
        const event = new CustomEvent('open-user-modal');
        document.dispatchEvent(event);
    });
}

/**
 * Ініціалізує контроль видимості колонок
 */
function initColumnVisibility() {
    // Фіксований порядок колонок: Аватар, Повне ім'я, Ім'я користувача, Роль, Останній вхід
    // (Дії додаються автоматично через renderPseudoTable)
    usersAdminState.visibleColumns = ['avatar', 'display_name', 'username', 'role', 'last_login'];
}

// =========================================================================
// ROLES TAB INITIALIZATION
// =========================================================================

/**
 * Ініціалізує систему табів (section-navigator)
 */
function initTabs() {
    const tabButtons = document.querySelectorAll('[data-tab-target]');
    const tabContents = document.querySelectorAll('[data-tab-content]');

    tabButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const targetTab = button.dataset.tabTarget;

            // Оновити активні стани кнопок
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Оновити активні стани контентів
            tabContents.forEach(content => {
                if (content.dataset.tabContent === targetTab) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });

            // Зберегти поточний таб
            usersAdminState.currentTab = targetTab;

            // Завантажити дані для ролей якщо потрібно
            if (targetTab === 'tab-roles-manage' && usersAdminState.roles.length === 0) {
                await loadRolesData();
            }

            // TODO: Permissions tabs - recreate if needed
            // if (targetTab === 'tab-permissions-catalog') {
            //     const success = await loadPermissionsCatalog();
            //     if (success) {
            //         renderPermissionsCatalogTable('pages');
            //     }
            // }

            // if (targetTab === 'tab-permissions-assignments') {
            //     const success = await loadPermissionAssignments();
            //     if (success) {
            //         renderPermissionAssignmentsTable('pages');
            //     }
            // }

            // Рендерити відповідний контент
            if (targetTab === 'tab-roles-manage') {
                renderRolesTable(usersAdminState.roles);
            }
        });
    });

    console.log('✅ Таби ініціалізовані');
}

/**
 * Ініціалізує кнопки для табів ролей
 */
function initRolesTabButtons() {
    // Кнопка додавання ролі
    const addRoleBtn = document.getElementById('add-role-btn');
    if (addRoleBtn) {
        addRoleBtn.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('open-role-modal'));
        });
    }

    // Кнопка оновлення для табу управління ролями
    const refreshManageBtn = document.getElementById('refresh-tab-roles-manage');
    if (refreshManageBtn) {
        refreshManageBtn.addEventListener('click', async () => {
            await loadRolesData();
            renderRolesTable(usersAdminState.roles);
        });
    }

    console.log('✅ Кнопки табів ролей ініціалізовані');
}

/**
 * TODO: Ініціалізує кнопки для табів прав (recreate if needed)
 */
// function initPermissionsTabButtons() {
//     const addPermissionBtn = document.getElementById('add-permission-btn');
//     if (addPermissionBtn) {
//         addPermissionBtn.addEventListener('click', () => {
//             document.dispatchEvent(new CustomEvent('open-permission-catalog-modal', {
//                 detail: { permission: null, mode: 'create' }
//             }));
//         });
//     }

//     const refreshCatalogBtn = document.getElementById('refresh-tab-permissions-catalog');
//     if (refreshCatalogBtn) {
//         refreshCatalogBtn.addEventListener('click', async () => {
//             const success = await loadPermissionsCatalog();
//             if (success) {
//                 const activeFilter = document.querySelector('[data-permission-catalog-category].active');
//                 const category = activeFilter ? activeFilter.dataset.permissionCatalogCategory : 'pages';
//                 renderPermissionsCatalogTable(category);
//             }
//         });
//     }

//     const refreshAssignmentsBtn = document.getElementById('refresh-tab-permissions-assignments');
//     if (refreshAssignmentsBtn) {
//         refreshAssignmentsBtn.addEventListener('click', async () => {
//             const success = await loadPermissionAssignments();
//             if (success) {
//                 const activeFilter = document.querySelector('[data-permission-assignment-category].active');
//                 const category = activeFilter ? activeFilter.dataset.permissionAssignmentCategory : 'pages';
//                 renderPermissionAssignmentsTable(category);
//             }
//         });
//     }

//     console.log('✅ Кнопки табів прав ініціалізовані');
// }

/**
 * Завантажує дані ролей з API
 */
async function loadRolesData() {
    try {
        console.log('📥 Завантаження ролей...');

        // Завантажити ролі з об'єднаного ендпоінту /api/users
        const rolesResponse = await window.apiClient.get('/api/users?action=roles');

        if (rolesResponse.success) {
            usersAdminState.roles = rolesResponse.roles;
            console.log(`✅ Завантажено ${rolesResponse.roles.length} ролей`);
        } else {
            throw new Error(rolesResponse.error || 'Failed to load roles');
        }

        // TODO: Завантажити каталог прав якщо потрібно
        // const catalogResponse = await window.apiClient.get('/api/users?action=permissions-catalog');
        // if (catalogResponse.success) {
        //     usersAdminState.permissionsCatalog = catalogResponse.permissions;
        //     console.log('✅ Каталог прав завантажено');
        // }

        // Показати кнопку додавання ролі
        const addRoleBtn = document.getElementById('add-role-btn');
        if (addRoleBtn) {
            addRoleBtn.style.display = '';
        }
    } catch (error) {
        console.error('❌ Помилка завантаження ролей:', error);
        showRolesError('Не вдалося завантажити ролі');
    }
}


/**
 * Показує помилку завантаження ролей
 */
function showRolesError(message) {
    const container = document.getElementById('roles-manage-container');
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state">
            <span class="material-symbols-outlined">error</span>
            <p>${message}</p>
        </div>
    `;
}
