// js/layout/layout-aside-observer.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            ПРАВА ПАНЕЛЬ — ВІДСТЕЖЕННЯ СЕКЦІЙ (ASIDE OBSERVER)            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  IntersectionObserver що стежить за секціями сторінки.                   ║
 * ║  При скролі до секції — перемикає вміст правої панелі.                   ║
 * ║                                                                          ║
 * ║  📋 АТРИБУТИ СЕКЦІЙ:                                                     ║
 * ║  ├── data-aside-template="aside-table" — який шаблон показати            ║
 * ║  └── data-aside-template=""            — aside закривається (absent)     ║
 * ║                                                                          ║
 * ║  📋 HTML ПРИКЛАД:                                                        ║
 * ║  <main data-aside-template="aside-glossary">          ← вся сторінка    ║
 * ║  <div class="tab-content" data-aside-template="aside-brands"> ← таб     ║
 * ║  <section data-aside-template="aside-table">          ← секція          ║
 * ║  <section data-aside-template="">                     ← без панелі      ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { showAsidePanel } from './layout-plugin-aside-loader.js';

// ═══════════════════════════════════════════════════════════════════════════
// ПУБЛІЧНЕ API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🔌 ПЛАГІН — відстежує секції та перемикає вміст aside.
 */
export function init() {
    const sections = document.querySelectorAll('[data-aside-template]');
    if (!sections.length) return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            const templateName = entry.target.dataset.asideTemplate;

            // Тільки міняємо контент, стан aside не чіпаємо —
            // користувач сам керує expanded/collapsed/closed
            showAsidePanel(templateName || null);
        });
    }, {
        root: null,
        threshold: 0.1
    });

    sections.forEach(s => observer.observe(s));
}
