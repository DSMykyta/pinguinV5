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
import { getTableDOM } from './gt-dom.js';
import { handleInputTypeSwitch } from './gt-row-renderer.js';

export async function processAndFillInputs(text) {
    if (!text) return;
    const entries = parseText(text);
    const dom = getTableDOM();

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];

        // Обробка порожнього розділювача
        if (entry.isSeparator) {
            const newRow = await createAndAppendRow();
            newRow.classList.remove(ROW_CLASSES.TD);
            newRow.classList.add(ROW_CLASSES.NEW_TABLE);
            continue;
        }

        if (!entry.left) continue;

        // Якщо це заголовок секції - перевіряємо чи вже не існує такого заголовка
        if (entry.isHeader) {
            const existingRows = dom.rowsContainer.querySelectorAll('.inputs-bloc');

            // Шукаємо ПЕРШИЙ заголовок th-strong (це може бути не останній рядок!)
            const firstHeader = Array.from(existingRows).find(row =>
                row.classList.contains(ROW_CLASSES.TH_STRONG)
            );

            if (firstHeader) {
                const firstLeftInput = firstHeader.querySelector('.input-left');
                const firstRightInput = firstHeader.querySelector('.input-right');

                // Перевіряємо чи це той самий заголовок (Пищевая ценность = Харчова цінність)
                // АБО якщо перший рядок порожній (початковий стан)
                const isEmptyHeader = !firstLeftInput.value.trim();
                const isSameHeaderValue = isSameHeader(firstLeftInput.value, entry.left);

                if (isEmptyHeader || isSameHeaderValue) {
                    // Оновлюємо текст заголовка на поточну мову
                    firstLeftInput.value = entry.left;
                    firstRightInput.value = '';

                    // Додаємо клас single якщо потрібно
                    if (entry.isSingle && !firstHeader.classList.contains(ROW_CLASSES.SINGLE)) {
                        firstHeader.classList.add(ROW_CLASSES.SINGLE);
                        const singleBtn = firstHeader.querySelector(`[data-class="${ROW_CLASSES.SINGLE}"]`);
                        singleBtn?.classList.add('active');

                        // Перемикаємо на режим "Поле" (textarea)
                        const fieldRadio = firstHeader.querySelector('input[type="radio"][value="field"]');
                        if (fieldRadio) {
                            fieldRadio.checked = true;
                            handleInputTypeSwitch(firstHeader, 'field');
                        }
                    }
                    continue; // Пропускаємо створення нового рядка
                }
            }
        }

        const newRow = await createAndAppendRow();
        newRow.querySelector('.input-left').value = entry.left;
        newRow.querySelector('.input-right').value = entry.right;

        // Якщо це заголовок секції (Пищевая ценность, Ингредиенты тощо)
        if (entry.isHeader) {
            newRow.classList.remove(ROW_CLASSES.TD);
            newRow.classList.add(ROW_CLASSES.TH_STRONG);
        }

        // Додаємо клас single (одна колонка) та перемикаємо на textarea
        if (entry.isSingle) {
            newRow.classList.add(ROW_CLASSES.SINGLE);
            const singleBtn = newRow.querySelector(`[data-class="${ROW_CLASSES.SINGLE}"]`);
            singleBtn?.classList.add('active');

            // Перемикаємо на режим "Поле" (textarea)
            const fieldRadio = newRow.querySelector('input[type="radio"][value="field"]');
            if (fieldRadio) {
                fieldRadio.checked = true;
                handleInputTypeSwitch(newRow, 'field');
            }
        }

        // Додаємо клас bold (жирний текст)
        if (entry.isBold) {
            newRow.classList.add(ROW_CLASSES.BOLD);
            const boldBtn = newRow.querySelector(`[data-class="${ROW_CLASSES.BOLD}"]`);
            boldBtn?.classList.add('active');
        }

        if (!entry.right && !entry.isSingle) {
            newRow.classList.add(ROW_CLASSES.COLSPAN2);
            const colspanBtn = newRow.querySelector(`[data-class="${ROW_CLASSES.COLSPAN2}"]`);
            colspanBtn?.classList.add('active');
        }
    }
}

/**
 * Перевіряє чи два заголовки є однаковими (враховуючи переклади)
 */
function isSameHeader(header1, header2) {
    const h1 = header1.toLowerCase().trim();
    const h2 = header2.toLowerCase().trim();

    // Пряме співпадіння
    if (h1 === h2) return true;

    // Групи синонімів (російська/українська)
    const synonymGroups = [
        ['пищевая ценность', 'харчова цінність'],
        ['ингредиенты', 'інгредієнти'],
        ['состав', 'склад']
    ];

    for (const group of synonymGroups) {
        if (group.includes(h1) && group.includes(h2)) {
            return true;
        }
    }

    return false;
}

/**
 * Головна функція, що перетворює сирий текст на масив логічних записів.
 * @param {string} text - Вхідний текст.
 * @returns {Array<{left: string, right: string, isHeader?: boolean, isSeparator?: boolean, isSingle?: boolean, isBold?: boolean}>}
 */
function parseText(text) {
    // 1. Попереднє очищення та розбивка на рядки
    let lines = text
        // НЕ видаляємо відсотки! Вони потрібні для tooltip
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

    // 4. Обробка спеціальних блоків (Пищевая ценность, Ингредиенты тощо)
    const processedEntries = [];

    for (let i = 0; i < finalEntries.length; i++) {
        const entry = finalEntries[i];
        const nextEntry = finalEntries[i + 1];

        const isPishchevayaTsennost = /пищевая ценность|харчова цінність/i.test(entry.left);
        const isIngredients = /ингредиенты|інгредієнти/i.test(entry.left);
        const isSostav = /состав|склад/i.test(entry.left);

        // Обробка "Пищевая ценность"
        if (isPishchevayaTsennost && entry.right) {
            // Створюємо заголовковий рядок
            processedEntries.push({
                left: entry.left,
                right: '',
                isHeader: true
            });
            // Створюємо рядок зі значенням
            processedEntries.push({
                left: entry.left,
                right: entry.right
            });
        } else if (isPishchevayaTsennost && !entry.right) {
            // Якщо це просто заголовок без значення
            processedEntries.push({
                left: entry.left,
                right: '',
                isHeader: true
            });
        }
        // Обробка "Ингредиенты"
        else if (isIngredients) {
            // Додаємо порожній розділювач
            processedEntries.push({
                left: '',
                right: '',
                isSeparator: true
            });
            // Створюємо заголовок БЕЗ single (має бути звичайний заголовок)
            processedEntries.push({
                left: entry.left,
                right: '',
                isHeader: true
            });
            // Якщо є наступний рядок з текстом інгредієнтів - ВІН має бути single
            if (nextEntry) {
                const isNextIngredients = /ингредиенты|інгредієнти/i.test(nextEntry.left);
                const isNextSostav = /состав|склад/i.test(nextEntry.left);

                if (!isNextIngredients && !isNextSostav) {
                    processedEntries.push({
                        left: nextEntry.left,
                        right: nextEntry.right || '',
                        isSingle: true
                    });
                    i++; // Пропускаємо наступний entry, бо вже обробили
                }
            }
        }
        // Обробка "Состав"
        else if (isSostav) {
            // Додаємо порожній розділювач
            processedEntries.push({
                left: '',
                right: '',
                isSeparator: true
            });
            // Створюємо рядок з текстом
            processedEntries.push({
                left: entry.left,
                right: entry.right || '',
                isSingle: true,
                isBold: true
            });
        }
        // Звичайний рядок
        else {
            processedEntries.push(entry);
        }
    }

    return processedEntries;
}