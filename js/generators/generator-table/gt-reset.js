// js/generators/generator-table/gt-reset.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE GENERATOR LEGO - RESET PLUGIN                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  ПЛАГІН — Очищення таблиці                                              ║
 * ║                                                                          ║
 * ║  ФУНКЦІЇ:                                                                ║
 * ║  - performTableReset() — Очистити всі рядки                              ║
 * ║  - Слухає charm:refresh на секції (кнопка + confirm через charm)          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getTableDOM } from './gt-dom.js';
import { markPluginLoaded, resetRowCounter, runHook } from './gt-state.js';
import { initializeFirstRow } from './gt-row-manager.js';

export const PLUGIN_NAME = 'gt-reset';

// ============================================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================================

export function init() {
    markPluginLoaded(PLUGIN_NAME);

    const section = document.getElementById('section-table');
    section?.addEventListener('charm:refresh', () => performTableReset());
}

// ============================================================================
// RESET LOGIC
// ============================================================================

/**
 * Виконує фактичне очищення секції таблиць та UI.
 */
export function performTableReset() {
    const dom = getTableDOM();
    if (!dom.rowsContainer) return;

    dom.rowsContainer.innerHTML = '';
    resetRowCounter();

    // Викликаємо хук для інших плагінів (session manager очистить сесію)
    runHook('onTableReset');

    initializeFirstRow();
}
