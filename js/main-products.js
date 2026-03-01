// js/main-products.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                       MAIN — PRODUCTS                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Точка входу сторінки товарів                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { initCore } from './main-core.js';
import { initProducts } from './pages/products/products-main.js';

// Ініціалізація при завантаженні DOM
document.addEventListener('DOMContentLoaded', async () => {

    // Спочатку ініціалізуємо core функціональність
    await initCore();

    // Потім ініціалізуємо специфічні для products функції
    await initProducts();

});
