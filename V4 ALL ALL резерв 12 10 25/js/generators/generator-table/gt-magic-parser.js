// js/generators/generator-table/gt-magic-parser.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║             TABLE GENERATOR - "МАГІЧНИЙ" ПАРСЕР (MAGIC PARSER) v6.3      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * * ПРИЗНАЧЕННЯ:
 * Обробляє найскладніші етикетки. Надійно об'єднує значення, розбирає
 * рядки та коректно видаляє відсоткові значення.
 */

import { createAndAppendRow } from './gt-row-manager.js';
import { ROW_CLASSES } from './gt-config.js';

export async function processAndFillInputs(text) {
    if (!text) return;
    const entries = parseText(text);

    for (const entry of entries) {
        if (entry.left) {
            const newRow = await createAndAppendRow();
            newRow.querySelector('.input-left').value = entry.left;
            newRow.querySelector('.input-right').value = entry.right;

            if (!entry.right) {
                newRow.classList.add(ROW_CLASSES.COLSPAN2);
                const colspanBtn = newRow.querySelector(`[data-class="${ROW_CLASSES.COLSPAN2}"]`);
                colspanBtn?.classList.add('active');
            }
        }
    }
}

/**
 * Головна функція, що перетворює сирий текст на масив логічних записів.
 * @param {string} text - Вхідний текст.
 * @returns {Array<{left: string, right: string}>}
 */
function parseText(text) {
    // 1. Попереднє очищення та розбивка на рядки
    let lines = text
        // === ОСНОВНЕ ВИПРАВЛЕННЯ: Покращена регулярка для видалення відсотків ===
        .replace(/\s*\d+\s*%/g, '') // Видаляє будь-яку комбінацію "число %"
        .replace(/\*\*|†|®/g, '')
        .replace(/(\d),(\d{3})/g, '$1$2')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);

    // 2. "Склеювання" значень знизу вгору
    const valueOnlyRegex = /^[<]?\d[\d,.]*(\s*[\w()-]+)?$/;
    const standardEntryRegex = /\D+\s+[\d,.]+/; 

    for (let i = lines.length - 1; i > 0; i--) {
        if (valueOnlyRegex.test(lines[i]) && !lines[i].match(/[a-zA-Z]{4,}/)) {
            for (let j = i - 1; j >= 0; j--) {
                if (!standardEntryRegex.test(lines[j])) {
                    lines[j] += ' ' + lines[i];
                    lines.splice(i, 1);
                    break;
                }
            }
        }
    }

    // 3. Фінальний розбір кожного логічного рядка
    const finalEntries = [];
    for (const line of lines) {
        const parenthesizedValueRegex = /\(([\d,.]+\s*[\w-]+)\)/g;
        const matches = [...line.matchAll(parenthesizedValueRegex)];

        if (matches.length > 1) {
            let lastIndex = 0;
            matches.forEach(match => {
                const name = line.substring(lastIndex, match.index).replace(/,$/, '').trim();
                const value = match[1].trim();
                if (name) {
                    finalEntries.push({ left: name, right: value });
                }
                lastIndex = match.index + match[0].length;
            });
        } else {
            const splitMatch = line.match(/(.*?)\s+([\d,.]+.+)$/);
            if (splitMatch) {
                finalEntries.push({ left: splitMatch[1].trim(), right: splitMatch[2].trim() });
            } else {
                finalEntries.push({ left: line, right: '' });
            }
        }
    }

    return finalEntries;
}