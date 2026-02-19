// js/common/charms/charm-filter-pills.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    CHARM: FILTER PILLS                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Document-level delegation. Один listener на весь додаток.             ║
 * ║                                                                        ║
 * ║  HTML:                                                                 ║
 * ║  <div data-filter-group="paramType">                                   ║
 * ║    <button class="nav-icon active" data-filter-value="all">Всі</button>║
 * ║    <button class="nav-icon" data-filter-value="cat">Категорія</button> ║
 * ║  </div>                                                                ║
 * ║                                                                        ║
 * ║  Click: toggle .active (single-select).                                ║
 * ║  Dispatch на контейнер:                                                ║
 * ║    charm:filter { detail: { group, value } }                           ║
 * ║                                                                        ║
 * ║  Сторінка слухає:                                                      ║
 * ║  container.addEventListener('charm:filter', (e) => {                   ║
 * ║      state.filter = e.detail.value;                                    ║
 * ║      rerender();                                                       ║
 * ║  });                                                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export function initFilterPillsCharm() {
    document.addEventListener('click', (e) => {
        const pill = e.target.closest('[data-filter-value]');
        if (!pill) return;

        const group = pill.closest('[data-filter-group]');
        if (!group) return;

        // Single-select: deactivate all, activate clicked
        group.querySelectorAll('[data-filter-value]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        group.dispatchEvent(new CustomEvent('charm:filter', {
            bubbles: true,
            detail: {
                group: group.dataset.filterGroup,
                value: pill.dataset.filterValue
            }
        }));
    });
}
