// js/main-brands.js
// Запускач для сторінки brands.html

import { initCore } from './main-core.js';
import { initBrands } from './brands/brands-main.js';

// Ініціалізація при завантаженні DOM
document.addEventListener('DOMContentLoaded', async () => {

    // Спочатку ініціалізуємо core функціональність
    initCore();

    // Потім ініціалізуємо специфічні для brands функції (нова система з плагінами)
    await initBrands();

});
