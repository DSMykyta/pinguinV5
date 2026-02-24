// js/generators/generator-link/gln-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         LINKS GENERATOR                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                           ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── gln-main.js      — Точка входу, завантаження плагінів               ║
 * ║  ├── gln-plugins.js   — Система реєстрації плагінів (хуки)               ║
 * ║  ├── gln-dom.js       — Всі DOM-елементи генератора                      ║
 * ║  ├── gln-data.js      — Завантаження даних (бренди, посилання)           ║
 * ║  ├── gln-events.js    — Слухачі подій, основна логіка                    ║
 * ║  └── gln-ui.js        — Рендер кнопок посилань                           ║
 * ║                                                                           ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  ├── gln-reset.js     — Кнопка оновлення даних                           ║
 * ║  └── gln-aside.js     — Кнопка "Додати бренд"                            ║
 * ║                                                                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { registerAsideInitializer } from '../../layout/aside-main.js';
import { fetchLinksData } from './gln-data.js';
import { renderLinkButtons } from './gln-ui.js';
import { initLinksEventListeners, updateLinksUI } from './gln-events.js';
import { runHook, getRegisteredPlugins } from './gln-plugins.js';

/**
 * Плагіни для динамічного завантаження.
 * Якщо файл видалено — просто не завантажиться, без помилок.
 */
const PLUGINS = [
    './gln-reset.js',
    './gln-aside.js',
];

async function loadPlugins() {
    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );

    results.forEach((result, index) => {
        if (result.status === 'rejected') {
        }
    });
}

async function initLinksGenerator() {
    if (!document.getElementById('links-buttons-container')) return;

    await fetchLinksData();
    await loadPlugins();
    renderLinkButtons();
    initLinksEventListeners();
    runHook('onInit', { updateLinksUI });
    updateLinksUI();

}

registerAsideInitializer('aside-links', initLinksGenerator);

export { updateLinksUI };
