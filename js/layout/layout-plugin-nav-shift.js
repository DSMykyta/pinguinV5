// js/layout/layout-plugin-nav-shift.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            ЗСУВ КОНТЕНТУ ПРИ РОЗКРИТТІ NAV (NAV SHIFT)                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Слухає toggle expanded/collapsed на .nav.column і зсуває сусідній       ║
 * ║  контент-контейнер на реальну ширину nav (scrollWidth).                  ║
 * ║                                                                          ║
 * ║  📋 ЩО РОБИТЬ:                                                           ║
 * ║  ├── Сторінка: .content-main  → margin-left = nav.scrollWidth           ║
 * ║  └── Модалки:  .modal-fullscreen-content → padding-left = nav.scrollWidth║
 * ║                                                                          ║
 * ║  Працює через делегацію на document — один обробник для всіх nav.        ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// ВНУТРІШНЯ ЛОГІКА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Знаходить контент-контейнер для даного nav і повертає { el, prop }.
 * Сторінка: .content-main → margin-left
 * Модалка:  .modal-fullscreen-content (сусід nav) → padding-left
 */
function getContentTarget(nav) {
    // Сторінкова навігація (#main-nav) → content-main
    if (nav.id === 'main-nav') {
        const main = document.querySelector('.content-main');
        return main ? { el: main, prop: 'margin-left' } : null;
    }

    // Модальна навігація → .modal-fullscreen-content (sibling)
    const parent = nav.closest('.modal-body-with-sidebar');
    if (parent) {
        const content = parent.querySelector('.modal-fullscreen-content');
        return content ? { el: content, prop: 'padding-left' } : null;
    }

    return null;
}

/**
 * Застосовує зсув на контент-контейнер.
 * expanded → зчитує scrollWidth і ставить як inline style.
 * collapsed → прибирає inline style (повертається до CSS default).
 */
function applyShift(nav) {
    const target = getContentTarget(nav);
    if (!target) return;

    const isExpanded = nav.classList.contains('expanded');

    if (isExpanded) {
        // Читаємо реальну ширину nav (scrollWidth = повна ширина контенту)
        const width = nav.scrollWidth;
        target.el.style.setProperty(target.prop, width + 'px');
    } else {
        // Прибираємо inline — CSS default відступ повернеться
        target.el.style.removeProperty(target.prop);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПУБЛІЧНЕ API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🔌 ПЛАГІН — слухає toggle expanded на nav.column і зсуває контент.
 */
export function init() {
    // Делегований click на .nav-toggle — спрацьовує ПІСЛЯ toggle в nav-menu
    // Використовуємо capture: false (bubbling) — nav-menu вішає раніше,
    // тому expanded клас вже є/зник коли ми читаємо.
    document.addEventListener('click', (e) => {
        const toggle = e.target.closest('.nav-toggle');
        if (!toggle) return;

        const nav = toggle.closest('.nav.column');
        if (!nav) return;

        // requestAnimationFrame — щоб expanded клас вже точно застосувався
        // і max-width transition почала працювати (scrollWidth буде правильним)
        requestAnimationFrame(() => applyShift(nav));
    });

    // Слухаємо transitionend для оновлення під час анімації
    // (scrollWidth змінюється поступово при transition max-width)
    document.addEventListener('transitionend', (e) => {
        if (e.propertyName !== 'max-width') return;
        const nav = e.target.closest('.nav.column');
        if (!nav) return;

        applyShift(nav);
    });
}
