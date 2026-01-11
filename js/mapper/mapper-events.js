// js/mapper/mapper-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - EVENT HANDLERS                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Обробники подій для Marketplace Mapper.
 */

import { mapperState } from './mapper-init.js';
import { renderCurrentTab } from './mapper-table.js';
import { loadMapperData } from './mapper-data.js';
import { createColumnSelector } from '../common/ui-table-columns.js';

/**
 * Конфігурація колонок для кожного табу
 */
const columnConfigs = {
    categories: [
        { id: 'id', label: 'ID', checked: true },
        { id: 'name_ua', label: 'Назва UA', checked: true },
        { id: 'name_ru', label: 'Назва RU', checked: false },
        { id: 'parent_id', label: 'Батьківська', checked: true }
    ],
    characteristics: [
        { id: 'id', label: 'ID', checked: true },
        { id: 'name_ua', label: 'Назва UA', checked: true },
        { id: 'name_ru', label: 'Назва RU', checked: false },
        { id: 'type', label: 'Тип', checked: true },
        { id: 'is_global', label: 'Глобальна', checked: true },
        { id: 'unit', label: 'Одиниця', checked: false },
        { id: 'category_ids', label: 'Категорії', checked: false }
    ],
    options: [
        { id: 'id', label: 'ID', checked: true },
        { id: 'characteristic_id', label: 'Характеристика', checked: true },
        { id: 'value_ua', label: 'Значення UA', checked: true },
        { id: 'value_ru', label: 'Значення RU', checked: false },
        { id: 'sort_order', label: 'Порядок', checked: false }
    ],
    marketplaces: [
        { id: 'id', label: 'ID', checked: true },
        { id: 'name', label: 'Назва', checked: true },
        { id: 'slug', label: 'Slug', checked: true },
        { id: 'is_active', label: 'Активний', checked: true }
    ],
    'mp-categories': [
        { id: 'external_id', label: 'ID', checked: true },
        { id: 'name', label: 'Назва', checked: true },
        { id: 'parent_id', label: 'Батьківська ID', checked: false },
        { id: 'parent_name', label: 'Батьківська', checked: true },
        { id: 'our_cat_id', label: 'Наша категорія', checked: true }
    ],
    'mp-characteristics': [
        { id: 'external_id', label: 'ID', checked: true },
        { id: 'name', label: 'Назва', checked: true },
        { id: 'type', label: 'Тип', checked: true },
        { id: 'unit', label: 'Одиниця', checked: false },
        { id: 'category_name', label: 'Категорія MP', checked: false },
        { id: 'our_char_id', label: 'Наша характ.', checked: true }
    ],
    'mp-options': [
        { id: 'external_id', label: 'ID', checked: true },
        { id: 'name', label: 'Назва', checked: true },
        { id: 'char_id', label: 'Характеристика', checked: true },
        { id: 'our_option_id', label: 'Наша опція', checked: true }
    ]
};

/**
 * Ініціалізувати всі обробники подій
 */
export function initMapperEvents() {
    console.log('📋 Ініціалізація обробників подій Mapper...');

    // Кнопки оновлення табів
    initRefreshButtons();

    // Кнопки додавання
    initAddButtons();

    // Кнопка імпорту
    initImportButton();

    // Фільтри
    initFilterPills();

    // Селектори колонок
    initColumnSelectors();

    console.log('✅ Обробники подій Mapper ініціалізовано');
}

/**
 * Ініціалізувати селектори колонок для всіх табів
 */
function initColumnSelectors() {
    const tabs = ['categories', 'characteristics', 'options', 'marketplaces', 'mp-categories', 'mp-characteristics', 'mp-options'];

    tabs.forEach(tab => {
        const containerId = `table-columns-list-mapper-${tab}`;
        const columns = columnConfigs[tab];

        if (!columns) return;

        // Встановити початкові видимі колонки зі стану
        const initialVisible = mapperState.visibleColumns[tab] || columns.filter(c => c.checked).map(c => c.id);
        const columnsWithState = columns.map(col => ({
            ...col,
            checked: initialVisible.includes(col.id)
        }));

        createColumnSelector(containerId, columnsWithState, {
            checkboxPrefix: `mapper-${tab}-col`,
            onChange: (selectedIds) => {
                mapperState.visibleColumns[tab] = selectedIds;
                renderCurrentTab();
            }
        });
    });

    console.log('✅ Селектори колонок ініціалізовано');
}

