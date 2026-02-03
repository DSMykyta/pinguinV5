// js/generators/generator-table/gt-magic-parser.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║             TABLE GENERATOR - "МАГІЧНИЙ" ПАРСЕР (MAGIC PARSER) v9.0      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Парсить текст з етикеток продуктів (iHerb, тощо) і створює структуровані
 * записи для таблиці харчової цінності.
 *
 * ПРИНЦИПИ:
 * 1. Всі харчові цінності йдуть в ОДНУ таблицю
 * 2. Розділення таблиць ТІЛЬКИ на явних заголовках (Ингредиенты, Состав)
 * 3. Автоматична нормалізація назв (Calories → Калории)
 * 4. Підтримка підкатегорій (сахар → - сахар)
 */

import { createAndAppendRow } from './gt-row-manager.js';
import { ROW_CLASSES } from './gt-config.js';
import { getTableDOM } from './gt-dom.js';
import { handleInputTypeSwitch } from './gt-row-renderer.js';

// ============================================================================
// КОНСТАНТИ
// ============================================================================

/** Regex для одиниць виміру */
const UNITS = '(?:г|мг|мкг|ккал|кдж|ml|g|mg|mcg|iu|ме|IU|МЕ|cfu|КУО|HUT|GDU|TU|FIP|LACU|GALU|ALU|SKB|DU|LU|HCU|PU)';
const MULTIPLIERS = '(?:billion|million|bil|mil|тыс|тис|млн|млрд)?';

/** Regex для числового значення з одиницею */
const VALUE_PATTERN = new RegExp(
    `^(.+)\\s+` +                                    // Назва (жадібний)
    `([<>]?\\s*[\\d,.]+\\s*` +                       // Число з можливим < >
    `${MULTIPLIERS}\\s*` +                           // Множник (billion, тощо)
    `${UNITS}` +                                     // Одиниця виміру
    `(?:\\s*/\\s*[\\d,.]+\\s*${UNITS})?)` +          // Опційно: /100г
    `\\s*(?:[<>]?\\s*[\\d,.]+%)?$`,                  // Опційно: відсоток в кінці
    'i'
);

/** Regex для калорій без одиниці */
const CALORIES_PATTERN = /^(калории|калорії|calories)\s+(\d+)\s*$/i;

/** Regex для заголовка "Пищевая ценность X" */
const NUTRITION_HEADER_PATTERN = /^(пищевая ценность|харчова цінність)\s+(.+)$/i;

/** Рядки iHerb для пропуску */
const IHERB_SKIP_PATTERNS = [
    /^(размер порции|розмір порції|serving size)[:\s]/i,
    /^(количество порций|кількість порцій|servings per)/i,
    /^(количество на порцию|кількість на порцію|amount per)/i,
    /^%\s*(от суточной|від добової|daily value)/i
];

/** Символи для видалення */
const CLEANUP_SYMBOLS = /\*\*|[†‡✝×®*•○◊■□▪▫]/g;

// ============================================================================
// НОРМАЛІЗАЦІЯ НАЗВ
// ============================================================================

/**
 * Мапа нормалізації назв нутрієнтів
 * Формат: [regex, російська форма, українська форма]
 */
