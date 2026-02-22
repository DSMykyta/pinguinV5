// js/tasks/tasks-cards.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS - CARDS PLUGIN                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Рендеринг карток задач.
 * Використовує content-card, severity-badge, badge, word-chip, btn-icon
 *
 * 🔌 ПЛАГІН — цей файл можна видалити, система працюватиме без нього.
 */

import { tasksState } from './tasks-state.js';
import { getTasksForCurrentTab, canEditTask, canChangeStatus } from './tasks-data.js';
import { registerTasksPlugin, runHook } from './tasks-plugins.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';
import { registerActionHandlers, initActionHandlers, actionButton } from '../common/ui-actions.js';

// ═══════════════════════════════════════════════════════════════════════════
// КОНСТАНТИ
// ═══════════════════════════════════════════════════════════════════════════

const PRIORITY_MAP = {
    urgent: { icon: 'brightness_alert', class: 'c-red', text: 'Терміново' },
    high: { icon: 'warning', class: 'c-red', text: 'Високий' },
    medium: { icon: 'info', class: 'c-yellow', text: 'Середній' },
    low: { icon: 'check_circle', class: 'c-green', text: 'Низький' }
};

const STATUS_MAP = {
    todo: { text: 'До виконання', icon: 'radio_button_unchecked' },
    in_progress: { text: 'В роботі', icon: 'pending' },
    done: { text: 'Виконано', icon: 'check_circle' },
    archived: { text: 'Архів', icon: 'inventory_2' }
};

const TYPE_MAP = {
    task: { icon: 'task_alt', text: 'Задача' },
    info: { icon: 'lightbulb', text: 'Інфо' },
    script: { icon: 'code', text: 'Скрипт' },
    reference: { icon: 'link', text: 'Посилання' }
};

