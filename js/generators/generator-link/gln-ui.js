// js/generators/generator-link/gln-ui.js
import { getLinksDOM } from './gln-dom.js';
import { getLinksData, getCountriesData } from './gln-data.js';

export function renderLinkButtons() {
    const dom = getLinksDOM();
    const data = getLinksData();
    if (!dom.buttonsContainer) return;
    dom.buttonsContainer.innerHTML = ''; // Очищуємо перед рендером

    data.forEach(item => {
        const button = document.createElement("a");
        button.className = "chip chip-link";
        button.href = item.link;
        button.target = "_blank";
        button.textContent = item.brand;
        button.dataset.brandLower = item.brand.toLowerCase();
        dom.buttonsContainer.appendChild(button);
    });
}

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

export function filterLinkButtons() {
    const dom = getLinksDOM();
    if (!dom.searchInput || !dom.buttonsContainer) return;
    const searchTerm = dom.searchInput.value.toLowerCase();
    const buttons = dom.buttonsContainer.querySelectorAll(".chip");

    buttons.forEach(button => {
        const buttonText = button.dataset.brandLower; // Беремо з data-атрибуту
        button.classList.toggle('u-hidden', !(buttonText.includes(searchTerm)));
    });
}