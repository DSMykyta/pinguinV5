// js/main-tasks.js
// Запускач для сторінки tasks.html

import { initCore } from './main-core.js';
import { initTasks } from './tasks/tasks-main.js';

// Ініціалізація при завантаженні DOM
document.addEventListener('DOMContentLoaded', async () => {

    // Спочатку ініціалізуємо core функціональність
    initCore();

    // Потім ініціалізуємо специфічні для tasks функції
    await initTasks();

});
