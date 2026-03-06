// js/main-banners.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         MAIN — BANNERS                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Точка входу сторінки банерів                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { initCore } from './main-core.js';
import { initBanners } from './pages/banners/banners-main.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initCore();
    await initBanners();
});
