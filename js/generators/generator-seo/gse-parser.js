// js/generators/generator-seo/gse-parser.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    SEO GENERATOR - TEXT PARSER                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Парсинг тексту для розпізнавання бренду та назви продукту.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - updateBrandAndProductFromText(mainText) - Розпізнає бренд та продукт з тексту
 */

import { getBrandsData } from './gse-data.js';
import { stripHtmlTags as stripHtml } from '../../utils/text-utils.js';

/**
 * Розпізнає бренд та назву продукту з тексту
 * @param {string} mainText - Вхідний текст для парсингу
 * @returns {{ brand: string, product: string }} Об'єкт з брендом та продуктом
 */
export function updateBrandAndProductFromText(mainText) {
    // Спочатку очищаємо HTML теги
    const cleanText = stripHtml(mainText || '');
    const text = cleanText.trim();
    const textLower = text.toLowerCase();
    const brands = getBrandsData();

    let foundBrand = '';
    let productName = '';

    // 1. Створюємо список ВСІХ можливих назв брендів
    const allBrandNames = brands ? Object.values(brands).flatMap(brand => brand.searchNames || []) : [];

    // 2. Сортуємо їх від найдовшого до найкоротшого
    allBrandNames.sort((a, b) => b.length - a.length);

    // 3. Шукаємо ПЕРШИЙ (найдовший) збіг
    for (const brandName of allBrandNames) {
        if (!brandName) continue;
        const brandNameLower = brandName.toLowerCase();
        if (textLower.startsWith(brandNameLower + ' ') || textLower === brandNameLower) {
            foundBrand = brandName;
            const brandEndIndex = brandName.length;
            productName = text.substring(brandEndIndex).trim();
            break;
        }
    }

    // 4. Якщо НІЧОГО не знайшли - стара логіка
    if (!foundBrand) {
        const words = text.split(/\s+/);
        foundBrand = words[0] || '';
        productName = words.slice(1).join(' ');
    }

    // 5. Обрізаємо назву товару по тире (тільки якщо є пробіл з обох сторін)
    // Підтримуємо: звичайний дефіс (-), en-dash (–), em-dash (—)
    const dashIndex = productName.search(/\s[-–—]\s/);
    if (dashIndex !== -1) {
        productName = productName.substring(0, dashIndex).trim();
    }

    return { brand: foundBrand, product: productName };
}
