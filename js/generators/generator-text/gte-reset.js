// js/generators/generator-text/gte-reset.js
import { getTextDOM } from './gte-dom.js';
import { initStats } from './gte-stats.js';
import { getSeoDOM } from '../generator-seo/gse-dom.js';
import { runCalculations as runSeoCalculations } from '../generator-seo/gse-events.js';
// =============================

/**
 * Ініціалізує кнопку "Очистити" для секції тексту.
 */
export function initTextReset() {
    const reloadBtn = document.getElementById('reload-section-text');
    if (!reloadBtn) return;

    reloadBtn.addEventListener('click', () => {
        const textDom = getTextDOM();
        const seoDom = getSeoDOM();
        const icon = reloadBtn.querySelector('span');

        // --- Анімація СТАРТ ---
        reloadBtn.disabled = true;
        reloadBtn.style.color = 'var(--color-primary)';
        icon?.classList.add('is-spinning');
        // ---------------------

        // 1. Очищаємо поля тексту та SEO
        if (textDom.inputMarkup) textDom.inputMarkup.value = '';
        if (seoDom.brandNameInput) seoDom.brandNameInput.value = '';
        if (seoDom.productNameInput) seoDom.productNameInput.value = '';

        // 2. Скидаємо лічильники тексту
        initStats();

        // 3. Перераховуємо SEO
        runSeoCalculations();

        // --- Анімація СТОП (одразу) ---
        reloadBtn.disabled = false;
        reloadBtn.style.color = 'var(--text-disabled)';
        icon?.classList.remove('is-spinning');
        if(icon) icon.style.transform = 'none';
        // -------------------------
    });
}