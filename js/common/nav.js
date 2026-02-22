// js/common/nav.js

import { loadHTML } from './util-loader.js';

/**
 * Встановлює клас 'active' для посилання поточної сторінки.
 */
function setActiveLink(nav) {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = nav.querySelectorAll('.nav-main a.btn-icon');

    links.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

/**
 * Завантажує шаблон nav і встановлює активну кнопку.
 */
export async function initNav() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;

    await loadHTML('templates/partials/nav.html', nav);
    setActiveLink(nav);
}
