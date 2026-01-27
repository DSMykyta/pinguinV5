// js/generators/generator-seo/gse-reset.js

/**
 * ПЛАГІН: Кнопка скидання SEO
 * Можна видалити — SEO працюватиме без кнопки очищення.
 */

import { registerSeoPlugin, runHook } from './gse-plugins.js';
import { getSeoDOM } from './gse-dom.js';
import { fetchData } from './gse-data.js';

let runCalculationsRef = null;

/**
 * Ініціалізує кнопку "Очистити" для SEO-секції.
 */
function initResetButton({ runCalculations }) {
    // Зберігаємо референс на runCalculations
    runCalculationsRef = runCalculations;

    const reloadBtn = document.getElementById('reload-section-seo');
    if (!reloadBtn) return;

    reloadBtn.addEventListener('click', handleReset);
}

async function handleReset() {
    const reloadBtn = document.getElementById('reload-section-seo');
    const dom = getSeoDOM();
    const icon = reloadBtn?.querySelector('span');

    // --- Анімація СТАРТ ---
    if (reloadBtn) {
        reloadBtn.disabled = true;
        reloadBtn.style.color = 'var(--color-primary)';
        icon?.classList.add('is-spinning');
    }
    // ---------------------

    // Очищаємо поля
    dom.brandNameInput.value = '';
    dom.productNameInput.value = '';
    dom.productPackagingInput.value = '';
    dom.triggerTitlesContainer.innerHTML = '';

    try {
        await fetchData(); // Заново завантажуємо дані

        // Викликаємо хук — плагіни можуть реагувати на reset
        runHook('onReset');

        if (runCalculationsRef) runCalculationsRef(); // Перераховуємо SEO

    } catch (error) {
        console.error("Помилка під час перезавантаження:", error);
    } finally {
        // --- Анімація СТОП ---
        if (reloadBtn) {
            reloadBtn.disabled = false;
            reloadBtn.style.color = 'var(--text-disabled)';
            icon?.classList.remove('is-spinning');
            if (icon) icon.style.transform = 'none';
        }
        // ---------------------
    }
}

// Самореєстрація плагіна
registerSeoPlugin('onInit', initResetButton);
