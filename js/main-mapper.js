// js/main-mapper.js
// Запускач для сторінки mapper.html

import { initCore } from './main-core.js';
import { initMapper } from './mapper/mapper-init.js';

// Ініціалізація при завантаженні DOM
document.addEventListener('DOMContentLoaded', () => {

    // Спочатку ініціалізуємо core функціональність
    initCore();

    // Потім ініціалізуємо специфічні для mapper функції
    initMapper();

});
