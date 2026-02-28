// js/components/charms/charm-search-clear.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    CHARM: SEARCH CLEAR BUTTON                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Document-level delegation. Один listener на весь додаток.             ║
 * ║                                                                        ║
 * ║  HTML:                                                                 ║
 * ║  <input type="text" id="search-keywords">                             ║
 * ║  <button data-clear-for="search-keywords" class="btn-icon u-hidden">  ║
 * ║    <span class="material-symbols-outlined">close</span>               ║
 * ║  </button>                                                             ║
 * ║                                                                        ║
 * ║  Клік на кнопку: очищує input, ховає кнопку, фокус на input.          ║
 * ║  Input event: показує/ховає кнопку залежно від вмісту.                ║
 * ║  Dispatch: new Event('input') — тригерить managedTable search.        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export function initSearchClearCharm() {
    // Click: clear input and hide button
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-clear-for]');
        if (!btn) return;

        const input = document.getElementById(btn.dataset.clearFor);
        if (!input) return;

        input.value = '';
        btn.classList.add('u-hidden');
        input.focus();
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Input: toggle button visibility
    document.addEventListener('input', (e) => {
        if (!e.target.id) return;
        const btn = document.querySelector(`[data-clear-for="${e.target.id}"]`);
        if (btn) btn.classList.toggle('u-hidden', !e.target.value.trim());
    });
}
