// js/generators/generator-link/gln-reset.js
import { fetchLinksData } from './gln-data.js';
import { renderLinkButtons } from './gln-ui.js';
// === ІМПОРТУЄМО ПРАВИЛЬНИЙ ОНОВЛЮВАЧ ===
import { updateLinksUI } from './gln-events.js';

/**
 * Ініціалізує кнопку "Оновити" для секції посилань.
 */
export function initLinksReset() {
    const reloadBtn = document.getElementById('reload-section-links');
    if (!reloadBtn) return;

    reloadBtn.addEventListener('click', async () => {
        console.log('Оновлення секції посилань...');
        const icon = reloadBtn.querySelector('span');

        // --- Анімація СТАРТ ---
        reloadBtn.disabled = true;
        reloadBtn.style.color = 'var(--color-primary)';
        icon?.classList.add('is-spinning');
        // ---------------------

        try {
            await fetchLinksData(); // Завантажуємо дані
            renderLinkButtons(); // Перемальовуємо кнопки
            updateLinksUI(); // Оновлюємо UI

        } catch (error) {
            console.error("Помилка під час перезавантаження посилань:", error);
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