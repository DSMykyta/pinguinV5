// js/layout/layout-plugin-nav-menu.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      ЛІВА НАВІГАЦІЙНА ПАНЕЛЬ (MENU)                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Завантажує HTML шаблон лівого меню і підсвічує активну сторінку.        ║
 * ║                                                                          ║
 * ║  📋 ЩО РОБИТЬ:                                                           ║
 * ║  ├── Завантажує templates/partials/nav.html у #main-nav                  ║
 * ║  ├── Додає клас .active на посилання поточної сторінки                   ║
 * ║  └── Click-toggle expanded/collapsed для .nav.column                    ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { loadHTML } from '../utils/html-loader.js';
import { getUserData } from '../auth/auth-google.js';

// ═══════════════════════════════════════════════════════════════════════════
// ВНУТРІШНЯ ЛОГІКА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Чи має юзер налаштування menu=true (nav expanded по дефолту)
 */
function isMenuExpanded() {
    const user = getUserData();
    return user?.menu === true;
}

/**
 * Застосувати expanded стан до nav.column
 */
function applyNavExpanded(nav) {
    nav.classList.add('expanded');
    if (nav.id === 'main-nav') {
        document.body.classList.add('nav-expanded');
    }
}

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
 * Делегований click-toggle для всіх .nav-toggle кнопок.
 * Працює і для сторінкової навігації, і для модальних.
 */
function initNavToggle() {
    document.addEventListener('click', (e) => {
        const toggle = e.target.closest('.nav-toggle');
        if (!toggle) return;

        const nav = toggle.closest('.nav.column');
        if (!nav) return;

        nav.classList.toggle('expanded');
        const isExpanded = nav.classList.contains('expanded');

        // Оновлюємо тултіп
        const label = isExpanded ? 'Згорнути меню' : 'Розгорнути меню';
        toggle.dataset.tooltip = label;
        toggle.setAttribute('aria-label', label);

        // Оновити активний tooltip якщо він зараз видимий
        const activeTooltip = document.querySelector('.custom-tooltip');
        if (activeTooltip) activeTooltip.textContent = label;

        // Синхронізуємо body клас для #main-nav (CSS margin-left на content-main)
        if (nav.id === 'main-nav') {
            document.body.classList.toggle('nav-expanded', isExpanded);
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// ПУБЛІЧНЕ API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🔌 ПЛАГІН — завантажує nav шаблон і підсвічує активну сторінку.
 */
export async function init() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;

    await loadHTML('templates/partials/nav.html', nav);

    // Для неавторизованих — видаляємо nav-main з DOM (не display:none)
    if (!window.isAuthorized) {
        const navMain = nav.querySelector('.nav-main');
        if (navMain) navMain.remove();
    } else {
        setActiveLink(nav);
        // Якщо user.menu === true — розгортаємо nav по дефолту
        if (isMenuExpanded()) applyNavExpanded(nav);
    }

    // Toggle expanded/collapsed для nav.column
    initNavToggle();

    // Модальні nav — розгортаємо при відкритті модалу якщо menu=true
    if (isMenuExpanded()) {
        document.addEventListener('modal-opened', (e) => {
            const { bodyTarget } = e.detail;
            if (!bodyTarget) return;
            bodyTarget.querySelectorAll('.nav.column').forEach(applyNavExpanded);
        });
    }
}
