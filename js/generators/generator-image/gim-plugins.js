// js/generators/generator-image/gim-plugins.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    IMAGE TOOL - PLUGINS                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Система реєстрації плагінів та хуків                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * СИСТЕМА ПЛАГІНІВ IMAGE TOOL ГЕНЕРАТОРА
 *
 * Дозволяє модулям реєструватися і бути видаленими без помилок.
 *
 * Хуки (події):
 * - onInit: викликається при ініціалізації
 * - onLoad: викликається при завантаженні зображення
 * - onSave: викликається при збереженні
 */

import { createHookRegistry } from '../../utils/utils-hooks.js';

const registry = createHookRegistry({
    name: 'Image',
    events: ['onInit', 'onLoad', 'onSave'],
});

export const { registerHook, runHook, runHookAsync } = registry;
export const registerImagePlugin = registerHook;
export const getRegisteredPlugins = registry.getRegisteredHooks;
