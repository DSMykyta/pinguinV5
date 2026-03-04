// js/pages/products/products-state.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PRODUCTS - STATE                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Глобальний стан для модуля товарів та варіантів.
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 *
 * СТРУКТУРА КОЛОНОК Products (Google Sheets):  A:AO (41 колонка)
 * A: product_id | B: article
 * C: brand_id | D: line_id | E: category_id
 * F: text_before_ua | G: text_before_ru
 * H: name_ua | I: name_ru
 * J: label_ua | K: label_ru
 * L: detail_ua | M: detail_ru
 * N: variation_ua | O: variation_ru
 * P: text_after_ua | Q: text_after_ru
 * R: generated_short_ua | S: generated_short_ru
 * T: generated_full_ua | U: generated_full_ru
 * V: url
 * W: composition_code_ua | X: composition_code_ru
 * Y: composition_notes_ua | Z: composition_notes_ru
 * AA: product_text_ua | AB: product_text_ru
 * AC: characteristics | AD: image_url
 * AE: seo_title_ua | AF: seo_title_ru
 * AG: seo_description_ua | AH: seo_description_ru
 * AI: seo_keywords_ua | AJ: seo_keywords_ru
 * AK: status | AL: created_at | AM: updated_at
 * AN: created_by | AO: updated_by
 *
 * СТРУКТУРА КОЛОНОК ProductVariants (Google Sheets):  A:X (24 колонки)
 * A: variant_id | B: product_id | C: article | D: name_ua | E: name_ru
 * F: generated_short_ua | G: generated_short_ru
 * H: generated_full_ua | I: generated_full_ru
 * J: price | K: old_price | L: barcode | M: weight | N: stock
 * O: variant_chars | P: image_url
 * Q: composition_code_ua | R: composition_code_ru
 * S: composition_notes_ua | T: composition_notes_ru
 * U: product_text_ua | V: product_text_ru
 * W: status | X: created_at
 */

import { registerFilter } from './products-plugins.js';

/**
 * Глобальний стан для products модуля
 */
export const productsState = {
    // ═══════════════════════════════════════════════════════════════════════
    // PLUGIN API — делегати до products-plugins.js
    // ═══════════════════════════════════════════════════════════════════════

    registerFilter(name, callback, options) {
        registerFilter(name, callback, options);
    },
    // ═══════════════════════════════════════════════════════════════════════
    // АКТИВНИЙ ТАБ
    // ═══════════════════════════════════════════════════════════════════════

    activeTab: 'products',

    // ═══════════════════════════════════════════════════════════════════════
    // ДАНІ
    // ═══════════════════════════════════════════════════════════════════════

    products: [],
    productVariants: [],
    productGroups: [],
    brands: [],
    categories: [],

    // ═══════════════════════════════════════════════════════════════════════
    // ПОШУК
    // ═══════════════════════════════════════════════════════════════════════

    searchQuery: '',
    searchColumns: ['product_id', 'name_ua', 'brand_id', 'category_id'],

    // ═══════════════════════════════════════════════════════════════════════
    // КОЛОНКИ ТАБЛИЦІ
    // ═══════════════════════════════════════════════════════════════════════

    visibleColumns: ['image_url', 'product_id', 'article', 'name_ua', 'brand_name', 'category_name', 'status', 'variants_count'],

    columnFilters: {},

    // ═══════════════════════════════════════════════════════════════════════
    // СОРТУВАННЯ
    // ═══════════════════════════════════════════════════════════════════════

    sortKey: null,
    sortOrder: 'asc',
    sortAPI: null,

    // ═══════════════════════════════════════════════════════════════════════
    // MANAGED TABLE
    // ═══════════════════════════════════════════════════════════════════════

    productsManagedTable: null,
    tableAPI: null,
};
