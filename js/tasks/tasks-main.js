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
import { getCurrentUserAvatar } from '../common/avatar/avatar-state.js';
import { AVATAR_HD_PATH, DEFAULT_ANIMAL, AVATAR_SIZES } from '../common/avatar/avatar-config.js';
import { registerPanelInitializer } from '../panel/panel-right.js';

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ІНІЦІАЛІЗАТОРІВ ASIDE (на рівні модуля)
// ═══════════════════════════════════════════════════════════════════════════

registerPanelInitializer('aside-tasks', initAsideTasksHandlers);
registerPanelInitializer('aside-cabinet', initAsideCabinetHandlers);
registerPanelInitializer('aside-cabinet-links', initAsideCabinetLinksHandlers);
registerPanelInitializer('aside-admin', initAsideAdminHandlers);

// ═══════════════════════════════════════════════════════════════════════════
// ПЛАГІНИ - можна видалити будь-який, система працюватиме
// ═══════════════════════════════════════════════════════════════════════════

const PLUGINS = [
    './tasks-cabinet.js',
    './tasks-cards.js',
    './tasks-crud.js',
    './tasks-events.js',
    './tasks-ui.js',
    './tasks-links.js',
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

    } catch (error) {
        console.error('❌ Помилка завантаження даних:', error);
        renderErrorState();
    }
}

/**
 * Ініціалізувати пагінацію
 */
function initTasksPagination() {
    const footer = document.querySelector('.footer');
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
        if (icon) icon.classList.add('spinning');
        refreshBtn.disabled = true;

        try {
            await loadTasks();

            tasksState.activeTab = 'my';
            runHook('onRender');

        } catch (error) {
            console.error('❌ Помилка оновлення:', error);
        } finally {
            if (icon) icon.classList.remove('spinning');
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
 * Ініціалізувати обробники в aside-cabinet
 * Викликається panel-right.js після завантаження шаблону aside-cabinet.html
 *
 * Заповнює профіль юзера в aside та підключає кнопку "Додати задачу"
 */
function initAsideCabinetHandlers() {
    const user = window.currentUser;
    if (!user) return;

    // Аватар в aside
    const avatarEl = document.getElementById('aside-cabinet-avatar');
    if (avatarEl) {
        const animal = getCurrentUserAvatar() || DEFAULT_ANIMAL;
        const avatarPath = `${AVATAR_HD_PATH}/${animal}-calm.png`;
        avatarEl.innerHTML = `<img src="${avatarPath}" alt="${animal}" style="width: 48px; height: 48px; border-radius: 50%;" onerror="this.style.display='none'">`;
    }

    // Ім'я та роль
    const nameEl = document.getElementById('aside-cabinet-name');
    const roleEl = document.getElementById('aside-cabinet-role');

    const roleLabels = { admin: 'Адміністратор', editor: 'Редактор', viewer: 'Глядач' };

    if (nameEl) nameEl.textContent = user.display_name || user.username;
    if (roleEl) roleEl.textContent = roleLabels[user.role] || user.role;

    // Статистика в aside (оновиться після завантаження даних)
    updateAsideCabinetStats();

    // Кнопка "Додати задачу" в aside-cabinet
    const addTaskBtn = document.getElementById('btn-add-task-cabinet');
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
 * Ініціалізувати обробники в aside-cabinet-links
 * Викликається panel-right.js після завантаження шаблону
 */
function initAsideCabinetLinksHandlers() {
    const searchInput = document.getElementById('search-cabinet-links');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const container = document.getElementById('links-container');
            if (!container) return;

            container.querySelectorAll('[data-link-name]').forEach(item => {
                const name = (item.dataset.linkName || '').toLowerCase();
                const desc = (item.dataset.linkDesc || '').toLowerCase();
                item.style.display = (name.includes(query) || desc.includes(query) || !query)
                    ? '' : 'none';
            });
        });
    }

    const clearBtn = document.getElementById('clear-search-cabinet-links');
    if (clearBtn && searchInput) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            clearBtn.classList.add('u-hidden');
        });
        searchInput.addEventListener('input', () => {
            clearBtn.classList.toggle('u-hidden', !searchInput.value.trim());
        });
    }

    // Чекбокси категорій
    document.querySelectorAll('[data-link-category-filter]').forEach(cb => {
        cb.addEventListener('change', () => {
            const category = cb.dataset.linkCategoryFilter;
            const container = document.getElementById('links-container');
            if (!container) return;

            const group = container.querySelector(`[data-links-group="${category}"]`);
            if (group) {
                group.style.display = cb.checked ? '' : 'none';
            }
        });
    });
}

