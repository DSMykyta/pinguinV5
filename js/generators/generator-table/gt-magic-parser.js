// js/generators/generator-table/gt-magic-parser.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    GT-MAGIC-PARSER v10.0                                 ║
 * ║              Головний модуль магічного парсингу                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Парсить текст з етикеток продуктів (iHerb, тощо) і створює структуровані
 * записи для таблиці харчової цінності.
 *
 * ПЛАГІНИ:
 * - gt-magic-cleanup.js    → очистка тексту від сміття
 * - gt-magic-normalize.js  → нормалізація назв (Calories → Калории)
 * - gt-magic-serving.js    → витягування розміру порції
 * - gt-magic-merge.js      → склейка осиротілих значень
 * - gt-smart-value-parser.js → розумний парсинг значень
 *
 * ЕКСПОРТ:
 * - processAndFillInputs(text) - парсить текст і заповнює UI
 */

import { createAndAppendRow } from './gt-row-manager.js';
import { ROW_CLASSES } from './gt-config.js';
import { getTableDOM } from './gt-dom.js';
import { handleInputTypeSwitch } from './gt-row-renderer.js';

// Плагіни
import { cleanText } from './gt-magic-cleanup.js';
import { extractServingSize, shouldSkipLine, isServingLine } from './gt-magic-serving.js';
import { mergeOrphanValues } from './gt-magic-merge.js';
import { smartParseLine } from './gt-smart-value-parser.js';

// ============================================================================
// ПАТЕРНИ ЗАГОЛОВКІВ
// ============================================================================

const HEADER_PATTERNS = {
    nutrition: /^(пищевая ценность|харчова цінність)$/i,
    nutritionWithValue: /^(пищевая ценность|харчова цінність)\s+(.+)$/i,
    ingredients: /^(ингредиенты|інгредієнти):?$/i,
    composition: /^(состав|склад):?$/i,
};

// ============================================================================
// ПІДГОТОВКА ТЕКСТУ
// ============================================================================

/**
 * Очищає та розбиває текст на рядки
 * @param {string} text - Вхідний текст
 * @returns {string[]} - Масив очищених рядків
 */
function prepareLines(text) {
    const cleaned = cleanText(text);

    return cleaned
        .split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .filter(line => !shouldSkipLine(line));
}

// ============================================================================
// ПАРСИНГ ТЕКСТУ
// ============================================================================

/**
 * Головна функція парсингу тексту
 * @param {string} text - Текст для парсингу
 * @returns {Object[]} - Масив записів {left, right, isHeader, ...}
 */
function parseText(text) {
    const servingSize = extractServingSize(text);
    let lines = prepareLines(text);
    lines = mergeOrphanValues(lines);

    // Парсимо всі рядки
    const entries = lines.map(line => smartParseLine(line));

    // Обробляємо спеціальні заголовки
    const result = [];

    // Перевіряємо чи є "Пищевая ценность" в тексті
    const hasNutritionHeader = entries.some(e =>
        HEADER_PATTERNS.nutrition.test(e.left.trim())
    );

    // Додаємо заголовок якщо є servingSize але немає заголовка
    if (servingSize && !hasNutritionHeader) {
        result.push({
            left: 'Пищевая ценность',
            right: servingSize,
            isHeader: true
        });
    }

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const nextEntry = entries[i + 1];
        const leftTrimmed = entry.left.trim();

        // === ПИЩЕВАЯ ЦЕННОСТЬ ===
        if (HEADER_PATTERNS.nutrition.test(leftTrimmed)) {
            let rightValue = entry.right || servingSize || '';

            // Перевіряємо чи наступний рядок - це порція
            if (!rightValue && nextEntry && isServingLine(nextEntry.left)) {
                rightValue = nextEntry.left + (nextEntry.right ? ' ' + nextEntry.right : '');
                i++;
            }

            result.push({
                left: entry.left,
                right: rightValue,
                isHeader: true
            });
        }
        // === ИНГРЕДИЕНТЫ ===
        else if (HEADER_PATTERNS.ingredients.test(leftTrimmed)) {
            result.push({ left: '', right: '', isSeparator: true });

            result.push({
                left: entry.left.replace(/:$/, ''),
                right: '',
                isHeader: true,
                isSingle: true
            });

            // Наступний рядок - текст інгредієнтів
            if (nextEntry && !isHeaderLine(nextEntry.left)) {
                const hasValue = /\d+\s*(г|мг|мкг|mg|mcg|g|iu|ме)/i.test(nextEntry.right);
                if (!hasValue) {
                    result.push({
                        left: nextEntry.left,
                        right: nextEntry.right || '',
                        isSingle: true
                    });
                    i++;
                }
            }
        }
        // === СОСТАВ ===
        else if (HEADER_PATTERNS.composition.test(leftTrimmed)) {
            result.push({ left: '', right: '', isSeparator: true });
            result.push({
                left: entry.left.replace(/:$/, ''),
                right: entry.right || '',
                isSingle: true,
                isBold: true
            });
        }
        // === ЗВИЧАЙНИЙ РЯДОК ===
        else {
            result.push(entry);
        }
    }

    return result;
}

