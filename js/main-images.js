// js/main-images.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                          MAIN — IMAGES                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Точка входу сторінки зображень                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { initCore } from './main-core.js';
import { initImages } from './pages/images/images-main.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initCore();
    await initImages();
});