const ACTION_CONTEXT = 'tasks';

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ОБРОБНИКІВ ДІЙ
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers(ACTION_CONTEXT, {
    edit: async (rowId) => {
        try {
            const { showEditTaskModal } = await import('./tasks-crud.js');
            showEditTaskModal(rowId);
        } catch (err) {
            console.warn('tasks-crud.js не завантажено');
        }
    },
    view: async (rowId) => {
        try {
            const { showTaskViewModal } = await import('./tasks-crud.js');
            showTaskViewModal(rowId);
        } catch (err) {
            console.warn('tasks-crud.js не завантажено');
        }
    },
    status: async (rowId) => {
        try {
            const { showStatusDropdown } = await import('./tasks-ui.js');
            const btn = document.querySelector(`[data-action="status"][data-row-id="${rowId}"]`);
            if (btn) showStatusDropdown(btn, rowId);
        } catch (err) {
            console.warn('tasks-ui.js не завантажено');
        }
    },
    pin: async (rowId) => {
        try {
            const { togglePin, renderCabinet } = await import('./tasks-cabinet.js');
            togglePin(rowId);
            renderCabinet();
            runHook('onRender');
        } catch (err) {
            console.warn('tasks-cabinet.js не завантажено');
        }
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// РЕНДЕРИНГ
// ═══════════════════════════════════════════════════════════════════════════

function renderCards() {
    const containerId = `tasks-container-${tasksState.activeTab}`;
    const container = document.getElementById(containerId);
    if (!container) return;

    const statsId = `tab-stats-${tasksState.activeTab}`;
    const statsEl = document.getElementById(statsId);

    const tasks = getTasksForCurrentTab();

    if (statsEl) {
        statsEl.textContent = `${tasks.length} записів`;
    }

    if (tasks.length === 0) {
        renderEmptyState(container);
        return;
    }

    const cardsHtml = tasks.map(task => renderCard(task)).join('');
    container.innerHTML = `<div class="chip-container">${cardsHtml}</div>`;

    initActionHandlers(container, ACTION_CONTEXT);
    initCardClickEvents(container);
}

function renderCard(task) {
    const priority = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
    const status = STATUS_MAP[task.status] || STATUS_MAP.todo;
    const type = TYPE_MAP[task.type] || TYPE_MAP.task;
    const commentsCount = task.comments?.length || 0;

    // Права доступу
    const isAuthor = canEditTask(task);
    const canStatus = canChangeStatus(task);

    // Кнопки дій
    const viewBtn = actionButton({
        action: 'view',
        rowId: task.id,
        icon: 'visibility',
        tooltip: 'Переглянути',
        context: ACTION_CONTEXT
    });

    const editBtn = isAuthor ? actionButton({
        action: 'edit',
        rowId: task.id,
        icon: 'edit',
        tooltip: 'Редагувати',
        context: ACTION_CONTEXT
    }) : '';

    // Pin кнопка (зірочка) — стан з localStorage через tasks-cabinet.js
    const pinIcon = isPinnedTask(task.id) ? 'star' : 'star_border';
    const pinTooltip = isPinnedTask(task.id) ? 'Відкріпити' : 'Закріпити';
    const pinBtn = actionButton({
        action: 'pin',
        rowId: task.id,
        icon: pinIcon,
        tooltip: pinTooltip,
        context: ACTION_CONTEXT
    });

    // Статус badge (клікабельний якщо можна змінити)
    const statusBadgeClass = canStatus ? 'badge c-red clickable' : 'badge';
    const statusBadge = canStatus
        ? actionButton({
            action: 'status',
            rowId: task.id,
            icon: status.icon,
            tooltip: status.text,
            context: ACTION_CONTEXT,
            className: statusBadgeClass
        })
        : `<span class="${statusBadgeClass}"><span class="material-symbols-outlined">${status.icon}</span></span>`;

    // Теги
    const tagsHtml = task.tags
        ? task.tags.split(',').map(t => `<span class="word-chip">${t.trim()}</span>`).join('')
        : '';

    // Коментарі
    const commentsHtml = commentsCount > 0
        ? `<span class="content-card-comments"><span class="material-symbols-outlined">comment</span>${commentsCount}</span>`
        : '';

    // Assigned to (якщо відрізняється від автора)
    const assignedHtml = task.assigned_to && task.assigned_to !== task.created_by
        ? `<span><span class="material-symbols-outlined">arrow_forward</span> ${task.assigned_to}</span>`
        : '';

    return `
        <div class="content-card" data-task-id="${task.id}" data-status="${task.status}">
            <div class="content-card-header">
                <h4 class="content-card-title">${escapeHtml(task.title)}</h4>
                <span class="severity-badge ${priority.class}">
                    <span class="material-symbols-outlined">${priority.icon}</span>
                </span>
            </div>

            ${task.description ? `<p class="content-card-body">${escapeHtml(task.description.substring(0, 120))}${task.description.length > 120 ? '...' : ''}</p>` : ''}

            <div class="content-card-meta">
                <span class="content-card-meta-left">
                    <span class="material-symbols-outlined">person</span>
                    ${task.created_by}
                    ${assignedHtml}
                </span>
                ${statusBadge}
            </div>

            <div class="content-card-footer">
                <div class="content-card-footer-left">
                    <span class="badge">
                        <span class="material-symbols-outlined">${type.icon}</span>
                    </span>
                    ${commentsHtml}
                </div>
                <div class="content-card-footer-right">
                    ${tagsHtml}
                </div>
            </div>

            <div class="content-card-actions">
                ${pinBtn}
                ${viewBtn}
                ${editBtn}
            </div>
        </div>
    `;
}

function renderEmptyState(container) {
    const messages = {
        my: 'У вас ще немає задач'
    };

    const avatarHtml = renderAvatarState('empty', {
        message: messages[tasksState.activeTab] || 'Немає даних',
        size: 'medium',
        containerClass: 'empty-state',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });

    container.innerHTML = avatarHtml;
}

function initCardClickEvents(container) {
    container.querySelectorAll('.content-card[data-task-id]').forEach(card => {
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Перевірити чи задача закріплена.
 * Читає з localStorage напряму (без залежності від tasks-cabinet.js).
 * @param {string} taskId
 * @returns {boolean}
 */
function isPinnedTask(taskId) {
    const userId = tasksState.currentUserId;
    if (!userId) return false;
    try {
        const stored = localStorage.getItem(`pinned-tasks-${userId}`);
        const ids = stored ? JSON.parse(stored) : [];
        return ids.includes(taskId);
    } catch {
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ПЛАГІНА
// ═══════════════════════════════════════════════════════════════════════════

registerTasksPlugin('onInit', renderCards);
registerTasksPlugin('onRender', renderCards);
registerTasksPlugin('onFilterChange', renderCards);

export { renderCards };