/**
 * Перевіряє чи рядок є заголовком
 */
function isHeaderLine(text) {
    if (!text) return false;
    return HEADER_PATTERNS.ingredients.test(text) ||
           HEADER_PATTERNS.composition.test(text) ||
           HEADER_PATTERNS.nutrition.test(text);
}

// ============================================================================
// ЗАПОВНЕННЯ UI
// ============================================================================

/**
 * Перевіряє чи два заголовки однакові (з урахуванням перекладів)
 */
function isSameHeader(header1, header2) {
    const h1 = header1.toLowerCase().trim();
    const h2 = header2.toLowerCase().trim();

    if (h1 === h2) return true;

    const synonyms = [
        ['пищевая ценность', 'харчова цінність'],
        ['ингредиенты', 'інгредієнти'],
        ['состав', 'склад']
    ];

    return synonyms.some(group => group.includes(h1) && group.includes(h2));
}

/**
 * Застосовує клас та активує кнопку
 */
function applyClass(row, className) {
    row.classList.add(className);
    const btn = row.querySelector(`[data-class="${className}"]`);
    btn?.classList.add('active');
}

/**
 * Головна функція - парсить текст і заповнює UI
 * @param {string} text - Текст для парсингу
 */
export async function processAndFillInputs(text) {
    if (!text) return;

    const entries = parseText(text);
    const dom = getTableDOM();

    for (const entry of entries) {
        // Розділювач
        if (entry.isSeparator) {
            const newRow = await createAndAppendRow();
            newRow.classList.remove(ROW_CLASSES.TD);
            newRow.classList.add(ROW_CLASSES.NEW_TABLE);
            continue;
        }

        // Пропускаємо порожні
        if (!entry.left && !entry.right) continue;

        // Заголовок - перевіряємо чи існує
        if (entry.isHeader) {
            const existingRows = dom.rowsContainer.querySelectorAll('.inputs-bloc');
            const firstHeader = Array.from(existingRows).find(row =>
                row.classList.contains(ROW_CLASSES.TH_STRONG)
            );

            if (firstHeader) {
                const leftInput = firstHeader.querySelector('.input-left');
                const rightInput = firstHeader.querySelector('.input-right');
                const isEmpty = !leftInput.value.trim();
                const isSame = isSameHeader(leftInput.value, entry.left);

                if (isEmpty || isSame) {
                    leftInput.value = entry.left;
                    rightInput.value = entry.right || '';

                    if (entry.isSingle && !firstHeader.classList.contains(ROW_CLASSES.SINGLE)) {
                        applyClass(firstHeader, ROW_CLASSES.SINGLE);
                        const fieldRadio = firstHeader.querySelector('input[type="radio"][value="field"]');
                        if (fieldRadio) {
                            fieldRadio.checked = true;
                            handleInputTypeSwitch(firstHeader, 'field');
                        }
                    }
                    continue;
                }
            }
        }

        // Створюємо новий рядок
        const newRow = await createAndAppendRow();
        newRow.querySelector('.input-left').value = entry.left;
        newRow.querySelector('.input-right').value = entry.right;

        // Заголовок
        if (entry.isHeader) {
            newRow.classList.remove(ROW_CLASSES.TD);
            newRow.classList.add(ROW_CLASSES.TH_STRONG);
        }

        // Single (одна колонка)
        if (entry.isSingle) {
            applyClass(newRow, ROW_CLASSES.SINGLE);
            const fieldRadio = newRow.querySelector('input[type="radio"][value="field"]');
            if (fieldRadio) {
                fieldRadio.checked = true;
                handleInputTypeSwitch(newRow, 'field');
            }
        }

        // Bold
        if (entry.isBold) {
            applyClass(newRow, ROW_CLASSES.BOLD);
        }

        // Colspan2 для рядків без значення (але не single і не header)
        if (!entry.right && !entry.isSingle && !entry.isHeader) {
            applyClass(newRow, ROW_CLASSES.COLSPAN2);
        }
    }
}
