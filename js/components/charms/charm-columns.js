// js/components/charms/charm-columns.js

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
import { initDropdowns } from '../forms/dropdown.js';

// ═══════════════════════════════════════════════════════════════════════════
// CHARM DISCOVERY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Знайти всі .pseudo-table-container[columns] в scope та ініціалізувати
 * @param {HTMLElement|Document} scope
 */
export function initColumnsCharm(scope = document) {
    const containers = scope.querySelectorAll('.pseudo-table-container[columns]');
    console.log(`[charm-columns] initColumnsCharm: знайдено ${containers.length} контейнерів`, containers);
    containers.forEach(container => {
        if (container._columnsCharmInit) {
            console.log(`[charm-columns] ⏭ ${container.id} — вже ініціалізовано, пропуск`);
            return;
        }
        container._columnsCharmInit = true;
        console.log(`[charm-columns] ▶ ініціалізація ${container.id}`);
        setupColumnsDropdown(container);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS DROPDOWN
// ═══════════════════════════════════════════════════════════════════════════

function setupColumnsDropdown(container) {
    const group = findToolbarGroup(container);
    if (!group) {
        console.warn(`[charm-columns] ✗ toolbar group не знайдено для ${container.id}`);
        return;
    }
    console.log(`[charm-columns] ✓ toolbar group знайдено для ${container.id}`, group);

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

    // Ініціалізувати dropdown (бо він створений динамічно після initDropdowns)
    initDropdowns(wrapper);
    console.log(`[charm-columns] ✓ dropdown створено та ініціалізовано для ${container.id}, listId=${body.id}`);
}
