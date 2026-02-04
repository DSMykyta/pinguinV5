// js/generators/generator-table/gt-hotkeys.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE GENERATOR LEGO - HOTKEYS PLUGIN                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Гарячі клавіші                                              ║
 * ║                                                                          ║
 * ║  HOTKEYS:                                                                ║
 * ║  - Ctrl+Enter — Додати рядок                                             ║
 * ║  - Ctrl+Shift+Enter — Додати порожній рядок                              ║
 * ║  - Ctrl+Delete — Видалити поточний рядок                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { markPluginLoaded } from './gt-state.js';
import { createAndAppendRow, initializeEmptyRow, deleteRow } from './gt-row-manager.js';

export const PLUGIN_NAME = 'gt-hotkeys';

// ============================================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================================

export function init() {
    markPluginLoaded(PLUGIN_NAME);
    setupHotkeys();
}

// ============================================================================
// HOTKEYS
// ============================================================================

function setupHotkeys() {
    document.addEventListener('keydown', handleKeydown);
}

function handleKeydown(e) {
    const container = document.getElementById('rows-container');
    const isFocusedInContainer = container && document.activeElement && container.contains(document.activeElement);

    // Ctrl+Enter / Ctrl+Shift+Enter
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
            initializeEmptyRow();
        } else {
            createAndAppendRow();
        }
    }

    // Ctrl+Delete
    if (isFocusedInContainer && e.ctrlKey && e.key === 'Delete') {
        e.preventDefault();
        const activeRow = document.activeElement.closest('.inputs-bloc');
        if (activeRow) {
            deleteRow(activeRow);
        }
    }
}

// ============================================================================
// CLEANUP
// ============================================================================

export function destroy() {
    document.removeEventListener('keydown', handleKeydown);
}
