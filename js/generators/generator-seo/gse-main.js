// js/generators/generator-seo/gse-main.js

/**
 * SEO GENERATOR - Головний модуль
 *
 * Ядро генератора з системою плагінів.
 * Плагіни можна видаляти — генератор продовжить працювати.
 */

import { registerPanelInitializer } from '../../panel/panel-right.js';
import { fetchData } from './gse-data.js';
import { runHook, getRegisteredPlugins } from './gse-plugins.js';

// Базова логіка (обов'язкова)
import { initEventListeners, runCalculations } from './gse-events.js';

/**
 * Список плагінів для динамічного завантаження.
 * Якщо файл видалено — просто не завантажиться, без помилок.
 */
const PLUGINS = [
    './gse-triggers.js',
    './gse-reset.js',
    './gse-copy.js',
    './gse-aside.js',
];

/**
 * Завантажує плагіни динамічно
 */
async function loadPlugins() {
    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );

    // Логуємо які плагіни завантажились
    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.log(`[SEO] Плагін ${PLUGINS[index]} не завантажено (можливо видалено)`);
        }
    });
}

async function initSeoGenerator() {
    // Перевірка, чи ми на сторінці з SEO-блоком
    if (!document.getElementById('brand-name')) return;

    // 1. Завантажуємо дані
    await fetchData();

    // 2. Завантажуємо плагіни
    await loadPlugins();

    // 3. Ініціалізуємо базову логіку
    initEventListeners();

    // 4. Викликаємо хук onInit для всіх плагінів
    runHook('onInit', { runCalculations });

    // 5. Перший запуск розрахунків
    runCalculations();

    // Дебаг: показуємо скільки плагінів зареєстровано
    console.log('✅ SEO Generator ініціалізовано', getRegisteredPlugins());
}

// Реєструємо в системі правої панелі
registerPanelInitializer('aside-seo', initSeoGenerator);

// Експортуємо для використання плагінами
export { runCalculations };
