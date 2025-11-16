// js/generators/generator-image/gim-utils.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              IMAGE TOOL - UTILITY FUNCTIONS                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Допоміжні функції загального призначення.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - getPlural(number, one, two, five) - Відмінює слова за числом
 */

/**
 * Utility для відмінювання слів
 * @param {number} number - Число
 * @param {string} one - Форма для 1 (файл)
 * @param {string} two - Форма для 2-4 (файли)
 * @param {string} five - Форма для 5+ (файлів)
 * @returns {string} Правильна форма слова
 */
export function getPlural(number, one, two, five) {
    let n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) {
        return five;
    }
    n %= 10;
    if (n === 1) {
        return one;
    }
    if (n >= 2 && n <= 4) {
        return two;
    }
    return five;
}