const NORMALIZATION_MAP = [
    // Калории
    [/^(калорийность|энергетическая ценность|калорій|енергетична цінність|calories|energy|kcal)$/i,
     'Калории', 'Калорії'],

    // - от жиров (підкатегорія калорій)
    [/^(от жиров|від жирів|from fat|calories from fat)$/i,
     ' - от жиров', ' - від жирів'],

    // Жиры (основна категорія)
    [/^(жир|жиров|жири|жирів|fat|fats|total fat|общее содержание жира|загальний вміст жиру)$/i,
     'Жиры', 'Жири'],

    // - насыщенные (підкатегорія жирів)
    [/^(насыщенные жиры|насыщенных жиров|насыщенные|насичені жири|насичені|saturated fat|saturated)$/i,
     ' - насыщенные', ' - насичені'],

    // - транс-жиры (підкатегорія жирів)
    [/^(транс-?жиры|транс-?жирів|трансжиры|trans fat|trans)$/i,
     ' - транс-жиры', ' - транс-жири'],

    // Холестерин
    [/^(холестерин|холестерина|холестерол|cholesterol)$/i,
     'Холестерин', 'Холестерин'],

    // Натрий
    [/^(натрий|натрия|натрій|натрію|sodium)$/i,
     'Натрий', 'Натрій'],

    // Углеводы (основна категорія)
    [/^(углеводы|углеводов|вуглеводи|вуглеводів|carbohydrates|carbs|total carbohydrate|общее количество углеводов|загальна кількість вуглеводів)$/i,
     'Углеводы', 'Вуглеводи'],

    // - сахар (підкатегорія вуглеводів)
    [/^(сахар|сахара|цукор|цукру|sugar|sugars|total sugars|общее содержание сахара|загальний вміст цукру)$/i,
     ' - сахар', ' - цукор'],

    // - добавленного сахара (підпідкатегорія)
    [/^(добавленн?ый сахар|добавленного сахара|доданий цукор|added sugar|includes.*added)$/i,
     ' - добавленного сахара', ' - доданого цукру'],

    // - пищевые волокна (підкатегорія вуглеводів)
    [/^(клетчатка|пищевые волокна|пищевых волокон|харчові волокна|dietary fiber|fiber|fibre)$/i,
     ' - пищевые волокна', ' - харчові волокна'],

    // Белок
    [/^(белок|белки|белков|білок|білка|білків|protein|proteins)$/i,
     'Белок', 'Білок'],

    // Соль
    [/^(соль|солі|salt)$/i,
     'Соль', 'Сіль'],
];

/**
 * Визначає мову тексту (українська чи російська)
 */
function isUkrainian(text) {
    // Українські літери
    if (/[іїєґ]/i.test(text)) return true;
    // Українські слова без специфічних літер
    if (/^(цукор|цукру|жири|жирів|вуглеводи|білок|білка|сіль|солі)$/i.test(text)) return true;
    return false;
}

/**
 * Нормалізує назву нутрієнту
 */
function normalizeNutrientName(name) {
    let normalized = name.replace(/:$/, '').trim();
    const ua = isUkrainian(normalized);

    for (const [regex, ruForm, uaForm] of NORMALIZATION_MAP) {
        if (regex.test(normalized)) {
            return ua ? uaForm : ruForm;
        }
    }

    return normalized;
}

// ============================================================================
// ПАРСИНГ
// ============================================================================

/**
 * Витягує розмір порції з тексту iHerb
 */
function extractServingSize(text) {
    const match = text.match(/размер порции[:\s]+(.+?)(?:\n|$)/i) ||
                  text.match(/розмір порції[:\s]+(.+?)(?:\n|$)/i) ||
                  text.match(/serving size[:\s]+(.+?)(?:\n|$)/i);
    return match ? match[1].trim() : '';
}

/**
 * Очищує та розбиває текст на рядки
 */
function cleanAndSplitLines(text) {
    return text
        // Видаляємо зайві символи
        .replace(CLEANUP_SYMBOLS, '')
        // Видаляємо відсотки в кінці рядка (включаючи <1%)
        .replace(/\s+[<>]?\s*[\d,.]+%\s*$/gm, '')
        // Табуляції → пробіли
        .replace(/\t+/g, ' ')
        // Тисячні роздільники (1,000 → 1000)
        .replace(/(\d),(\d{3})/g, '$1$2')
        .split('\n')
        .map(line => line.trim())
        .map(line => line.replace(/\s{2,}/g, ' '))
        .filter(line => line)
        // Пропускаємо службові рядки iHerb
        .filter(line => !IHERB_SKIP_PATTERNS.some(pattern => pattern.test(line)));
}

/**
 * Склеює "осиротілі" значення з попередніми рядками
 * Наприклад: "Вітамін D" + "10 мг" → "Вітамін D 10 мг"
 */
function mergeOrphanValues(lines) {
    const valueOnlyRegex = new RegExp(
        `^[<>]?\\s*[\\d,.]+\\s*${MULTIPLIERS}\\s*${UNITS}$`, 'i'
    );

    for (let i = lines.length - 1; i > 0; i--) {
        if (valueOnlyRegex.test(lines[i])) {
            // Шукаємо попередній рядок без значення
            for (let j = i - 1; j >= 0; j--) {
                if (!/\d+\s*(?:г|мг|мкг|mg|mcg|g|iu|ме)/i.test(lines[j])) {
                    lines[j] += ' ' + lines[i];
                    lines.splice(i, 1);
                    break;
                }
            }
        }
    }

    return lines;
}

