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
    initFilterPills();
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
            if (icon) icon.classList.add('spinning');
            btn.disabled = true;

            try {
                await loadTasks();
                runHook('onRender');
                showToast('Дані оновлено', 'success');
            } catch (error) {
                showToast('Помилка оновлення', 'error');
            } finally {
                if (icon) icon.classList.remove('spinning');
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

            // Синхронізувати filter pills з чекбоксами
            syncFilterPillsFromState();
        });
    });
}

/**
 * Ініціалізувати filter pills у header секції задач
 */
function initFilterPills() {
    const pillsContainer = document.getElementById('type-filter-pills');
    if (!pillsContainer) return;

    pillsContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('[data-type-filter]');
        if (!pill) return;

        const filterValue = pill.dataset.typeFilter;

        // Оновити активну pill
        pillsContainer.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        // Оновити стан фільтрів
        if (filterValue === 'all') {
            tasksState.filters.type = [];
        } else {
            tasksState.filters.type = [filterValue];
        }

        // Синхронізувати aside чекбокси
        document.querySelectorAll('[data-filter="type"]').forEach(cb => {
            if (filterValue === 'all') {
                cb.checked = false;
            } else {
                cb.checked = cb.value === filterValue;
            }
        });

        tasksState.pagination.currentPage = 1;
        runHook('onFilterChange');
        runHook('onRender');
    });
}

/**
 * Синхронізувати стан filter pills з tasksState.filters.type
 */
function syncFilterPillsFromState() {
    const pillsContainer = document.getElementById('type-filter-pills');
    if (!pillsContainer) return;

    const activeTypes = tasksState.filters.type;
    pillsContainer.querySelectorAll('.filter-pill').forEach(p => {
        const val = p.dataset.typeFilter;
        if (val === 'all') {
            p.classList.toggle('active', activeTypes.length === 0);
        } else {
            p.classList.toggle('active', activeTypes.length === 1 && activeTypes[0] === val);
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ПЛАГІНА
// ═══════════════════════════════════════════════════════════════════════════

registerTasksPlugin('onInit', initEvents);

export { initEvents };
