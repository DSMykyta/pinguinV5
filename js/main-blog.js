// js/main-blog.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                           MAIN — BLOG                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Точка входу сторінки блогу                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { initCore } from './main-core.js';
import { initBlog } from './pages/blog/blog-main.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initCore();
    await initBlog();
});
