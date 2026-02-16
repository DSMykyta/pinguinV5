// js/generators/generator-table/gt-magic-parser.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    GT-MAGIC-PARSER v12.0 (LEGO WRAPPER)                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Обгортка для LEGO magic системи. Забезпечує зворотню сумісність
 * зі старими імпортами та інтеграцію з UI генератора таблиць.
 *
 * LEGO МОДУЛЬ:
 * Вся логіка парсингу винесена в js/generators/generator-magic/
 *
 * ЕКСПОРТ:
 * - processAndFillInputs(text) - парсить текст і заповнює UI
 */

import { createAndAppendRow } from './gt-row-manager.js';
import { ROW_CLASSES } from './gt-config.js';
import { getTableDOM } from './gt-dom.js';
import { handleInputTypeSwitch } from './gt-row-renderer.js';

// LEGO Magic Module
import {
    initMagicParser,
    parseText,
    registerHook,
    runHook,
    getLoadedPlugins
} from '../generator-magic/magic-main.js';

import { isSameHeader } from '../generator-magic/magic-headers.js';

// ============================================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================================

let initialized = false;

/**
 * Ініціалізувати magic parser (lazy)
 */
async function ensureInitialized() {
    if (!initialized) {
        await initMagicParser();
        initialized = true;
    }
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

    await ensureInitialized();

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
            const existingRows = dom.rowsContainer.querySelectorAll('.content-bloc');
            const firstHeader = Array.from(existingRows).find(row =>
                row.classList.contains(ROW_CLASSES.TH_STRONG)
            );

            if (firstHeader) {
                const leftInput = firstHeader.querySelector('.input-box.large input, .input-box.large textarea');
                const rightInput = firstHeader.querySelector('.input-box.small input, .input-box.small textarea');
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
        newRow.querySelector('.input-box.large input, .input-box.large textarea').value = entry.left;
        newRow.querySelector('.input-box.small input, .input-box.small textarea').value = entry.right;

        // Заголовок
        if (entry.isHeader) {
            newRow.classList.remove(ROW_CLASSES.TD);
            newRow.classList.add(ROW_CLASSES.TH_STRONG);
        }

        // Single (одна колонка)
        if (entry.isSingle) {
            applyClass(newRow, ROW_CLASSES.SINGLE);

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

// ============================================================================
// RE-EXPORTS (для зворотньої сумісності)
// ============================================================================

export { parseText, registerHook, runHook, getLoadedPlugins };
