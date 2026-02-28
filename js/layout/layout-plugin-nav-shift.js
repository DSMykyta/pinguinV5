// js/layout/layout-plugin-nav-shift.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            ЗСУВ КОНТЕНТУ ПРИ РОЗКРИТТІ NAV (NAV SHIFT)                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Слухає transitionend на nav.column (width).                              ║
 * ║  Після завершення анімації — виставляє margin/padding контенту.          ║
 * ║  Nav position: fixed — hover не впливає на контент.                      ║
 * ║                                                                          ║
 * ║  📋 ЩО РОБИТЬ:                                                           ║
 * ║  ├── Сторінка: .content-main         → margin-left  = nav.offsetWidth   ║
 * ║  └── Модалки:  .modal-fullscreen-content → padding-left = nav.offsetWidth║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// ВНУТРІШНЯ ЛОГІКА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Знаходить контент-контейнер для даного nav.
 * Повертає { el, prop } або null.
 */
function getContentTarget(nav) {
    if (nav.id === 'main-nav') {
        const main = document.querySelector('.content-main');
        return main ? { el: main, prop: 'margin-left' } : null;
    }

    const parent = nav.closest('.modal-body-with-sidebar');
    if (parent) {
        const content = parent.querySelector('.modal-fullscreen-content');
        return content ? { el: content, prop: 'padding-left' } : null;
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// ПУБЛІЧНЕ API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🔌 ПЛАГІН — зсув контенту після завершення nav width transition.
 */
export function init() {
    document.addEventListener('transitionend', (e) => {
        if (e.propertyName !== 'width') return;

        const nav = e.target.closest('.nav.column');
        if (!nav) return;

        const target = getContentTarget(nav);
        if (!target) return;

        if (nav.classList.contains('expanded')) {
            target.el.style.setProperty(target.prop, nav.offsetWidth + 'px');
        } else {
            target.el.style.removeProperty(target.prop);
        }
    });
}
