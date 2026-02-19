// js/tasks/tasks-ui.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS - UI PLUGIN                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * UI компоненти: dropdown зміни статусу.
 *
 * 🔌 ПЛАГІН — цей файл можна видалити, система працюватиме без нього.
 */

import { tasksState } from './tasks-state.js';
import { changeTaskStatus, getTaskById } from './tasks-data.js';
import { registerTasksPlugin, runHook } from './tasks-plugins.js';
import { showToast } from '../common/ui-toast.js';

// ═══════════════════════════════════════════════════════════════════════════
// DROPDOWN СТАТУСУ
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_OPTIONS = [
    { value: 'todo', label: 'До виконання', icon: 'radio_button_unchecked' },
    { value: 'in_progress', label: 'В роботі', icon: 'pending' },
    { value: 'done', label: 'Виконано', icon: 'check_circle' }
];

/**
 * Показати dropdown для зміни статусу
 * @param {HTMLElement} triggerBtn - Кнопка яка викликала dropdown
 * @param {string} taskId - ID задачі
 */
export function showStatusDropdown(triggerBtn, taskId) {
    // Закрити існуючі dropdown
    closeAllStatusDropdowns();

    const task = getTaskById(taskId);
    if (!task) return;

    // Перевірка прав
    if (task.created_by !== tasksState.currentUserId) {
        showToast('Ви не можете змінювати статус чужих задач', 'warning');
        return;
    }

    // Створити dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown-menu dropdown-menu-status is-open';
    dropdown.dataset.taskId = taskId;

    dropdown.innerHTML = `
        <div class="dropdown-body">
            ${STATUS_OPTIONS.map(opt => `
                <button class="dropdown-item ${task.status === opt.value ? 'active' : ''}"
                        data-status="${opt.value}">
                    <span class="material-symbols-outlined">${opt.icon}</span>
                    <span>${opt.label}</span>
                </button>
            `).join('')}
        </div>
    `;

    // Позиціонувати
    const rect = triggerBtn.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.zIndex = '1000';

    // Обробники кнопок статусу
    dropdown.querySelectorAll('[data-status]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const newStatus = btn.dataset.status;

            if (newStatus === task.status) {
                closeAllStatusDropdowns();
                return;
            }

            try {
                await changeTaskStatus(taskId, newStatus);
                showToast('Статус оновлено', 'success');
                runHook('onTaskUpdate', taskId);
                runHook('onRender');
            } catch (error) {
                showToast(error.message || 'Помилка оновлення статусу', 'error');
            }

            closeAllStatusDropdowns();
        });
    });

    // Додати в DOM
    document.body.appendChild(dropdown);

    // Закрити при кліку поза dropdown
    setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
    }, 0);
}

/**
 * Закрити всі dropdown статусів
 */
function closeAllStatusDropdowns() {
    document.querySelectorAll('.dropdown-menu-status').forEach(el => el.remove());
    document.removeEventListener('click', handleOutsideClick);
}

/**
 * Обробник кліку поза dropdown
 */
function handleOutsideClick(e) {
    if (!e.target.closest('.dropdown-menu-status') && !e.target.closest('[data-action="status"]')) {
        closeAllStatusDropdowns();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ
// ═══════════════════════════════════════════════════════════════════════════

// Закривати dropdown при зміні табу
registerTasksPlugin('onTabChange', closeAllStatusDropdowns);

export { closeAllStatusDropdowns };
