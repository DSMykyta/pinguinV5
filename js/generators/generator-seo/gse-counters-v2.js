// js/generators/generator-seo/gse-counters-v2.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                  GENERATOR SEO - COUNTERS V2                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Ліміти: Title 60, Keywords 250, Description 160                      ║
 * ║  Кольорова індикація: зелений / жовтий / червоний                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import { getSeoDOM } from './gse-dom.js';

const LIMITS = {
    title: 60,
    keywords: 250,
    description: 160,
};

/**
 * Оновлює лічильники символів + кольорову індикацію
 */
export function updateCounters() {
    const dom = getSeoDOM();

    updateField(dom.seoTitleInput, dom.seoTitleCounterSpan, LIMITS.title);
    updateField(dom.seoKeywordsInput, dom.seoKeywordsCounterSpan, LIMITS.keywords);
    updateField(dom.seoDescriptionInput, dom.seoDescriptionCounterSpan, LIMITS.description);
}

/**
 * Оновлює один лічильник з кольоровою індикацією
 */
function updateField(input, counter, limit) {
    if (!input || !counter) return;

    const len = input.value.length;
    counter.innerText = `${len}/${limit}`;

    // Кольорова індикація на span лічильника
    counter.classList.remove('c-green', 'c-yellow', 'c-red');

    if (len > limit) {
        counter.classList.add('c-red');
    } else if (len > limit * 0.9) {
        counter.classList.add('c-yellow');
    } else {
        counter.classList.add('c-green');
    }
}
