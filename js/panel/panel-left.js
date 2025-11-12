// /js/panel/panel-left.js

import { initDropdowns } from '../common/ui-dropdown.js';

/**
 * Встановлює клас 'is-active' для посилання, що відповідає поточній сторінці.
 * (Без змін)
 */
function setActivePageLink(panel) {
    const currentPagePath = window.location.pathname;
    const links = panel.querySelectorAll('a.panel-item');

    links.forEach(link => {
        if (link.getAttribute('href') === '#') {
            return; 
        }
        const linkPath = new URL(link.href).pathname;
        if (currentPagePath === linkPath) {
            link.classList.add('is-active');
        }
    });
}

/**
 * Ініціалізує відстеження прокрутки (Scroll Spy).
 * (Без змін)
 */
function initScrollSpy() {
    const sections = document.querySelectorAll('main > section[id]');
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                
                document.querySelectorAll('.panel-item[data-scroll-to]').forEach(item => {
                    item.classList.remove('is-active');
                });

                const activeItem = document.querySelector(`.panel-item[data-scroll-to="#${sectionId}"]`);
                if (activeItem) {
                    activeItem.classList.add('is-active');
                }
            }
        });
    }, {
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0
    });

    sections.forEach(section => observer.observe(section));
}

/**
 * ▼▼▼ НОВА ФУНКЦІЯ ▼▼▼
 * Додає логіку для кнопки згортання/розгортання лівої панелі.
 */
// function initLeftPanelToggle() {
//     const panel = document.getElementById('panel-left');
//     const toggleBtn = document.getElementById('btn-panel-left-toggle'); // Цей ID не існує
//
//     if (panel && toggleBtn) {
//         toggleBtn.addEventListener('click', () => {
//             const isCollapsed = panel.classList.toggle('is-collapsed');
//             document.body.classList.toggle('left-panel-collapsed', isCollapsed);
//             
//             // Оновлюємо ARIA-атрибут для доступності
//             toggleBtn.setAttribute('aria-label', isCollapsed ? 'Розгорнути панель' : 'Згорнути панель');
//         });
//     } else {
//         // console.error("Не знайдено #panel-left або #btn-panel-left-toggle"); // Ця помилка очікувана для index.html
//     }
// }

/**
 * ✨ ОСНОВНА ОНОВЛЕНА ФУНКЦІЯ ✨
 */
export function initPanelLeft() {
    const panel = document.getElementById('panel-left');
    if (!panel) return;
    
    // 1. Ініціалізуємо дропдауни (по кліку)
initDropdowns();
     
     // 2. Вмикаємо логіку кнопки-перемикача
    // initLeftPanelToggle(); // Логіка перенесена в CSS (hover)
 
     // 3. Встановлюємо активне посилання сторінки
     setActivePageLink(panel);

    // 4. Вмикаємо підсвічування активної секції при скролі
    initScrollSpy(); 
}