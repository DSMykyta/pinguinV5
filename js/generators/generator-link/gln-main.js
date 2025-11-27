// js/generators/generator-link/gln-main.js
import { registerPanelInitializer } from '../../panel/panel-right.js';
import { fetchLinksData } from './gln-data.js';
import { renderLinkButtons } from './gln-ui.js';
// === ІМПОРТУЄМО ПРАВИЛЬНИЙ ОНОВЛЮВАЧ ===
import { initLinksEventListeners, updateLinksUI } from './gln-events.js';
import { initLinksReset } from './gln-reset.js';
import { initAsideButtons } from './gln-aside.js';

async function initLinksGenerator() {
    if (!document.getElementById('links-buttons-container')) return;

    await fetchLinksData();
    renderLinkButtons();
    initLinksEventListeners();
    initLinksReset(); // Викликаємо без параметрів
    initAsideButtons(); // Ініціалізуємо кнопки в footer aside

    // Початкове оновлення UI
    updateLinksUI();
}

registerPanelInitializer('aside-links', initLinksGenerator);