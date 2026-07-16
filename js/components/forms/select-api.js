// js/components/forms/select-api.js

/**
 * Public initialization API for custom selects.
 */

import { CustomSelect } from './select-custom.js';

export function initCustomSelects(container = document) {
    container.querySelectorAll('select[data-custom-select]').forEach(selectEl => {
        if (!selectEl.closest('.custom-select-wrapper')) {
            new CustomSelect(selectEl);
        }
    });
}

export function reinitializeCustomSelect(selectElement) {
    if (!selectElement) return;
    const existingWrapper = selectElement.closest('.custom-select-wrapper');
    if (existingWrapper) {
        // Зупиняємо спостерігач перед видаленням
        if (selectElement.customSelect && selectElement.customSelect.observer) {
            selectElement.customSelect.observer.disconnect();
        }
        existingWrapper.parentNode.insertBefore(selectElement, existingWrapper);
        existingWrapper.remove();
        selectElement.style.display = '';
    }
    new CustomSelect(selectElement);
}
