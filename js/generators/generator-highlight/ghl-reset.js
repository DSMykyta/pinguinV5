// js/generators/generator-highlight/ghl-reset.js

/**
 * RESET - Очищення редактора
 */

import { getHighlightDOM } from './ghl-dom.js';
import { resetUndoStack } from './ghl-undo.js';
import { updateStats } from './ghl-stats.js';
import { getSeoDOM } from '../generator-seo/gse-dom.js';
import { runCalculations as runSeoCalculations } from '../generator-seo/gse-events.js';

/**
 * Скинути редактор
 */
export function resetEditor() {
    const dom = getHighlightDOM();
    const reloadBtn = document.getElementById('reload-section-highlight');
    const icon = reloadBtn?.querySelector('span');

    // Анімація СТАРТ
    if (reloadBtn) {
        reloadBtn.disabled = true;
        reloadBtn.style.color = 'var(--color-primary)';
        icon?.classList.add('is-spinning');
    }

    // Очищаємо редактори
    if (dom.editor) dom.editor.innerHTML = '';
    if (dom.codeEditor) dom.codeEditor.value = '';
    if (dom.findInput) dom.findInput.value = '';
    if (dom.replaceInput) dom.replaceInput.value = '';

    // Очищаємо SEO поля
    const seoDom = getSeoDOM();
    if (seoDom.brandNameInput) seoDom.brandNameInput.value = '';
    if (seoDom.productNameInput) seoDom.productNameInput.value = '';
    runSeoCalculations();

    // Скидаємо валідацію
    if (dom.validationResults) {
        dom.validationResults.innerHTML = '';
        dom.validationResults.classList.remove('has-errors');
    }

    // Скидаємо стеки undo/redo
    resetUndoStack();

    // Оновлюємо статистику
    updateStats();

    // Анімація СТОП
    setTimeout(() => {
        if (reloadBtn) {
            reloadBtn.disabled = false;
            reloadBtn.style.color = '';
            icon?.classList.remove('is-spinning');
        }
    }, 300);
}
