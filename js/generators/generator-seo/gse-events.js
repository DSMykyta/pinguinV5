// js/generators/generator-seo/gse-events.js
import { getSeoDOM } from './gse-dom.js';
import { generateSeoTitle, generateSeoDescription, generateSeoKeywords } from './gse-generators.js';
import { checkSafety } from './gse-helpers.js';
import { syncTulipsFromProductName, addTulip } from './gse-triggers.js';
import { updateCountryDisplay } from './gse-brand.js';
import { updateCounters } from './gse-counters.js';
import { initSearchClear } from '../../utils/search-clear.js';

/**
 * Головна функція, яка робить ТІЛЬКИ перерахунок SEO-полів.
 */
export function runCalculations() {
    const dom = getSeoDOM();
    
    const brand = dom.brandNameInput.value.trim();
    const product = dom.productNameInput.value.trim();
    const packaging = dom.productPackagingInput.value.trim();
    const mainText = dom.ghlEditor?.textContent || '';
    const activeTulips = Array.from(dom.triggerTitlesContainer.querySelectorAll('.chip-active'))
                              .map(t => t.dataset.title);

    dom.seoTitleInput.value = generateSeoTitle(brand, product, packaging);
    dom.seoDescriptionInput.value = generateSeoDescription(mainText);
    dom.seoKeywordsInput.value = generateSeoKeywords(brand, product, packaging, activeTulips);

    dom.commonWarning.textContent = checkSafety(product);
    updateCountryDisplay();
    updateCounters();
}

/**
 * Налаштовує всі слухачі подій.
 */
export function initEventListeners() {
    const dom = getSeoDOM();

    // Текст редактора обробляється в ghl-seo.js -> updateSeoFromEditor()

    dom.productNameInput.addEventListener('input', () => {
        syncTulipsFromProductName();
        runCalculations();
    });

    [dom.brandNameInput, dom.productPackagingInput].forEach(input => {
        input.addEventListener('input', runCalculations);
    });

    dom.searchTrigerInput.addEventListener('input', e => {
        const searchTerm = e.target.value.toLowerCase();
        dom.trigerButtonsContainer.querySelectorAll('.chip').forEach(button => {
            button.classList.toggle('u-hidden', !(button.textContent.toLowerCase().includes(searchTerm)));
        });
    });

    dom.trigerButtonsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('chip-clickable')) {
            addTulip(e.target.dataset.title, true);
            runCalculations();
        }
    });

    dom.triggerTitlesContainer.addEventListener('click', e => {
        const target = e.target;
        if (target.dataset.title && target.classList.contains('chip')) {
            target.classList.toggle('chip-active');
            runCalculations();
        }
    });

    // Ініціалізація кнопки очищення пошуку
    initSearchClear('search-triger');
}