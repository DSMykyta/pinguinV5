// js/generators/generator-magic/gm-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAGIC LEGO - MAIN ENTRY POINT                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🏭 ФАБРИКА — Завантаження плагінів + публічний API                      ║
 * ║                                                                          ║
 * ║  АРХІТЕКТУРА:                                                            ║
 * ║  ┌─────────────────────────────────────────────────────────────────┐     ║
 * ║  │                     Magic Parser                                │     ║
 * ║  │  ┌─────────┐ ┌───────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │     ║
 * ║  │  │ Cleanup │ │ Normalize │ │ Serving │ │  Merge  │ │ Headers │  │     ║
 * ║  │  └─────────┘ └───────────┘ └─────────┘ └─────────┘ └─────────┘  │     ║
 * ║  │                         ▲                                       │     ║
 * ║  │  ┌──────────────────────────────────────────────────────────┐   │     ║
 * ║  │  │                   MagicState                             │   │     ║
 * ║  │  │              (hooks, loadedPlugins)                      │   │     ║
 * ║  │  └──────────────────────────────────────────────────────────┘   │     ║
 * ║  └─────────────────────────────────────────────────────────────────┘     ║
 * ║                                                                          ║
 * ║  ВИКОРИСТАННЯ:                                                           ║
 * ║  ```javascript                                                           ║
 * ║  import { parseText, initMagicParser } from './gm-main.js';           ║
 * ║                                                                          ║
 * ║  await initMagicParser(); // Завантажити плагіни                         ║
 * ║  const entries = parseText(text); // Парсити текст                       ║
 * ║  ```                                                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import {
    state,
    registerHook,
    runHook,
    getLoadedPlugins,
    updateState
} from './gm-state.js';

// ============================================================================
// ПЛАГІНИ
// ============================================================================

/**
 * Список плагінів для завантаження
 * Порядок важливий - вони виконуються послідовно!
 */
const PLUGINS = [
    () => import('./gm-cleanup.js'),
    () => import('./gm-normalize.js'),
    () => import('./gm-serving.js'),
    () => import('./gm-merge.js'),
    () => import('./gm-headers.js'),
    () => import('./gm-smart-parser.js'),
];

const PLUGIN_NAMES = [
    'gm-cleanup',
    'gm-normalize',
    'gm-serving',
    'gm-merge',
    'gm-headers',
    'gm-smart-parser',
];

/** Завантажені модулі плагінів */
const loadedModules = {};

// ============================================================================
// ЗАВАНТАЖЕННЯ ПЛАГІНІВ
// ============================================================================

/**
 * Завантажити всі плагіни з graceful degradation
 * @returns {Promise<void>}
 */
export async function initMagicParser() {
    const results = await Promise.allSettled(
        PLUGINS.map(fn => fn())
    );

    results.forEach((result, index) => {
        const pluginName = PLUGIN_NAMES[index];

        if (result.status === 'fulfilled') {
            const module = result.value;
            loadedModules[pluginName] = module;

            // Викликаємо init якщо є
            if (typeof module.init === 'function') {
                try {
                    module.init();
                } catch (e) {
                    console.error(`[Magic] Plugin ${pluginName} init error:`, e);
                }
            }
        } else {
            console.warn(`[Magic] ⚠️ Plugin ${pluginName} failed to load:`, result.reason);
        }
    });

    console.log(`[Magic] Loaded plugins: ${getLoadedPlugins().join(', ')}`);
}

// ============================================================================
// ПУБЛІЧНИЙ API
// ============================================================================

/**
 * Отримати функцію з плагіна
 * @param {string} pluginName - Назва плагіна
 * @param {string} funcName - Назва функції
 * @returns {Function|null}
 */
function getPluginFunction(pluginName, funcName) {
    const module = loadedModules[pluginName];
    if (module && typeof module[funcName] === 'function') {
        return module[funcName];
    }
    return null;
}

/**
 * Очистити текст від сміття
 * @param {string} text - Вхідний текст
 * @returns {string}
 */
export function cleanText(text) {
    const fn = getPluginFunction('gm-cleanup', 'cleanText');
    if (fn) {
        runHook('onCleanup', text);
        return fn(text);
    }
    return text;
}

/**
 * Нормалізувати назву нутрієнта
 * @param {string} name - Назва
 * @returns {string}
 */
export function normalizeNutrientName(name) {
    const fn = getPluginFunction('gm-normalize', 'normalizeNutrientName');
    if (fn) {
        runHook('onNormalize', name);
        return fn(name);
    }
    return name;
}

/**
 * Сортувати нутрієнти
 * @param {Array} entries - Масив записів
 * @returns {Array}
 */
