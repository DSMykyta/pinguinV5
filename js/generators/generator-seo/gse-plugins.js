// js/generators/generator-seo/gse-plugins.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                     GENERATOR SEO - PLUGINS                             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Система реєстрації плагінів та хуків                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * СИСТЕМА ПЛАГІНІВ SEO ГЕНЕРАТОРА
 *
 * Дозволяє модулям реєструватися і бути видаленими без помилок.
 *
 * Хуки (події):
 * - onInit: викликається при ініціалізації SEO
 * - onCalculate: викликається при перерахунку SEO
 * - onReset: викликається при скиданні форми
 */

import { createHookRegistry } from '../../utils/utils-hooks.js';

const registry = createHookRegistry({
    name: 'SEO',
    events: ['onInit', 'onCalculate', 'onReset'],
});

export const { registerHook, runHook, runHookAsync } = registry;
export const registerSeoPlugin = registerHook;
export const getRegisteredPlugins = registry.getRegisteredHooks;

export const optionalFunctions = {};
