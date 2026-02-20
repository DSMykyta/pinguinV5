// js/panel/panel-left.js

import { loadHTML } from '../common/util-loader.js';

/**
 * Встановлює клас 'active' для посилання поточної сторінки.
 */
function setActiveLink(nav) {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = nav.querySelectorAll('.bubble-nav-main a.btn-icon');

    links.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

/**
 * Завантажує шаблон bubble-nav і встановлює активну кнопку.
 */
export async function initPanelLeft() {
    const nav = document.getElementById('bubble-nav');
    if (!nav) return;

    await loadHTML('templates/partials/bubble-nav.html', nav);
    setActiveLink(nav);
}
