// js/entities/entities-init.js
// Головний ініціалізатор для системи управління сутностями

import { initCustomSelects } from '../common/ui-select.js';
import { initPagination } from '../common/ui-pagination.js';
import { initColumnVisibility } from '../common/ui-columns.js';
import { initGoogleAuth } from '../auth/google-auth.js';
import { loadAllEntitiesData, getMpColumns, getMarketplaces } from './entities-data.js';
import { renderTable } from './entities-render.js';
import { initEntityEvents } from './entities-events.js';
import { initMarketplaceAdmin } from './entities-marketplace-admin.js';
import { initSearchClear } from '../utils/search-clear.js';
import { initTooltips } from '../common/ui-tooltip.js';
import { initDropdowns } from '../common/ui-dropdown.js';

// Глобальний state для entities
export const entitiesState = {
    categories: [],
    characteristics: [],
    options: [],
    marketplaces: [],
    currentTab: 'tab-categories',
    selectedIds: new Set(),
    pagination: {
        'tab-categories': { currentPage: 1, pageSize: 25, totalItems: 0 },
        'tab-characteristics': { currentPage: 1, pageSize: 25, totalItems: 0 },
        'tab-options': { currentPage: 1, pageSize: 25, totalItems: 0 }
    },
    paginationInstances: {} // Зберігаємо інстанси пагінації для кожного табу
};

export function initEntities() {
    console.log('📋 Ініціалізація Entities...');

    // 0. Ініціалізувати tooltips
    initTooltips();

    // 1. Завантажити aside-entities.html в праву панель
    loadAsideEntities();

    // 2. Ініціалізувати UI компоненти
    initCustomSelects();
    initColumnVisibility(
        document.querySelector('#columns-visibility-container'),
        document.querySelector('.tab-content.active'),
        {
            storageKey: 'entities-column-visibility',
            onColumnToggle: (columnName, isVisible) => {
                console.log(`Column ${columnName}: ${isVisible ? 'shown' : 'hidden'}`);
            }
        }
    );

    // 3. Ініціалізувати пагінацію для футера
    const footer = document.querySelector('.fixed-footer');
    if (footer) {
        const paginationInstance = initPagination(footer, {
            currentPage: 1,
            pageSize: 25,
            totalItems: 0,
            onPageChange: (page, pageSize) => {
                const currentTab = entitiesState.currentTab;
                entitiesState.pagination[currentTab].currentPage = page;
                entitiesState.pagination[currentTab].pageSize = pageSize;
                renderTable(currentTab);
            }
        });
        entitiesState.paginationInstances[entitiesState.currentTab] = paginationInstance;
    }

    // 4. Ініціалізувати обробники подій (таби, кнопки, тощо)
    initEntityEvents();

    // 5. Ініціалізувати адмін-панель маркетплейсів
    initMarketplaceAdmin();

    // 6. Ініціалізувати Google Auth з callback для завантаження даних
    initGoogleAuth(() => {
        console.log('✅ Google Auth готова, завантажуємо дані...');
        loadAllEntitiesData().then(() => {
            console.log('✅ Дані завантажені');
            // Відобразити початковий таб (categories)
            renderTable('tab-categories');
        }).catch(error => {
            console.error('❌ Помилка завантаження даних:', error);
        });
    });
}

function loadAsideEntities() {
    const panelRightContent = document.getElementById('panel-right-content');
    if (!panelRightContent) return;

    fetch('templates/aside/aside-entities.html')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load aside-entities.html');
            return response.text();
        })
        .then(html => {
            panelRightContent.innerHTML = html;
            console.log('✅ aside-entities.html завантажено');

            // Ініціалізувати dropdowns після завантаження aside
            initDropdowns();

            // Ініціалізувати базові чекбокси колонок після завантаження aside
            setupColumnCheckboxes('tab-categories');

            // Ініціалізувати пошук
            setupSearch();
        })
        .catch(error => {
            console.error('❌ Помилка завантаження aside-entities.html:', error);
        });
}

function setupColumnCheckboxes(entityType) {
    const columnsBase = document.getElementById('columns-base');
    const columnsMp = document.getElementById('columns-marketplaces');

    if (!columnsBase || !columnsMp) return;

    // ===== БАЗОВІ КОЛОНКИ =====
    const baseColumns = getBaseColumns(entityType);
    columnsBase.innerHTML = '<h4>Базові поля</h4><div class="aside-list"></div>';
    const baseList = columnsBase.querySelector('.aside-list');

    baseColumns.forEach(col => {
        const btn = createColumnButton(col.name, col.label, col.visible, entityType);
        baseList.appendChild(btn);
    });

    // ===== COMPUTED КОЛОНКИ =====
    const computedColumns = getComputedColumns(entityType);
    if (computedColumns.length > 0) {
        const separator = document.createElement('div');
        separator.className = 'separator-thin';
        separator.style.margin = '8px 0';
        baseList.appendChild(separator);

        computedColumns.forEach(col => {
            const btn = createColumnButton(col.name, col.label, col.visible, entityType);
            baseList.appendChild(btn);
        });
    }

    // ===== МАРКЕТПЛЕЙС КОЛОНКИ (ДИНАМІЧНІ!) =====
    columnsMp.innerHTML = '';

    const marketplaces = getMarketplaces();
    const entityTypeCap = entityType.charAt(0).toUpperCase() + entityType.slice(1);

    marketplaces.forEach(mp => {
        // Підтримка різних назв колонок з Google Sheets
        const mpId = mp.marketplace_id || mp.mp_id;
        const mpName = mp.display_name || mp.mp_name || mpId;

        // Отримати колонки для цього МП та entityType з MP_Columns_Meta
        const mpColumns = getMpColumns(mpId, entityTypeCap);

        if (mpColumns.length === 0) return; // Пропустити якщо немає колонок

        // Створити групу для кожного МП
        const separator = document.createElement('div');
        separator.className = 'separator';
        columnsMp.appendChild(separator);

        const mpGroup = document.createElement('div');
        mpGroup.className = 'column-group';

        const title = document.createElement('h4');
        title.textContent = mpName;
        mpGroup.appendChild(title);

        const mpList = document.createElement('div');
        mpList.className = 'aside-list';

        mpColumns.forEach(colMeta => {
            const btn = createColumnButton(
                colMeta.column_name,
                colMeta.display_name,
                true, // за замовчуванням видимі
                entityType
            );
            mpList.appendChild(btn);
        });

        mpGroup.appendChild(mpList);
        columnsMp.appendChild(mpGroup);
    });
}

