// js/generators/generator-link/gln-ui.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    GENERATOR LINK - UI RENDERING                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Рендеринг кнопок посилань для брендів.
 *
 * ФОРМАТ ВИВОДУ:
 * Кожне посилання бренду виводиться як окрема кнопка:
 * [MST ua] [MST de] [MST instagram] [Optimum ua] [Now ua] [Now de]
 *
 * Де "MST" — назва бренду, "ua"/"de" — назва посилання (link.name)
 */

import { getLinksDOM } from './gln-dom.js';
import { getLinksData, getCountriesData } from './gln-data.js';

/**
 * Рендерити кнопки посилань
 * Кожне посилання бренду = окрема кнопка
 */
export function renderLinkButtons() {
    const dom = getLinksDOM();
    const data = getLinksData();
    if (!dom.buttonsContainer) return;

    dom.buttonsContainer.innerHTML = '';

    data.forEach(item => {
        const button = document.createElement("a");
        button.className = "chip chip-link";
        button.href = item.url;
        button.target = "_blank";
        button.rel = "noopener noreferrer";

        // Формат: "BrandName linkName" (наприклад "MST ua")
        const displayText = item.linkName
            ? `${item.brand} ${item.linkName}`
            : item.brand;

        button.textContent = displayText;

        // Для фільтрації — шукаємо по назві бренду
        button.dataset.brandLower = item.brand.toLowerCase();
        button.dataset.linkName = (item.linkName || '').toLowerCase();

        dom.buttonsContainer.appendChild(button);
    });
}

/**
 * Оновити відображення країни для бренду
 */
export function updateLinkCountryDisplay() {
    const dom = getLinksDOM();
    const countries = getCountriesData();
    if (!dom.searchInput || !dom.countryDisplay) return;

    const brandName = dom.searchInput.value.trim().toLowerCase();
    const countryName = countries[brandName];

    if (countryName) {
        dom.countryDisplay.innerHTML = `<span class="chip">${countryName}</span>`;
    } else {
        dom.countryDisplay.innerHTML = '';
    }
}

/**
 * Фільтрувати кнопки посилань по пошуковому запиту
 */
export function filterLinkButtons() {
    const dom = getLinksDOM();
    if (!dom.searchInput || !dom.buttonsContainer) return;

    const searchTerm = dom.searchInput.value.toLowerCase();
    const buttons = dom.buttonsContainer.querySelectorAll(".chip");

    buttons.forEach(button => {
        const brandName = button.dataset.brandLower;
        const linkName = button.dataset.linkName;

        // Шукаємо по назві бренду АБО по назві посилання
        const matches = brandName.includes(searchTerm) || linkName.includes(searchTerm);
        button.classList.toggle('u-hidden', !matches);
    });
}
