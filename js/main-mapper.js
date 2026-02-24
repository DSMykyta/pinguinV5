// js/main-mapper.js
// Запускач для сторінки mapper.html

import { initCore } from './main-core.js';
import { initMapper } from './pages/mapper/mapper-init.js';

// Ініціалізація при завантаженні DOM
document.addEventListener('DOMContentLoaded', async () => {

    // Спочатку ініціалізуємо core функціональність
    await initCore();

    // Потім ініціалізуємо специфічні для mapper функції
    initMapper();

});
