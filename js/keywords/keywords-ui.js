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
    console.log('✅ Колонки пошуку заповнено');
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
            // Перемальовати таблицю
            renderKeywordsTable();
        }
    });
    console.log('✅ Колонки таблиці заповнено');
}

/**
 * Ініціалізувати фільтри за типами (динамічно з даних)
 */
export function initParamTypeFilters() {
    const container = document.getElementById('param-type-filters-header');

    if (!container) {
        console.warn('⚠️ Контейнер фільтрів типів не знайдено');
        return;
    }

    // Отримати унікальні типи з даних
    const uniqueTypes = [...new Set(keywordsState.keywords.map(k => k.param_type).filter(Boolean))];

    // Створити HTML для кнопок
    let buttonsHTML = `
        <button class="nav-icon active" data-filter="all" data-filter-type="param_type">
            <span class="material-symbols-outlined">list</span>
            <span class="nav-icon-label">Всі</span>
        </button>
    `;

    uniqueTypes.sort().forEach(type => {
        const label = type.charAt(0).toUpperCase() + type.slice(1);
        buttonsHTML += `
            <button class="nav-icon" data-filter="${type}" data-filter-type="param_type">
                <span class="material-symbols-outlined">label</span>
                <span class="nav-icon-label">${label}</span>
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

            console.log(`🔎 Фільтр за типом застосовано: "${filter}"`);
        });
    });

    console.log('✅ Фільтри типів ініціалізовано');
}
