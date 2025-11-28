// js/generators/generator-table/gt-session-manager.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║           TABLE GENERATOR - МЕНЕДЖЕР СЕСІЙ (SESSION MANAGER)             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * * ПРИЗНАЧЕННЯ:
 * Керує автоматичним збереженням стану таблиці в localStorage та її
 * відновленням при перезавантаженні сторінки.
 */

import { getTableDOM } from './gt-dom.js';
import { createAndAppendRow } from './gt-row-manager.js';
import { debounce } from './gt-utils.js';

const SESSION_KEY = 'tableGeneratorSession';
const dom = getTableDOM();

function saveSession() {
    if (!dom.rowsContainer) return;
    const rowsData = [];
    dom.rowsContainer.querySelectorAll('.inputs-bloc').forEach(row => {
        rowsData.push({
            left: row.querySelector('.input-left')?.value || '',
            right: row.querySelector('.input-right')?.value || '',
            classes: Array.from(row.classList),
        });
    });
    localStorage.setItem(SESSION_KEY, JSON.stringify(rowsData));
}

export async function loadSession() {
    const savedData = localStorage.getItem(SESSION_KEY);
    if (!savedData) return false;
    const rowsData = JSON.parse(savedData);
    if (!Array.isArray(rowsData) || rowsData.length === 0) return false;
    dom.rowsContainer.innerHTML = '';
    for (const data of rowsData) {
        const newRow = await createAndAppendRow();
        newRow.querySelector('.input-left').value = data.left;
        newRow.querySelector('.input-right').value = data.right;
        newRow.className = '';
        data.classes.forEach(cls => newRow.classList.add(cls));
    }
    return true;
}

/**
 * Повністю видаляє збережену сесію з localStorage.
 */
export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

export const autoSaveSession = debounce(saveSession, 700);