/**
 * Ініціалізувати пошук
 */
export function initMapperSearch(searchInput) {
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        mapperState.searchQuery = e.target.value.toLowerCase();
        mapperState.pagination.currentPage = 1;
        renderCurrentTab();
    });

    // Enter для пошуку
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            renderCurrentTab();
        }
    });

    console.log('✅ Пошук ініціалізовано');
}

/**
 * Ініціалізувати кнопки оновлення
 */
function initRefreshButtons() {
    const tabs = ['categories', 'characteristics', 'options', 'marketplaces', 'mp-categories', 'mp-characteristics', 'mp-options'];

    tabs.forEach(tab => {
        const btn = document.getElementById(`refresh-tab-mapper-${tab}`);
        if (btn) {
            btn.addEventListener('click', async () => {
                console.log(`🔄 Оновлення табу ${tab}...`);

                // Показати стан завантаження
                btn.disabled = true;
                btn.querySelector('.material-symbols-outlined').classList.add('spinning');

                try {
                    // Для MP табів завантажуємо відповідні дані
                    if (tab.startsWith('mp-')) {
                        const { loadMpCategories, loadMpCharacteristics, loadMpOptions } = await import('./mapper-data.js');
                        if (tab === 'mp-categories') await loadMpCategories();
                        else if (tab === 'mp-characteristics') await loadMpCharacteristics();
                        else if (tab === 'mp-options') await loadMpOptions();
                    } else {
                        await loadMapperData();
                    }
                    renderCurrentTab();
                } catch (error) {
                    console.error(`❌ Помилка оновлення табу ${tab}:`, error);
                } finally {
                    btn.disabled = false;
                    btn.querySelector('.material-symbols-outlined').classList.remove('spinning');
                }
            });
        }
    });
}

/**
 * Ініціалізувати кнопки додавання
 */
function initAddButtons() {
    // Категорії
    const addCategoryBtn = document.getElementById('btn-add-mapper-category');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', async () => {
            const { showAddCategoryModal } = await import('./mapper-crud.js');
            showAddCategoryModal();
        });
    }

    // Характеристики
    const addCharacteristicBtn = document.getElementById('btn-add-mapper-characteristic');
    if (addCharacteristicBtn) {
        addCharacteristicBtn.addEventListener('click', async () => {
            const { showAddCharacteristicModal } = await import('./mapper-crud.js');
            showAddCharacteristicModal();
        });
    }

    // Опції
    const addOptionBtn = document.getElementById('btn-add-mapper-option');
    if (addOptionBtn) {
        addOptionBtn.addEventListener('click', async () => {
            const { showAddOptionModal } = await import('./mapper-crud.js');
            showAddOptionModal();
        });
    }

    // Маркетплейси
    const addMarketplaceBtn = document.getElementById('btn-add-mapper-marketplace');
    if (addMarketplaceBtn) {
        addMarketplaceBtn.addEventListener('click', async () => {
            const { showAddMarketplaceModal } = await import('./mapper-crud.js');
            showAddMarketplaceModal();
        });
    }
}

/**
 * Ініціалізувати кнопку імпорту
 */
function initImportButton() {
    const importBtn = document.getElementById('btn-import-mapper');
    if (importBtn) {
        importBtn.addEventListener('click', async () => {
            const { showImportModal } = await import('./mapper-crud.js');
            showImportModal();
        });
    }
}

/**
 * Ініціалізувати фільтр-кнопки
 */