// Допоміжні функції
function getBaseColumns(entityType) {
    const configs = {
        categories: [
            { name: 'local_id', label: 'ID', visible: true },
            { name: 'parent_name', label: 'Батьківська', visible: true },
            { name: 'name_uk', label: 'Назва UA', visible: true },
            { name: 'name_ru', label: 'Назва RU', visible: false },
            { name: 'category_type', label: 'Тип', visible: true }
        ],
        characteristics: [
            { name: 'local_id', label: 'ID', visible: true },
            { name: 'name_uk', label: 'Назва UA', visible: true },
            { name: 'category_names', label: 'Категорії', visible: true },
            { name: 'param_type', label: 'Тип параметра', visible: true },
            { name: 'is_global', label: 'Глобальна', visible: true }
        ],
        options: [
            { name: 'local_id', label: 'ID', visible: true },
            { name: 'char_name', label: 'Характеристика', visible: true },
            { name: 'name_uk', label: 'Назва UA', visible: true },
            { name: 'name_ru', label: 'Назва RU', visible: false }
        ]
    };

    return configs[entityType] || [];
}

function getComputedColumns(entityType) {
    if (entityType === 'categories') {
        return [
            { name: 'level', label: 'Рівень (LVL)', visible: true },
            { name: 'children_count', label: 'Дітей', visible: true }
        ];
    }

    if (entityType === 'characteristics') {
        return [
            { name: 'option_count', label: 'Опцій', visible: true }
        ];
    }

    return [];
}

function createColumnButton(columnName, displayName, isActive, entityType) {
    // Перевірити збережений стан з localStorage
    const savedVisibility = getColumnVisibility(entityType, columnName);
    const isVisible = savedVisibility !== null ? savedVisibility : isActive;

    const btn = document.createElement('button');
    btn.className = 'aside-item' + (isVisible ? ' active' : '');
    btn.dataset.column = columnName;

    const span = document.createElement('span');
    span.className = 'aside-link-text';
    span.textContent = displayName;

    btn.appendChild(span);

    // Застосувати видимість колонки одразу
    toggleColumnVisibility(columnName, isVisible);

    // Toggle при кліку
    btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        const visible = btn.classList.contains('active');
        toggleColumnVisibility(columnName, visible);
        saveColumnVisibility(entityType, columnName, visible);
    });

    return btn;
}

function toggleColumnVisibility(columnName, visible) {
    const cells = document.querySelectorAll(`[data-column="${columnName}"]`);
    cells.forEach(cell => {
        if (cell.tagName === 'BUTTON') return; // Пропустити кнопки (це ми самі)
        cell.classList.toggle('u-hidden', !(visible));
    });
}

function getColumnVisibility(entityType, columnName) {
    const storageKey = `entities-column-visibility-${entityType}`;
    const saved = localStorage.getItem(storageKey);
    if (!saved) return null;

    try {
        const data = JSON.parse(saved);
        return data[columnName];
    } catch (e) {
        return null;
    }
}

function saveColumnVisibility(entityType, columnName, visible) {
    const storageKey = `entities-column-visibility-${entityType}`;
    let data = {};

    const saved = localStorage.getItem(storageKey);
    if (saved) {
        try {
            data = JSON.parse(saved);
        } catch (e) {
            // Ignore
        }
    }

    data[columnName] = visible;
    localStorage.setItem(storageKey, JSON.stringify(data));
}

function setupSearch() {
    const searchInput = document.getElementById('entity-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        filterTableByQuery(query);
    });

    // Ініціалізація кнопки очищення пошуку
    initSearchClear('entity-search-input');
}

function filterTableByQuery(query) {
    const currentTab = entitiesState.currentTab;
    const tableBody = document.querySelector(`[data-tab-content="${currentTab}"] .pseudo-table-body`);
    if (!tableBody) return;

    const rows = tableBody.querySelectorAll('.pseudo-table-row');
    let visibleCount = 0;

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const matches = query === '' || text.includes(query);
        row.classList.toggle('u-hidden', !(matches));
        if (matches) visibleCount++;
    });

    // Оновити статистику
    updateStats(visibleCount);
}

function updateStats(visibleCount = null) {
    const currentTab = entitiesState.currentTab;
    const entityType = currentTab.replace('tab-', ''); // tab-categories -> categories
    const totalItems = entitiesState[entityType]?.length || 0;
    const selectedCount = entitiesState.selectedIds.size;

    const statsTotal = document.getElementById('stats-total');
    const statsSelected = document.getElementById('stats-selected');

    if (statsTotal) {
        statsTotal.textContent = `Всього: ${visibleCount !== null ? visibleCount : totalItems}`;
    }
    if (statsSelected) {
        statsSelected.textContent = `Вибрано: ${selectedCount}`;
    }
}

// Експортуємо функції для використання в інших модулях
export { setupColumnCheckboxes, updateStats };
