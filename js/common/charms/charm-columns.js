// js/common/charms/charm-columns.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    COLUMNS CHARM                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Декларативне авто-створення columns dropdown                            ║
 * ║  на основі HTML атрибуту [columns] на .pseudo-table-container.           ║
 * ║                                                                          ║
 * ║  USAGE:                                                                  ║
 * ║  <div class="pseudo-table-container" columns>                            ║
 * ║                                                                          ║
 * ║  columns → dropdown видимості колонок в .section-header .group           ║
 * ║            managed table авто-детектує через _charmColumnsListId         ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { findToolbarGroup } from './charm-refresh.js';

// ═══════════════════════════════════════════════════════════════════════════
// CHARM DISCOVERY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Знайти всі .pseudo-table-container[columns] в scope та ініціалізувати
 * @param {HTMLElement|Document} scope
 */
export function initColumnsCharm(scope = document) {
    scope.querySelectorAll('.pseudo-table-container[columns]').forEach(container => {
        if (container._columnsCharmInit) return;
        container._columnsCharmInit = true;
        setupColumnsDropdown(container);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS DROPDOWN
// ═══════════════════════════════════════════════════════════════════════════

function setupColumnsDropdown(container) {
    const group = findToolbarGroup(container);
    if (!group) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'dropdown-wrapper';

    const trigger = document.createElement('button');
    trigger.className = 'btn-icon';
    trigger.setAttribute('data-dropdown-trigger', '');
    trigger.setAttribute('aria-label', 'Колонки');
    trigger.innerHTML = '<span class="material-symbols-outlined">view_column</span>';

    const menu = document.createElement('div');
    menu.className = 'dropdown-panel';

    const header = document.createElement('div');
    header.className = 'dropdown-header';
    header.textContent = 'Показати колонки';

    const body = document.createElement('div');
    body.className = 'dropdown-body';
    body.id = `${container.id}-columns-list`;

    menu.append(header, body);
    wrapper.append(trigger, menu);
    group.appendChild(wrapper);

    container._charmColumnsListId = body.id;
}
