// js/pages/products/products-crud-variant-weight.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        PRODUCTS CRUD — ВАГА ВАРІАНТУ (ПЛАГІН)                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  ПЛАГІН (viewless)                                                       ║
 * ║  Обробка ваги для варіантів:                                             ║
 * ║  ├── char-000022 (блок 1) — примусово рендериться як перше поле         ║
 * ║  ├── При збереженні: char-000022 → колонка weight                       ║
 * ║  └── Якщо вага є — назва збирається заново з частин товару,             ║
 * ║      variation = "{вага} грам/грамм"                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getBrandById } from '../brands/brands-data.js';
import { getBrandLineById } from '../brands/lines-data.js';
import { buildShortName, buildFullName } from './products-crud-names.js';
import { registerHook } from './products-plugins.js';
import { escapeHtml } from '../../utils/utils-text.js';

/**
 * Форматування ваги: число грамів → "500 грам" / "500 грамм"
 * @param {string} raw - сире значення з поля weight (завжди грами)
 * @param {'ua'|'ru'} lang
 * @returns {string}
 */
function formatWeight(raw, lang) {
    const num = parseFloat(raw);
    if (isNaN(num) || num <= 0) return '';
    const display = String(num);
    return `${display} ${lang === 'ru' ? 'грамм' : 'грам'}`;
}

const WEIGHT_CHAR_ID = 'char-000022';

export function init(state) {
    registerHook('onCharsRender', (container, savedValues, variantData) => {
        if (!container) return;
        // Не дублювати
        if (container.querySelector(`[data-vchar-id="${WEIGHT_CHAR_ID}"]`)) return;

        const saved = variantData?.weight || variantData?.variant_chars?.[WEIGHT_CHAR_ID] || '';

        const weightField = document.createElement('div');
        weightField.className = 'group column col-3';
        weightField.innerHTML = `
            <label for="variant-char-${WEIGHT_CHAR_ID}" class="label-l">Вага</label>
            <div class="content-bloc"><div class="content-line"><div class="input-box">
                <input type="number" step="0.01"
                    id="variant-char-${WEIGHT_CHAR_ID}"
                    data-vchar-id="${WEIGHT_CHAR_ID}"
                    value="${escapeHtml(saved)}"
                    placeholder="Вага">
                <span class="tag c-tertiary">грам</span>
            </div></div></div>
        `;

        // Перше поле в характеристиках — і в модалі, і в акордіоні
        // Вставляємо в .grid (якщо є), інакше в сам контейнер
        const grid = container.querySelector('.grid');
        (grid || container).prepend(weightField);
    });

    // Перед збереженням: поле ваги → колонка weight (не в variant_chars)
    state.registerFilter('onBeforeVariantSave', (formData) => {
        const weightInput = document.querySelector(`[data-vchar-id="${WEIGHT_CHAR_ID}"]`);
        const weightVal = weightInput?.value?.trim() || '';
        formData.weight = weightVal;
        // Видаляємо з variant_chars — вага живе тільки в колонці weight
        if (formData.variant_chars) {
            delete formData.variant_chars[WEIGHT_CHAR_ID];
        }
        return formData;
    }, { plugin: 'variant-weight' });

    // Фільтр для генерації назви: якщо variant_chars містить char-000022 (вагу),
    // збираємо назву заново з частин товару, замінюючи variation на форматовану вагу
    state.registerFilter('onComputeVariantNames', (names, ctx) => {
        const raw = (ctx.weight || ctx.variantChars?.[WEIGHT_CHAR_ID] || '').toString().trim();
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