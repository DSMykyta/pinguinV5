// js/common/ui-tabs.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      ГЛОБАЛЬНИЙ ОБРОБНИК ВКЛАДОК                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * * ПРИЗНАЧЕННЯ:
 * Керує логікою перемикання вкладок (табів).
 * * * ЯК ЦЕ ПРАЦЮЄ:
 * 1. Шукає контейнер з атрибутом `data-tabs-container`.
 * 2. Всередині нього знаходить кнопки-тригери з `data-tab-target="tab-id"`.
 * 3. Також знаходить панелі контенту з `data-tab-content="tab-id"`.
 * 4. При кліку на тригер, ховає всі панелі та показує потрібну.
 * 5. Перша вкладка активується за замовчуванням.
 */

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

    // Деактивуємо весь контент (шукаємо глобально)
    document.querySelectorAll('.tab-content.is-active').forEach(content => {
        content.classList.remove('is-active');
    });

    // Активуємо потрібні
    selectedTab.classList.add('active');
    if (targetContent) {
        targetContent.classList.add('is-active');
    }
}