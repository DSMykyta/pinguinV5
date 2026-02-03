// js/tasks/tasks-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS - EVENTS PLUGIN                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Обробники подій: оновлення, фільтри в aside.
 *
 * 🔌 ПЛАГІН — цей файл можна видалити, система працюватиме без нього.
 */

import { tasksState } from './tasks-state.js';
import { loadTasks } from './tasks-data.js';
import { registerTasksPlugin, runHook } from './tasks-plugins.js';
import { showToast } from '../common/ui-toast.js';

// ═══════════════════════════════════════════════════════════════════════════
// ІНІЦІАЛІЗАЦІЯ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізація обробників подій
 */
function initEvents() {
    initRefreshButtons();
    initFilterCheckboxes();
}

/**
 * Ініціалізувати кнопки оновлення
 */
function initRefreshButtons() {
    const refreshButtons = document.querySelectorAll('[id^="refresh-tab-"]');

    refreshButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            // Додаємо анімацію
            const icon = btn.querySelector('.material-symbols-outlined');
            if (icon) icon.classList.add('is-spinning');
            btn.disabled = true;

            try {
                await loadTasks();
                runHook('onRender');
                showToast('Дані оновлено', 'success');
            } catch (error) {
                showToast('Помилка оновлення', 'error');
            } finally {
                if (icon) icon.classList.remove('is-spinning');
                btn.disabled = false;
            }
        });
    });
}

/**
 * Ініціалізувати фільтри в aside
 */
function initFilterCheckboxes() {
    const filterCheckboxes = document.querySelectorAll('[data-filter]');

    filterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const filterType = checkbox.dataset.filter;
            const value = checkbox.value;

            if (!tasksState.filters[filterType]) {
                tasksState.filters[filterType] = [];
            }

            if (checkbox.checked) {
                if (!tasksState.filters[filterType].includes(value)) {
                    tasksState.filters[filterType].push(value);
                }
            } else {
                const index = tasksState.filters[filterType].indexOf(value);
                if (index > -1) {
                    tasksState.filters[filterType].splice(index, 1);
                }
            }

            // Скинути пагінацію
            tasksState.pagination.currentPage = 1;

            // Викликати хук
            runHook('onFilterChange');
            runHook('onRender');
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ПЛАГІНА
// ═══════════════════════════════════════════════════════════════════════════

registerTasksPlugin('onInit', initEvents);

export { initEvents };
