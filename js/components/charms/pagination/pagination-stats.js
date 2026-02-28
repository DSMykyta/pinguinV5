// js/components/charms/pagination/pagination-stats.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                          PAGINATION STATS                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Авто-створення лічильника "Показано X з Y" для пагінації               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Автоматичне створення stats span для pagination charm.
 * Знаходить .section-name-block над контейнером і створює <span class="body-s">.
 */

/**
 * @param {HTMLElement} el — pagination container
 * @returns {HTMLElement|null} — створений span або null
 */
export function autoCreateStatsSpan(el) {
    const parent = el.closest('.tab-content') || el.parentElement;
    const header = parent?.querySelector('.section-header');
    if (!header) return null;

    const nameBlock = header.querySelector('.section-name-block');
    if (!nameBlock) return null;

    const span = document.createElement('span');
    span.className = 'body-s';
    span.textContent = 'Показано 0 з 0';
    nameBlock.appendChild(span);
    return span;
}
