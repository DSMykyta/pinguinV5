// js/generators/generator-link/gln-events.js
import { getLinksDOM } from './gln-dom.js';
import { updateLinkCountryDisplay, filterLinkButtons } from './gln-ui.js';
import { initSearchClear } from '../../utils/search-clear.js';

export function initLinksEventListeners() {
    const dom = getLinksDOM();
    if (!dom.searchInput) return;

    // Один слухач для пошуку
    dom.searchInput.addEventListener("input", () => {
        filterLinkButtons();
        updateLinkCountryDisplay();
    });

    // Ініціалізація кнопки очищення пошуку
    initSearchClear('links-search-input');
}

export function updateLinksUI() {
    filterLinkButtons();
    updateLinkCountryDisplay();
}