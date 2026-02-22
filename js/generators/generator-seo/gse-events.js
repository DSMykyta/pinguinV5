// js/generators/generator-seo/gse-events.js
import { getSeoDOM } from './gse-dom.js';
import { generateSeoTitle, generateSeoDescription, generateSeoKeywords } from './gse-generators.js';
import { checkSafety } from './gse-helpers.js';
import { optionalFunctions } from './gse-plugins.js';
import { updateCountryDisplay } from './gse-brand.js';
import { updateCounters } from './gse-counters.js';
import { updateBrandAndProductFromText } from './gse-parser.js';
import { debounce } from '../../utils/common-utils.js';

/**
 * Головна функція, яка робить ТІЛЬКИ перерахунок SEO-полів.
 */
export function runCalculations() {
    const dom = getSeoDOM();
    
    const brand = dom.brandNameInput.value.trim();
    const product = dom.productNameInput.value.trim();
    const packaging = dom.productPackagingInput.value.trim();
    const mainText = dom.ghlEditor?.textContent || '';
    const activeTulips = Array.from(dom.triggerTitlesContainer.querySelectorAll('.badge.c-main'))
                              .map(t => t.dataset.title);

    dom.seoTitleInput.value = generateSeoTitle(brand, product, packaging);
    dom.seoDescriptionInput.value = generateSeoDescription(mainText);
    dom.seoKeywordsInput.value = generateSeoKeywords(brand, product, packaging, activeTulips);

    dom.commonWarning.textContent = checkSafety(product);
    updateCountryDisplay();
    updateCounters();
}

/**
 * Оновити SEO поля з тексту редактора Highlight
 */
function updateSeoFromEditor() {
    const dom = getSeoDOM();
    if (!dom.ghlEditor || !dom.brandNameInput) return;

    const text = dom.ghlEditor.textContent || '';
    const { brand, product } = updateBrandAndProductFromText(text);

    dom.brandNameInput.value = brand;
    if (dom.productNameInput) dom.productNameInput.value = product;

    optionalFunctions.syncTulipsFromProductName?.();
    runCalculations();
}

/**
 * Налаштовує всі слухачі подій.
 */
export function initEventListeners() {
    const dom = getSeoDOM();

    // SEO слухає зміни в редакторі Highlight (якщо він є на сторінці)
    if (dom.ghlEditor) {
        const debouncedSeoUpdate = debounce(updateSeoFromEditor, 300);
        dom.ghlEditor.addEventListener('input', debouncedSeoUpdate);
    }

    dom.productNameInput.addEventListener('input', () => {
        optionalFunctions.syncTulipsFromProductName?.();
        runCalculations();
    });

    [dom.brandNameInput, dom.productPackagingInput].forEach(input => {
        input.addEventListener('input', runCalculations);
    });

    dom.searchTrigerInput.addEventListener('input', e => {
        const searchTerm = e.target.value.toLowerCase();
        dom.trigerButtonsContainer.querySelectorAll('.badge').forEach(button => {
            button.classList.toggle('u-hidden', !(button.textContent.toLowerCase().includes(searchTerm)));
        });
    });

    dom.trigerButtonsContainer.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON' && e.target.classList.contains('badge')) {
            optionalFunctions.addTulip?.(e.target.dataset.title, true);
            runCalculations();
        }
    });

    dom.triggerTitlesContainer.addEventListener('click', e => {
        const target = e.target;
        if (target.dataset.title && target.classList.contains('badge')) {
            target.classList.toggle('c-main');
            runCalculations();
        }
    });

}