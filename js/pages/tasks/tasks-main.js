// js/pages/tasks/tasks-main.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS — MAIN                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Точка входу модуля завдань.                                 ║
 * ║  createPage() + registerAsideInitializer                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { tasksState } from './tasks-state.js';
import { tasksPlugins } from './tasks-plugins.js';
import { loadTasks, loadUsersForTasks } from './tasks-data.js';
import { createPage } from '../../components/page/page-main.js';
import { registerAsideInitializer } from '../../layout/layout-main.js';

// ═══════════════════════════════════════════════════════════════════════════
// PAGE FACTORY
// ═══════════════════════════════════════════════════════════════════════════

const page = createPage({
    name: 'Tasks',
    state: tasksState,
    plugins: tasksPlugins,
    PLUGINS: [
        () => import('./tasks-table.js'),
        () => import('./tasks-crud.js'),
        () => import('./tasks-ui.js'),
        () => import('./tasks-filter.js'),
        () => import('./tasks-comments.js'),
    ],
    dataLoaders: [loadTasks, loadUsersForTasks],
    containers: ['tasks-table-container'],
});

// ═══════════════════════════════════════════════════════════════════════════
// ASIDE INITIALIZER
// ═══════════════════════════════════════════════════════════════════════════

registerAsideInitializer('aside-tasks', () => {
    const addBtn = document.getElementById('btn-add-task-aside');
    if (addBtn && !addBtn._tasksInit) {
        addBtn._tasksInit = true;
        addBtn.addEventListener('click', async () => {
            const { showAddTaskModal } = await import('./tasks-crud.js');
            showAddTaskModal();
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export async function initTasks() {
    await page.init();
}
