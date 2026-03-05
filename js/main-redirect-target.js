// js/main-redirect-target.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                       MAIN — REDIRECT TARGET                             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Точка входу сторінки переадрисації                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { initCore } from './main-core.js';
import { initRedirectTarget } from './pages/redirect-target/redirect-target-main.js';

// Ініціалізація при завантаженні DOM
document.addEventListener('DOMContentLoaded', async () => {

    // Спочатку ініціалізуємо core функціональність
    await initCore();

    // Потім ініціалізуємо специфічні для products функції
    // Тут в майбутньому буде ініціалізація специфічних функцій сторінки RedirectTarget
    await initRedirectTarget();

});
