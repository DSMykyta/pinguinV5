// js/pages/redirect-target/redirect-target-events.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   REDIRECT TARGET — EVENTS                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН (viewless) — Локальні події елементів сторінки                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export function init(state) {
    const { dom } = state;

    if (dom.btnAdd) {
        dom.btnAdd.addEventListener('click', () => {
            // Не пишемо логіку тут, просто кидаємо хук для інших плагінів
            state.runHook('onWillAddRecord');
        });
    }
}