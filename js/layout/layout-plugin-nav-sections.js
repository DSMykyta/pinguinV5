// js/layout/layout-plugin-nav-sections.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      НАВІГАТОР ПО СЕКЦІЯХ СТОРІНКИ                       ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Вертикальна панель іконок #section-navigator для швидкого переходу       ║
 * ║  між секціями. Підсвічує поточну секцію при скролі (Scroll Spy).         ║
 * ║                                                                          ║
 * ║  📋 ЩО РОБИТЬ:                                                           ║
 * ║  ├── Плавна прокрутка до секції при кліку на іконку                      ║
 * ║  └── Scroll Spy: .active на іконці відповідно до видимої секції          ║
 * ║                                                                          ║
 * ║  📋 HTML СТРУКТУРА:                                                      ║
 * ║  <nav id="section-navigator">                                            ║
 * ║    <a class="btn-icon expand" href="#section-id">...</a>                 ║
 * ║  </nav>                                                                  ║
 * ║  <main> <section id="section-id">...</section> </main>                   ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// ПУБЛІЧНЕ API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🔌 ПЛАГІН — ініціалізує навігатор по секціях зі scroll spy.
 */
export function init() {
    const navigator = document.getElementById('section-navigator');
    if (!navigator) return;

    // 1. Плавна прокрутка по кліку
    navigator.addEventListener('click', (e) => {
        const navIcon = e.target.closest('.btn-icon.expand');
        if (!navIcon || !navIcon.hash) return;

        e.preventDefault();
        const targetElement = document.querySelector(navIcon.hash);

        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });

    // 2. Scroll Spy (підсвічування активної секції)
    const sections = document.querySelectorAll('main > section[id]');
    const navIcons = navigator.querySelectorAll('.btn-icon.expand');

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const sectionId = entry.target.id;
            const correspondingIcon = navigator.querySelector(`.btn-icon.expand[href="#${sectionId}"]`);

            if (entry.isIntersecting) {
                navIcons.forEach(icon => icon.classList.remove('active'));
                if (correspondingIcon) {
                    correspondingIcon.classList.add('active');
                }
            }
        });
    }, {
        root: document.getElementById('content-main'),
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0
    });

    sections.forEach(section => observer.observe(section));
}
