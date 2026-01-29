// js/generators/generator-table/gt-magic-parser.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║             TABLE GENERATOR - "МАГІЧНИЙ" ПАРСЕР (MAGIC PARSER) v8.0      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * * ПРИЗНАЧЕННЯ:
 * Обробляє найскладніші етикетки. Надійно об'єднує значення, розбирає
 * рядки та коректно видаляє відсоткові значення.
 *
 * v8.0: Додано підтримку формату iHerb, автоматичне розділення таблиць
 *       (харчова цінність / інгредієнти), авто-додавання "ккал".
 */

// Список харчових цінностей для розпізнавання (нормалізовані назви)
const NUTRITIONAL_FACTS = new Set([
    // Російські
    'калории', 'калорийность', 'энергетическая ценность',
    'жиры', 'жир', 'жиров', 'насыщенные жиры', 'насыщенных жиров', 'транс-жиры',
    '- от жиров', '- насыщенные', '- транс-жиры',
    'углеводы', 'углеводов', 'общее количество углеводов',
    'белок', 'белки', 'белков',
    'сахар', 'сахара', '- сахар',
    'холестерин', 'холестерина',
    'натрий', 'натрия',
    'соль', 'пищевые волокна', 'клетчатка',
    // Українські
    'калорії', 'калорій', 'енергетична цінність',
    'жири', 'жирів', 'насичені жири', 'транс-жири',
    '- від жирів', '- насичені', '- транс-жири',
    'вуглеводи', 'вуглеводів',
    'білок', 'білка', 'білків',
    'цукор', 'цукру', '- цукор',
    'холестерин',
    'натрій', 'натрію',
    'сіль', 'харчові волокна',
    // English
    'calories', 'total fat', 'fat', 'saturated fat', 'trans fat',
    'total carbohydrate', 'carbohydrates', 'carbs',
    'protein', 'proteins',
    'sugar', 'sugars', 'total sugars',
    'cholesterol', 'sodium', 'salt',
    'dietary fiber', 'fiber', 'fibre'
]);

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

        // Пропускаємо тільки якщо обидва поля порожні
        if (!entry.left && !entry.right) continue;

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
                    // Оновлюємо текст заголовка на поточну мову та значення порції
                    firstLeftInput.value = entry.left;
                    firstRightInput.value = entry.right || '';

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

        if (!entry.right && !entry.isSingle && !entry.isHeader) {
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
 * Перевіряє чи назва є харчовою цінністю
 * @param {string} name - Назва для перевірки
 * @returns {boolean}
 */
function isNutritionalFact(name) {
    const normalized = name.toLowerCase().replace(/:$/, '').trim();
    return NUTRITIONAL_FACTS.has(normalized);
}

/**
 * Головна функція, що перетворює сирий текст на масив логічних записів.
 * @param {string} text - Вхідний текст.
 * @returns {Array<{left: string, right: string, isHeader?: boolean, isSeparator?: boolean, isSingle?: boolean, isBold?: boolean}>}
 */
function parseText(text) {
    // 0. Витягуємо розмір порції з формату iHerb
    let servingSize = '';
    const servingSizeMatch = text.match(/размер порции[:\s]+(.+?)(?:\n|$)/i) ||
                             text.match(/розмір порції[:\s]+(.+?)(?:\n|$)/i) ||
                             text.match(/serving size[:\s]+(.+?)(?:\n|$)/i);
    if (servingSizeMatch) {
        servingSize = servingSizeMatch[1].trim();
    }

    // 1. Попереднє очищення та розбивка на рядки
    let lines = text
        // Видаляємо зайві символи: **, †, ®, ✝, ×, ‡, *, •, ○, зірочки
        .replace(/\*\*|[†‡✝×®*•○◊■□▪▫]/g, '')
        // Видаляємо відсотки в кінці (включаючи з < > та комами): <1%, 16,667%, 50%
        .replace(/\s+[<>]?\s*[\d,.]+%\s*$/gm, '')
        // Замінюємо табуляції на пробіли
        .replace(/\t+/g, ' ')
        // Видаляємо тисячні роздільники (1,000 -> 1000)
        .replace(/(\d),(\d{3})/g, '$1$2')
        .split('\n')
        .map(line => line.trim())
        // Видаляємо множинні пробіли
        .map(line => line.replace(/\s{2,}/g, ' '))
        .filter(line => line)
        // Видаляємо рядки iHerb, які не потрібні
        .filter(line => {
            const lower = line.toLowerCase();
            // Пропускаємо "Размер порции: ..."
            if (/^(размер порции|розмір порції|serving size)[:\s]/i.test(line)) return false;
            // Пропускаємо "Количество порций в упаковке: ..."
            if (/^(количество порций|кількість порцій|servings per)/i.test(line)) return false;
            // Пропускаємо заголовок колонок "Количество на порцию | % от суточной нормы"
            if (/^(количество на порцию|кількість на порцію|amount per)/i.test(line)) return false;
            // Пропускаємо "% от суточной нормы" або "% Daily Value"
            if (/^%\s*(от суточной|від добової|daily value)/i.test(line)) return false;
            return true;
        });

    // 2. "Склеювання" значень знизу вгору
    // Regex для рядка що є ТІЛЬКИ значенням (число + одиниця виміру)
    // Включає: Billion/Million CFU для пробіотиків, стандартні одиниці
    const valueOnlyRegex = /^[<>]?\s*[\d,.]+\s*(?:billion|million|bil|mil|тыс|тис|млн|млрд)?\s*(?:г|мг|мкг|ккал|кдж|ml|g|mg|mcg|iu|ме|IU|МЕ|cfu|КУО)$/i;
    const standardEntryRegex = /\D+\s+[\d,.]+/;

    for (let i = lines.length - 1; i > 0; i--) {
        if (valueOnlyRegex.test(lines[i])) {
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
        const parsed = parseLine(line);
        finalEntries.push(parsed);
    }

    // 4. Обробка спеціальних блоків (Пищевая ценность, Ингредиенты тощо)
    const processedEntries = [];
    let hasAddedNutritionHeader = false; // Чи вже додали заголовок Пищевая ценность
    let lastWasNutrition = false; // Чи попередній елемент був харчовою цінністю

    // Перевіряємо чи є "Пищевая ценность" в тексті
    const hasPishchevayaInText = finalEntries.some(e =>
        /^(пищевая ценность|харчова цінність)$/i.test(e.left.trim())
    );

    // Якщо є servingSize але немає "Пищевая ценность" - додаємо заголовок на початку
    if (servingSize && !hasPishchevayaInText) {
        processedEntries.push({
            left: 'Пищевая ценность',
            right: servingSize,
            isHeader: true
        });
        hasAddedNutritionHeader = true;
        lastWasNutrition = true;
    }

    for (let i = 0; i < finalEntries.length; i++) {
        const entry = finalEntries[i];
        const nextEntry = finalEntries[i + 1];

        const isPishchevayaTsennost = /^(пищевая ценность|харчова цінність)$/i.test(entry.left.trim());
        const isIngredients = /^(ингредиенты|інгредієнти):?$/i.test(entry.left.trim());
        const isSostav = /^(состав|склад):?$/i.test(entry.left.trim());

        // Перевіряємо чи це інгредієнт (має латинську назву в дужках)
        const hasLatinName = /\([A-Za-z][a-z]+\s+[a-z\-]+/i.test(entry.left);

        // Автоматичне розділення ТІЛЬКИ коли бачимо явний інгредієнт з латинською назвою
        // після звичайних рядків (не після заголовків)
        if (hasLatinName && lastWasNutrition && !isPishchevayaTsennost && !isIngredients && !isSostav) {
            processedEntries.push({
                left: '',
                right: '',
                isSeparator: true
            });
            lastWasNutrition = false;
        }

        // Обробка "Пищевая ценность" - заголовок зі значенням в правій колонці
        if (isPishchevayaTsennost) {
            let rightValue = entry.right || '';

            // Якщо right порожній, використовуємо servingSize з iHerb формату
            if (!rightValue && servingSize) {
                rightValue = servingSize;
            }

            // Якщо right порожній, перевіряємо чи наступний рядок - це значення порції
            if (!rightValue && nextEntry) {
                const isNextPortion = /^(\d+\s*(г|g|мл|ml|таблетк|капсул|порц|serving)|на\s+\d|per\s+\d|в\s+\d)/i.test(nextEntry.left);
                const isNextSpecial = /^(калори|жир|белок|білок|углевод|вуглевод|холестерин|натрий|натрій)/i.test(nextEntry.left);

                if (isNextPortion && !isNextSpecial) {
                    rightValue = nextEntry.left + (nextEntry.right ? ' ' + nextEntry.right : '');
                    i++; // Пропускаємо наступний entry
                }
            }

            processedEntries.push({
                left: entry.left,
                right: rightValue,
                isHeader: true
            });
            lastWasNutrition = true;
            hasAddedNutritionHeader = true;
        }
        // Обробка "Ингредиенты"
        else if (isIngredients) {
            // Додаємо порожній розділювач
            processedEntries.push({
                left: '',
                right: '',
                isSeparator: true
            });
            // Створюємо заголовок (single - одна колонка на всю ширину)
            processedEntries.push({
                left: entry.left.replace(/:$/, ''),
                right: '',
                isHeader: true,
                isSingle: true
            });
            // Якщо є наступний рядок - перевіряємо чи це текст інгредієнтів
            if (nextEntry) {
                const isNextSpecial = /^(ингредиенты|інгредієнти|состав|склад|пищевая ценность|харчова цінність)/i.test(nextEntry.left);
                // Якщо наступний рядок НЕ спеціальний і НЕ містить числове значення - це текст інгредієнтів
                const hasNumericValue = /\d+\s*(г|мг|мкг|ккал|кдж|ml|g|mg|mcg|iu|ме)/i.test(nextEntry.right);

                if (!isNextSpecial && !hasNumericValue) {
                    processedEntries.push({
                        left: nextEntry.left,
                        right: nextEntry.right || '',
                        isSingle: true
                    });
                    i++; // Пропускаємо наступний entry
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
                left: entry.left.replace(/:$/, ''),
                right: entry.right || '',
                isSingle: true,
                isBold: true
            });
        }
        // Звичайний рядок
        else {
            // Якщо рядок має значення (числове) - це ймовірно харчова цінність
            if (entry.right) {
                lastWasNutrition = true;
            }
            processedEntries.push(entry);
        }
    }

    return processedEntries;
}

/**
 * Нормалізує назви нутрієнтів до стандартних форм.
 * Видаляє двокрапку з кінця. Зберігає мову (укр/рос).
 * @param {string} name - Назва нутрієнту
 * @returns {string} - Нормалізована назва
 */
function normalizeNutrientName(name) {
    // Видаляємо двокрапку з кінця
    let normalized = name.replace(/:$/, '').trim();

    // Визначаємо мову: українські літери АБО українські слова без і/ї/є/ґ
    const hasUkrainianLetters = /[іїєґ]/i.test(normalized);
    const isUkrainianWord = /^(цукор|цукру|жири|жирів|вуглеводи|вуглеводів|білок|білка|білків|калорії|калорій|сіль|солі)$/i.test(normalized);
    const isUkrainian = hasUkrainianLetters || isUkrainianWord;

    // Мапа нормалізації: [regex, російська форма, українська форма]
    // Всі з великої літери, крім "- сахар"/"- цукор" (підкатегорія)
    const normalizationMap = [
        // Калории / Калорії
        [/^(калорийность|энергетическая ценность|калорій|енергетична цінність|calories|energy|kcal)$/i, 'Калории', 'Калорії'],
        // Жиры / Жири
        [/^(жир|жиров|жири|жирів|fat|fats|total fat)$/i, 'Жиры', 'Жири'],
        // Насыщенные жиры / Насичені жири
        [/^(насыщенные жиры|насыщенных жиров|насичені жири|saturated fat)$/i, 'Насыщенные жиры', 'Насичені жири'],
        // Углеводы / Вуглеводи
        [/^(углеводы|углеводов|вуглеводи|вуглеводів|carbohydrates|carbs|total carbohydrate|общее количество углеводов|загальна кількість вуглеводів)$/i, 'Углеводы', 'Вуглеводи'],
        // Пищевые волокна / Харчові волокна
        [/^(клетчатка|пищевые волокна|пищевых волокон|харчові волокна|dietary fiber|fiber|fibre)$/i, 'Пищевые волокна', 'Харчові волокна'],
        // Белок / Білок
        [/^(белок|белки|белков|білок|білка|білків|protein|proteins)$/i, 'Белок', 'Білок'],
        // - сахар / - цукор - підкатегорія з тире
        [/^(сахар|сахара|цукор|цукру|sugar|sugars|total sugars)$/i, '- сахар', '- цукор'],
        // Натрий / Натрій
        [/^(натрий|натрия|натрій|натрію|sodium)$/i, 'Натрий', 'Натрій'],
        // Холестерин / Холестерин
        [/^(холестерин|холестерина|холестерол|cholesterol)$/i, 'Холестерин', 'Холестерин'],
        // Соль / Сіль
        [/^(соль|солі|salt)$/i, 'Соль', 'Сіль'],
    ];

    for (const [regex, ruForm, uaForm] of normalizationMap) {
        if (regex.test(normalized)) {
            return isUkrainian ? uaForm : ruForm;
        }
    }

    // Якщо не знайдено в мапі - повертаємо без двокрапки
    return normalized;
}

/**
 * Парсить один рядок тексту на left/right частини.
 * Враховує дужки з описами (не плутає їх з числовими значеннями).
 * @param {string} line - Рядок для парсингу
 * @returns {{left: string, right: string}}
 */
function parseLine(line) {
    // Спеціальна обробка для "Пищевая ценность" / "Харчова цінність"
    // Вони можуть мати значення типу "2 таблетки", "100 г", "на порцию"
    const headerMatch = line.match(/^(пищевая ценность|харчова цінність)\s+(.+)$/i);
    if (headerMatch) {
        return {
            left: headerMatch[1].trim(),
            right: headerMatch[2].trim()
        };
    }

    // Регулярка для знаходження числового значення в кінці рядка
    // ЖАДІБНИЙ .+ шукає значення з КІНЦЯ (backtracking)
    // Це правильно обробляє назви з цифрами: "Омега 369", "Vitamin D3"
    // Підтримує: Billion/Million CFU для пробіотиків
    // Приклади: "10 мг", "< 1 г", "100 ккал", "2.5 mcg", "65 Billion CFU"
    const valueRegex = /^(.+)\s+([<>]?\s*[\d,.]+\s*(?:billion|million|bil|mil|тыс|тис|млн|млрд)?\s*(?:г|мг|мкг|ккал|кдж|ml|g|mg|mcg|iu|ме|IU|МЕ|cfu|КУО)(?:\s*\/\s*[\d,.]+\s*(?:г|мг|мкг|ккал|кдж|ml|g|mg|mcg|iu|ме|IU|МЕ))?)\s*(?:\d+\s*%)?$/i;

    const match = line.match(valueRegex);

    if (match) {
        let left = match[1].trim();
        let right = match[2].trim();

        // Переносимо знак < або > з left в right якщо він там залишився
        const ltGtMatch = left.match(/^(.+?)\s*([<>])\s*$/);
        if (ltGtMatch) {
            left = ltGtMatch[1].trim();
            right = ltGtMatch[2] + ' ' + right;
        }

        // Нормалізуємо назву нутрієнту
        left = normalizeNutrientName(left);

        return { left, right };
    }

    // Спеціальна обробка для Калорій без одиниці виміру: "Calories 5" або "Калории 5"
    // Автоматично додаємо "ккал"
    const caloriesMatch = line.match(/^(калории|калорії|calories)\s+(\d+)\s*$/i);
    if (caloriesMatch) {
        const isUkrainian = /[іїєґ]/i.test(caloriesMatch[1]);
        return {
            left: isUkrainian ? 'Калорії' : 'Калории',
            right: caloriesMatch[2] + ' ккал'
        };
    }

    // Якщо не знайдено числового значення з одиницею виміру - повертаємо весь рядок як left
    return { left: normalizeNutrientName(line), right: '' };
}