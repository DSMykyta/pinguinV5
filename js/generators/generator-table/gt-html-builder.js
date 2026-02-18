/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                 TABLE GENERATOR - HTML БУДІВНИК (BUILDER)                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * * ПРИЗНАЧЕННЯ:
 * Генерує фінальний HTML-код таблиці на основі поточного стану рядків у DOM.
 * Відповідає за правильну побудову тегів <table>, <tbody>, <tr>, <td>, <th>,
 * а також за обробку спеціальних випадків, як-от h3, colspan та курсив.
 */

import { getTableDOM } from './gt-dom.js';
import { ROW_CLASSES, SELECTORS } from './gt-config.js';
import { sanitizeText } from './gt-utils.js';

const dom = getTableDOM();

/**
 * Генерує повний HTML-код таблиці(-ць) з усіх рядків.
 * @returns {string} - Готовий для копіювання HTML-код.
 */
export function generateHtmlTable() {
    let tableHTML = '';
    let isTableOpen = false;

    dom.rowsContainer.querySelectorAll(SELECTORS.INPUTS_BLOC).forEach(row => {
        const leftInput = row.querySelector(SELECTORS.INPUT_LEFT).value;
        const rightInput = row.querySelector(SELECTORS.INPUT_RIGHT).value;

        // Пропускаємо порожні рядки
        if ((row.classList.contains(ROW_CLASSES.ADDED) && !rightInput.trim()) ||
            (!row.classList.contains(ROW_CLASSES.NEW_TABLE) && !leftInput.trim() && !rightInput.trim())) {
            return;
        }

        // Обробка розділювачів та H3
        if (row.classList.contains(ROW_CLASSES.NEW_TABLE) || row.classList.contains(ROW_CLASSES.H3)) {
            if (isTableOpen) {
                tableHTML += '</tbody></table>';
                isTableOpen = false;
            }
            if (row.classList.contains(ROW_CLASSES.H3)) {
                tableHTML += `<h3>${sanitizeText(leftInput)}</h3>`;
            }
            return;
        }

        // Відкриваємо таблицю, якщо вона ще не відкрита
        if (!isTableOpen) {
            tableHTML += '<table><tbody>';
            isTableOpen = true;
        }

        // Форматуємо контент
        let leftContent = formatCellContent(leftInput);
        let rightContent = formatCellContent(rightInput);
        if (row.classList.contains(ROW_CLASSES.ITALIC)) {
            leftContent = `<em>${leftContent}</em>`;
            rightContent = `<em>${rightContent}</em>`;
        }

        const isTh = row.classList.contains(ROW_CLASSES.TH_STRONG) || row.classList.contains(ROW_CLASSES.TH);
        const cellTag = isTh ? 'th' : 'td';

        tableHTML += generateTableRow(row, leftContent, rightContent, cellTag);
    });

    if (isTableOpen) {
        tableHTML += '</tbody></table>';
    }

    return tableHTML;
}

/**
 * Форматує текст комірки, додаючи <em> для тексту в дужках.
 * @param {string} text - Вхідний текст.
 * @returns {string} - Форматований текст.
 */
function formatCellContent(text) {
    let content = sanitizeText(text);
    return content.replace(/\(([^)]+)\)/g, '<em>($1)</em>');
}

/**
 * Генерує HTML для одного рядка <tr>, враховуючи colspan та single.
 * @param {HTMLElement} row - DOM-елемент рядка.
 * @param {string} leftContent - Оброблений текст лівої комірки.
 * @param {string} rightContent - Оброблений текст правої комірки.
 * @param {string} cellTag - 'td' або 'th'.
 * @returns {string} - HTML-код для `<tr>`.
 */
function generateTableRow(row, leftContent, rightContent, cellTag) {
    const isBold = row.classList.contains(ROW_CLASSES.TH_STRONG) || row.classList.contains(ROW_CLASSES.BOLD);
    
    if (row.classList.contains(ROW_CLASSES.COLSPAN2)) {
        const content = isBold ? `<strong>${leftContent}</strong>` : leftContent;
        return `<tr><${cellTag}>${content}</${cellTag}></tr>`;
    }

    if (row.classList.contains(ROW_CLASSES.SINGLE)) {
        const content = isBold ? `<strong>${leftContent}</strong>` : leftContent;
        return `<tr><${cellTag}>${content}</${cellTag}></tr>`;
    }

    const leftCell = isBold ? `<strong>${leftContent}</strong>` : leftContent;
    const rightCell = isBold ? `<strong>${rightContent}</strong>` : rightContent;
    return `<tr><${cellTag}>${leftCell}</${cellTag}><${cellTag}>${rightCell}</${cellTag}></tr>`;
}