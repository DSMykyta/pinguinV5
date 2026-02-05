// js/gemini/gem-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         GEMINI AI MODULE                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                           ║
 * ║  🔒 ЯДРО:                                                                 ║
 * ║  ├── gem-main.js      — Точка входу, ініціалізація                       ║
 * ║  ├── gem-plugins.js   — Система реєстрації плагінів                      ║
 * ║  ├── gem-config.js    — Завантаження API ключа з Sheets                  ║
 * ║  ├── gem-dom.js       — DOM елементи (FAB, інпути)                       ║
 * ║  ├── gem-api.js       — Виклик Gemini API                                ║
 * ║  └── gem-events.js    — Event listeners                                  ║
 * ║                                                                           ║
 * ║  🔌 ПЛАГІНИ:                                                              ║
 * ║  ├── gem-write.js     — Написати текст + SEO                             ║
 * ║  └── gem-clean.js     — Очистити текст                                   ║
 * ║                                                                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { loadApiKey, hasApiKey } from './gem-config.js';
import { createFabElement, removeFabElement } from './gem-dom.js';
import { initEventListeners } from './gem-events.js';
import { runHook, getAllPlugins } from './gem-plugins.js';

/**
 * Плагіни для динамічного завантаження
 */
const PLUGINS = [
    './gem-write.js',
    './gem-clean.js'
];

/**
 * Завантажити плагіни
 */
async function loadPlugins() {
    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );

    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.warn(`[Gemini] Плагін ${PLUGINS[index]} не завантажено:`, result.reason);
        }
    });
}

/**
 * Ініціалізація Gemini модуля
 * @param {Object} options - Опції
 * @param {string} options.container - Селектор контейнера для FAB
 * @returns {Promise<boolean>} Успішність ініціалізації
 */
export async function initGemini(options = {}) {
    const containerSelector = options.container || '#section-text .section-content';
    const container = document.querySelector(containerSelector);

    if (!container) {
        console.warn('[Gemini] Контейнер не знайдено:', containerSelector);
        return false;
    }

    // Завантажуємо API ключ
    const hasKey = await loadApiKey();

    if (!hasKey) {
        console.warn('[Gemini] API ключ недоступний, FAB прихований');
        removeFabElement();
        return false;
    }

    // Завантажуємо плагіни
    await loadPlugins();

    const plugins = getAllPlugins();
    if (plugins.length === 0) {
        console.warn('[Gemini] Жоден плагін не завантажено');
        return false;
    }

    // Створюємо FAB
    const fabCreated = createFabElement(container);
    if (!fabCreated) {
        return false;
    }

    // Ініціалізуємо event listeners
    initEventListeners();

    // Запускаємо хук onInit
    runHook('onInit');

    console.log(`[Gemini] Ініціалізовано з ${plugins.length} плагінами:`, plugins.map(p => p.name).join(', '));

    return true;
}

/**
 * Знищити Gemini модуль
 */
export function destroyGemini() {
    removeFabElement();
}

/**
 * Перевірити чи Gemini доступний
 */
export function isGeminiAvailable() {
    return hasApiKey();
}
