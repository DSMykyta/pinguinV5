// js/keywords/keywords-ui.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - UI MANAGEMENT                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Column selectors тепер в createManagedTable (keywords-table.js).
 * Тут залишається тільки initParamTypeFilters.
 */

import { keywordsState } from './keywords-init.js';
import { renderKeywordsTableRowsOnly } from './keywords-table.js';

// Column selectors тепер в createManagedTable (keywords-table.js)
export function populateSearchColumns() {}
export function populateTableColumns() {}

// Фіксовані типи параметрів (порядок і іконки як в Mapper)
const PARAM_TYPES = [
    { value: 'category', label: 'Категорія', icon: 'square' },
    { value: 'characteristic', label: 'Характеристика', icon: 'change_history' },
    { value: 'option', label: 'Опція', icon: 'circle' },
    { value: 'marketing', label: 'Маркетинг', icon: 'sell' },
    { value: 'other', label: 'Інше', icon: 'star' }
];

/**
 * Ініціалізувати фільтри за типами (фіксовані типи)
 */
export function initParamTypeFilters() {
    const container = document.getElementById('param-type-filters-header');

    if (!container) {
        console.warn('⚠️ Контейнер фільтрів типів не знайдено');
        return;
    }

    // Створити HTML для кнопок
    let buttonsHTML = `
        <button class="btn-icon expand active" data-filter-value="all">
            <span class="material-symbols-outlined">list</span>
            <span class="btn-icon-label">Всі</span>
        </button>
    `;

    PARAM_TYPES.forEach(type => {
        buttonsHTML += `
            <button class="btn-icon expand" data-filter-value="${type.value}">
                <span class="material-symbols-outlined">${type.icon}</span>
                <span class="btn-icon-label">${type.label}</span>
            </button>
        `;
    });

    container.dataset.filterGroup = 'paramType';
    container.innerHTML = buttonsHTML;

    if (!keywordsState.paramTypeFilter) {
        keywordsState.paramTypeFilter = 'all';
    }

    // Charm filter-pills керує .active toggle, ми слухаємо charm:filter
    container.addEventListener('charm:filter', (e) => {
        keywordsState.paramTypeFilter = e.detail.value;
        renderKeywordsTableRowsOnly();
    });
}
