// js/pages/products/products-crud-variant-weight.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        PRODUCTS CRUD — ВАГА ВАРІАНТУ (ПЛАГІН)                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔌 ПЛАГІН (viewless)                                                    ║
 * ║  Обробка поля weight для варіантів:                                      ║
 * ║  ├── Якщо weight заповнено — назва збирається заново з частин товару,   ║
 * ║  │   variation замінюється на "{вага} грам/грамм"                        ║
 * ║  └── Значення weight записується в variant_chars['char-000022']         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getBrandById } from '../brands/brands-data.js';
import { getBrandLineById } from '../brands/lines-data.js';
import { buildShortName, buildFullName } from './products-crud-names.js';

/**
 * Форматування ваги: число грамів → "500 грам" / "500 грамм"
 * @param {string} raw - сире значення з поля weight (завжди грами)
 * @param {'ua'|'ru'} lang
 * @returns {string}
 */
function formatWeight(raw, lang) {
    const num = parseFloat(raw);
    if (isNaN(num) || num <= 0) return '';
    const display = Number.isInteger(num) ? String(num) : String(num);
    return `${display} ${lang === 'ru' ? 'грамм' : 'грам'}`;
}

export function init(state) {
    // 1. Фільтр перед збереженням: запис ваги як характеристики char-000022
    state.registerFilter('onBeforeVariantSave', (formData) => {
        if (formData.weight && formData.weight.trim() !== '') {
            formData.variant_chars = formData.variant_chars || {};
            formData.variant_chars['char-000022'] = formData.weight.trim();
        }
        return formData;
    }, { plugin: 'variant-weight' });

    // 2. Фільтр для генерації назви: збираємо заново з частин товару,
    //    замінюючи variation на форматовану вагу
    state.registerFilter('onComputeVariantNames', (names, ctx) => {
        const raw = ctx.weight?.trim();
        if (!raw) return names;

        const weightUa = formatWeight(raw, 'ua');
        const weightRu = formatWeight(raw, 'ru');
        if (!weightUa) return names;

        const product = ctx.product;
        if (!product) return names;

        // Резолвимо бренд і лінійку з ID → назва
        const brand = product.brand_id ? getBrandById(product.brand_id) : null;
        const line = product.line_id ? getBrandLineById(product.line_id) : null;
        const brandName = brand?.name || '';
        const lineName = line?.name || '';

        // Частина варіанту (характеристики)
        const variantSuffix_ua = ctx.nameUaDisplay ? ` - ${ctx.nameUaDisplay}` : '';
        const variantSuffix_ru = ctx.nameRuDisplay ? ` - ${ctx.nameRuDisplay}` : '';

        // Коротка: [Бренд] [Лінійка] [Назва] [Ознака] [Деталь], [Вага грам] - [характеристики]
        const shortUa = buildShortName(brandName, lineName, product.name_ua, product.label_ua, product.detail_ua, weightUa) + variantSuffix_ua;
        const shortRu = buildShortName(brandName, lineName, product.name_ru, product.label_ru, product.detail_ru, weightRu) + variantSuffix_ru;

        // Повна: [Текст перед] [Коротка] [Текст після]
        const prefixUa = product.text_before_ua || '';
        const prefixRu = product.text_before_ru || '';
        const suffixUa = product.text_after_ua || '';
        const suffixRu = product.text_after_ru || '';

        names.generated_short_ua = shortUa.trim();
        names.generated_short_ru = shortRu.trim();
        names.generated_full_ua = buildFullName(prefixUa, shortUa, suffixUa).trim();
        names.generated_full_ru = buildFullName(prefixRu, shortRu, suffixRu).trim();

        return names;
    }, { plugin: 'variant-weight' });
}