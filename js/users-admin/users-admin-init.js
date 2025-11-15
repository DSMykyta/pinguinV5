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
import { renderPermissionsMatrix } from './users-admin-roles-matrix.js';
import { initRolesModals } from './users-admin-roles-modals.js';

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
    currentTab: 'tab-users',   // 'tab-users' або 'tab-roles'
    currentRolesView: 'manage-roles', // 'manage-roles' або 'access-matrix'

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

    // Ініціалізувати кнопки для табу користувачів
    initRefreshButton();
    initAddUserButton();

    // Ініціалізувати кнопки для табу ролей
    initRolesTabButtons();

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
        renderCurrentRolesView();
    });
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
        button.addEventListener('click', () => {
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

            // Завантажити дані для табу якщо потрібно
            if (targetTab === 'tab-roles' && usersAdminState.roles.length === 0) {
                loadRolesData();
            }
        });
    });

    console.log('✅ Таби ініціалізовані');
}

/**
 * Ініціалізує кнопки для табу ролей
 */
function initRolesTabButtons() {
    // Кнопка додавання ролі
    const addRoleBtn = document.getElementById('add-role-btn');
    if (addRoleBtn) {
        addRoleBtn.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('open-role-modal'));
        });
    }

    // Кнопка оновлення
    const refreshBtn = document.getElementById('refresh-tab-roles');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await loadRolesData();
            renderCurrentRolesView();
        });
    }

    // Кнопки перемикання між підрозділами (таблиця / матриця)
    const filterButtons = document.querySelectorAll('#tab-roles [data-filter]');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;

            // Оновити активні стани
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Зберегти поточний вид
            usersAdminState.currentRolesView = filter;

            // Відобразити відповідний контент
            renderCurrentRolesView();
        });
    });

    console.log('✅ Кнопки табу ролей ініціалізовані');
}

/**
 * Завантажує дані ролей з API
 */
async function loadRolesData() {
    try {
        console.log('📥 Завантаження ролей...');

        // Завантажити ролі
        const rolesResponse = await window.apiClient.get('/api/roles');

        if (rolesResponse.success) {
            usersAdminState.roles = rolesResponse.roles;
            console.log(`✅ Завантажено ${rolesResponse.roles.length} ролей`);
        } else {
            throw new Error(rolesResponse.error || 'Failed to load roles');
        }

        // Завантажити каталог прав
        const catalogResponse = await window.apiClient.get('/api/roles', { action: 'get-catalog' });

        if (catalogResponse.success) {
            usersAdminState.permissionsCatalog = catalogResponse.catalog;
            console.log('✅ Каталог прав завантажено');
        } else {
            throw new Error(catalogResponse.error || 'Failed to load permissions catalog');
        }

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
 * Рендерить поточний вид ролей (таблиця або матриця)
 */
function renderCurrentRolesView() {
    const manageContainer = document.getElementById('roles-manage-container');
    const matrixContainer = document.getElementById('roles-matrix-container');

    if (usersAdminState.currentRolesView === 'manage-roles') {
        // Показати таблицю ролей
        manageContainer.style.display = '';
        matrixContainer.style.display = 'none';
        renderRolesTable(usersAdminState.roles);
    } else if (usersAdminState.currentRolesView === 'access-matrix') {
        // Показати матрицю доступів
        manageContainer.style.display = 'none';
        matrixContainer.style.display = '';
        if (usersAdminState.permissionsCatalog) {
            renderPermissionsMatrix(usersAdminState.roles, usersAdminState.permissionsCatalog);
        }
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
