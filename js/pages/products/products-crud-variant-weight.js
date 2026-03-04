// js/pages/products/products-crud-variant-weight.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        PRODUCTS CRUD — ВАГА ВАРІАНТУ (ПЛАГІН)                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔌 ПЛАГІН (viewless)                                                    ║
 * ║  Обробка поля weight для варіантів:                                      ║
 * ║  ├── Якщо weight заповнено, він замінює product-variation у назві        ║
 * ║  └── Значення weight автоматично записується в char-000022               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export function init(state) {
    // 1. Фільтр перед збереженням: запис ваги як характеристики char-000022
    state.registerFilter('onBeforeVariantSave', (formData) => {
        if (formData.weight && formData.weight.trim() !== '') {
            formData.variant_chars = formData.variant_chars || {};
            formData.variant_chars['char-000022'] = formData.weight.trim();
        }
        return formData;
    }, { plugin: 'variant-weight' });

    // 2. Фільтр для генерації назви: ігноруємо product-variation і використовуємо weight
    state.registerFilter('onComputeVariantNames', (names, ctx) => {
        const weight = ctx.weight?.trim();
        if (!weight) return names; // Ваги немає — залишаємо дефолтну генерацію

        const product = ctx.product;
        if (!product) return names;

        const nameUaDisplay = ctx.nameUaDisplay ? ` - ${ctx.nameUaDisplay}` : '';
        const nameRuDisplay = ctx.nameRuDisplay ? ` - ${ctx.nameRuDisplay}` : '';

        // Беремо базову назву БЕЗ product-variation
        // В pinguin-v5 чиста назва лежить у name_ua / name_ru
        const baseShortUa = product.name_ua || '';
        const baseShortRu = product.name_ru || '';
        const baseFullUa = product.full_name_ua || baseShortUa;
        const baseFullRu = product.full_name_ru || baseShortRu;

        // Формуємо нову назву: Базова назва + Вага з варіанту + Назва варіанту
        names.generated_short_ua = `${baseShortUa} ${weight}${nameUaDisplay}`.trim();
        names.generated_short_ru = `${baseShortRu} ${weight}${nameRuDisplay}`.trim();
        names.generated_full_ua = `${baseFullUa} ${weight}${nameUaDisplay}`.trim();
        names.generated_full_ru = `${baseFullRu} ${weight}${nameRuDisplay}`.trim();

        return names;
    }, { plugin: 'variant-weight' });
}