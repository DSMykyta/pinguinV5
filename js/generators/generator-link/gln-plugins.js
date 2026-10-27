// js/generators/generator-link/gln-plugins.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    GENERATOR LINK - PLUGINS                             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Система реєстрації плагінів та хуків                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * СИСТЕМА ПЛАГІНІВ LINKS ГЕНЕРАТОРА
 *
 * Дозволяє модулям реєструватися і бути видаленими без помилок.
 *
 * Хуки (події):
 * - onInit: викликається при ініціалізації
 * - onReset: викликається при оновленні даних
 */

import { createHookRegistry } from '../../utils/utils-hooks.js';

const registry = createHookRegistry({
    name: 'Links',
    events: ['onInit', 'onReset'],
});

export const { registerHook, runHook, runHookAsync } = registry;
export const registerLinksPlugin = registerHook;
export const getRegisteredPlugins = registry.getRegisteredHooks;
