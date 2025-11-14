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

/**
 * Глобальний state для users admin модуля
 */
export const usersAdminState = {
    // Дані
    users: [],                 // Список користувачів з Users Database

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

    // НЕ викликати checkAuthAndLoadData() одразу - чекаємо на auth-state-changed!

    // Слухати події зміни авторизації
    document.addEventListener('auth-state-changed', (event) => {
        console.log('🔐 Подія auth-state-changed:', event.detail);
        if (event.detail.isAuthorized && event.detail.user) {
            checkAuthAndLoadData(event.detail.user);
        } else {
            showUnauthorizedState();
        }
    });

    // Ініціалізувати модалки
    initModals();

    // Ініціалізувати кнопку оновлення
    initRefreshButton();

    // Ініціалізувати кнопку додавання користувача
    initAddUserButton();
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
    if (!refreshBtn) {
        console.error('❌ Кнопка #refresh-tab-users не знайдена');
        return;
    }

    console.log('✅ Кнопка оновлення ініціалізована');
    refreshBtn.addEventListener('click', async () => {
        console.log('🔄 Клік на кнопку оновлення');
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
    if (!addBtn) {
        console.error('❌ Кнопка #add-user-btn не знайдена');
        return;
    }

    console.log('✅ Кнопка додавання користувача ініціалізована');
    addBtn.addEventListener('click', () => {
        console.log('➕ Клік на кнопку додавання користувача');
        // Викликати модалку додавання користувача
        const event = new CustomEvent('open-add-user-modal');
        document.dispatchEvent(event);
    });
}

/**
 * Ініціалізує контроль видимості колонок
 */
function initColumnVisibility() {
    // Фіксований порядок колонок: Дії, Ім'я, Роль, Останній вхід
    usersAdminState.visibleColumns = ['actions', 'username', 'role', 'last_login'];
}
