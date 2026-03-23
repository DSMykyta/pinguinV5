// js/pages/tasks/tasks-plugins.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS — PLUGIN SYSTEM                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔒 ЯДРО — Re-export з generic page-plugins.
 */

import { createPluginRegistry } from '../../components/page/page-plugins.js';

const tasksPlugins = createPluginRegistry('Tasks');

export const registerHook = tasksPlugins.registerHook;
export const runHook = tasksPlugins.runHook;
export const runHookAsync = tasksPlugins.runHookAsync;

export { tasksPlugins };
