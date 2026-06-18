// js/generators/generator-ai-magic/aim-apply.js

/**
 * Applies selected AI Magic result slices to the current Instruments page.
 * Table rows are delegated to the existing gt-magic-parser to avoid direct row
 * mutations from this module.
 */

import { processAndFillInputs } from '../generator-table/gt-magic-parser.js';
import { updateCounters } from '../generator-seo/gse-counters-v2.js';
import { getField, getPageDOM } from './aim-dom.js';
import { state } from './aim-state.js';

export async function applySeo(modal, lang) {
    const result = state.result;
    if (!result) return;

    const page = getPageDOM();
    const data = result[lang] || result.ua || {};
    const source = result.source || {};

    setInput(page.brandName, source.brand);
    setInput(page.productName, data.h1 || source.product_name_original);
    setInput(page.packaging, source.packaging);

    setInput(page.seoTitle, fieldValue(modal, `ai-magic-seo-title-${lang}`));
    setInput(page.seoDescription, fieldValue(modal, `ai-magic-seo-description-${lang}`));
    setInput(page.seoKeywords, fieldValue(modal, `ai-magic-seo-keywords-${lang}`));

    updateCounters();
}

export function applyText(modal, lang) {
    const page = getPageDOM();
    const html = fieldValue(modal, `ai-magic-description-${lang}`);

    if (!page.textEditor || !html) return;
    page.textEditor.innerHTML = html;
    page.textEditor.dispatchEvent(new Event('input', { bubbles: true }));
}

export async function applyTable(modal, lang) {
    const tableText = fieldValue(modal, `ai-magic-table-${lang}`);
    if (!tableText) return;
    await processAndFillInputs(tableText);
    document.getElementById('rows-container')?.dispatchEvent(new Event('input', { bubbles: true }));
}

export async function applyAll(modal, lang) {
    applyText(modal, lang);
    await applySeo(modal, lang);
    await applyTable(modal, lang);
}

function fieldValue(modal, id) {
    return getField(modal, id)?.value?.trim() || '';
}

function setInput(input, value) {
    if (!input || value === undefined || value === null) return;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
}
