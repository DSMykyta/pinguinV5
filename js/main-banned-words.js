// js/main-banned-words.js
// Запускач для сторінки banned-words.html

import { initCore } from './main-core.js';
import { initBannedWords } from './pages/banned-words/banned-words-main.js';

// Ініціалізація при завантаженні DOM
document.addEventListener('DOMContentLoaded', async () => {

    // Спочатку ініціалізуємо core функціональність
    await initCore();

    // Потім ініціалізуємо специфічні для banned words функції
    initBannedWords();

});
