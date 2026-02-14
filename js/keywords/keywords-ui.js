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
        <button class="nav-icon active" data-filter="all" data-filter-type="param_type">
            <span class="material-symbols-outlined">list</span>
            <span class="nav-icon-label">Всі</span>
        </button>
    `;

    PARAM_TYPES.forEach(type => {
        buttonsHTML += `
            <button class="nav-icon" data-filter="${type.value}" data-filter-type="param_type">
                <span class="material-symbols-outlined">${type.icon}</span>
                <span class="nav-icon-label">${type.label}</span>
            </button>
        `;
    });

    container.innerHTML = buttonsHTML;

    if (!keywordsState.paramTypeFilter) {
        keywordsState.paramTypeFilter = 'all';
    }

    const filterButtons = container.querySelectorAll('[data-filter-type="param_type"]');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;

            keywordsState.paramTypeFilter = filter;

            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            keywordsState.pagination.currentPage = 1;

            // refilter через managed table (preFilter читає paramTypeFilter)
            renderKeywordsTableRowsOnly();
        });
    });
}
