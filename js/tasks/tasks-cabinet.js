// js/tasks/tasks-cabinet.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS - CABINET PLUGIN                                ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔌 ПЛАГІН — цей файл можна видалити, система працюватиме без нього.     ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Рендеринг секції "Кабінет" на сторінці tasks.html:                      ║
 * ║  - Привітання з великим HD аватаром та смішним текстом                   ║
 * ║  - Статистика: кількість задач + зарезервовані товари з прайсу           ║
 * ║  - Закріплені записи (pinned tasks/info)                                 ║
 * ║                                                                          ║
 * ║  ХУКИ:                                                                   ║
 * ║  - onInit — початковий рендер кабінету                                   ║
 * ║  - onTaskUpdate — оновлення статистики після змін                        ║
 * ║                                                                          ║
 * ║  ЗАЛЕЖНОСТІ:                                                             ║
 * ║  - tasks-state.js (tasksState, priceStats)                               ║
 * ║  - tasks-plugins.js (registerTasksPlugin)                                ║
 * ║  - avatar-ui-states.js (getAvatarState)                                  ║
 * ║  - avatar-config.js (UI_STATES_CONFIG — cabinetGreeting)                 ║
 * ║  - api-client.js (callSheetsAPI — для прайс-даних)                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { tasksState } from './tasks-state.js';
import { registerTasksPlugin, runHook } from './tasks-plugins.js';
import { getAvatarState } from '../common/avatar/avatar-ui-states.js';
import { UI_STATES_CONFIG, AVATAR_HD_PATH, DEFAULT_ANIMAL, AVATAR_SIZES, EMOTION_ALIASES } from '../common/avatar/avatar-config.js';
import { getCurrentUserAvatar } from '../common/avatar/avatar-state.js';
import { callSheetsAPI } from '../utils/api-client.js';

// ═══════════════════════════════════════════════════════════════════════════
// ЗАВАНТАЖЕННЯ ДАНИХ ПРАЙСУ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Завантажити статистику зарезервованих товарів поточного юзера з прайс-таблиці.
 * Використовує spreadsheetType: 'price', аркуш Price.
 * Фільтрує по display_name поточного користувача (колонка I — reserve).
 *
 * @returns {Promise<void>} Оновлює tasksState.priceStats
 */
