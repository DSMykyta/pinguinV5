// js/generators/generator-table/gt-magic-parser.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    GT-MAGIC-PARSER v11.0                                 ║
 * ║              Головний модуль магічного парсингу                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Парсить текст з етикеток продуктів (iHerb, тощо) і створює структуровані
 * записи для таблиці харчової цінності.
 *
 * ПЛАГІНИ:
 * - gt-magic-cleanup.js       → очистка тексту від сміття
 * - gt-magic-normalize.js     → нормалізація назв (Всего углеводов → Углеводы)
 * - gt-magic-serving.js       → витягування розміру порції
 * - gt-magic-merge.js         → склейка осиротілих значень
 * - gt-magic-headers.js       → обробка заголовків (Ингредиенты, Состав)
 * - gt-smart-value-parser.js  → розумний парсинг значень
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
import { normalizeNutrientName, sortNutrients } from './gt-magic-normalize.js';
import { extractServingSize, shouldSkipLine } from './gt-magic-serving.js';
import { mergeOrphanValues } from './gt-magic-merge.js';
import { processHeaders, isSameHeader } from './gt-magic-headers.js';
import { smartParseLine } from './gt-smart-value-parser.js';

// ============================================================================
// ПІДГОТОВКА ТЕКСТУ
// ============================================================================

/** Патерни заголовків з текстом на тому ж рядку */
const INLINE_HEADER_PATTERNS = [
    /^(ингредиенты|інгредієнти|другие ингредиенты|інші інгредієнти):\s*(.+)$/i,
    /^(состав|склад):\s*(.+)$/i,
];

/**
 * Розділяє рядки типу "Ингредиенты: текст" на два окремих рядки
 * @param {string[]} lines - Масив рядків
 * @returns {string[]} - Масив з розділеними рядками
 */
function splitInlineHeaders(lines) {
    const result = [];

    for (const line of lines) {
        let matched = false;

        for (const pattern of INLINE_HEADER_PATTERNS) {
            const match = line.match(pattern);
            if (match) {
                // Додаємо заголовок окремо
                result.push(match[1]);
                // Додаємо текст окремо
                if (match[2].trim()) {
                    result.push(match[2].trim());
                }
                matched = true;
                break;
            }
        }

        if (!matched) {
            result.push(line);
        }
    }

    return result;
}

// ============================================================================
// ПАРСИНГ ТЕКСТУ
// ============================================================================

/**
 * Парсить рядок з урахуванням табуляції як роздільника колонок
 * @param {string} line - Рядок (може містити таб)
 * @returns {{left: string, right: string}}
 */
function parseLineWithTab(line) {
    // Якщо є табуляція - це роздільник колонок
    if (line.includes('\t')) {
        // Розділяємо по табах і очищаємо кожну частину
        const parts = line.split('\t').map(p => cleanText(p.trim())).filter(p => p);
        if (parts.length >= 2) {
            return { left: parts[0], right: parts.slice(1).join(' ') };
        } else if (parts.length === 1) {
            return { left: parts[0], right: '' };
        }
    }
    // Інакше - звичайний парсинг
    return smartParseLine(cleanText(line));
}

/**
 * Головна функція парсингу тексту
 * @param {string} text - Текст для парсингу
 * @returns {Object[]} - Масив записів {left, right, isHeader, ...}
 */
function parseText(text) {
    const servingSize = extractServingSize(text);

    // Розділяємо на рядки БЕЗ очищення табів спочатку
    let rawLines = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);

    // Розділяємо inline headers (Ингредиенты: текст)
    rawLines = splitInlineHeaders(rawLines);

    // Склеюємо осиротілі значення (для не-табличних даних)
    rawLines = mergeOrphanValues(rawLines);

    // Парсимо кожен рядок з урахуванням табуляції
    let entries = rawLines
        .filter(line => !shouldSkipLine(cleanText(line)))
        .map(line => {
            const parsed = parseLineWithTab(line);
            parsed.left = normalizeNutrientName(parsed.left);
            return parsed;
        });

    // Сортуємо нутрієнти за стандартним порядком
    entries = sortNutrients(entries);

    // Обробляємо заголовки (Ингредиенты, Состав, Пищевая ценность)
    return processHeaders(entries, servingSize);
}

// ============================================================================
// ЗАПОВНЕННЯ UI
// ============================================================================

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

            // isField = true → режим "field" (поле), інакше строка
            if (entry.isField) {
                const fieldRadio = newRow.querySelector('input[type="radio"][value="field"]');
                if (fieldRadio) {
                    fieldRadio.checked = true;
                    handleInputTypeSwitch(newRow, 'field');
                }
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
