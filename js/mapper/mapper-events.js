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

    console.log('✅ Обробники подій Mapper ініціалізовано');
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
    const tabs = ['categories', 'characteristics', 'options', 'marketplaces'];

    tabs.forEach(tab => {
        const btn = document.getElementById(`refresh-tab-mapper-${tab}`);
        if (btn) {
            btn.addEventListener('click', async () => {
                console.log(`🔄 Оновлення табу ${tab}...`);

                // Показати стан завантаження
                btn.disabled = true;
                btn.querySelector('.material-symbols-outlined').classList.add('spinning');

                try {
                    await loadMapperData();
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
 * Ініціалізувати фільтр-пілюлі
 */
function initFilterPills() {
    const containers = [
        'filter-pills-mapper-characteristics',
        'filter-pills-mapper-options'
    ];

    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (!container) return;

        const pills = container.querySelectorAll('.filter-pill');
        pills.forEach(pill => {
            pill.addEventListener('click', () => {
                // Прибрати active з усіх
                pills.forEach(p => p.classList.remove('active'));

                // Додати active до поточного
                pill.classList.add('active');

                // Отримати значення фільтра
                const filter = pill.dataset.filter;
                const tabId = pill.dataset.tabId;
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
