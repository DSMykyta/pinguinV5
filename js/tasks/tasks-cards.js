// js/tasks/tasks-cards.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS - CARDS PLUGIN                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Рендеринг карток задач.
 *
 * 🔌 ПЛАГІН — цей файл можна видалити, система працюватиме без нього.
 */

import { tasksState } from './tasks-state.js';
import { getTasksForCurrentTab } from './tasks-data.js';
import { registerTasksPlugin, runHook } from './tasks-plugins.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';
import { registerActionHandlers, initActionHandlers, actionButton } from '../common/ui-actions.js';

// ═══════════════════════════════════════════════════════════════════════════
// КОНСТАНТИ
// ═══════════════════════════════════════════════════════════════════════════

const PRIORITY_LABELS = {
    urgent: { text: 'Терміново', class: 'task-priority--urgent' },
    high: { text: 'Високий', class: 'task-priority--high' },
    medium: { text: 'Середній', class: 'task-priority--medium' },
    low: { text: 'Низький', class: 'task-priority--low' }
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
// РЕЄСТРАЦІЯ ОБРОБНИКІВ ДІЙ (ui-actions.js)
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
    status: async (rowId, data, context) => {
        try {
            const { showStatusDropdown } = await import('./tasks-ui.js');
            // Знаходимо кнопку для позиціонування dropdown
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

/**
 * Рендеринг карток для поточного табу
 */
function renderCards() {
    const containerId = `tasks-container-${tasksState.activeTab}`;
    const container = document.getElementById(containerId);
    if (!container) return;

    const statsId = `tab-stats-${tasksState.activeTab}`;
    const statsEl = document.getElementById(statsId);

    // Отримати відфільтровані задачі
    const tasks = getTasksForCurrentTab();
    const totalItems = tasks.length;

    // Пагінація
    const { currentPage, pageSize } = tasksState.pagination;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const paginatedTasks = tasks.slice(startIndex, endIndex);

    // Оновити статистику
    if (statsEl) {
        statsEl.textContent = `Показано ${paginatedTasks.length} з ${totalItems}`;
    }

    // Оновити пагінацію
    if (tasksState.paginationAPI) {
        tasksState.pagination.totalItems = totalItems;
        tasksState.paginationAPI.update({
            currentPage,
            pageSize,
            totalItems
        });
    }

    // Рендеринг
    if (paginatedTasks.length === 0) {
        renderEmptyState(container);
        return;
    }

    const cardsHtml = paginatedTasks.map(task => renderCard(task)).join('');
    container.innerHTML = `<div class="tasks-grid">${cardsHtml}</div>`;

    // Ініціалізувати ui-actions на контейнері
    initActionHandlers(container, ACTION_CONTEXT);

    // Ініціалізувати клік на картку для перегляду
    initCardClickEvents(container);
}

/**
 * Рендеринг однієї картки
 * @param {Object} task - Дані задачі
 * @returns {string} HTML картки
 */
function renderCard(task) {
    const priority = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.medium;
    const status = STATUS_LABELS[task.status] || STATUS_LABELS.todo;
    const typeIcon = TYPE_ICONS[task.type] || TYPE_ICONS.task;

    const dueDateHtml = task.due_date
        ? `<span class="task-due-date"><span class="material-symbols-outlined">schedule</span>${formatDate(task.due_date)}</span>`
        : '';

    const tagsHtml = task.tags
        ? `<div class="task-tags">${task.tags.split(',').map(t => `<span class="task-tag">${t.trim()}</span>`).join('')}</div>`
        : '';

    const codeHtml = task.code_snippet
        ? `<pre class="task-code"><code>${escapeHtml(task.code_snippet.substring(0, 200))}${task.code_snippet.length > 200 ? '...' : ''}</code></pre>`
        : '';

    const assignedHtml = task.assigned_to && task.assigned_to !== task.created_by
        ? `<span class="task-assigned"><span class="material-symbols-outlined">person</span>${task.assigned_to}</span>`
        : '';

    // Кнопки дій через ui-actions
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
        icon: 'swap_horiz',
        tooltip: 'Змінити статус',
        context: ACTION_CONTEXT
    });

    return `
        <div class="task-card" data-task-id="${task.id}" data-status="${task.status}" data-priority="${task.priority}">
            <div class="task-card-header">
                <span class="task-type" title="${task.type}">
                    <span class="material-symbols-outlined">${typeIcon}</span>
                </span>
                <span class="task-priority ${priority.class}">${priority.text}</span>
                ${dueDateHtml}
            </div>

            <div class="task-card-body">
                <h4 class="task-title">${escapeHtml(task.title)}</h4>
                ${task.description ? `<p class="task-description">${escapeHtml(task.description.substring(0, 150))}${task.description.length > 150 ? '...' : ''}</p>` : ''}
                ${codeHtml}
                ${tagsHtml}
            </div>

            <div class="task-card-footer">
                <div class="task-meta">
                    <span class="task-status" data-status="${task.status}">
                        <span class="material-symbols-outlined">${status.icon}</span>
                        ${status.text}
                    </span>
                    ${assignedHtml}
                </div>

                <div class="task-actions">
                    ${editBtn}
                    ${statusBtn}
                </div>
            </div>
        </div>
    `;
}

/**
 * Рендеринг пустого стану
 */
function renderEmptyState(container) {
    const messages = {
        my: 'У вас ще немає задач',
        inbox: 'Немає вхідних задач',
        sent: 'Ви ще не призначали задачі іншим',
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

/**
 * Ініціалізувати клік на картку для перегляду
 */
function initCardClickEvents(container) {
    container.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('click', async (e) => {
            // Ігнорувати кліки на кнопках
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
 * Форматувати дату
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
}

/**
 * Екранувати HTML
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

registerTasksPlugin('onInit', renderCards);
registerTasksPlugin('onRender', renderCards);
registerTasksPlugin('onTabChange', renderCards);
registerTasksPlugin('onFilterChange', renderCards);

export { renderCards };
