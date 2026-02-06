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
 * ║  ├── tasks-cabinet.js  — Секція "Кабінет" (привітання, статистика, pin)  ║
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

// ═══════════════════════════════════════════════════════════════════════════
// ПЛАГІНИ - можна видалити будь-який, система працюватиме
// ═══════════════════════════════════════════════════════════════════════════

const PLUGINS = [
    './tasks-cabinet.js',
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

    // Ініціалізувати кнопки "Додати" в секціях
    initAddButtons();

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
    // Сторінка для всіх авторизованих користувачів
    if (!window.isAuthorized) {
        renderAuthRequiredState();
        return;
    }

    const userRole = window.currentUser?.role;

    // Показати/сховати адмін секцію та навігацію
    updateAdminVisibility(userRole);

    // Viewer — read-only: сховати кнопки створення
    if (userRole === 'viewer') {
        document.getElementById('btn-add-task-header')?.classList.add('u-hidden');
        document.getElementById('btn-add-info')?.classList.add('u-hidden');
    }

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
 * Ініціалізувати кнопки "Додати" в заголовках секцій
 */
function initAddButtons() {
    // Кнопка "Додати задачу" в секції Задачі
    const addTaskBtn = document.getElementById('btn-add-task-header');
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

    // Кнопка "Додати запис" в секції Інформація
    const addInfoBtn = document.getElementById('btn-add-info');
    if (addInfoBtn) {
        addInfoBtn.addEventListener('click', async () => {
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
 * Відрендерити стан "Потрібна авторизація"
 */
function renderAuthRequiredState() {
    // Показуємо в кабінеті
    const cabinetContainer = document.getElementById('cabinet-container');
    if (cabinetContainer) {
        cabinetContainer.innerHTML = renderAvatarState('authLogin', {
            message: 'Авторизуйтесь для доступу до кабінету',
            size: 'xl',
            containerClass: 'empty-state-container',
            avatarClass: 'empty-state-avatar',
            messageClass: 'avatar-state-message',
            showMessage: true
        });
    }

    // Показуємо в задачах
    const tasksContainer = document.getElementById('tasks-container-my');
    if (tasksContainer) {
        tasksContainer.innerHTML = renderAvatarState('authRequired', {
            message: 'Авторизуйтесь для перегляду задач',
            size: 'lg',
            containerClass: 'empty-state-container',
            avatarClass: 'empty-state-avatar',
            messageClass: 'avatar-state-message',
            showMessage: true
        });
    }
}

/**
 * Відрендерити стан помилки
 */
function renderErrorState(message = 'Помилка завантаження даних') {
    const container = document.getElementById('cabinet-container');
    if (!container) return;

    container.innerHTML = renderAvatarState('error', {
        message: message,
        size: 'xl',
        containerClass: 'empty-state-container',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });
}
