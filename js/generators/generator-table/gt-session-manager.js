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
const STRUCTURAL_ROW_CLASSES = ['content-bloc', 'generator-table-row', 'table-row'];
let sessionRowsCache = null;
let lifecycleListenersAdded = false;

// ============================================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================================

export function init() {
    markPluginLoaded(PLUGIN_NAME);

    // Підписуємось на хук очищення таблиці
    registerHook('onTableReset', clearSession, { plugin: 'session-manager' });

    if (!lifecycleListenersAdded) {
        lifecycleListenersAdded = true;
        window.addEventListener('pagehide', () => autoSaveSession.flush?.());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') autoSaveSession.flush?.();
        });
    }
}

// ============================================================================
// SESSION LOGIC
// ============================================================================

function readRowData(row) {
    return {
        left: row.querySelector('.input-box.large input, .input-box.large textarea')?.value || '',
        right: row.querySelector('.input-box.small input, .input-box.small textarea')?.value || '',
        classes: Array.from(row.classList),
    };
}

function collectRowsData() {
    const dom = getTableDOM();
    if (!dom.rowsContainer) return [];

    return Array.from(dom.rowsContainer.querySelectorAll('.content-bloc'), readRowData);
}

function syncChangedRow(sourceEl) {
    const dom = getTableDOM();
    const row = sourceEl?.closest?.('.content-bloc');
    if (!dom.rowsContainer || !row || !dom.rowsContainer.contains(row)) {
        sessionRowsCache = collectRowsData();
        return;
    }

    if (!sessionRowsCache) sessionRowsCache = collectRowsData();

    const rows = Array.from(dom.rowsContainer.querySelectorAll('.content-bloc'));
    const index = rows.indexOf(row);
    if (index < 0) {
        sessionRowsCache = collectRowsData();
        return;
    }

    sessionRowsCache[index] = readRowData(row);
}

function saveSession(sourceEl = null) {
    if (sourceEl) {
        syncChangedRow(sourceEl);
    } else {
        sessionRowsCache = collectRowsData();
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionRowsCache || []));
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
            newRow.className = STRUCTURAL_ROW_CLASSES.join(' ');
            (data.classes || []).forEach(cls => newRow.classList.add(cls));
        }
        sessionRowsCache = collectRowsData();
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
    autoSaveSession.cancel?.();
    sessionRowsCache = null;
    localStorage.removeItem(SESSION_KEY);
}

export const autoSaveSession = debounce(saveSession, 700);

// ============================================================================
// CLEANUP
// ============================================================================

export function destroy() {
    clearSession();
}