/**
 * Ініціалізувати обробники в aside-admin
 * Викликається panel-right.js після завантаження шаблону
 */
function initAsideAdminHandlers() {
    const statsEl = document.getElementById('aside-admin-stats');
    if (!statsEl) return;

    const totalTasks = tasksState.tasks.length;
    const totalUsers = tasksState.users.length;

    statsEl.innerHTML = `
        <div class="u-flex-col-8">
            <span style="font-size: 12px;">
                <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: -2px;">task_alt</span>
                Задачі: <strong>${totalTasks}</strong>
            </span>
            <span style="font-size: 12px;">
                <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: -2px;">group</span>
                Користувачі: <strong>${totalUsers}</strong>
            </span>
        </div>
    `;
}

/**
 * Оновити статистику в aside-cabinet
 * Показує кількість задач по статусах
 */
function updateAsideCabinetStats() {
    const statsEl = document.getElementById('aside-cabinet-stats');
    if (!statsEl) return;

    const userId = tasksState.currentUserId;
    if (!userId) {
        statsEl.innerHTML = '<span class="avatar-state-message">Авторизуйтесь</span>';
        return;
    }

    const myTasks = tasksState.tasks.filter(t =>
        t.created_by === userId ||
        (t.assigned_to && t.assigned_to.split(',').map(id => id.trim()).includes(userId))
    );

    const todo = myTasks.filter(t => t.status === 'todo').length;
    const inProgress = myTasks.filter(t => t.status === 'in_progress').length;
    const done = myTasks.filter(t => t.status === 'done').length;

    statsEl.innerHTML = `
        <div class="u-flex-col-8">
            <span style="font-size: 12px;"><span class="material-symbols-outlined" style="font-size: 14px; vertical-align: -2px;">radio_button_unchecked</span> До виконання: <strong>${todo}</strong></span>
            <span style="font-size: 12px;"><span class="material-symbols-outlined" style="font-size: 14px; vertical-align: -2px;">pending</span> В роботі: <strong>${inProgress}</strong></span>
            <span style="font-size: 12px;"><span class="material-symbols-outlined" style="font-size: 14px; vertical-align: -2px;">check_circle</span> Виконано: <strong>${done}</strong></span>
        </div>
    `;
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
            containerClass: 'empty-state',
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
            containerClass: 'empty-state',
            avatarClass: 'empty-state-avatar',
            messageClass: 'avatar-state-message',
            showMessage: true
        });
    }

    // Показуємо в посиланнях
    const linksContainer = document.getElementById('links-container');
    if (linksContainer) {
        linksContainer.innerHTML = renderAvatarState('authRequired', {
            message: 'Авторизуйтесь для перегляду посилань',
            size: 'lg',
            containerClass: 'empty-state',
            avatarClass: 'empty-state-avatar',
            messageClass: 'avatar-state-message',
            showMessage: true
        });
    }
}

/**
 * Відрендерити стан "Немає доступу"
 */
function renderNoAccessState() {
    const container = document.getElementById('cabinet-container');
    if (!container) return;

    container.innerHTML = renderAvatarState('error', {
        message: 'У вас немає доступу до цієї сторінки',
        size: 'xl',
        containerClass: 'empty-state',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });
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
        containerClass: 'empty-state',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });
}
