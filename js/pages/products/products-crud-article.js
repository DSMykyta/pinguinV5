// js/pages/products/products-crud-article.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        PRODUCTS CRUD — АРТИКУЛ (ПЛАГІН)                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔌 ПЛАГІН (viewless)                                                    ║
 * ║  Автогенерація артикулів для товарів і варіантів:                        ║
 * ║  ├── Товар: послідовний номер (1, 2, 3, ...)                            ║
 * ║  ├── Варіант: {артикул_товару}-{N} (1-1, 1-2, ...)                     ║
 * ║  └── Варіант: можна перевизначити вручну                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getProducts } from './products-data.js';
import { getVariantsByProductId } from './variants-data.js';

/**
 * Визначити наступний номер артикулу товару
 * Шукає максимальний числовий артикул серед існуючих товарів
 * @returns {string} Наступний номер (напр. "7")
 */
function getNextProductArticle() {
    const products = getProducts();
    let max = 0;
    for (const p of products) {
        const num = parseInt(p.article, 10);
        if (!isNaN(num) && num > max) max = num;
    }
    return String(max + 1);
}

/**
 * Визначити наступний суфікс варіанту для даного товару
 * @param {string} productArticle - артикул товару
 * @param {string} productId - ID товару
 * @param {Array} [pendingArticles] - артикули pending варіантів (ще не збережених)
 * @returns {string} Повний артикул варіанту (напр. "5-3")
 */
function getNextVariantArticle(productArticle, productId, pendingArticles = []) {
    const prefix = productArticle + '-';
    let max = 0;

    // Перевірити збережені варіанти
    const variants = getVariantsByProductId(productId);
    for (const v of variants) {
        if (v.article && v.article.startsWith(prefix)) {
            const num = parseInt(v.article.slice(prefix.length), 10);
            if (!isNaN(num) && num > max) max = num;
        }
    }

    // Перевірити pending варіанти
    for (const art of pendingArticles) {
        if (art && art.startsWith(prefix)) {
            const num = parseInt(art.slice(prefix.length), 10);
            if (!isNaN(num) && num > max) max = num;
        }
    }

    return `${productArticle}-${max + 1}`;
}

export function init(state) {
    // 1. Фільтр перед збереженням товару: авто-генерація артикулу якщо порожній
    state.registerFilter('beforeProductSave', (formData, ctx) => {
        if (!formData.article && ctx.isNew) {
            formData.article = getNextProductArticle();
        }
        return formData;
    }, { plugin: 'article' });

    // 2. Фільтр перед збереженням варіанту: авто-генерація артикулу якщо порожній
    state.registerFilter('onBeforeVariantSave', (formData, ctx) => {
        if (!formData.article || !formData.article.trim()) {
            const productArticle = ctx?.productArticle || '';
            const productId = ctx?.productId || '';
            if (productArticle) {
                formData.article = getNextVariantArticle(productArticle, productId, ctx?.pendingArticles);
            }
        }
        return formData;
    }, { plugin: 'article' });
}

// Експорт для використання в pending variants
export { getNextVariantArticle };
