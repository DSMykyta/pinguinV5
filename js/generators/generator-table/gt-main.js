/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   TABLE GENERATOR - ГОЛОВНИЙ ФАЙЛ (MAIN)                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * * ПРИЗНАЧЕННЯ:
 * Точка входу для всього модуля генератора таблиць. Його єдине завдання —
 * імпортувати необхідні компоненти та запустити процес ініціалізації.
 * Цей файл підключається до основного скрипту додатка.
 */

// js/generators/generator-table/gt-main.js
import { registerPanelInitializer } from '../../panel/panel-right.js';
import { getTableDOM } from './gt-dom.js';
import { setupEventListeners } from './gt-event-handler.js';
import { initializeFirstRow } from './gt-row-manager.js';
import { loadSession, autoSaveSession } from './gt-session-manager.js';
import { initHotkeys } from './gt-hotkeys.js';
import { SORTABLE_CONFIG } from './gt-config.js';
import { initTableReset } from './gt-reset.js';

async function initTableGenerator() {
    const dom = getTableDOM();
    if (!dom.rowsContainer) return;

    setupEventListeners();
    initHotkeys();
    initTableReset();

    const sessionLoaded = await loadSession();
    if (!sessionLoaded) {
        initializeFirstRow();
    }

    if (typeof Sortable !== 'undefined') {
        new Sortable(dom.rowsContainer, {
            ...SORTABLE_CONFIG,
            onEnd: () => autoSaveSession(),
        });
    }
}

// Реєструємо наш запускач
registerPanelInitializer('aside-table', initTableGenerator);