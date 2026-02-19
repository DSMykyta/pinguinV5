// js/common/charms/table-controls.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE CONTROLS CHARM                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Декларативне авто-створення refresh кнопки та columns dropdown          ║
 * ║  на основі HTML атрибутів контейнера.                                    ║
 * ║                                                                          ║
 * ║  USAGE:                                                                  ║
 * ║  <div class="pseudo-table-container" refresh columns>                    ║
 * ║                                                                          ║
 * ║  refresh  → кнопка оновлення в .section-header .group                   ║
 * ║             dispatch charm:refresh з waitUntil патерном                  ║
 * ║  columns  → dropdown видимості колонок в .section-header .group          ║
 * ║             managed table авто-детектує через _charmColumnsListId        ║
 * ║                                                                          ║
 * ║  EVENTS:                                                                 ║
 * ║  charm:refresh — на контейнері, detail.waitUntil(promise)               ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { withSpinner } from './refresh-button.js';

// ═══════════════════════════════════════════════════════════════════════════
// CHARM DISCOVERY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Знайти всі [refresh] і [columns] контейнери в scope та ініціалізувати
 * @param {HTMLElement|Document} scope
 */
export function initTableControlsCharm(scope = document) {
    scope.querySelectorAll('.pseudo-table-container[refresh], .pseudo-table-container[columns]').forEach(container => {
        if (container._tableControlsInit) return;
        container._tableControlsInit = true;
        setupControls(container);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════

function setupControls(container) {
    const group = findToolbarGroup(container);
    if (!group) return;

    if (container.hasAttribute('refresh')) {
        setupRefreshButton(container, group);
    }
    if (container.hasAttribute('columns')) {
        setupColumnsDropdown(container, group);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// REFRESH BUTTON
// ═══════════════════════════════════════════════════════════════════════════

function setupRefreshButton(container, group) {
    const btn = document.createElement('button');
    btn.className = 'btn-icon';
    btn.setAttribute('aria-label', 'Оновити');
    btn.innerHTML = '<span class="material-symbols-outlined">refresh</span>';
    group.insertBefore(btn, group.firstChild);

    btn.addEventListener('click', () => withSpinner(btn, async () => {
        const promises = [];
        container.dispatchEvent(new CustomEvent('charm:refresh', {
            bubbles: true,
            detail: { waitUntil: (p) => promises.push(p) }
        }));
        await Promise.all(promises);
    }));
}

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS DROPDOWN
// ═══════════════════════════════════════════════════════════════════════════

function setupColumnsDropdown(container, group) {
    const wrapper = document.createElement('div');
    wrapper.className = 'dropdown-wrapper';

    const trigger = document.createElement('button');
    trigger.className = 'btn-icon';
    trigger.setAttribute('data-dropdown-trigger', '');
    trigger.setAttribute('aria-label', 'Колонки');
    trigger.innerHTML = '<span class="material-symbols-outlined">view_column</span>';

    const menu = document.createElement('div');
    menu.className = 'dropdown-menu dropdown-menu-right';

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

// ═══════════════════════════════════════════════════════════════════════════
// TOOLBAR GROUP DISCOVERY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Знайти .group в .section-header що відповідає контейнеру.
 * Якщо .group не існує — створити.
 */
function findToolbarGroup(container) {
    const parent = container.closest('.tab-content') || container.parentElement;
    const header = parent?.querySelector('.section-header');
    if (!header) return null;

    let group = header.querySelector(':scope > .group');
    if (!group) {
        group = document.createElement('div');
        group.className = 'group';
        header.appendChild(group);
    }
    return group;
}
