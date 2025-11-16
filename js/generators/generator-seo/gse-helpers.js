// js/generators/generator-seo/gse-helpers.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   SEO GENERATOR - HELPER FUNCTIONS                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Допоміжні функції для перевірки та валідації.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - checkSafety(productName) - Перевіряє чи продукт заборонений до продажу
 */

/**
 * Перевіряє чи продукт є забороненим до продажу в Україні
 * @param {string} productName - Назва продукту
 * @returns {string} Повідомлення про заборону або порожній рядок
 */
export function checkSafety(productName) {
    const BANNED_PRODUCTS = ['alpha gpc', 'aloe-emodin', 'aloin', 'barbaloin', 'hydroxyanthracene', 'dmaa', 'dmha', 'yohimbine'];
    const productValue = productName.toLowerCase();
    const isBanned = BANNED_PRODUCTS.some(p => productValue.includes(p));
    return isBanned ? 'Заборонено до продажу в Україні' : '';
}
