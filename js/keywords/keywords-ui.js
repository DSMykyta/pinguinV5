// js/keywords/keywords-ui.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - UI MANAGEMENT                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { keywordsState } from './keywords-init.js';
import { setupSearchColumnsSelector, setupTableColumnsSelector } from '../common/ui-table-columns.js';
import { renderKeywordsTable, getColumns } from './keywords-table.js';

/**
 * Заповнити колонки для пошуку в aside
 * Використовує універсальну функцію setupSearchColumnsSelector
 */
export function populateSearchColumns() {
    setupSearchColumnsSelector({
        containerId: 'search-columns-list-keywords',
        getColumns,
        state: keywordsState,
        checkboxPrefix: 'search-col-keywords'
    });
}

/**
 * Заповнити колонки таблиці в dropdown
 * Використовує універсальну функцію setupTableColumnsSelector
 */
export function populateTableColumns() {
    setupTableColumnsSelector({
        containerId: 'table-columns-list-keywords',
        getColumns,
        state: keywordsState,
        checkboxPrefix: 'keywords-col',
        searchColumnsContainerId: 'search-columns-list-keywords',
        onVisibilityChange: async (selectedIds) => {
            // Оновити visible columns в tableAPI якщо він існує
            if (keywordsState.tableAPI) {
                keywordsState.tableAPI.setVisibleColumns(selectedIds);
            }
            // Перемальовати таблицю
            renderKeywordsTable();
        }
    });
}

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

    // Заповнити контейнер
    container.innerHTML = buttonsHTML;

    // Встановити початковий фільтр
    if (!keywordsState.paramTypeFilter) {
        keywordsState.paramTypeFilter = 'all';
    }

    // Додати обробники подій для всіх кнопок
    const filterButtons = container.querySelectorAll('[data-filter-type="param_type"]');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;

            // Оновити стан фільтру
            keywordsState.paramTypeFilter = filter;

            // Оновити UI активних кнопок
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Скинути сторінку на першу
            keywordsState.pagination.currentPage = 1;

            // Перерендерити таблицю з новим фільтром
            renderKeywordsTable();

        });
    });

}
