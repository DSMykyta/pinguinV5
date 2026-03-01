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
 * СТРУКТУРА КОЛОНОК Products (Google Sheets):
 * A: product_id | B: name_ua | C: name_ru | D: brand_id | E: line_id
 * F: category_id | G: composition_ua | H: composition_ru
 * I: product_text_ua | J: product_text_ru | K: characteristics
 * L: image_url | M: seo_title_ua | N: seo_title_ru
 * O: seo_description_ua | P: seo_description_ru
 * Q: seo_keywords_ua | R: seo_keywords_ru
 * S: status | T: created_at | U: updated_at
 *
 * СТРУКТУРА КОЛОНОК ProductVariants (Google Sheets):
 * A: variant_id | B: product_id | C: sku | D: name_ua | E: name_ru
 * F: price | G: barcode | H: weight | I: stock
 * J: variant_chars | K: image_url | L: status | M: created_at
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
