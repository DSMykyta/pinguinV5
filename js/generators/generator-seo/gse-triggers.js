// js/generators/generator-seo/gse-triggers.js
import { getSeoDOM } from './gse-dom.js';
import { getTriggersData } from './gse-data.js';

/**
 * Створює список кнопок-тригерів в асайді.
 */
export function renderTriggerButtons() {
    const dom = getSeoDOM();
    const triggersData = getTriggersData();
    dom.trigerButtonsContainer.innerHTML = '';

    triggersData.forEach(trigger => {
        const button = document.createElement('button');
        button.className = 'chip chip-clickable';
        button.textContent = trigger.title;
        button.dataset.title = trigger.title;
        dom.trigerButtonsContainer.appendChild(button);
    });
}

/**
 * Створює HTML для одного "тюльпана" і додає його на сторінку.
 */
export function addTulip(title, isActive = true) {
    const dom = getSeoDOM();
    if (dom.triggerTitlesContainer.querySelector(`[data-title="${title}"]`)) return;

    const triggerData = getTriggersData().find(t => t.title === title);
    if (!triggerData) return;

    const tulip = document.createElement('div');
    tulip.className = isActive ? 'chip chip-active chip-tooltip' : 'chip chip-tooltip';
    tulip.textContent = title;
    tulip.dataset.title = title;

    if (triggerData.keywords && triggerData.keywords.length > 0) {
        const tooltip = document.createElement('div');
        tooltip.className = 'chip-tooltip-content';
        tooltip.textContent = triggerData.keywords.join(', ');
        tulip.appendChild(tooltip);
    }
    dom.triggerTitlesContainer.appendChild(tulip);
}

/**
 * Автоматично додає "тюльпани" на основі назви продукту.
 * Спочатку очищає всі існуючі тюльпани, потім додає нові.
 */
export function syncTulipsFromProductName() {
    const dom = getSeoDOM();
    const triggersData = getTriggersData();
    const productName = dom.productNameInput.value.toLowerCase();

    // Очищуємо всі існуючі тюльпани
    dom.triggerTitlesContainer.innerHTML = '';

    // Додаємо тільки ті, що відповідають поточній назві продукту
    triggersData.forEach(trigger => {
        if (trigger.triggers.some(t => productName.includes(t))) {
            addTulip(trigger.title, true);
        }
    });
}