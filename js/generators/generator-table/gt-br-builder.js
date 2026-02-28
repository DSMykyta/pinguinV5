// js/generators/generator-table/gt-br-builder.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                 TABLE GENERATOR — BR БУДІВНИК (BUILDER)                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Генерує спрощений <br>-варіант таблиці для копіювання      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getTableDOM } from './gt-dom.js';
import { ROW_CLASSES, SELECTORS } from './gt-config.js';
import { sanitizeText } from './gt-utils.js';

const dom = getTableDOM();

/**
 * Генерує текст з тегами <br> з усіх рядків.
 * @returns {string} - Готовий для копіювання текст.
 */
export function generateBrText() {
    let textHTML = '';
    dom.rowsContainer.querySelectorAll(SELECTORS.INPUTS_BLOC).forEach(row => {
        if (row.classList.contains(ROW_CLASSES.NEW_TABLE)) {
            textHTML += '<br>';
            return;
        }

        let leftInput = row.querySelector(SELECTORS.INPUT_LEFT).value;
        const rightInput = row.querySelector(SELECTORS.INPUT_RIGHT).value;

        if ((row.classList.contains(ROW_CLASSES.ADDED) && !rightInput.trim()) || (!leftInput.trim() && !rightInput.trim())) {
            return;
        }

        // Не дублюємо "Пищевая ценность" у BR-коді
        if (leftInput.match(/Харчова цінність|Пищевая ценность/gi)) {
            leftInput = '';
        }

        const sanitizedLeft = sanitizeText(leftInput);
        let line;

        if (row.classList.contains(ROW_CLASSES.H3) || row.classList.contains(ROW_CLASSES.COLSPAN2) || row.classList.contains(ROW_CLASSES.SINGLE)) {
            line = sanitizedLeft;
        } else {
            const sanitizedRight = sanitizeText(rightInput);
            line = `${sanitizedLeft} ${sanitizedRight}`.trim();
        }

        if (row.classList.contains(ROW_CLASSES.H3) || row.classList.contains(ROW_CLASSES.BOLD) || row.classList.contains(ROW_CLASSES.TH_STRONG) || row.classList.contains(ROW_CLASSES.TH)) {
            if(line) line = `<strong>${line}</strong>`;
        }

        if (line) {
            textHTML += line + '<br>';
        }
    });
    return textHTML;
}