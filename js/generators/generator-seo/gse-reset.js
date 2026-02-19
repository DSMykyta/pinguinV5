// js/generators/generator-seo/gse-reset.js

/**
 * ПЛАГІН: Скидання SEO
 * Можна видалити — SEO працюватиме без скидання.
 * Слухає charm:refresh на секції (кнопка створюється charm-refresh.js).
 */

import { registerSeoPlugin, runHook } from './gse-plugins.js';
import { getSeoDOM } from './gse-dom.js';
import { fetchData } from './gse-data.js';

let runCalculationsRef = null;

/**
 * Ініціалізує charm:refresh listener для SEO-секції.
 */
function initResetButton({ runCalculations }) {
    runCalculationsRef = runCalculations;

    const section = document.getElementById('section-seo');
    if (!section) return;

    section.addEventListener('charm:refresh', handleReset);
}

async function handleReset(e) {
    const dom = getSeoDOM();

    // Очищаємо поля
    dom.brandNameInput.value = '';
    dom.productNameInput.value = '';
    dom.productPackagingInput.value = '';
    dom.triggerTitlesContainer.innerHTML = '';

    const done = (async () => {
        await fetchData();
        runHook('onReset');
        if (runCalculationsRef) runCalculationsRef();
    })();

    e.detail?.waitUntil(done);
}

// Самореєстрація плагіна
registerSeoPlugin('onInit', initResetButton);
