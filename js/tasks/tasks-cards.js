// js/tasks/tasks-cards.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS - CARDS PLUGIN                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Рендеринг карток задач.
 * Використовує ТІЛЬКИ існуючі класи: chip-tooltip-content, severity-badge, chip, btn-icon
 *
 * 🔌 ПЛАГІН — цей файл можна видалити, система працюватиме без нього.
 */

import { tasksState } from './tasks-state.js';
import { getTasksForCurrentTab } from './tasks-data.js';
import { registerTasksPlugin } from './tasks-plugins.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';
import { registerActionHandlers, initActionHandlers, actionButton } from '../common/ui-actions.js';

// ═══════════════════════════════════════════════════════════════════════════
// КОНСТАНТИ
// ═══════════════════════════════════════════════════════════════════════════

const PRIORITY_MAP = {
    urgent: { icon: 'brightness_alert', class: 'severity-high' },
    high: { icon: 'warning', class: 'severity-high' },
    medium: { icon: 'info', class: 'severity-medium' },
    low: { icon: 'check_circle', class: 'severity-low' }
};

const STATUS_LABELS = {
    todo: { text: 'До виконання', icon: 'radio_button_unchecked' },
    in_progress: { text: 'В роботі', icon: 'pending' },
    done: { text: 'Виконано', icon: 'check_circle' },
    archived: { text: 'Архів', icon: 'inventory_2' }
};

const TYPE_ICONS = {
    task: 'task_alt',
    info: 'lightbulb',
    script: 'code',
    reference: 'link'
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

    // chip-container - існуючий клас для flex-wrap контейнера
    const cardsHtml = tasks.map(task => renderCard(task)).join('');
    container.innerHTML = `<div class="chip-container">${cardsHtml}</div>`;

    initActionHandlers(container, ACTION_CONTEXT);
    initCardClickEvents(container);
}

function renderCard(task) {
    const priority = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
    const status = STATUS_LABELS[task.status] || STATUS_LABELS.todo;

    const editBtn = actionButton({
        action: 'edit',
        rowId: task.id,
        icon: 'edit',
        tooltip: 'Редагувати',
        context: ACTION_CONTEXT
    });

    const statusBtn = actionButton({
        action: 'status',
        rowId: task.id,
        icon: status.icon,
        tooltip: status.text,
        context: ACTION_CONTEXT
    });

    // chip-tooltip-content - існуючий клас (чорна картка)
    // severity-badge - існуючий клас для пріоритету
    return `
        <div class="chip-tooltip-content" data-task-id="${task.id}" data-status="${task.status}">
            <span class="severity-badge ${priority.class}">
                <span class="material-symbols-outlined">${priority.icon}</span>
            </span>
            <strong>${escapeHtml(task.title)}</strong>
            ${task.description ? `<p>${escapeHtml(task.description.substring(0, 100))}${task.description.length > 100 ? '...' : ''}</p>` : ''}
            <div class="chip-list">
                ${editBtn}
                ${statusBtn}
            </div>
        </div>
    `;
}

function renderEmptyState(container) {
    const messages = {
        my: 'У вас ще немає задач',
        info: 'Немає збереженої інформації'
    };

    const avatarHtml = renderAvatarState('empty', {
        message: messages[tasksState.activeTab] || 'Немає даних',
        size: 'medium',
        containerClass: 'empty-state-container',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });

    container.innerHTML = avatarHtml;
}

function initCardClickEvents(container) {
    container.querySelectorAll('.chip-tooltip-content[data-task-id]').forEach(card => {
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

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ПЛАГІНА
// ═══════════════════════════════════════════════════════════════════════════

registerTasksPlugin('onInit', renderCards);
registerTasksPlugin('onRender', renderCards);
registerTasksPlugin('onFilterChange', renderCards);

export { renderCards };