export function sortNutrients(entries) {
    const fn = getPluginFunction('gm-normalize', 'sortNutrients');
    return fn ? fn(entries) : entries;
}

/**
 * Витягти розмір порції
 * @param {string} text - Текст
 * @returns {string}
 */
export function extractServingSize(text) {
    const fn = getPluginFunction('gm-serving', 'extractServingSize');
    return fn ? fn(text) : '';
}

/**
 * Перевірити чи пропустити рядок
 * @param {string} line - Рядок
 * @returns {boolean}
 */
export function shouldSkipLine(line) {
    const fn = getPluginFunction('gm-serving', 'shouldSkipLine');
    return fn ? fn(line) : false;
}

/**
 * Склеїти осиротілі значення
 * @param {string[]} lines - Масив рядків
 * @returns {string[]}
 */
export function mergeOrphanValues(lines) {
    const fn = getPluginFunction('gm-merge', 'mergeOrphanValues');
    return fn ? fn(lines) : lines;
}

/**
 * Обробити заголовки
 * @param {Array} entries - Масив записів
 * @param {string} servingSize - Розмір порції
 * @returns {Array}
 */
export function processHeaders(entries, servingSize) {
    const fn = getPluginFunction('gm-headers', 'processHeaders');
    return fn ? fn(entries, servingSize) : entries;
}

/**
 * Розумний парсинг рядка
 * @param {string} line - Рядок
 * @returns {{left: string, right: string}}
 */
export function smartParseLine(line) {
    const fn = getPluginFunction('gm-smart-parser', 'smartParseLine');
    return fn ? fn(line) : { left: line, right: '' };
}

/**
 * Головна функція парсингу тексту
 * @param {string} text - Текст для парсингу
 * @returns {Array} - Масив записів
 */
export function parseText(text) {
    if (!text) return [];

    runHook('onBeforeParse', text);

    const servingSize = extractServingSize(text);
    updateState({ servingSize });

    // Розділяємо на рядки
    let rawLines = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);

    // Розділяємо inline headers
    rawLines = splitInlineHeaders(rawLines);

    // Склеюємо осиротілі значення
    rawLines = mergeOrphanValues(rawLines);

    // Парсимо кожен рядок
    let entries = rawLines
        .filter(line => !shouldSkipLine(cleanText(line)))
        .map(line => {
            const parsed = parseLineWithTab(line);
            parsed.left = normalizeNutrientName(parsed.left);
            return parsed;
        });

    // Сортуємо
    entries = sortNutrients(entries);

    // Обробляємо заголовки
    entries = processHeaders(entries, servingSize);

    updateState({ lastParsedText: text, lastEntries: entries });
    runHook('onAfterParse', entries);

    return entries;
}

// ============================================================================
// ВНУТРІШНІ ФУНКЦІЇ
// ============================================================================

/** Патерни заголовків з текстом на тому ж рядку */
const INLINE_HEADER_PATTERNS = [
    /^(ингредиенты|інгредієнти|другие ингредиенты|інші інгредієнти):\s*(.+)$/i,
    /^(состав|склад):\s*(.+)$/i,
];

/**
 * Розділяє рядки типу "Ингредиенты: текст" на два
 */
function splitInlineHeaders(lines) {
    const result = [];
    for (const line of lines) {
        let matched = false;
        for (const pattern of INLINE_HEADER_PATTERNS) {
            const match = line.match(pattern);
            if (match) {
                result.push(match[1]);
                if (match[2].trim()) {
                    result.push(match[2].trim());
                }
                matched = true;
                break;
            }
        }
        if (!matched) {
            result.push(line);
        }
    }
    return result;
}

/**
 * Парсить рядок з урахуванням табуляції
 */
function parseLineWithTab(line) {
    if (line.includes('\t')) {
        const parts = line.split('\t')
            .map(p => cleanText(p.trim()))
            .filter(p => p)
            .filter(p => !/^[<>]?\s*[\d,.]+%$/.test(p));

        if (parts.length >= 2) {
            let left = parts[0];
            let right = parts.slice(1).join(' ');

            // Калорії без одиниці
            if (/^(калории|калорії|калорий|calories?|energy|kcal|энергия|енергія)$/i.test(left) &&
                /^\d+[\d,.]*$/.test(right)) {
                right = right + ' ккал';
            }

            return { left, right };
        } else if (parts.length === 1) {
            return { left: parts[0], right: '' };
        }
    }
    return smartParseLine(cleanText(line));
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { registerHook, runHook, getLoadedPlugins } from './gm-state.js';
