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
        info: myTasks.filter(t => ['info', 'script', 'reference'].includes(t.type)).length
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
        <div class="u-flex-row-8" style="gap: 24px; align-items: center;">
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

    return `
        <div class="grid2" style="margin-top: 16px;">
            <div class="panel-box" style="flex-direction: column; height: auto; gap: 4px; cursor: default;">
                <span class="material-symbols-outlined panel-box-icon">task_alt</span>
                <strong style="font-size: 24px;">${stats.active}</strong>
                <span class="avatar-state-message" style="font-size: 12px; max-width: none;">активних задач</span>
                ${stats.urgent > 0 ? `<span class="chip chip-error" style="font-size: 11px;">${stats.urgent} термінових</span>` : ''}
            </div>
            <div class="panel-box" style="flex-direction: column; height: auto; gap: 4px; cursor: default;">
                <span class="material-symbols-outlined panel-box-icon">inventory_2</span>
                <strong style="font-size: 24px;">${price.loaded ? price.noArticle : '...'}</strong>
                <span class="avatar-state-message" style="font-size: 12px; max-width: none;">без артикулу</span>
                ${price.loaded && price.canPost > 0 ? `<span class="chip chip-success" style="font-size: 11px;">${price.canPost} можна викласти</span>` : ''}
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

    // Завантажити прайс-статистику паралельно (якщо ще не завантажено)
    if (!tasksState.priceStats.loaded) {
        loadPriceStats().then(() => {
            // Перерендерити тільки статистику
            const statsEl = container.querySelector('[data-cabinet-stats]');
            if (statsEl) statsEl.outerHTML = `<div data-cabinet-stats>${renderStats()}</div>`;
        });
    }

    container.innerHTML = `
        ${renderGreeting()}
        <div data-cabinet-stats>${renderStats()}</div>
        ${renderPinned()}
    `;

    // Обробники для відкріплення
    initPinnedHandlers(container);
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

export { renderCabinet, loadPriceStats, getPinnedTasks, getPinnedIds };
