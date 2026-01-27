// js/generators/generator-link/gln-main.js

/**
 * LINKS GENERATOR - Головний модуль
 *
 * Ядро генератора з системою плагінів.
 * Плагіни можна видаляти — генератор продовжить працювати.
 */

import { registerPanelInitializer } from '../../panel/panel-right.js';
import { fetchLinksData } from './gln-data.js';
import { renderLinkButtons } from './gln-ui.js';
import { initLinksEventListeners, updateLinksUI } from './gln-events.js';
import { runHook, getRegisteredPlugins } from './gln-plugins.js';

/**
 * Список плагінів для динамічного завантаження.
 * Якщо файл видалено — просто не завантажиться, без помилок.
 */
const PLUGINS = [
    './gln-reset.js',
    './gln-aside.js',
];

/**
 * Завантажує плагіни динамічно
 */
async function loadPlugins() {
    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );

    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.log(`[Links] Плагін ${PLUGINS[index]} не завантажено`);
        }
    });
}

async function initLinksGenerator() {
    if (!document.getElementById('links-buttons-container')) return;

    // 1. Завантажуємо дані
    await fetchLinksData();

    // 2. Завантажуємо плагіни
    await loadPlugins();

    // 3. Базова ініціалізація
    renderLinkButtons();
    initLinksEventListeners();

    // 4. Викликаємо хук onInit для плагінів
    runHook('onInit', { updateLinksUI });

    // 5. Початкове оновлення UI
    updateLinksUI();

    console.log('✅ Links Generator ініціалізовано', getRegisteredPlugins());
}

registerPanelInitializer('aside-links', initLinksGenerator);

// Експортуємо для плагінів
export { updateLinksUI };
