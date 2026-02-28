// js/generators/generator-seo/gse-counters.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                     GENERATOR SEO - COUNTERS                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Лічильники символів для SEO-полів                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { getSeoDOM } from './gse-dom.js';

/**
 * Оновлює лічильники символів для всіх SEO-полів.
 */
export function updateCounters() {
    const dom = getSeoDOM();

    if (dom.seoTitleInput && dom.seoTitleCounterSpan) {
        dom.seoTitleCounterSpan.innerText = `${dom.seoTitleInput.value.length}/65`;
    }
    if (dom.seoKeywordsInput && dom.seoKeywordsCounterSpan) {
        dom.seoKeywordsCounterSpan.innerText = `${dom.seoKeywordsInput.value.length}/250`;
    }
    if (dom.seoDescriptionInput && dom.seoDescriptionCounterSpan) {
        dom.seoDescriptionCounterSpan.innerText = `${dom.seoDescriptionInput.value.length}/200`;
    }
}