// js/tasks/tasks-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         TASKS SYSTEM                                     ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── tasks-main.js     — Точка входу, завантаження плагінів              ║
 * ║  ├── tasks-plugins.js  — Система реєстрації плагінів (хуки)              ║
 * ║  ├── tasks-state.js    — Глобальний стан (tasksState)                    ║
 * ║  └── tasks-data.js     — Google Sheets API (CRUD операції)               ║
 * ║                                                                          ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  ├── tasks-cards.js    — Рендеринг карток задач                          ║
 * ║  ├── tasks-crud.js     — Модальні вікна (додати/редагувати)              ║
 * ║  ├── tasks-events.js   — Обробники подій (пошук, фільтри)                ║
 * ║  └── tasks-ui.js       — UI компоненти (фільтри, статуси)                ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { tasksState } from './tasks-state.js';
import { loadTasks, loadUsers } from './tasks-data.js';
import { runHook, runHookAsync } from './tasks-plugins.js';
import { initPagination } from '../common/ui-pagination.js';
import { initTooltips } from '../common/ui-tooltip.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';
import { registerPanelInitializer } from '../panel/panel-right.js';

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ІНІЦІАЛІЗАТОРА ASIDE (на рівні модуля)
// ═══════════════════════════════════════════════════════════════════════════

registerPanelInitializer('aside-tasks', initAsideTasksHandlers);

// ═══════════════════════════════════════════════════════════════════════════
// ПЛАГІНИ - можна видалити будь-який, система працюватиме
// ═══════════════════════════════════════════════════════════════════════════

const PLUGINS = [
    './tasks-cards.js',
    './tasks-crud.js',
    './tasks-events.js',
    './tasks-ui.js',
];

/**
 * Завантажити плагіни динамічно
 */
async function loadPlugins() {
    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            // Плагін завантажено
        } else {
            console.warn(`[Tasks] ⚠️ Плагін не завантажено: ${PLUGINS[index]}`, result.reason?.message || '');
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// ІНІЦІАЛІЗАЦІЯ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Головна функція ініціалізації модуля Tasks
 */
export async function initTasks() {
    // Ініціалізувати базові UI компоненти
    initTooltips();

    // Завантажити плагіни
    await loadPlugins();

    // Ініціалізувати пагінацію
    initTasksPagination();

    // Ініціалізувати кнопку оновлення
    initRefreshButton();

    // Перевірити авторизацію та завантажити дані
    await checkAuthAndLoadData();

    // Слухати події зміни авторизації
    document.addEventListener('auth-state-changed', async (event) => {
        if (event.detail.isAuthorized) {
            await checkAuthAndLoadData();
        } else {
            renderAuthRequiredState();
        }
    });
}

/**
 * Перевірити авторизацію та завантажити дані
 */
async function checkAuthAndLoadData() {
    // Сторінка тільки для авторизованих (не viewer)
    if (!window.isAuthorized) {
        renderAuthRequiredState();
        return;
    }

    // Перевірка ролі - viewer не має доступу
    const userRole = window.currentUser?.role;
    if (userRole === 'viewer') {
        renderNoAccessState();
        return;
    }

    // Показати/сховати адмін секцію та навігацію
    updateAdminVisibility(userRole);

    // Зберігаємо ID поточного користувача
    tasksState.currentUserId = window.currentUser?.id || window.currentUser?.username;

    if (!tasksState.currentUserId) {
        console.error('❌ Не вдалося визначити ID користувача');
        renderErrorState('Помилка авторизації');
        return;
    }

    try {
        // Завантажити задачі та користувачів паралельно
        await Promise.all([
            loadTasks(),
            loadUsers()
        ]);

        // Рендеримо секцію Задачі (activeTab = 'my')
        tasksState.activeTab = 'my';
        await runHookAsync('onInit', tasksState.tasks);

        // Рендеримо секцію Інформація (activeTab = 'info')
        tasksState.activeTab = 'info';
        runHook('onRender');

        // Повертаємо на 'my' як основний
        tasksState.activeTab = 'my';

        // Рендеримо профіль
        renderProfileSection();

    } catch (error) {
        console.error('❌ Помилка завантаження даних:', error);
        renderErrorState();
    }
}

/**
 * Ініціалізувати пагінацію
 */
function initTasksPagination() {
    const footer = document.querySelector('.fixed-footer');
    if (!footer) {
        console.warn('⚠️ Footer не знайдено');
        return;
    }

    const paginationAPI = initPagination(footer, {
        currentPage: tasksState.pagination.currentPage,
        pageSize: tasksState.pagination.pageSize,
        totalItems: tasksState.pagination.totalItems,
        onPageChange: (page, pageSize) => {
            tasksState.pagination.currentPage = page;
            tasksState.pagination.pageSize = pageSize;
            runHook('onRender');
        }
    });

    tasksState.paginationAPI = paginationAPI;
}

/**
 * Ініціалізувати кнопку оновлення
 */
function initRefreshButton() {
    const refreshBtn = document.getElementById('refresh-tasks');
    if (!refreshBtn) return;

    refreshBtn.addEventListener('click', async () => {
        const icon = refreshBtn.querySelector('.material-symbols-outlined');
        if (icon) icon.classList.add('is-spinning');
        refreshBtn.disabled = true;

        try {
            await loadTasks();

            // Оновити обидві секції
            tasksState.activeTab = 'my';
            runHook('onRender');

            tasksState.activeTab = 'info';
            runHook('onRender');

            tasksState.activeTab = 'my';

        } catch (error) {
            console.error('❌ Помилка оновлення:', error);
        } finally {
            if (icon) icon.classList.remove('is-spinning');
            refreshBtn.disabled = false;
        }
    });
}

/**
 * Ініціалізувати обробники в aside-tasks
 * Викликається panel-right.js після завантаження шаблону
 */
function initAsideTasksHandlers() {
    // Пошук
    const searchInput = document.getElementById('search-tasks');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            tasksState.searchQuery = e.target.value;
            tasksState.pagination.currentPage = 1;
            runHook('onRender');
        });
    }

    // Кнопка очистки пошуку
    const clearSearchBtn = document.getElementById('clear-search-tasks');
    if (clearSearchBtn && searchInput) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            tasksState.searchQuery = '';
            tasksState.pagination.currentPage = 1;
            clearSearchBtn.classList.add('u-hidden');
            runHook('onRender');
        });

        searchInput.addEventListener('input', () => {
            if (searchInput.value.trim()) {
                clearSearchBtn.classList.remove('u-hidden');
            } else {
                clearSearchBtn.classList.add('u-hidden');
            }
        });
    }

    // Кнопка "Додати задачу"
    const addTaskBtn = document.getElementById('btn-add-task');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', async () => {
            try {
                const { showAddTaskModal } = await import('./tasks-crud.js');
                showAddTaskModal();
            } catch (e) {
                console.warn('tasks-crud.js не завантажено');
            }
        });
    }
}

