// js/generators/generator-link/gln-reset.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    GENERATOR LINK - RESET                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Оновлення та скидання даних генератора посилань            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * ПЛАГІН: Оновлення Links
 * Можна видалити — Links працюватиме без кнопки оновлення.
 * Слухає charm:refresh на секції (кнопка створюється charm-refresh.js).
 */

import { registerLinksPlugin, runHook } from './gln-plugins.js';
import { fetchLinksData } from './gln-data.js';
import { renderLinkButtons } from './gln-ui.js';

let updateLinksUIRef = null;

/**
 * Ініціалізує charm:refresh listener для секції посилань.
 */
function initLinksReset({ updateLinksUI }) {
    updateLinksUIRef = updateLinksUI;

    const section = document.getElementById('section-links');
    if (!section) return;

    section.addEventListener('charm:refresh', handleReset);
}

async function handleReset(e) {
    const done = (async () => {
        await fetchLinksData();
        renderLinkButtons();
        runHook('onReset');
        if (updateLinksUIRef) updateLinksUIRef();
    })();

    e.detail?.waitUntil(done);
}

export function init(context) {
    registerLinksPlugin('onInit', initLinksReset);
}
