// js/layout/layout-plugin-nav-shift.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            ЗСУВ КОНТЕНТУ ПРИ РОЗКРИТТІ NAV (NAV SHIFT)                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  ResizeObserver стежить за шириною .nav.column.                          ║
 * ║  При зміні ширини — синхронізує margin/padding контенту покадрово.       ║
 * ║                                                                          ║
 * ║  📋 ЩО РОБИТЬ:                                                           ║
 * ║  ├── Сторінка: .content-main         → margin-left  = nav.offsetWidth   ║
 * ║  └── Модалки:  .modal-fullscreen-content → padding-left = nav.offsetWidth + 12║
 * ║                                                                          ║
 * ║  Transition не потрібен на контенті — плавність забезпечує               ║
 * ║  nav.column transition: max-width + покадрове оновлення.                 ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// ВНУТРІШНЯ ЛОГІКА
// ═══════════════════════════════════════════════════════════════════════════

const observed = new WeakSet();

/**
 * Знаходить контент-контейнер для даного nav.
 * Повертає { el, prop, gap } або null.
 */
function getContentTarget(nav) {
    if (nav.id === 'main-nav') {
        const main = document.querySelector('.content-main');
        return main ? { el: main, prop: 'margin-left', gap: 0 } : null;
    }

    const parent = nav.closest('.modal-body-with-sidebar');
    if (parent) {
        const content = parent.querySelector('.modal-fullscreen-content');
        return content ? { el: content, prop: 'padding-left', gap: 12 } : null;
    }

    return null;
}

/**
 * Синхронізує відступ контенту з поточною шириною nav.
 * Викликається ResizeObserver покадрово під час transition.
 */
function syncShift(nav) {
    const target = getContentTarget(nav);
    if (!target) return;
    target.el.style.setProperty(target.prop, (nav.offsetWidth + target.gap) + 'px');
}

const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
        syncShift(entry.target);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// ПУБЛІЧНЕ API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🔌 ПЛАГІН — ResizeObserver на nav.column, покадрова синхронізація.
 */
export function init() {
    // Сторінкова навігація — спостерігаємо одразу
    const pageNav = document.getElementById('main-nav');
    if (pageNav) {
        resizeObserver.observe(pageNav);
        observed.add(pageNav);
    }

    // Модальні навігації — спостерігаємо лінево при першому toggle
    document.addEventListener('click', (e) => {
        const toggle = e.target.closest('.nav-toggle');
        if (!toggle) return;

        const nav = toggle.closest('.nav.column');
        if (!nav || observed.has(nav)) return;

        resizeObserver.observe(nav);
        observed.add(nav);

        // Перший кадр — ResizeObserver ще не встиг, синхронізуємо вручну
        requestAnimationFrame(() => syncShift(nav));
    });
}
