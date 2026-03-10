// js/generators/generator-seo/gse-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         SEO GENERATOR                                     ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                           ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── gse-main.js      — Точка входу, завантаження плагінів               ║
 * ║  ├── gse-plugins.js   — Система реєстрації плагінів (хуки)               ║
 * ║  ├── gse-dom.js       — Всі DOM-елементи генератора                      ║
 * ║  ├── gse-data.js      — Завантаження даних (бренди, тригери)             ║
 * ║  ├── gse-events.js    — Слухачі подій, основна логіка                    ║
 * ║  ├── gse-generators.js— Генерація Title, Description, Keywords           ║
 * ║  ├── gse-parser.js    — Парсинг тексту (бренд + продукт)                 ║
 * ║  ├── gse-helpers.js   — Допоміжні функції (checkSafety)                  ║
 * ║  ├── gse-brand.js     — Логіка відображення країни бренду                ║
 * ║  └── gse-counters.js  — Лічильники символів для полів                    ║
 * ║                                                                           ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  ├── gse-triggers.js  — Тюльпани (теги) в асайді                         ║
 * ║  ├── gse-reset.js     — Кнопка скидання форми                            ║
 * ║  ├── gse-copy.js      — Копіювання результатів в буфер                   ║
 * ║  └── gse-aside.js     — Кнопка "Додати ключове слово"                    ║
 * ║                                                                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { registerAsideInitializer } from '../../layout/layout-main.js';
import { fetchData } from './gse-data.js';
import { runHook, getRegisteredPlugins } from './gse-plugins.js';
import { initEventListeners, runCalculations } from './gse-events.js';

/**
 * Плагіни для динамічного завантаження.
 * Якщо файл видалено — просто не завантажиться, без помилок.
 */
const PLUGINS = [
    () => import('./gse-triggers.js'),
    () => import('./gse-reset.js'),
    () => import('./gse-copy.js'),
    () => import('./gse-aside.js'),
];

async function loadPlugins() {
    const results = await Promise.allSettled(
        PLUGINS.map(fn => fn())
    );

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            try {
                result.value.init({ runCalculations });
            } catch (e) {
                console.error(`[SEO] Plugin ${index} init error:`, e);
            }
        } else if (result.status === 'rejected') {
            console.warn(`[SEO] Plugin ${index} failed`);
        }
    });
}

async function initSeoGenerator() {
    if (!document.getElementById('brand-name')) return;

    await fetchData();
    await loadPlugins();
    initEventListeners();
    runHook('onInit', { runCalculations });
    runCalculations();

}

registerAsideInitializer('aside-seo', initSeoGenerator);

export { runCalculations };
