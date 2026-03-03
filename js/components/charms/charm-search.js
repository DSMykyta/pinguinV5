// js/components/charms/charm-search.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    SEARCH CHARM                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Декларативне авто-створення пошукового поля на основі HTML атрибутів.  ║
 * ║  Працює на .pseudo-table-container — аналогічно refresh/columns.       ║
 * ║                                                                          ║
 * ║  USAGE:                                                                  ║
 * ║  <div class="pseudo-table-container" search>                            ║
 * ║  <div class="pseudo-table-container" search="Пошук опцій...">          ║
 * ║                                                                          ║
 * ║  BEHAVIOR:                                                               ║
 * ║  1. Створює .input-box з іконкою search + input + clear button          ║
 * ║  2. Вставляє в .section-header .group як першу дитину                   ║
 * ║  3. Зберігає container._charmSearchInput для table-managed.js           ║
 * ║                                                                          ║
 * ║  TABLE INTEGRATION:                                                      ║
 * ║  table-managed.js автоматично підхоплює через:                          ║
 * ║    containerEl?._charmSearchInput                                        ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { findToolbarGroup } from './charm-refresh.js';

// ═══════════════════════════════════════════════════════════════════════════
// CHARM DISCOVERY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Знайти всі .pseudo-table-container[search] в scope та ініціалізувати
 * @param {HTMLElement|Document} scope
 */
export function initSearchCharm(scope = document) {
    scope.querySelectorAll('.pseudo-table-container[search]').forEach(container => {
        if (container._searchCharmInit) return;
        container._searchCharmInit = true;
        setupSearch(container);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════

let searchIdCounter = 0;

function setupSearch(container) {
    const group = findToolbarGroup(container);
    if (!group) return;

    const placeholder = container.getAttribute('search') || 'Пошук...';
    const inputId = `charm-search-${++searchIdCounter}`;

    // .input-box wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'input-box';

    // search icon
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = 'search';

    // input
    const input = document.createElement('input');
    input.type = 'text';
    input.id = inputId;
    input.placeholder = placeholder;

    wrapper.append(icon, input);
    group.insertBefore(wrapper, group.firstChild);

    // Store reference for table-managed.js auto-detection
    container._charmSearchInput = input;
    container.dispatchEvent(new CustomEvent('charm:search-ready'));
}
