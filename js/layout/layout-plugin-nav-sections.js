// js/layout/layout-plugin-nav-sections.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      НАВІГАТОР ПО СЕКЦІЯХ                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Генерік scroll spy + навігація для сторінок і модалів.                  ║
 * ║                                                                          ║
 * ║  📋 ЩО РОБИТЬ:                                                           ║
 * ║  ├── Плавна прокрутка до секції при кліку на іконку                      ║
 * ║  └── Scroll Spy: .active на іконці відповідно до видимої секції          ║
 * ║                                                                          ║
 * ║  📋 HTML СТРУКТУРА:                                                      ║
 * ║  <nav class="nav column" id="...-section-navigator">                    ║
 * ║    <a class="btn-icon expand" href="#section-id">...</a>          ║
 * ║  </nav>                                                                  ║
 * ║  <main> <section id="section-id">...</section> </main>                   ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const _observers = new WeakMap();

// ═══════════════════════════════════════════════════════════════════════════
// ГЕНЕРІК API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати scroll spy для будь-якого nav + scrollable контейнера.
 * @param {HTMLElement} nav - навігаційний елемент з посиланнями
 * @param {HTMLElement} contentArea - скролюваний контейнер з секціями
 */
export function initSectionNav(nav, contentArea) {
    if (!nav || !contentArea) return;

    const navLinks = nav.querySelectorAll('a.btn-icon.expand');
    const sections = contentArea.querySelectorAll('section[id]');

    // Клік — делегування (один раз)
    if (!nav.dataset.navInited) {
        nav.addEventListener('click', (e) => {
            const link = e.target.closest('a.btn-icon.expand');
            if (!link) return;

            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const targetId = link.getAttribute('href')?.substring(1);
            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        nav.dataset.navInited = '1';
    }

    // Observer — disconnect старого якщо є
    const prevObserver = _observers.get(nav);
    if (prevObserver) prevObserver.disconnect();

    if (sections.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                navLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
                });
            }
        });
    }, {
        root: contentArea,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
    });

    sections.forEach(section => observer.observe(section));
    _observers.set(nav, observer);
}

/**
 * Disconnect observer для nav
 * @param {HTMLElement} nav
 */
export function destroySectionNav(nav) {
    if (!nav) return;
    const observer = _observers.get(nav);
    if (observer) {
        observer.disconnect();
        _observers.delete(nav);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПЛАГІН LAYOUT (сторінки — автоматичний init)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🔌 ПЛАГІН — ініціалізує навігатор для сторінки (content-main).
 */
export function init() {
    const nav = document.getElementById('section-navigator');
    const contentArea = document.getElementById('content-main');
    if (!nav || !contentArea) return;

    initSectionNav(nav, contentArea);
}
