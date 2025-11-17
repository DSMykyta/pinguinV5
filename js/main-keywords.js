// js/main-keywords.js
// Запускач для сторінки keywords.html

import { initCore } from './main-core.js';
import { initKeywords } from './keywords/keywords-init.js';

// Ініціалізація при завантаженні DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Ініціалізація сторінки Keywords...');

    // Спочатку ініціалізуємо core функціональність
    initCore();

    // Потім ініціалізуємо специфічні для keywords функції
    initKeywords();

    console.log('✅ Сторінка Keywords готова');
});
