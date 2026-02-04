// js/generators/generator-table/gt-magic-serving.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    GT-MAGIC-SERVING v1.0                                 ║
 * ║              Обробка розміру порції та службових рядків                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * - Витягує розмір порції з тексту iHerb
 * - Визначає службові рядки які треба пропустити
 *
 * ЕКСПОРТ:
 * - extractServingSize(text) - витягнути розмір порції
 * - shouldSkipLine(line) - чи пропустити рядок
 * - IHERB_SKIP_PATTERNS - патерни для пропуску
 */

// ============================================================================
// ПАТЕРНИ ДЛЯ ПРОПУСКУ
// ============================================================================

/**
 * Рядки iHerb які треба пропустити (службова інформація)
 */
export const IHERB_SKIP_PATTERNS = [
    /^(размер порции|розмір порції|serving size)[:\s]/i,
    /^(количество порций|кількість порцій|servings per)/i,
    /^(количество на порцию|кількість на порцію|amount per)/i,
    /^%\s*(от суточной|від добової|daily value)/i,
    /^\*\s*(percent daily|суточн|добов)/i,
    // "Ингредиенты" обробляється в gt-magic-headers.js, НЕ пропускати!
];

// ============================================================================
// ФУНКЦІЇ
// ============================================================================

/**
 * Витягує розмір порції з тексту
 * @param {string} text - Повний текст етикетки
 * @returns {string} - Розмір порції або пустий рядок
 *
 * @example
 * extractServingSize("Serving Size: 2 capsules\nVitamin C 500mg")
 * // → "2 capsules"
 */
export function extractServingSize(text) {
    if (!text) return '';

    const patterns = [
        /размер порции[:\s]+(.+?)(?:\n|$)/i,
        /розмір порції[:\s]+(.+?)(?:\n|$)/i,
        /serving size[:\s]+(.+?)(?:\n|$)/i,
        /порция[:\s]+(.+?)(?:\n|$)/i,
        /порція[:\s]+(.+?)(?:\n|$)/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }

    return '';
}

/**
 * Перевіряє чи треба пропустити рядок
 * @param {string} line - Рядок для перевірки
 * @returns {boolean} - true якщо треба пропустити
 *
 * @example
 * shouldSkipLine("Serving Size: 2 capsules") // → true
 * shouldSkipLine("Vitamin C 500mg") // → false
 */
export function shouldSkipLine(line) {
    if (!line) return true;

    const trimmed = line.trim();
    if (!trimmed) return true;

    return IHERB_SKIP_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Перевіряє чи рядок є заголовком порції
 * @param {string} line - Рядок для перевірки
 * @returns {boolean} - true якщо це порція типу "1 капсула"
 */
export function isServingLine(line) {
    if (!line) return false;
    return /^(\d+\s*(г|g|мл|ml|таблетк|капсул|порц|softgel|tablet|capsule))/i.test(line.trim());
}
