// js/pages/tasks/tasks-ui.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS — UI                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { registerHook } from './tasks-plugins.js';
import { tasksState } from './tasks-state.js';
import { loadTasks } from './tasks-data.js';
import { renderTasksTable } from './tasks-table.js';
import { showToast } from '../../components/feedback/toast.js';

export function init() {
    registerHook('onInit', setupUI);
    registerHook('onInit', checkNewTasks);
}

function setupUI() {
    const tableContainer = document.getElementById('tasks-table-container');
    if (!tableContainer) return;

    // Refresh charm
    if (!tableContainer._tasksRefreshInit) {
        tableContainer._tasksRefreshInit = true;
        tableContainer.addEventListener('charm:refresh', (e) => {
            const refreshTask = (async () => {
                await loadTasks();
                renderTasksTable();
                showToast('Дані оновлено', 'success');
            })();
            if (e?.detail?.waitUntil) e.detail.waitUntil(refreshTask);
        });
    }

    // Add buttons
    const addButtons = [
        document.getElementById('btn-add-task'),
        document.getElementById('btn-add-task-aside')
    ].filter(Boolean);

    addButtons.forEach((btn) => {
        if (btn._tasksAddInit) return;
        btn._tasksAddInit = true;
        btn.addEventListener('click', async () => {
            const { showAddTaskModal } = await import('./tasks-crud.js');
            showAddTaskModal();
        });
    });
}

function checkNewTasks() {
    const username = window.currentUser?.username;
    if (!username) return;

    const newTasks = (tasksState.tasks || []).filter(
        t => t.is_new === '1' && t.assigned_to === username
    );

    if (newTasks.length > 0) {
        showToast(`У вас ${newTasks.length} нових завдань!`, 'info');
    }
}
