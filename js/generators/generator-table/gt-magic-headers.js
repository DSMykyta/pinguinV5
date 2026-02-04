// js/generators/generator-table/gt-magic-headers.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    GT-MAGIC-HEADERS v1.0                                 ║
 * ║              Обробка спеціальних заголовків                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Розпізнає та обробляє спеціальні заголовки:
 * - Ингредиенты/Інгредієнти → порожній рядок + заголовок + поле
 * - Состав/Склад → порожній рядок + жирний заголовок
 * - Пищевая ценность → заголовок таблиці
 *
 * ЛОГІКА "ИНГРЕДИЕНТЫ":
 * 1. Перед ним порожній рядок (розділювач)
 * 2. "Ингредиенты" → одинарний рядок, заголовок
 * 3. Текст інгредієнтів → одинарний рядок, поле (field)
 *
 * ЕКСПОРТ:
 * - HEADER_PATTERNS - патерни заголовків
 * - isHeaderLine(text) - чи рядок є заголовком
 * - processHeaders(entries, servingSize) - обробити заголовки
 */

import { isServingLine } from './gt-magic-serving.js';

// ============================================================================
// ПАТЕРНИ ЗАГОЛОВКІВ
// ============================================================================

export const HEADER_PATTERNS = {
    /** Пищевая ценность / Харчова цінність */
    nutrition: /^(пищевая ценность|харчова цінність)$/i,

    /** Ингредиенты / Інгредієнти */
    ingredients: /^(ингредиенты|інгредієнти|другие ингредиенты|інші інгредієнти):?$/i,

    /** Состав / Склад */
    composition: /^(состав|склад):?$/i,
};

// ============================================================================
// ФУНКЦІЇ
// ============================================================================

/**
 * Перевіряє чи рядок є заголовком
 * @param {string} text - Текст для перевірки
 * @returns {boolean}
 */
export function isHeaderLine(text) {
    if (!text) return false;
    const trimmed = text.trim();
    return HEADER_PATTERNS.ingredients.test(trimmed) ||
           HEADER_PATTERNS.composition.test(trimmed) ||
           HEADER_PATTERNS.nutrition.test(trimmed);
}

/**
 * Перевіряє чи два заголовки однакові (з урахуванням перекладів)
 * @param {string} header1
 * @param {string} header2
 * @returns {boolean}
 */
export function isSameHeader(header1, header2) {
    const h1 = (header1 || '').toLowerCase().trim();
    const h2 = (header2 || '').toLowerCase().trim();

    if (h1 === h2) return true;

    const synonyms = [
        ['пищевая ценность', 'харчова цінність'],
        ['ингредиенты', 'інгредієнти'],
        ['другие ингредиенты', 'інші інгредієнти'],
        ['состав', 'склад']
    ];

    return synonyms.some(group => group.includes(h1) && group.includes(h2));
}

/**
 * Обробляє масив entries і додає спеціальну логіку для заголовків
 * @param {Object[]} entries - Масив {left, right}
 * @param {string} servingSize - Розмір порції (якщо є)
 * @returns {Object[]} - Оброблений масив з isSeparator, isHeader, isSingle, isField
 */
export function processHeaders(entries, servingSize = '') {
    const result = [];

    // Перевіряємо чи є "Пищевая ценность" в тексті
    const hasNutritionHeader = entries.some(e =>
        HEADER_PATTERNS.nutrition.test((e.left || '').trim())
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
        const leftTrimmed = (entry.left || '').trim();

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
            // 1. Порожній рядок (розділювач)
            result.push({ left: '', right: '', isSeparator: true });

            // 2. Заголовок "Ингредиенты" - одинарний рядок
            // Нормалізуємо "Другие ингредиенты" → "Ингредиенты"
            const normalizedHeader = /другие|інші/i.test(leftTrimmed) ? 'Ингредиенты' : entry.left.replace(/:$/, '');
            result.push({
                left: normalizedHeader,
                right: '',
                isHeader: true,
                isSingle: true
            });

            // 3. Текст інгредієнтів - одинарний рядок, поле (field)
            if (nextEntry && !isHeaderLine(nextEntry.left)) {
                const hasValue = /\d+\s*(г|мг|мкг|mg|mcg|g|iu|ме)/i.test(nextEntry.right || '');
                if (!hasValue) {
                    result.push({
                        left: nextEntry.left,
                        right: nextEntry.right || '',
                        isSingle: true,
                        isField: true  // ← поле, не строка
                    });
                    i++;
                }
            }
        }
        // === СОСТАВ ===
        else if (HEADER_PATTERNS.composition.test(leftTrimmed)) {
            // 1. Порожній рядок (розділювач)
            result.push({ left: '', right: '', isSeparator: true });

            // 2. Заголовок "Состав" - одинарний, жирний
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