/**
 * Парсить один рядок на left/right
 */
function parseLine(line) {
    // Спеціальна обробка "Пищевая ценность X"
    const headerMatch = line.match(NUTRITION_HEADER_PATTERN);
    if (headerMatch) {
        return {
            left: headerMatch[1].trim(),
            right: headerMatch[2].trim()
        };
    }

    // Стандартний парсинг: назва + значення
    const match = line.match(VALUE_PATTERN);
    if (match) {
        let left = match[1].trim();
        let right = match[2].trim();

        // Переносимо < > з назви в значення
        const ltGtMatch = left.match(/^(.+?)\s*([<>])\s*$/);
        if (ltGtMatch) {
            left = ltGtMatch[1].trim();
            right = ltGtMatch[2] + ' ' + right;
        }

        return {
            left: normalizeNutrientName(left),
            right
        };
    }

    // Калорії без одиниці → додаємо "ккал"
    const caloriesMatch = line.match(CALORIES_PATTERN);
    if (caloriesMatch) {
        return {
            left: isUkrainian(caloriesMatch[1]) ? 'Калорії' : 'Калории',
            right: caloriesMatch[2] + ' ккал'
        };
    }

    // Рядок "Содержит X г добавленного сахара" → спеціальна обробка
    const addedSugarMatch = line.match(/^(содержит|містить)\s+([\d,.]+\s*г)\s+(добавленн?ого сахара|доданого цукру)\.?$/i);
    if (addedSugarMatch) {
        return {
            left: isUkrainian(line) ? ' - доданого цукру' : ' - добавленного сахара',
            right: addedSugarMatch[2]
        };
    }

    // Немає значення - повертаємо як є
    return {
        left: normalizeNutrientName(line),
        right: ''
    };
}

/**
 * Головна функція парсингу тексту
 */
function parseText(text) {
    const servingSize = extractServingSize(text);
    let lines = cleanAndSplitLines(text);
    lines = mergeOrphanValues(lines);

    // Парсимо всі рядки
    const entries = lines.map(line => parseLine(line));

    // Обробляємо спеціальні заголовки
    const result = [];
    let hasNutritionHeader = false;

    // Перевіряємо чи є "Пищевая ценность" в тексті
    const hasPishchevayaInText = entries.some(e =>
        /^(пищевая ценность|харчова цінність)$/i.test(e.left.trim())
    );

    // Додаємо заголовок "Пищевая ценность" якщо є servingSize але немає заголовка
    if (servingSize && !hasPishchevayaInText) {
        result.push({
            left: 'Пищевая ценность',
            right: servingSize,
            isHeader: true
        });
        hasNutritionHeader = true;
    }

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const nextEntry = entries[i + 1];

        const isPishchevaya = /^(пищевая ценность|харчова цінність)$/i.test(entry.left.trim());
        const isIngredients = /^(ингредиенты|інгредієнти):?$/i.test(entry.left.trim());
        const isSostav = /^(состав|склад):?$/i.test(entry.left.trim());

        // === ПИЩЕВАЯ ЦЕННОСТЬ ===
        if (isPishchevaya) {
            let rightValue = entry.right || servingSize || '';

            // Перевіряємо чи наступний рядок - це порція
            if (!rightValue && nextEntry) {
                const isNextPortion = /^(\d+\s*(г|g|мл|ml|таблетк|капсул|порц))/i.test(nextEntry.left);
                if (isNextPortion) {
                    rightValue = nextEntry.left + (nextEntry.right ? ' ' + nextEntry.right : '');
                    i++; // Пропускаємо
                }
            }

            result.push({
                left: entry.left,
                right: rightValue,
                isHeader: true
            });
            hasNutritionHeader = true;
        }
        // === ИНГРЕДИЕНТЫ ===
        else if (isIngredients) {
            // Розділювач перед інгредієнтами
            result.push({ left: '', right: '', isSeparator: true });

            // Заголовок
            result.push({
                left: entry.left.replace(/:$/, ''),
                right: '',
                isHeader: true,
                isSingle: true
            });

            // Наступний рядок - текст інгредієнтів
            if (nextEntry && !/^(ингредиенты|інгредієнти|состав|склад|пищевая)/i.test(nextEntry.left)) {
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
        else if (isSostav) {
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
