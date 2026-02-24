// js/main-keywords.js
// Запускач для сторінки keywords.html

import { initCore } from './main-core.js';
import { initKeywords } from './pages/keywords/keywords-init.js';

// Ініціалізація при завантаженні DOM
document.addEventListener('DOMContentLoaded', async () => {

    // Спочатку ініціалізуємо core функціональність
    await initCore();

    // Потім ініціалізуємо специфічні для keywords функції
    initKeywords();

});