function initFilterPills() {
    const containers = [
        'filter-pills-mapper-characteristics',
        'filter-pills-mapper-options',
        'filter-pills-mapper-mp-categories',
        'filter-pills-mapper-mp-characteristics',
        'filter-pills-mapper-mp-options'
    ];

    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (!container) return;

        const buttons = container.querySelectorAll('.nav-icon[data-filter]');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Прибрати active з усіх
                buttons.forEach(b => b.classList.remove('active'));

                // Додати active до поточного
                btn.classList.add('active');

                // Отримати значення фільтра
                const filter = btn.dataset.filter;
                const tabId = btn.dataset.tabId;
                const tabName = tabId.replace('tab-mapper-', '');

                // Оновити стан
                mapperState.filters[tabName] = filter;
                mapperState.pagination.currentPage = 1;

                // Перерендерити
                renderCurrentTab();

                console.log(`📋 Фільтр ${tabName}: ${filter}`);
            });
        });
    });

    // Ініціалізувати фільтри маркетплейсу для MP табів
    initMpMarketplaceFilters();
}

/**
 * Ініціалізувати фільтри маркетплейсу для MP табів
 */
function initMpMarketplaceFilters() {
    const mpTabs = ['categories', 'characteristics', 'options'];

    mpTabs.forEach(tab => {
        const select = document.getElementById(`mp-filter-${tab}`);
        if (!select) return;

        // Заповнити список маркетплейсів
        populateMpFilterDropdown(select);

        // Обробник зміни
        select.addEventListener('change', async () => {
            const marketplaceId = select.value;
            mapperState.mpSelectedMarketplace[`mp-${tab}`] = marketplaceId || null;
            mapperState.pagination.currentPage = 1;

            // Завантажити дані якщо ще не завантажені
            if (marketplaceId) {
                const { loadMpCategories, loadMpCharacteristics, loadMpOptions } = await import('./mapper-data.js');
                if (tab === 'categories' && mapperState.mpCategories.length === 0) await loadMpCategories();
                else if (tab === 'characteristics' && mapperState.mpCharacteristics.length === 0) await loadMpCharacteristics();
                else if (tab === 'options' && mapperState.mpOptions.length === 0) await loadMpOptions();
            }

            renderCurrentTab();
            console.log(`📋 MP фільтр ${tab}: ${marketplaceId || 'всі'}`);
        });
    });
}

/**
 * Заповнити dropdown фільтра маркетплейсу
 */
function populateMpFilterDropdown(select) {
    // Очистити (залишити перший option)
    while (select.options.length > 1) {
        select.remove(1);
    }

    // Додати маркетплейси
    const marketplaces = mapperState.marketplaces || [];
    marketplaces.forEach(mp => {
        if (mp.is_active === 'true' || mp.is_active === true) {
            const option = document.createElement('option');
            option.value = mp.id;
            option.textContent = mp.name;
            select.appendChild(option);
        }
    });
}

/**
 * Ініціалізувати сортування
 */
export function initMapperSorting() {
    document.querySelectorAll('.sortable-header').forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sortKey;

            if (mapperState.sortKey === sortKey) {
                // Переключити порядок
                mapperState.sortOrder = mapperState.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                // Новий ключ сортування
                mapperState.sortKey = sortKey;
                mapperState.sortOrder = 'asc';
            }

            // Оновити індикатори
            updateSortIndicators(header);

            // Перерендерити
            renderCurrentTab();

            console.log(`📊 Сортування: ${sortKey} ${mapperState.sortOrder}`);
        });
    });
}

/**
 * Оновити індикатори сортування
 */
function updateSortIndicators(activeHeader) {
    // Прибрати всі індикатори
    document.querySelectorAll('.sortable-header').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        const indicator = header.querySelector('.sort-indicator');
        if (indicator) indicator.textContent = '';
    });

    // Додати індикатор до активного
    activeHeader.classList.add(mapperState.sortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
    const indicator = activeHeader.querySelector('.sort-indicator');
    if (indicator) {
        indicator.textContent = mapperState.sortOrder === 'asc' ? ' ↑' : ' ↓';
    }
}
