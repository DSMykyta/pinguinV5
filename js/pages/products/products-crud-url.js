// js/pages/products/products-crud-url.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS CRUD — URL SLUG + ВАЛІДАЦІЯ                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Транслітерація кирилиці → латиниці, генерація URL slug,
 * перевірка унікальності серед товарів, real-time валідація в модалі.
 */

import { getProducts } from './products-data.js';

// ═══════════════════════════════════════════════════════════════════════════
// TRANSLITERATION MAP
// ═══════════════════════════════════════════════════════════════════════════

const TRANSLIT_MAP = {
    'а':'a','б':'b','в':'v','г':'h','ґ':'g','д':'d','е':'e','є':'ye',
    'ж':'zh','з':'z','и':'y','і':'i','ї':'yi','й':'y','к':'k','л':'l',
    'м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u',
    'ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ь':'',
    'ю':'yu','я':'ya','ё':'yo','ы':'y','э':'e',
};

// ═══════════════════════════════════════════════════════════════════════════
// SLUGIFY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Транслітерація + slug: "Optimum Nutrition 100% Whey, 907 грам" → "optimum-nutrition-100-whey-907-hram"
 */
export function slugify(text) {
    if (!text) return '';
    let result = text.toLowerCase();
    result = result.replace(/./g, ch => TRANSLIT_MAP[ch] || ch);
    result = result.replace(/[^a-z0-9]+/g, '-');
    result = result.replace(/^-+|-+$/g, '');
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// UNIQUENESS CHECK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Перевірити унікальність URL серед товарів
 * @param {string} url - URL для перевірки
 * @param {string} [excludeProductId] - Виключити поточний товар
 * @returns {boolean} true якщо унікальний
 */
export function isProductUrlUnique(url, excludeProductId) {
    if (!url) return true;
    const products = getProducts();
    return !products.some(p =>
        p.url === url && p.product_id !== excludeProductId
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// URL FIELD UPDATE (real-time validation)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Оновити URL поле в модалі — авто-генерація slug + перевірка унікальності
 * @param {string} shortNameUa - Коротка назва UA для slug
 * @param {string|null} currentProductId - null для нового товару
 */
export function updateUrlField(shortNameUa, currentProductId) {
    const urlField = document.getElementById('product-url');
    const urlBloc = document.getElementById('product-url-bloc');
    if (!urlField || currentProductId) return;

    const slug = slugify(shortNameUa);
    urlField.value = slug;

    // Перевірка унікальності в реальному часі
    if (urlBloc) {
        const unique = isProductUrlUnique(slug, null);
        const line = urlBloc.querySelector('.content-line');
        if (line) {
            if (!unique && slug) line.setAttribute('error', '');
            else line.removeAttribute('error');
        }
    }
}
