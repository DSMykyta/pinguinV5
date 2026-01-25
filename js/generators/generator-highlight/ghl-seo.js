// js/generators/generator-highlight/ghl-seo.js

/**
 * SEO - Інтеграція з SEO генератором
 */

import { getHighlightDOM } from './ghl-dom.js';
import { getSeoDOM } from '../generator-seo/gse-dom.js';
import { runCalculations as runSeoCalculations } from '../generator-seo/gse-events.js';
import { updateBrandAndProductFromText } from '../generator-seo/gse-parser.js';
import { syncTulipsFromProductName } from '../generator-seo/gse-triggers.js';

/**
 * Оновити SEO поля з тексту редактора
 */
export function updateSeoFromEditor() {
    const dom = getHighlightDOM();
    if (!dom.editor) return;

    const seoDom = getSeoDOM();
    // Перевіряємо чи SEO панель завантажена
    if (!seoDom.brandNameInput || !seoDom.inputTextMarkup) return;

    const text = dom.editor.textContent || '';
    const { brand, product } = updateBrandAndProductFromText(text);

    seoDom.brandNameInput.value = brand;
    if (seoDom.productNameInput) seoDom.productNameInput.value = product;

    syncTulipsFromProductName();
    runSeoCalculations();
}
