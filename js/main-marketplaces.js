// js/main-marketplaces.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                       MAIN — MARKETPLACES                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Точка входу сторінки маркетплейсів                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { initCore } from './main-core.js';
import { initMarketplaces } from './pages/marketplaces/marketplaces-main.js';

// Ініціалізація при завантаженні DOM
document.addEventListener('DOMContentLoaded', async () => {

    // Спочатку ініціалізуємо core функціональність
    await initCore();

    // Потім ініціалізуємо специфічні для marketplaces функції
    await initMarketplaces();

});
