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
    if (!result) return 0;

    const page = getPageDOM();
    const data = result[lang] || result.ua || {};
    const source = result.source || {};
    let applied = 0;

    applied += setInput(page.brandName, source.brand);
    applied += setInput(page.productName, data.h1 || source.product_name_original);
    applied += setInput(page.packaging, source.packaging);

    applied += setInput(page.seoTitle, fieldValue(modal, `ai-magic-seo-title-${lang}`));
    applied += setInput(page.seoDescription, fieldValue(modal, `ai-magic-seo-description-${lang}`));
    applied += setInput(page.seoKeywords, fieldValue(modal, `ai-magic-seo-keywords-${lang}`));

    if (applied > 0) updateCounters();
    return applied;
}

export function applyText(modal, lang) {
    const page = getPageDOM();
    const html = fieldValue(modal, `ai-magic-description-${lang}`);

    if (!page.textEditor || !html) return 0;
    page.textEditor.innerHTML = html;
    page.textEditor.dispatchEvent(new Event('input', { bubbles: true }));
    return 1;
}

export async function applyTable(modal, lang) {
    const tableText = fieldValue(modal, `ai-magic-table-${lang}`);
    if (!tableText) return 0;
    await processAndFillInputs(tableText);
    document.getElementById('rows-container')?.dispatchEvent(new Event('input', { bubbles: true }));
    return 1;
}

export function applyImages(modal) {
    const urls = fieldValue(modal, 'ai-magic-images')
        .split(/\r?\n/)
        .map(url => url.trim())
        .filter(Boolean);
    if (!urls.length) return 0;

    const imageUrlInput = document.getElementById('gim-image-url');
    const loadUrlBtn = document.getElementById('gim-load-url-btn');
    if (!imageUrlInput || !loadUrlBtn) return 0;

    imageUrlInput.value = urls[0];
    imageUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
    loadUrlBtn.click();
    return 1;
}

export async function applyAll(modal, lang) {
    let applied = 0;
    applied += applyText(modal, lang);
    applied += await applySeo(modal, lang);
    applied += await applyTable(modal, lang);
    applied += applyImages(modal);
    return applied;
}

function fieldValue(modal, id) {
    return getField(modal, id)?.value?.trim() || '';
}

function setInput(input, value) {
    const nextValue = String(value ?? '').trim();
    if (!input || !nextValue) return 0;
    input.value = nextValue;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return 1;
}
