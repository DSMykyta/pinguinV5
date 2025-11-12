// js/generators/generator-table/gt-hotkeys.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║             TABLE GENERATOR - ГАРЯЧІ КЛАВІШІ (HOTKEYS)                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * * ПРИЗНАЧЕННЯ:
 * Додає підтримку гарячих клавіш для швидкого управління таблицею.
 */

import { createAndAppendRow, initializeEmptyRow, deleteRow } from './gt-row-manager.js';

export function initHotkeys() {
    document.addEventListener('keydown', (e) => {
        // Перевіряємо, що фокус знаходиться всередині нашого контейнера
        const isFocusedInContainer = document.activeElement && document.getElementById('rows-container').contains(document.activeElement);

        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                initializeEmptyRow(); // Ctrl + Shift + Enter
            } else {
                createAndAppendRow(); // Ctrl + Enter
            }
        }

        if (isFocusedInContainer && e.key === 'Delete') {
            e.preventDefault();
            const activeRow = document.activeElement.closest('.inputs-bloc');
            if (activeRow) {
                deleteRow(activeRow);
            }
        }
    });
}