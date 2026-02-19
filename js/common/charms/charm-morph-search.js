// js/common/charms/charm-morph-search.js

/**
 * CHARM: Morph Search
 *
 * Кругла кнопка 44×44 → розгортається в інпут 360px.
 * Document-level delegation, auto-discovery.
 *
 * HTML:
 * <div class="morph-search">
 *   <button class="morph-search-btn" aria-label="Пошук">
 *     <span class="material-symbols-outlined">search</span>
 *   </button>
 *   <div class="morph-search-field">
 *     <span class="material-symbols-outlined">search</span>
 *     <input type="text" placeholder="Пошук...">
 *     <button class="morph-search-close" aria-label="Закрити">
 *       <span class="material-symbols-outlined">close</span>
 *     </button>
 *   </div>
 * </div>
 */

export function initMorphSearchCharm() {

    // Open
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.morph-search-btn');
        if (!btn) return;
        const morph = btn.closest('.morph-search');
        if (!morph || morph.classList.contains('is-open')) return;

        morph.classList.add('is-open');
        const input = morph.querySelector('input');
        if (input) setTimeout(() => input.focus(), 350);
    });

    // Close
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.morph-search-close');
        if (!btn) return;
        const morph = btn.closest('.morph-search');
        if (!morph) return;
        closeMorphSearch(morph);
    });

    // Escape
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const morph = document.querySelector('.morph-search.is-open');
        if (!morph) return;
        closeMorphSearch(morph);
    });
}

function closeMorphSearch(morph) {
    morph.classList.remove('is-open');
    const input = morph.querySelector('input');
    if (input && input.value) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
}
