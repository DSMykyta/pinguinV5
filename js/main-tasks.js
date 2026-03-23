// js/main-tasks.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                        MAIN — TASKS                                     ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Точка входу сторінки завдань                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { initCore } from './main-core.js';
import { initTasks } from './pages/tasks/tasks-main.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initCore();
    await initTasks();
});
