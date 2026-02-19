// js/generators/generator-link/gln-events.js
import { getLinksDOM } from './gln-dom.js';
import { updateLinkCountryDisplay, filterLinkButtons } from './gln-ui.js';
export function initLinksEventListeners() {
    const dom = getLinksDOM();
    if (!dom.searchInput) return;

    // Один слухач для пошуку
    dom.searchInput.addEventListener("input", () => {
        filterLinkButtons();
        updateLinkCountryDisplay();
    });

}

export function updateLinksUI() {
    filterLinkButtons();
    updateLinkCountryDisplay();
}