// js/pages/brands/brands-state.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - STATE                                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Стан модуля брендів. Створений через generic createPageState.
 *
 * 🔒 ЯДРО — цей файл не можна видаляти!
 *
 * СТРУКТУРА КОЛОНОК Brands (Google Sheets):
 * A: brand_id | B: name_uk | C: names_alt | D: country_option_id
 * E: brand_text | F: brand_status | G: brand_links | H: mapper_option_id | I: brand_logo_url
 *
 * СТРУКТУРА КОЛОНОК BrandLines (Google Sheets):
 * A: line_id | B: brand_id | C: name_uk | D: line_logo_url
 */

import { createPageState } from '../../components/page/page-state.js';

export const brandsState = createPageState({
    activeTab: 'brands',

    searchColumns: ['brand_id', 'name_uk', 'names_alt', 'country_option_id'],
    visibleColumns: ['brand_logo_url', 'brand_id', 'name_uk', 'names_alt', 'country_option_id', 'brand_status', 'brand_links', 'bindings'],

    custom: {
        // Дані
        brands: [],
        brandLines: [],

        // Пошук для лінійок
        linesSearchQuery: '',
        linesSearchColumns: ['line_id', 'name_uk', 'brand_id'],

        // Видимі колонки для лінійок
        linesVisibleColumns: ['line_id', 'brand_name', 'name_uk'],

        // Сортування для лінійок
        linesSortKey: null,
        linesSortOrder: 'asc',

        // Managed table API (заповнюється плагінами)
        sortAPI: null,
    }
});
