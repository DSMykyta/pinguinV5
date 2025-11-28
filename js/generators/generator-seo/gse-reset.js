// js/generators/generator-seo/gse-reset.js
import { getSeoDOM } from './gse-dom.js';
import { fetchData } from './gse-data.js'; // Потрібно для перезавантаження
import { renderTriggerButtons } from './gse-triggers.js';

/**
 * Ініціалізує кнопку "Очистити" для SEO-секції.
 * @param {Function} onResetCallback - Функція, яку треба викликати ПІСЛЯ очищення (зазвичай runCalculations).
 */
export function initResetButton(onResetCallback) {
    const reloadBtn = document.getElementById('reload-section-seo');
    if (!reloadBtn) return;

    reloadBtn.addEventListener('click', async () => {
        const dom = getSeoDOM();
        const icon = reloadBtn.querySelector('span');

        // --- Анімація СТАРТ ---
        reloadBtn.disabled = true;
        reloadBtn.style.color = 'var(--color-primary)';
        icon?.classList.add('is-spinning');
        // ---------------------

        // Очищаємо поля
        dom.brandNameInput.value = '';
        dom.productNameInput.value = '';
        dom.productPackagingInput.value = '';
        dom.triggerTitlesContainer.innerHTML = '';

        try {
            await fetchData(); // Заново завантажуємо дані
            renderTriggerButtons(); // Перемальовуємо кнопки

            if (onResetCallback) onResetCallback(); // Перераховуємо SEO

        } catch (error) {
            console.error("Помилка під час перезавантаження тригерів:", error);
        } finally {
            // --- Анімація СТОП (після завершення) ---
            reloadBtn.disabled = false;
            reloadBtn.style.color = 'var(--text-disabled)';
            icon?.classList.remove('is-spinning');
            if(icon) icon.style.transform = 'none';
            // ------------------------------------
        }
    });
}