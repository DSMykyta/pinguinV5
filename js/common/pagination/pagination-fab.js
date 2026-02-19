// js/common/pagination/pagination-fab.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PAGINATION LEGO — FAB PLUGIN                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — FAB page-size selector (кругла кнопка з меню розмірів)     ║
 * ║  Можна видалити — пагінація працюватиме без зміни розміру сторінки.     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const DEFAULT_SIZES = [10, 25, 50, 100, 999999];
const SIZE_LABELS = { 999999: 'Всі' };

/**
 * Ініціалізувати FAB page-size selector
 * Якщо в контейнері вже є .page-size-selector — підключається до нього.
 * Якщо нема — створює новий.
 *
 * @param {HTMLElement} container - .pagination-container
 * @param {number} currentSize - Поточний розмір сторінки
 * @param {Function} onChange - Callback(newSize) при зміні
 * @returns {{ updateLabel: Function }}
 */
export function initFab(container, currentSize, onChange) {
    let selector = container.querySelector('.page-size-selector');

    if (!selector) {
        selector = createFabElement(currentSize);
        container.appendChild(selector);
    }

    // Click delegation
    selector.addEventListener('click', (e) => {
        if (e.target.closest('.page-size-trigger')) {
            selector.classList.toggle('is-open');
        }

        const option = e.target.closest('.page-size-option');
        if (option) {
            const newSize = parseInt(option.dataset.pageSize);
            selector.classList.remove('is-open');
            if (newSize !== currentSize) {
                currentSize = newSize;
                onChange(newSize);
            }
        }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!selector.contains(e.target)) {
            selector.classList.remove('is-open');
        }
    });

    return {
        updateLabel(size) {
            currentSize = size;
            const label = selector.querySelector('.page-size-label, #page-size-label');
            if (label) label.textContent = size > 1000 ? 'Всі' : size;
        }
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL
// ═══════════════════════════════════════════════════════════════════════════

function createFabElement(currentSize) {
    const selector = document.createElement('div');
    selector.className = 'page-size-selector';

    const trigger = document.createElement('button');
    trigger.className = 'page-size-trigger';
    trigger.setAttribute('aria-label', 'Кількість на сторінці');
    trigger.innerHTML = `<span class="page-size-label">${currentSize > 1000 ? 'Всі' : currentSize}</span>`;
    selector.appendChild(trigger);

    const menu = document.createElement('div');
    menu.className = 'page-size-menu';
    DEFAULT_SIZES.forEach(size => {
        const btn = document.createElement('button');
        btn.className = 'page-size-option';
        btn.dataset.pageSize = size;
        btn.textContent = SIZE_LABELS[size] || size;
        menu.appendChild(btn);
    });
    selector.appendChild(menu);

    return selector;
}
