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
import './generators/generator-image/gim-main.js';
import { initCompare } from './generators/generator-compare/gcmp-main.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initCore();
    await initImages();
    initCompare();
});