/**
 * Показати/сховати адмін секцію та навігацію
 */
function updateAdminVisibility(userRole) {
    const adminSection = document.getElementById('section-admin');
    const adminNav = document.getElementById('nav-admin');

    if (userRole === 'admin') {
        adminSection?.classList.remove('u-hidden');
        adminNav?.classList.remove('u-hidden');
    } else {
        adminSection?.classList.add('u-hidden');
        adminNav?.classList.add('u-hidden');
    }
}

/**
 * Рендеринг секції профілю
 */
function renderProfileSection() {
    const container = document.getElementById('profile-container');
    if (!container) return;

    const user = window.currentUser;
    if (!user) return;

    // Використовуємо існуючий avatar компонент
    const avatarHtml = renderAvatarState('user', {
        user: {
            avatar: user.avatar,
            display_name: user.display_name || user.username,
            role: user.role
        },
        size: 'large',
        containerClass: 'profile-avatar-container',
        showMessage: false
    });

    const roleLabels = {
        admin: 'Адміністратор',
        editor: 'Редактор',
        viewer: 'Глядач'
    };

    container.innerHTML = `
        <div class="profile-section">
            ${avatarHtml}
            <div class="profile-info">
                <h3 class="profile-name">${user.display_name || user.username}</h3>
                <span class="profile-role">${roleLabels[user.role] || user.role}</span>
            </div>
        </div>
    `;
}

/**
 * Відрендерити стан "Потрібна авторизація"
 */
function renderAuthRequiredState() {
    const container = document.getElementById('tasks-container-my');
    if (!container) return;

    const avatarHtml = renderAvatarState('authLogin', {
        message: 'Авторизуйтесь для доступу до задач',
        size: 'medium',
        containerClass: 'empty-state-container',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });

    container.innerHTML = avatarHtml;
}

/**
 * Відрендерити стан "Немає доступу"
 */
function renderNoAccessState() {
    const container = document.getElementById('tasks-container-my');
    if (!container) return;

    const avatarHtml = renderAvatarState('error', {
        message: 'У вас немає доступу до цієї сторінки',
        size: 'medium',
        containerClass: 'empty-state-container',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });

    container.innerHTML = avatarHtml;
}

/**
 * Відрендерити стан помилки
 */
function renderErrorState(message = 'Помилка завантаження даних') {
    const container = document.getElementById('tasks-container-my');
    if (!container) return;

    const avatarHtml = renderAvatarState('error', {
        message: message,
        size: 'medium',
        containerClass: 'empty-state-container',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });

    container.innerHTML = avatarHtml;
}
