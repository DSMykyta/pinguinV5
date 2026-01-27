// js/generators/generator-link/gln-reset.js

/**
 * ПЛАГІН: Кнопка оновлення Links
 * Можна видалити — Links працюватиме без кнопки оновлення.
 */

import { registerLinksPlugin, runHook } from './gln-plugins.js';
import { fetchLinksData } from './gln-data.js';
import { renderLinkButtons } from './gln-ui.js';

let updateLinksUIRef = null;

/**
 * Ініціалізує кнопку "Оновити" для секції посилань.
 */
function initLinksReset({ updateLinksUI }) {
    updateLinksUIRef = updateLinksUI;

    const reloadBtn = document.getElementById('reload-section-links');
    if (!reloadBtn) return;

    reloadBtn.addEventListener('click', handleReset);
}

async function handleReset() {
    const reloadBtn = document.getElementById('reload-section-links');
    const icon = reloadBtn?.querySelector('span');

    // --- Анімація СТАРТ ---
    if (reloadBtn) {
        reloadBtn.disabled = true;
        reloadBtn.style.color = 'var(--color-primary)';
        icon?.classList.add('is-spinning');
    }
    // ---------------------

    try {
        await fetchLinksData();
        renderLinkButtons();

        // Викликаємо хук — плагіни можуть реагувати на reset
        runHook('onReset');

        if (updateLinksUIRef) updateLinksUIRef();

    } finally {
        // --- Анімація СТОП ---
        if (reloadBtn) {
            reloadBtn.disabled = false;
            reloadBtn.style.color = 'var(--text-disabled)';
            icon?.classList.remove('is-spinning');
            if (icon) icon.style.transform = 'none';
        }
        // ---------------------
    }
}

// Самореєстрація плагіна
registerLinksPlugin('onInit', initLinksReset);
