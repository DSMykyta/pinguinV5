// js/generators/generator-link/gln-main.js
import { registerPanelInitializer } from '../../panel/panel-right.js';
import { fetchLinksData } from './gln-data.js';
import { renderLinkButtons } from './gln-ui.js';
// === ІМПОРТУЄМО ПРАВИЛЬНИЙ ОНОВЛЮВАЧ ===
import { initLinksEventListeners, updateLinksUI } from './gln-events.js';
import { initLinksReset } from './gln-reset.js';

async function initLinksGenerator() {
    if (!document.getElementById('links-buttons-container')) return;

    await fetchLinksData();
    renderLinkButtons();
    initLinksEventListeners();
    initLinksReset(); // Викликаємо без параметрів

    // === ВИКЛИКАЄМО ПРАВИЛЬНИЙ ОНОВЛЮВАЧ ===
    updateLinksUI(); // Початкове оновлення UI

    console.log('Генератор Посилань ініціалізовано.');
}

registerPanelInitializer('aside-links', initLinksGenerator);