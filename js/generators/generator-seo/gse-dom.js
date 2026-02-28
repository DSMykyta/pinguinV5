// js/generators/generator-seo/gse-dom.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                     GENERATOR SEO - DOM                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Кешовані DOM-елементи SEO генератора                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

let domCache = null;

export function getSeoDOM() {
    if (domCache) {
        return domCache;
    }

    domCache = {
        // --- Вхідні дані ---
        // Редактор тексту з Highlight Generator, звідки беремо текст для SEO
        ghlEditor: document.getElementById('ghl-editor'),
        
        // Три поля для ручного вводу
        brandNameInput: document.getElementById('brand-name'),
        productNameInput: document.getElementById('product-name'),
        productPackagingInput: document.getElementById('product-packaging'),
        
        // --- Вихідні дані (тільки для читання) ---
        countryNameDiv: document.getElementById('country-name'),
        seoTitleInput: document.getElementById('seo-title'),
        seoTitleCounterSpan: document.getElementById('seo-title-counter'),
        seoKeywordsInput: document.getElementById('seo-keywords'),
        seoKeywordsCounterSpan: document.getElementById('seo-keywords-counter'),
        seoDescriptionInput: document.getElementById('seo-description'),
        seoDescriptionCounterSpan: document.getElementById('seo-description-counter'),
        
        // --- Блоки в асайді ---
        // Контейнер для "тюльпанів", які додаються до ключових слів
        triggerTitlesContainer: document.getElementById('trigger-titles-container'),
        // Пошук в асайді
        searchTrigerInput: document.getElementById('search-triger'),
        // Контейнер для всіх кнопок-тригерів, що скролиться
        trigerButtonsContainer: document.getElementById('triger-buttons-container'),
        
        // Блок для попередження про заборонені товари
        commonWarning: document.getElementById('common-warning'),
    };

    return domCache;
}