// js/main-price.js
// Запускач для сторінки price.html

import { initCore } from './main-core.js';
import { initPrice } from './price/price-init.js';

// Ініціалізація при завантаженні DOM
document.addEventListener('DOMContentLoaded', () => {

    // Спочатку ініціалізуємо core функціональність
    initCore();

    // Потім ініціалізуємо специфічні для price функції
    initPrice();

});
