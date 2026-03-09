// js/layout/layout-plugin-nav-tabs.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                        СИСТЕМА ВКЛАДОК (TABS)                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Перемикає вкладки по кліку. Використовує data-атрибути.                 ║
 * ║                                                                          ║
 * ║  📋 HTML СТРУКТУРА:                                                      ║
 * ║  <div data-tabs-container>                                               ║
 * ║    <button data-tab-target="tab-id">...</button>   ← тригер             ║
 * ║  </div>                                                                  ║
 * ║  <div data-tab-content="tab-id">...</div>          ← контент            ║
 * ║                                                                          ║
 * ║  📋 ПРАВИЛА:                                                             ║
 * ║  ├── Перша вкладка активується автоматично                               ║
 * ║  ├── Активний тригер отримує клас .active                                ║
 * ║  ├── Активний контент отримує клас .active                               ║
 * ║  └── При перемиканні — custom event `tab-switched` на контейнері         ║
 * ║                                                                          ║
 * ║  🎯 ВИКОРИСТАННЯ:                                                        ║
 * ║  import { initTabs } from './layout/layout-main.js';                     ║
 * ║  initTabs();           // для всього документа                           ║
 * ║  initTabs(container);  // лише всередині контейнера (напр. модал)        ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// ПУБЛІЧНЕ API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізує вкладки всередині заданого контейнера.
 * Використовує делегування подій для підтримки динамічних табів.
 * @param {HTMLElement} container - DOM-елемент, в якому шукати вкладки (за замовчуванням document).
 */
export function initTabs(container = document) {
    const tabContainers = container.querySelectorAll('[data-tabs-container]');

    tabContainers.forEach(tabContainer => {
        // Активуємо першу вкладку за замовчуванням
        const firstTab = tabContainer.querySelector('[data-tab-target]');
        if (firstTab) {
            activateTab(firstTab);
        }

        // Використовуємо делегування подій для підтримки динамічних табів
        tabContainer.addEventListener('click', (e) => {
            const clickedTab = e.target.closest('[data-tab-target]');
            if (!clickedTab) return;

            e.preventDefault();
            activateTab(clickedTab);
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// ВНУТРІШНЯ ЛОГІКА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Активує вибрану вкладку та її контент.
 * @param {HTMLElement} selectedTab - Елемент вкладки, яку натиснули.
 */
function activateTab(selectedTab) {
    const targetId = selectedTab.dataset.tabTarget;
    const targetContent = document.querySelector(`[data-tab-content="${targetId}"]`);

    // Деактивуємо всі вкладки в тому самому контейнері
    const tabContainer = selectedTab.closest('[data-tabs-container]');
    if (tabContainer) {
        tabContainer.querySelectorAll('[data-tab-target]').forEach(t => t.classList.remove('active'));
    }

    // Деактивуємо весь контент + pagination charms
    document.querySelectorAll('[data-tab-content]').forEach(content => {
        content.classList.remove('active');
        content.querySelectorAll('.pseudo-table-container').forEach(c => {
            c._paginationCharm?.deactivate();
        });
    });

    // Активуємо потрібні + pagination charms
    selectedTab.classList.add('active');
    if (targetContent) {
        targetContent.classList.add('active');
        targetContent.querySelectorAll('.pseudo-table-container').forEach(c => {
            c._paginationCharm?.activate();
        });
    }

    // Custom event для page-specific логіки (state, hooks, lazy load)
    if (tabContainer) {
        tabContainer.dispatchEvent(new CustomEvent('tab-switched', {
            detail: { tabId: targetId },
            bubbles: true
        }));
    }
}
