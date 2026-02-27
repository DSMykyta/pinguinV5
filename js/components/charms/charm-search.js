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

    // search icon button (ghost — без фону)
    const iconBtn = document.createElement('button');
    iconBtn.type = 'button';
    iconBtn.className = 'btn-icon ghost';
    iconBtn.setAttribute('aria-label', 'Пошук');
    iconBtn.innerHTML = '<span class="material-symbols-outlined">search</span>';

    // input
    const input = document.createElement('input');
    input.type = 'text';
    input.id = inputId;
    input.placeholder = placeholder;

    // clear button (data-clear-for — підхоплюється charm-search-clear.js)
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn-icon u-hidden';
    clearBtn.setAttribute('data-clear-for', inputId);
    clearBtn.setAttribute('aria-label', 'Очистити пошук');
    clearBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';

    wrapper.append(iconBtn, input, clearBtn);
    group.insertBefore(wrapper, group.firstChild);

    // Store reference for table-managed.js auto-detection
    container._charmSearchInput = input;
}
