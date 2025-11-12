// js/main-entities.js
// Запускач для сторінки entities.html

import { initCore } from './main-core.js';
import { initEntities } from './entities/entities-init.js';

// Ініціалізація при завантаженні DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Ініціалізація сторінки Entities...');

    // Спочатку ініціалізуємо core функціональність
    initCore();

    // Потім ініціалізуємо специфічні для entities функції
    initEntities();

    console.log('✅ Сторінка Entities готова');
});
