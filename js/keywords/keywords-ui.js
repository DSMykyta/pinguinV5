// js/keywords/keywords-ui.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - UI MANAGEMENT                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { keywordsState } from './keywords-init.js';
import { createColumnSelector } from '../common/ui-table-columns.js';
import { renderKeywordsTable } from './keywords-table.js';

export function populateSearchColumns() {
    const allSearchColumns = [
        { id: 'local_id', label: 'ID', checked: true },
        { id: 'param_type', label: 'Тип', checked: true },
        { id: 'parent_local_id', label: 'Батьківський елемент', checked: false },
        { id: 'characteristics_local_id', label: 'Характеристика', checked: false },
        { id: 'name_uk', label: 'Назва (UA)', checked: true },
        { id: 'name_ru', label: 'Назва (RU)', checked: true },
        { id: 'name_en', label: 'Назва (EN)', checked: false },
        { id: 'name_lat', label: 'Назва (LAT)', checked: false },
        { id: 'name_alt', label: 'Альтернативні назви', checked: false },
        { id: 'trigers', label: 'Тригери', checked: true },
        { id: 'keywords_ua', label: 'Ключові слова (UA)', checked: true },
        { id: 'keywords_ru', label: 'Ключові слова (RU)', checked: false }
    ];

    createColumnSelector('search-columns-list-keywords', allSearchColumns, {
        checkboxPrefix: 'search-col-keywords',
        filterBy: keywordsState.visibleColumns,
        onChange: (selectedIds) => {
            keywordsState.searchColumns = selectedIds;
            console.log('🔍 Колонки пошуку:', keywordsState.searchColumns);
        }
    });

    console.log('✅ Колонки пошуку заповнено');
}

export function populateTableColumns() {
    const tableColumns = [
        { id: 'local_id', label: 'ID', checked: true },
        { id: 'param_type', label: 'Тип', checked: true },
        { id: 'parent_local_id', label: 'Батьківський елемент', checked: false },
        { id: 'characteristics_local_id', label: 'Характеристика', checked: false },
        { id: 'name_uk', label: 'Назва (UA)', checked: true },
        { id: 'name_ru', label: 'Назва (RU)', checked: false },
        { id: 'name_en', label: 'Назва (EN)', checked: false },
        { id: 'name_lat', label: 'Назва (LAT)', checked: false },
        { id: 'name_alt', label: 'Альтернативні назви', checked: false },
        { id: 'trigers', label: 'Тригери', checked: true },
        { id: 'keywords_ua', label: 'Ключові слова (UA)', checked: true },
        { id: 'keywords_ru', label: 'Ключові слова (RU)', checked: false }
    ];

    const columnSelector = createColumnSelector('table-columns-list-keywords', tableColumns, {
        checkboxPrefix: 'table-col-keywords',
        onChange: async (selectedIds) => {
            keywordsState.visibleColumns = selectedIds;
            console.log('📋 Видимі колонки:', keywordsState.visibleColumns);

            populateSearchColumns();

            renderKeywordsTable();
        }
    });

    if (columnSelector) {
        keywordsState.visibleColumns = columnSelector.getSelected();
    }

    console.log('✅ Колонки таблиці заповнено');
}

/**
 * Ініціалізувати фільтри за типами (динамічно з даних)
 */
export function initParamTypeFilters() {
    const container = document.getElementById('param-type-filters');
    if (!container) {
        console.warn('⚠️ Контейнер фільтрів типів не знайдено');
        return;
    }

    // Отримати унікальні типи з даних
    const uniqueTypes = [...new Set(keywordsState.keywords.map(k => k.param_type).filter(Boolean))];

    // Іконки для типів
    const typeIcons = {
        'ingredient': 'science',
        'flavor': 'restaurant',
        'brand': 'shopping_bag',
        'category': 'category',
        'form': 'package_2',
        'other': 'more_horiz'
    };

    // Створити HTML для кнопок
    let buttonsHTML = `
        <button class="nav-icon active" data-filter="all" data-filter-type="param_type">
            <span class="material-symbols-outlined">list</span>
            <span class="nav-icon-label">Всі</span>
        </button>
    `;

    uniqueTypes.sort().forEach(type => {
        const icon = typeIcons[type] || 'label';
        const label = type.charAt(0).toUpperCase() + type.slice(1);
        buttonsHTML += `
            <button class="nav-icon" data-filter="${type}" data-filter-type="param_type">
                <span class="material-symbols-outlined">${icon}</span>
                <span class="nav-icon-label">${label}</span>
            </button>
        `;
    });

    container.innerHTML = buttonsHTML;

    // Встановити початковий фільтр
    if (!keywordsState.paramTypeFilter) {
        keywordsState.paramTypeFilter = 'all';
    }

    // Додати обробники подій
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
