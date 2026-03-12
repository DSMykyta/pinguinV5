// js/pages/products/products-crud-url.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS CRUD — URL SLUG + ВАЛІДАЦІЯ                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Перевірка унікальності URL серед товарів, real-time валідація в модалі.
 */

import { getProducts } from './products-data.js';
import { registerHook } from './products-plugins.js';
import { slugify } from '../../utils/utils-text.js';

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

// Підписка на хук — реагуємо на зміну назви
registerHook('onNameUpdate', ({ shortNameUa, currentProductId }) => {
    updateUrlField(shortNameUa, currentProductId);
});

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
