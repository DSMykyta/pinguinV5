// js/generators/generator-image/gim-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         IMAGE TOOL GENERATOR                              ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                           ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── gim-main.js      — Точка входу, реєстрація генератора               ║
 * ║  ├── gim-plugins.js   — Система реєстрації плагінів (хуки)               ║
 * ║  ├── gim-dom.js       — Всі DOM-елементи генератора                      ║
 * ║  ├── gim-state.js     — Стан генератора (файли, активне зображення)      ║
 * ║  ├── gim-logic.js     — Основна логіка та обробники подій                ║
 * ║  ├── gim-loader.js    — Завантаження зображень (файл, URL, drag-drop)    ║
 * ║  ├── gim-renderer.js  — Рендеринг зображень на canvas                    ║
 * ║  ├── gim-transformer.js — Трансформації (resize, canvas)                 ║
 * ║  ├── gim-saver.js     — Збереження результату                            ║
 * ║  └── gim-utils.js     — Допоміжні функції                                ║
 * ║                                                                           ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  └── (поки немає)                                                         ║
 * ║                                                                           ║
 * ║  📝 ПРИМІТКА:                                                             ║
 * ║  Цей генератор має тісну інтеграцію компонентів.                         ║
 * ║  Всі файли ядра необхідні для роботи інструменту.                        ║
 * ║                                                                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { registerAsideInitializer } from '../../layout/layout-main.js';
import { initImageToolLogic } from './gim-logic.js';
import { runHook, getRegisteredPlugins } from './gim-plugins.js';

/**
 * Плагіни для динамічного завантаження.
 * Поки що генератор не має плагінів — всі файли є частиною ядра.
 */
const PLUGINS = [
    // () => import('./gim-some-plugin.js'),
];

async function loadPlugins() {
    if (PLUGINS.length === 0) return;

    const results = await Promise.allSettled(
        PLUGINS.map(fn => fn())
    );

    results.forEach((result, index) => {
        if (result.status === 'rejected') {
        }
    });
}

async function initImageToolGenerator() {
    if (!document.getElementById('gim-image-input')) return;

    await loadPlugins();
    initImageToolLogic();
    runHook('onInit');

}

registerAsideInitializer('aside-image-tool', initImageToolGenerator);