async function loadPriceStats() {
    try {
        const displayName = window.currentUser?.display_name;
        if (!displayName) {
            tasksState.priceStats = { totalReserved: 0, totalPosted: 0, totalChecked: 0, noArticle: 0, canPost: 0, loaded: true };
            return;
        }

        const result = await callSheetsAPI('get', {
            range: 'Price!A:P',
            spreadsheetType: 'price'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            tasksState.priceStats = { totalReserved: 0, totalPosted: 0, totalChecked: 0, noArticle: 0, canPost: 0, loaded: true };
            return;
        }

        // Пропускаємо заголовок, фільтруємо по reserve (колонка I, індекс 8)
        const dataRows = result.slice(1);
        const myItems = dataRows.filter(row => {
            const reserve = (row[8] || '').trim();
            return reserve === displayName;
        });

        const totalPosted = myItems.filter(row => (row[9] || '').toUpperCase() === 'TRUE').length;
        const noArticle = myItems.filter(row => !(row[1] || '').trim()).length;

        tasksState.priceStats = {
            totalReserved: myItems.length,
            totalPosted,
            totalChecked: myItems.filter(row => (row[11] || '').toUpperCase() === 'TRUE').length,
            noArticle,                  // Без артикулу — не можна викласти
            canPost: myItems.length - totalPosted - noArticle,  // Є артикул, але ще не викладено
            loaded: true
        };

    } catch (error) {
        console.warn('[Cabinet] ⚠️ Не вдалося завантажити прайс-статистику:', error.message);
        tasksState.priceStats = { totalReserved: 0, totalPosted: 0, totalChecked: 0, noArticle: 0, canPost: 0, loaded: true };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ЗАВАНТАЖЕННЯ ДАНИХ БРЕНДІВ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Завантажити статистику брендів з Main Spreadsheet.
 * @returns {Promise<void>} Оновлює tasksState.brandsStats
 */
async function loadBrandsStats() {
    try {
        const result = await callSheetsAPI('get', {
            range: 'Brands!A:F',
            spreadsheetType: 'main'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            tasksState.brandsStats = { total: 0, active: 0, inactive: 0, loaded: true };
            return;
        }

        const dataRows = result.slice(1).filter(row => row[0]); // рядки з brand_id
        const active = dataRows.filter(row => (row[5] || '').toLowerCase() === 'active').length;

        tasksState.brandsStats = {
            total: dataRows.length,
            active,
            inactive: dataRows.length - active,
            loaded: true
        };
    } catch (error) {
        console.warn('[Cabinet] ⚠️ Не вдалося завантажити статистику брендів:', error.message);
        tasksState.brandsStats = { total: 0, active: 0, inactive: 0, loaded: true };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// СТАТИСТИКА ЗАДАЧ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Порахувати статистику задач поточного юзера.
 *
 * @returns {Object} { active, urgent, done, info }
 */
function getTaskStats() {
    const userId = tasksState.currentUserId;
    if (!userId) return { active: 0, urgent: 0, done: 0, info: 0 };

    const myTasks = tasksState.tasks.filter(t =>
        t.created_by === userId || isUserAssigned(t.assigned_to, userId)
    );

    return {
        active: myTasks.filter(t => ['todo', 'in_progress'].includes(t.status) && t.type === 'task').length,
        urgent: myTasks.filter(t => ['todo', 'in_progress'].includes(t.status) && t.priority === 'urgent').length,
        done: myTasks.filter(t => t.status === 'done').length,
        info: myTasks.filter(t => ['info', 'script', 'reference'].includes(t.type)).length,
        total: myTasks.length
    };
}

/**
 * Перевірити чи користувач є в списку виконавців
 * @param {string} assignedTo - CSV user IDs
 * @param {string} userId - ID для перевірки
 * @returns {boolean}
 */
function isUserAssigned(assignedTo, userId) {
    if (!assignedTo || !userId) return false;
    return assignedTo.split(',').map(id => id.trim()).includes(userId);
}

// ═══════════════════════════════════════════════════════════════════════════
// ЗАКРІПЛЕНІ ЗАПИСИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати закріплені записи поточного юзера.
 * Закріплення зберігається в localStorage по ключу `pinned-tasks-{userId}`.
 * Максимум 5 закріплених.
 *
 * @returns {Array} Масив задач зі state, які закріплені
 */
function getPinnedTasks() {
    const userId = tasksState.currentUserId;
    if (!userId) return [];

    const pinnedIds = getPinnedIds();
    return tasksState.tasks
        .filter(t => pinnedIds.includes(t.id))
        .slice(0, 5);
}

/**
 * Отримати масив ID закріплених задач з localStorage
 * @returns {Array<string>}
 */
function getPinnedIds() {
    const userId = tasksState.currentUserId;
    if (!userId) return [];

    try {
        const stored = localStorage.getItem(`pinned-tasks-${userId}`);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * Закріпити/відкріпити задачу (toggle)
 * @param {string} taskId - ID задачі
 * @returns {boolean} Новий стан (true = закріплено)
 */
export function togglePin(taskId) {
    const userId = tasksState.currentUserId;
    if (!userId) return false;

    const pinnedIds = getPinnedIds();
    const index = pinnedIds.indexOf(taskId);

    if (index > -1) {
        pinnedIds.splice(index, 1);
    } else {
        if (pinnedIds.length >= 5) {
            pinnedIds.shift(); // Видалити найстаріший якщо > 5
        }
        pinnedIds.push(taskId);
    }

    localStorage.setItem(`pinned-tasks-${userId}`, JSON.stringify(pinnedIds));
    return index === -1; // true якщо закріпили
}

/**
 * Перевірити чи задача закріплена
 * @param {string} taskId - ID задачі
 * @returns {boolean}
 */
export function isPinned(taskId) {
    return getPinnedIds().includes(taskId);
}

// ═══════════════════════════════════════════════════════════════════════════
// ПРИВІТАННЯ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Згенерувати HTML привітання з аватаром.
 * Використовує cabinetGreeting state з avatar-config.js.
 * Підтримує рандомну емоцію з масиву emotions.
 *
 * @returns {string} HTML
 */
function renderGreeting() {
    const user = window.currentUser;
    if (!user) return '';

    const config = UI_STATES_CONFIG.cabinetGreeting;
    if (!config) return '';

    // Рандомна емоція з масиву (якщо є) або фіксована
    const emotions = config.emotions || [config.emotion];
    const emotion = emotions[Math.floor(Math.random() * emotions.length)];
    const normalizedEmotion = EMOTION_ALIASES[emotion] || emotion;

    // Рандомне повідомлення
    const message = config.messages[Math.floor(Math.random() * config.messages.length)];

    // Аватар юзера або дефолтний
    const animal = getCurrentUserAvatar() || DEFAULT_ANIMAL;
    const avatarPath = `${AVATAR_HD_PATH}/${animal}-${normalizedEmotion}.png`;
    const fallbackPath = `${AVATAR_HD_PATH}/${DEFAULT_ANIMAL}-${normalizedEmotion}.png`;
    const size = AVATAR_SIZES.xxl; // 160px

    const roleLabels = {
        admin: 'Адміністратор',
        editor: 'Редактор',
        viewer: 'Глядач'
    };

    return `
        <div class="group" style="gap: 24px; align-items: center;">
            <img
                src="${avatarPath}"
                alt="${animal} ${normalizedEmotion}"
                class="avatar-state-image"
                style="width: ${size}; height: ${size}; flex-shrink: 0;"
                onerror="this.onerror=null; this.src='${fallbackPath}'"
            >
            <div class="u-flex-col-8">
                <p class="avatar-state-title">${escapeHtml(message)}</p>
                <p class="avatar-state-message">
                    <strong>${escapeHtml(user.display_name || user.username)}</strong>
                    &nbsp;·&nbsp;${roleLabels[user.role] || user.role}
                </p>
            </div>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════════════════════
// РЕНДЕР СТАТИСТИКИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Згенерувати HTML для stat-карток.
 * 2 картки: задачі + товари. Використовує grid2 та існуючі badge/chip класи.
 *
 * @returns {string} HTML
 */
function renderStats() {
    const stats = getTaskStats();
    const price = tasksState.priceStats;
    const brands = tasksState.brandsStats || {};

    return `
        <div class="grid2" style="margin-top: 16px;">
            <div class="content-line panel" style="flex-direction: column; height: auto; gap: 4px; cursor: pointer;"
                 data-cabinet-navigate="section-tasks">
                <span class="material-symbols-outlined">task_alt</span>
                <strong style="font-size: 24px;">${stats.active}</strong>
                <span class="avatar-state-message" style="font-size: 12px; max-width: none;">активних задач</span>
                ${stats.urgent > 0 ? `<span class="chip chip-error" style="font-size: 11px;">${stats.urgent} термінових</span>` : ''}
            </div>

            <a href="price.html" class="content-line panel" style="flex-direction: column; height: auto; gap: 4px; text-decoration: none; color: inherit;">
                <span class="material-symbols-outlined">inventory_2</span>
                <strong style="font-size: 24px;">${price.loaded ? price.totalReserved : '...'}</strong>
                <span class="avatar-state-message" style="font-size: 12px; max-width: none;">зарезервовано</span>
                ${price.loaded && price.noArticle > 0 ? `<span class="chip chip-error" style="font-size: 11px;">${price.noArticle} без артикулу</span>` : ''}
                ${price.loaded && price.canPost > 0 ? `<span class="chip chip-success" style="font-size: 11px;">${price.canPost} можна викласти</span>` : ''}
            </a>

            <a href="brands.html" class="content-line panel" style="flex-direction: column; height: auto; gap: 4px; text-decoration: none; color: inherit;">
                <span class="material-symbols-outlined">shopping_bag</span>
                <strong style="font-size: 24px;">${brands.loaded ? brands.total : '...'}</strong>
                <span class="avatar-state-message" style="font-size: 12px; max-width: none;">брендів</span>
                ${brands.loaded && brands.active > 0 ? `<span class="chip chip-success" style="font-size: 11px;">${brands.active} активних</span>` : ''}
            </a>

            <div class="content-line panel" style="flex-direction: column; height: auto; gap: 4px; cursor: pointer;"
                 data-cabinet-navigate="section-tasks" data-cabinet-type-filter="info">
                <span class="material-symbols-outlined">lightbulb</span>
                <strong style="font-size: 24px;">${stats.info}</strong>
                <span class="avatar-state-message" style="font-size: 12px; max-width: none;">записів інфо</span>
            </div>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════════════════════
// РЕНДЕР ЗАКРІПЛЕНИХ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Згенерувати HTML для закріплених записів.
 * Використовує content-card компонент.
 *
 * @returns {string} HTML (порожній рядок якщо немає закріплених)
 */
function renderPinned() {
    const pinned = getPinnedTasks();
    if (pinned.length === 0) return '';

    const TYPE_MAP = {
        task: { icon: 'task_alt', text: 'Задача' },
        info: { icon: 'lightbulb', text: 'Інфо' },
        script: { icon: 'code', text: 'Скрипт' },
        reference: { icon: 'link', text: 'Посилання' }
    };

    const cards = pinned.map(task => {
        const type = TYPE_MAP[task.type] || TYPE_MAP.task;
        return `
            <div class="content-card" data-task-id="${task.id}" data-pinned="true" style="max-width: none;">
                <div class="content-card-header">
                    <h4 class="content-card-title">${escapeHtml(task.title)}</h4>
                    <button class="btn-icon" data-action="unpin" data-task-id="${task.id}" aria-label="Відкріпити">
                        <span class="material-symbols-outlined" style="color: var(--color-surface);">star</span>
                    </button>
                </div>
                <div class="content-card-footer">
                    <div class="content-card-footer-left">
                        <span class="badge">
                            <span class="material-symbols-outlined">${type.icon}</span>
                        </span>
                        <span style="font-size: 11px; opacity: 0.7;">${type.text}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div style="margin-top: 16px;">
            <div class="section-name" style="margin-bottom: 8px;">
                <span class="material-symbols-outlined" style="font-size: 18px; opacity: 0.5;">push_pin</span>
                <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-secondary);">Закріплене</span>
            </div>
            <div class="u-flex-col-8">
                ${cards}
            </div>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════════════════════
// НЕЩОДАВНЯ АКТИВНІСТЬ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Згенерувати HTML для нещодавньої активності.
 * Останні 5 оновлених задач поточного юзера.
 *
 * @returns {string} HTML (порожній рядок якщо немає активності)
 */
function renderRecentActivity() {
    const userId = tasksState.currentUserId;
    if (!userId) return '';

    const recentTasks = tasksState.tasks
        .filter(t =>
            (t.created_by === userId || isUserAssigned(t.assigned_to, userId)) &&
            t.updated_at
        )
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 5);

    if (recentTasks.length === 0) return '';

    const TYPE_ICONS = {
        task: 'task_alt',
        info: 'lightbulb',
        script: 'code',
        reference: 'link'
    };
    const STATUS_ICONS = {
        todo: 'radio_button_unchecked',
        in_progress: 'pending',
        done: 'check_circle'
    };

    const items = recentTasks.map(t => {
        const typeIcon = TYPE_ICONS[t.type] || TYPE_ICONS.task;
        const statusIcon = STATUS_ICONS[t.status] || STATUS_ICONS.todo;
        const timeAgo = formatTimeAgo(t.updated_at);

        return `
            <div class="content-card" data-task-id="${t.id}" data-recent="true" style="max-width: none; min-width: 0;">
                <div class="content-card-header">
                    <h4 class="content-card-title">${escapeHtml(t.title)}</h4>
                    <span class="badge">
                        <span class="material-symbols-outlined">${statusIcon}</span>
                    </span>
                </div>
                <div class="content-card-footer">
                    <div class="content-card-footer-left">
                        <span class="badge">
                            <span class="material-symbols-outlined">${typeIcon}</span>
                        </span>
                        <span style="font-size: 11px; opacity: 0.7;">${timeAgo}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div style="margin-top: 16px;">
            <div class="section-name" style="margin-bottom: 8px;">
                <span class="material-symbols-outlined" style="font-size: 18px; opacity: 0.5;">history</span>
                <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-secondary);">Нещодавня активність</span>
            </div>
            <div class="u-flex-col-8">${items}</div>
        </div>
    `;
}

/**
 * Відформатувати дату у відносний час (українською)
 * @param {string} dateStr - ISO datetime
 * @returns {string}
 */
function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'щойно';
    if (diffMin < 60) return `${diffMin} хв тому`;
    if (diffHours < 24) return `${diffHours} год тому`;
    if (diffDays < 7) return `${diffDays} дн тому`;
    return date.toLocaleDateString('uk-UA');
}

// ═══════════════════════════════════════════════════════════════════════════
// ГОЛОВНИЙ РЕНДЕР КАБІНЕТУ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Відрендерити повну секцію кабінету.
 * Викликається через хуки onInit та onTaskUpdate.
 */
async function renderCabinet() {
    const container = document.getElementById('cabinet-container');
    if (!container) return;

    const user = window.currentUser;
    if (!user) return;

    // Завантажити прайс та бренд статистику паралельно (якщо ще не завантажено)
    const statsToLoad = [];
    if (!tasksState.priceStats.loaded) statsToLoad.push(loadPriceStats());
    if (!tasksState.brandsStats?.loaded) statsToLoad.push(loadBrandsStats());

    if (statsToLoad.length > 0) {
        Promise.allSettled(statsToLoad).then(() => {
            const statsEl = container.querySelector('[data-cabinet-stats]');
            if (statsEl) {
                statsEl.outerHTML = `<div data-cabinet-stats>${renderStats()}</div>`;
                initStatCardNavigation(container);
            }
        });
    }

    container.innerHTML = `
        ${renderGreeting()}
        <div data-cabinet-stats>${renderStats()}</div>
        ${renderPinned()}
        ${renderRecentActivity()}
    `;

    // Обробники
    initPinnedHandlers(container);
    initRecentActivityHandlers(container);
    initStatCardNavigation(container);
}

/**
 * Ініціалізувати обробники кліків на закріплених картках
 * @param {HTMLElement} container
 */
function initPinnedHandlers(container) {
    container.querySelectorAll('[data-action="unpin"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const taskId = btn.dataset.taskId;
            togglePin(taskId);
            renderCabinet();
            runHook('onRender'); // Оновити зірочки в картках задач
        });
    });

    // Клік на закріплену картку -> відкрити перегляд
    container.querySelectorAll('[data-pinned="true"]').forEach(card => {
        card.addEventListener('click', async (e) => {
            if (e.target.closest('[data-action]')) return;
            const taskId = card.dataset.taskId;
            try {
                const { showTaskViewModal } = await import('./tasks-crud.js');
                showTaskViewModal(taskId);
            } catch (err) {
                console.warn('tasks-crud.js не завантажено');
            }
        });
    });
}

/**
 * Ініціалізувати обробники кліків на картках нещодавньої активності
 * @param {HTMLElement} container
 */
function initRecentActivityHandlers(container) {
    container.querySelectorAll('.content-card[data-recent="true"]').forEach(card => {
        card.addEventListener('click', async (e) => {
            if (e.target.closest('[data-action]')) return;
            const taskId = card.dataset.taskId;
            try {
                const { showTaskViewModal } = await import('./tasks-crud.js');
                showTaskViewModal(taskId);
            } catch (err) {
                console.warn('tasks-crud.js не завантажено');
            }
        });
    });
}

/**
 * Ініціалізувати навігацію з stat-карток до секцій
 * @param {HTMLElement} container
 */
function initStatCardNavigation(container) {
    container.querySelectorAll('[data-cabinet-navigate]').forEach(el => {
        el.addEventListener('click', () => {
            const targetId = el.dataset.cabinetNavigate;
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            // Якщо вказано фільтр типу — активувати його
            const typeFilter = el.dataset.cabinetTypeFilter;
            if (typeFilter) {
                tasksState.filters.type = [typeFilter];

                // Синхронізувати filter pills
                const pillsContainer = document.getElementById('type-filter-pills');
                if (pillsContainer) {
                    pillsContainer.querySelectorAll('[data-filter-value]').forEach(p => p.classList.remove('active'));
                    const targetPill = pillsContainer.querySelector(`[data-filter-value="${typeFilter}"]`);
                    if (targetPill) targetPill.classList.add('active');
                }

                // Синхронізувати aside чекбокси
                document.querySelectorAll('[data-filter="type"]').forEach(cb => {
                    cb.checked = cb.value === typeFilter;
                });

                tasksState.pagination.currentPage = 1;
                runHook('onRender');
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// УТИЛІТИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Екранування HTML
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ПЛАГІНА
// ═══════════════════════════════════════════════════════════════════════════

registerTasksPlugin('onInit', renderCabinet);
registerTasksPlugin('onTaskUpdate', renderCabinet);

export { renderCabinet, loadPriceStats, loadBrandsStats, getPinnedTasks, getPinnedIds };
