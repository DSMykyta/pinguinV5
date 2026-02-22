// js/generators/generator-seo/gse-triggers.js

/**
 * ПЛАГІН: Тригери (тюльпани) для SEO
 * Можна видалити — SEO працюватиме без тюльпанів.
 */

import { registerSeoPlugin, optionalFunctions } from './gse-plugins.js';
import { getSeoDOM } from './gse-dom.js';
import { getTriggersData } from './gse-data.js';

/**
 * Створює список кнопок-тригерів в асайді.
 */
function renderTriggerButtons() {
    const dom = getSeoDOM();
    const triggersData = getTriggersData();

    if (!dom.trigerButtonsContainer) return;
    dom.trigerButtonsContainer.innerHTML = '';

    triggersData.forEach(trigger => {
        const button = document.createElement('button');
        button.className = 'badge';
        button.textContent = trigger.title;
        button.dataset.title = trigger.title;
        dom.trigerButtonsContainer.appendChild(button);
    });
}

/**
 * Створює HTML для одного "тюльпана" і додає його на сторінку.
 */
function addTulip(title, isActive = true) {
    const dom = getSeoDOM();
    if (!dom.triggerTitlesContainer) return;
    if (dom.triggerTitlesContainer.querySelector(`[data-title="${title}"]`)) return;

    const triggerData = getTriggersData().find(t => t.title === title);
    if (!triggerData) return;

    const tulip = document.createElement('div');
    tulip.className = isActive ? 'badge c-main' : 'badge';
    tulip.textContent = title;
    tulip.dataset.title = title;

    if (triggerData.keywords && triggerData.keywords.length > 0) {
        tulip.title = triggerData.keywords.join(', ');
    }
    dom.triggerTitlesContainer.appendChild(tulip);
}

/**
 * Автоматично додає "тюльпани" на основі назви продукту.
 * Спочатку очищає всі існуючі тюльпани, потім додає нові.
 */
function syncTulipsFromProductName() {
    const dom = getSeoDOM();
    const triggersData = getTriggersData();

    if (!dom.triggerTitlesContainer || !dom.productNameInput) return;

    const productName = dom.productNameInput.value.toLowerCase();

    // Очищуємо всі існуючі тюльпани
    dom.triggerTitlesContainer.innerHTML = '';

    // Додаємо тільки ті, що відповідають поточній назві продукту
    triggersData.forEach(trigger => {
        if (trigger.triggers.some(t => {
            // Використовуємо word boundary для точного співставлення
            // Екрануємо спецсимволи в тригері
            const escapedTrigger = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedTrigger}\\b`, 'i');
            return regex.test(productName);
        })) {
            addTulip(trigger.title, true);
        }
    });
}

/**
 * Ініціалізація плагіна
 */
function initTriggers() {
    // Реєструємо функції як опціональні
    optionalFunctions.addTulip = addTulip;
    optionalFunctions.syncTulipsFromProductName = syncTulipsFromProductName;

    // Малюємо кнопки при старті
    renderTriggerButtons();
}

// Самореєстрація плагіна
registerSeoPlugin('onInit', initTriggers);
registerSeoPlugin('onReset', renderTriggerButtons);
