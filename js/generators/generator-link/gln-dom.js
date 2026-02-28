// js/generators/generator-link/gln-dom.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                       GENERATOR LINK - DOM                              ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Кешовані DOM-елементи генератора посилань                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
let domCache = null;

export function getLinksDOM() {
    if (domCache) return domCache;
    domCache = {
        buttonsContainer: document.getElementById('links-buttons-container'), // Новий ID для головної секції
        searchInput: document.getElementById('links-search-input'),         // Новий ID для асайду
        countryDisplay: document.getElementById('links-country-display')      // Новий ID для асайду
    };
    return domCache;
}