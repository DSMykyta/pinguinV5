// js/main-banned-words.js
// Запускач для сторінки banned-words.html

import { initCore } from './main-core.js';
import { initBannedWords } from './banned-words/banned-words-init.js';

// Ініціалізація при завантаженні DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Ініціалізація сторінки Banned Words...');

    // Спочатку ініціалізуємо core функціональність
    initCore();

    // Потім ініціалізуємо специфічні для banned words функції
    initBannedWords();

    console.log('✅ Сторінка Banned Words готова');
});
