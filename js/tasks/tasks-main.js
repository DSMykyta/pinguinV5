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
import { loadTasks } from './tasks-data.js';
import { runHook, runHookAsync } from './tasks-plugins.js';
import { initPagination } from '../common/ui-pagination.js';
import { initTooltips } from '../common/ui-tooltip.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';

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

    // Завантажити aside
    await loadAsideTasks();

    // Ініціалізувати пагінацію
    initTasksPagination();

    // Ініціалізувати перемикання табів
    initTabSwitching();

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

    // Зберігаємо ID поточного користувача
    tasksState.currentUserId = window.currentUser?.id || window.currentUser?.username;

    if (!tasksState.currentUserId) {
        console.error('❌ Не вдалося визначити ID користувача');
        renderErrorState('Помилка авторизації');
        return;
    }

    try {
        await loadTasks();

        // Запустити хук onInit для плагінів
        await runHookAsync('onInit', tasksState.tasks);

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
 * Ініціалізувати перемикання табів
 */
function initTabSwitching() {
    const tabButtons = document.querySelectorAll('[data-tab-target]');
    const tabContents = document.querySelectorAll('[data-tab-content]');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tabTarget;

            // Оновити активну кнопку
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Оновити видимий контент
            tabContents.forEach(content => {
                if (content.dataset.tabContent === targetTab) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });

            // Оновити стан
            const tabName = targetTab.replace('tab-', '');
            tasksState.activeTab = tabName;

            // Скинути пагінацію
            tasksState.pagination.currentPage = 1;

            // Запустити хуки
            runHook('onTabChange', tabName);
            runHook('onRender');
        });
    });
}

/**
 * Відрендерити стан "Потрібна авторизація"
 */
function renderAuthRequiredState() {
    const container = document.querySelector('#tab-my .tasks-container');
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
    const container = document.querySelector('#tab-my .tasks-container');
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
    const container = document.querySelector('#tab-my .tasks-container');
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

/**
 * Завантажити aside панель
 */
async function loadAsideTasks() {
    const panelRightContent = document.getElementById('panel-right-content');
    if (!panelRightContent) return;

    try {
        const response = await fetch('templates/aside/aside-tasks.html');
        if (!response.ok) throw new Error('Failed to load aside-tasks.html');

        const html = await response.text();
        panelRightContent.innerHTML = html;

        // Ініціалізувати пошук
        const searchInput = document.getElementById('search-tasks');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                tasksState.searchQuery = e.target.value;
                tasksState.pagination.currentPage = 1;
                runHook('onRender');
            });
        }

        // Ініціалізувати кнопку очистки пошуку
        const clearSearchBtn = document.getElementById('clear-search-tasks');
        if (clearSearchBtn && searchInput) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                tasksState.searchQuery = '';
                tasksState.pagination.currentPage = 1;
                clearSearchBtn.classList.add('u-hidden');
                runHook('onRender');
            });

            // Показати/сховати кнопку очистки при введенні
            searchInput.addEventListener('input', () => {
                if (searchInput.value.trim()) {
                    clearSearchBtn.classList.remove('u-hidden');
                } else {
                    clearSearchBtn.classList.add('u-hidden');
                }
            });
        }

        // Ініціалізувати кнопку "Додати задачу"
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

    } catch (error) {
        console.error('❌ Помилка завантаження aside-tasks.html:', error);
    }
}
