// js/pages/products/products-crud-names.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS CRUD — ГЕНЕРАЦІЯ НАЗВ ТОВАРУ                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Авто-формування коротких і повних назв товару з полів модалу.
 * Коротка: [Бренд] [Лінійка] [Назва] [Ознака] [Деталь], [Варіація]
 * Повна:   [Текст перед / Категорія] [Коротка] [Текст після]
 */

import { updateUrlField } from './products-crud-url.js';

// ═══════════════════════════════════════════════════════════════════════════
// NAME FIELDS
// ═══════════════════════════════════════════════════════════════════════════

const NAME_FIELDS = [
    'product-text-before-ua', 'product-text-before-ru',
    'product-name-ua', 'product-name-ru',
    'product-label-ua', 'product-label-ru',
    'product-detail-ua', 'product-detail-ru',
    'product-variation-ua', 'product-variation-ru',
    'product-text-after-ua', 'product-text-after-ru',
];

// ═══════════════════════════════════════════════════════════════════════════
// NAME BUILDERS (pure functions)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Побудувати коротку назву:
 * [Бренд] [Лінійка] [Назва] [Ознака] [Деталь], [Варіація]
 */
export function buildShortName(brand, line, name, label, detail, variation) {
    const mainParts = [brand, line, name, label, detail].filter(Boolean).join(' ');
    if (!variation) return mainParts;
    return mainParts ? `${mainParts}, ${variation}` : variation;
}

/**
 * Побудувати повну назву:
 * [Текст перед] [Коротка назва] [Текст після]
 */
export function buildFullName(textBefore, shortName, textAfter) {
    return [textBefore, shortName, textAfter].filter(Boolean).join(' ');
}

/**
 * Побудувати повну назву варіанту:
 * [Текст перед] [Бренд] [Лінійка] [Назва] [Ознака] [Деталь], [Варіація] - [Варіант] [Текст після]
 */
export function buildVariantFullName(textBefore, brand, line, name, label, detail, variation, variantName, textAfter) {
    const mainParts = [brand, line, name, label, detail].filter(Boolean).join(' ');
    let core = mainParts;
    if (variation) core = core ? `${core}, ${variation}` : variation;
    if (variantName) core = core ? `${core} - ${variantName}` : variantName;
    return [textBefore, core, textAfter].filter(Boolean).join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════
// LISTENERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати слухачів для авто-генерації назв
 * @param {Function} onChange - callback при зміні будь-якого поля назви
 */
export function initNameGenerationListeners(onChange) {
    NAME_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.dataset.nameGenInited) {
            el.addEventListener('input', onChange);
            el.dataset.nameGenInited = '1';
        }
    });

    // Бренд, лінійка, категорія теж впливають на назву
    ['product-brand', 'product-line', 'product-category'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.dataset.nameGenInited) {
            el.addEventListener('change', onChange);
            el.dataset.nameGenInited = '1';
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE GENERATED NAMES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Оновити згенеровані назви (коротка + повна)
 * Якщо "Текст перед назвою" порожній — підставляється назва категорії
 * @param {string|null} currentProductId - null для нового товару
 */
export function updateGeneratedNames(currentProductId) {
    const v = (id) => document.getElementById(id)?.value.trim() || '';

    // Бренд і лінійка — частина коротної назви
    const brandSelect = document.getElementById('product-brand');
    const lineSelect = document.getElementById('product-line');
    const brandName = brandSelect?.selectedOptions?.[0]?.textContent?.trim() || '';
    const lineName = lineSelect?.selectedOptions?.[0]?.textContent?.trim() || '';
    const brandPart = (brandName && !brandName.startsWith('—')) ? brandName : '';
    const linePart = (lineName && !lineName.startsWith('—')) ? lineName : '';

    // Категорія — fallback для текст перед назвою
    const catSelect = document.getElementById('product-category');
    const catName = catSelect?.selectedOptions?.[0]?.textContent?.trim() || '';
    const catPart = (catName && !catName.startsWith('—')) ? catName : '';

    const textBeforeUa = v('product-text-before-ua');
    const textBeforeRu = v('product-text-before-ru');
    // Якщо текст перед назвою порожній — підставити категорію
    const prefixUa = textBeforeUa || catPart;
    const prefixRu = textBeforeRu || catPart;

    // Коротка: [Бренд] [Лінійка] [Назва] [Ознака] [Деталь], [Варіація]
    const shortUaVal = buildShortName(brandPart, linePart, v('product-name-ua'), v('product-label-ua'), v('product-detail-ua'), v('product-variation-ua'));
    const shortRuVal = buildShortName(brandPart, linePart, v('product-name-ru'), v('product-label-ru'), v('product-detail-ru'), v('product-variation-ru'));

    const shortUa = document.getElementById('product-generated-short-ua');
    const shortRu = document.getElementById('product-generated-short-ru');
    if (shortUa) shortUa.value = shortUaVal;
    if (shortRu) shortRu.value = shortRuVal;

    // Повна: [Текст перед / Категорія] [Коротка] [Текст після]
    const fullUa = document.getElementById('product-generated-full-ua');
    const fullRu = document.getElementById('product-generated-full-ru');
    if (fullUa) fullUa.value = buildFullName(prefixUa, shortUaVal, v('product-text-after-ua'));
    if (fullRu) fullRu.value = buildFullName(prefixRu, shortRuVal, v('product-text-after-ru'));

    // URL slug — тільки для нових товарів
    updateUrlField(shortUaVal, currentProductId);
}
