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
 * СТРУКТУРА КОЛОНОК Products (Google Sheets):  A:AI (35 колонок)
 * A: product_id
 * B: brand_id | C: line_id | D: category_id
 * E: text_before_ua | F: text_before_ru
 * G: name_ua | H: name_ru
 * I: label_ua | J: label_ru
 * K: detail_ua | L: detail_ru
 * M: variation_ua | N: variation_ru
 * O: text_after_ua | P: text_after_ru
 * Q: generated_short_ua | R: generated_short_ru
 * S: generated_full_ua | T: generated_full_ru
 * U: composition_ua | V: composition_ru
 * W: product_text_ua | X: product_text_ru
 * Y: characteristics | Z: image_url
 * AA: seo_title_ua | AB: seo_title_ru
 * AC: seo_description_ua | AD: seo_description_ru
 * AE: seo_keywords_ua | AF: seo_keywords_ru
 * AG: status | AH: created_at | AI: updated_at
 *
 * СТРУКТУРА КОЛОНОК ProductVariants (Google Sheets):  A:V (22 колонки)
 * A: variant_id | B: product_id | C: sku | D: name_ua | E: name_ru
 * F: spec_ua | G: spec_ru
 * H: generated_short_ua | I: generated_short_ru
 * J: generated_full_ua | K: generated_full_ru
 * L: price | M: old_price | N: barcode | O: weight | P: stock
 * Q: variant_chars | R: image_url
 * S: composition_notes_ua | T: composition_notes_ru
 * U: status | V: created_at
 */

/**
 * Глобальний стан для products модуля
 */
export const productsState = {
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

    visibleColumns: ['image_url', 'product_id', 'name_ua', 'brand_name', 'category_name', 'status', 'variants_count'],

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
