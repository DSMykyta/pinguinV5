// js/generators/generator-table/gt-session-manager.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE GENERATOR LEGO - SESSION MANAGER                ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Збереження та відновлення стану таблиці                     ║
 * ║                                                                          ║
 * ║  ФУНКЦІЇ:                                                                ║
 * ║  - loadSession() — Відновити дані з localStorage                         ║
 * ║  - autoSaveSession() — Зберегти з debounce                               ║
 * ║  - clearSession() — Очистити збережені дані                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getTableDOM } from './gt-dom.js';
import { createAndAppendRow } from './gt-row-manager.js';
import { debounce } from './gt-utils.js';
import { markPluginLoaded, registerHook } from './gt-state.js';

export const PLUGIN_NAME = 'gt-session-manager';

// ============================================================================
// CONFIG
// ============================================================================

const SESSION_KEY = 'tableGeneratorSession';

// ============================================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================================

export function init() {
    markPluginLoaded(PLUGIN_NAME);

    // Підписуємось на хук очищення таблиці
    registerHook('onTableReset', clearSession, { plugin: 'session-manager' });
}

// ============================================================================
// SESSION LOGIC
// ============================================================================

function saveSession() {
    const dom = getTableDOM();
    if (!dom.rowsContainer) return;

    const rowsData = [];
    dom.rowsContainer.querySelectorAll('.content-bloc').forEach(row => {
        rowsData.push({
            left: row.querySelector('.input-box.large input, .input-box.large textarea')?.value || '',
            right: row.querySelector('.input-box.small input, .input-box.small textarea')?.value || '',
            classes: Array.from(row.classList),
        });
    });
    localStorage.setItem(SESSION_KEY, JSON.stringify(rowsData));
}

export async function loadSession() {
    const dom = getTableDOM();
    const savedData = localStorage.getItem(SESSION_KEY);
    if (!savedData) return false;

    try {
        const rowsData = JSON.parse(savedData);
        if (!Array.isArray(rowsData) || rowsData.length === 0) return false;

        dom.rowsContainer.innerHTML = '';
        for (const data of rowsData) {
            const newRow = await createAndAppendRow({ autoSave: false });
            newRow.querySelector('.input-box.large input, .input-box.large textarea').value = data.left;
            newRow.querySelector('.input-box.small input, .input-box.small textarea').value = data.right;
            newRow.className = '';
            data.classes.forEach(cls => newRow.classList.add(cls));
        }
        return true;
    } catch (e) {
        console.warn('[GT Session] Failed to load session:', e);
        return false;
    }
}

/**
 * Повністю видаляє збережену сесію з localStorage.
 */
export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

export const autoSaveSession = debounce(saveSession, 700);

// ============================================================================
// CLEANUP
// ============================================================================

export function destroy() {
    clearSession();
}
