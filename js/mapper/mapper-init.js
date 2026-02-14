// js/mapper/mapper-init.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - INITIALIZATION                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── mapper-init.js       — Ініціалізація модуля                         ║
 * ║  ├── mapper-main.js       — Точка входу, завантаження плагінів           ║
 * ║  ├── mapper-state.js      — Централізований state + hooks                ║
 * ║  ├── mapper-utils.js      — Спільні утиліти                              ║
 * ║  ├── mapper-data.js       — API операції з даними                        ║
 * ║  └── mapper-table.js      — Рендеринг таблиць                            ║
 * ║                                                                          ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  ├── mapper-categories.js      — Категорії CRUD + модалки                ║
 * ║  ├── mapper-characteristics.js — Характеристики CRUD + модалки           ║
 * ║  ├── mapper-options.js         — Опції CRUD + модалки                    ║
 * ║  ├── mapper-marketplaces.js    — Маркетплейси CRUD + модалки             ║
 * ║  └── mapper-import.js          — Імпорт даних (TODO)                     ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { loadMapperData } from './mapper-data.js';
import { renderCurrentTab, invalidateLookupCaches } from './mapper-table.js';
import { initMapperEvents, initMapperSearch, initMapperSorting } from './mapper-events.js';
import { createLazyLoader } from '../common/util-lazy-load.js';
import { initPagination } from '../common/ui-pagination.js';
import { createColumnSelector } from '../common/table/table-columns.js';
import { initTooltips } from '../common/ui-tooltip.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';
import { loadMapperPlugins } from './mapper-main.js';

// Re-export mapperState для зворотної сумісності
export { mapperState } from './mapper-state.js';
import { mapperState, runHook } from './mapper-state.js';

// Конфігурація колонок пошуку для кожного табу
const SEARCH_COLUMNS_CONFIG = {
    categories: [
        { id: 'id', label: 'ID', checked: true },
        { id: 'name_ua', label: 'Назва UA', checked: true },
        { id: 'name_ru', label: 'Назва RU', checked: true }
    ],
    characteristics: [
        { id: 'id', label: 'ID', checked: true },
        { id: 'name_ua', label: 'Назва UA', checked: true },
        { id: 'name_ru', label: 'Назва RU', checked: true },
        { id: 'type', label: 'Тип', checked: true }
    ],
    options: [
        { id: 'id', label: 'ID', checked: true },
        { id: 'value_ua', label: 'Значення UA', checked: true },
        { id: 'value_ru', label: 'Значення RU', checked: true }
    ],
    marketplaces: [
        { id: 'id', label: 'ID', checked: true },
        { id: 'name', label: 'Назва', checked: true },
        { id: 'slug', label: 'Slug', checked: true }
    ]
};

let _searchColsSelector = null;

function updateSearchColumnsSelector(tabName) {
    const config = SEARCH_COLUMNS_CONFIG[tabName];
    if (!config) return;
    if (_searchColsSelector) _searchColsSelector.destroy();
    _searchColsSelector = createColumnSelector('search-mapper-search-columns', config, {
        checkboxPrefix: 'mapper-search',
        onChange: (selectedIds) => {
            mapperState.searchColumns[tabName] = selectedIds;
            if (mapperState.searchQuery) renderCurrentTab();
        }
    });
}

/**
 * Головна функція ініціалізації модуля Mapper
 */
export async function initMapper() {

    // Ініціалізувати tooltip систему
    initTooltips();

    // Завантажити aside
    loadAsideMapper();

    // Ініціалізувати пагінацію
    initMapperPagination();

    // Ініціалізувати обробники табів
    initTabSwitching();

    // Завантажити плагіни
    await loadMapperPlugins();

    // Перевірити авторизацію та завантажити дані
    checkAuthAndLoadData();

    // Слухати події зміни авторизації
    document.addEventListener('auth-state-changed', (event) => {
        if (event.detail.isAuthorized) {
            checkAuthAndLoadData();
        }
    });
}

/**
 * Ініціалізація перемикання табів
 */
function initTabSwitching() {
    const tabButtons = document.querySelectorAll('[data-tab-target^="tab-mapper-"]');

    tabButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const tabId = button.dataset.tabTarget;
            const tabName = tabId.replace('tab-mapper-', '');

            mapperState.activeTab = tabName;
            mapperState.pagination.currentPage = 1;
            mapperState.searchQuery = '';

            // Оновити пошуковий інпут
            const searchInput = document.getElementById('search-mapper');
            if (searchInput) {
                searchInput.value = '';
                const clearBtn = document.getElementById('clear-search-mapper');
                if (clearBtn) clearBtn.classList.add('u-hidden');
            }

            // Оновити search columns selector для нового табу
            updateSearchColumnsSelector(tabName);

            // Lazy load даних для цього табу
            await ensureTabData(tabName);
            renderCurrentTab();

        });
    });
}

/**
 * Перевірити авторизацію та завантажити дані
 */
// Lazy loaders для відкладеного завантаження даних по табах
let lazyCharacteristics = null;
let lazyOptions = null;

function createTabLoaders() {
    const dataModule = import('./mapper-data.js');

    lazyCharacteristics = createLazyLoader(async () => {
        const { loadMpCharacteristics, loadMapCharacteristics } = await dataModule;
        await Promise.all([loadMpCharacteristics(), loadMapCharacteristics()]);
        invalidateLookupCaches();
    });

    lazyOptions = createLazyLoader(async () => {
        const { loadMpOptions, loadMapOptions } = await dataModule;
        await Promise.all([loadMpOptions(), loadMapOptions()]);
        invalidateLookupCaches();
    });
}

/**
 * Завантажити дані для табу (lazy — тільки при першому відкритті)
 */
export async function ensureTabData(tabName) {
    if (tabName === 'characteristics' && lazyCharacteristics) {
        await lazyCharacteristics.load();
    } else if (tabName === 'options' && lazyOptions) {
        // Опції залежать від характеристик
        if (lazyCharacteristics) await lazyCharacteristics.load();
        await lazyOptions.load();
    }
}

async function checkAuthAndLoadData() {

    // Перевіряємо глобальний стан авторизації
    if (window.isAuthorized) {

        try {
            // Завантажити основні дані (маркетплейси, власні категорії/характеристики/опції)
            await loadMapperData();

            // Завантажити тільки категорії MP + маппінги категорій (найнеобхідніше)
            const { loadMpCategories, loadMapCategories } = await import('./mapper-data.js');
            await Promise.all([
                loadMpCategories(),
                loadMapCategories()
            ]);

            // Створити lazy loaders для інших табів
            createTabLoaders();

            // Ініціалізувати dropdowns після заповнення
            const { initDropdowns } = await import('../common/ui-dropdown.js');
            initDropdowns();

            // Повідомити плагіни про завантаження даних
            runHook('onDataLoaded');

            // Відрендерити поточний таб
            await ensureTabData(mapperState.activeTab);
            renderCurrentTab();

            // Ініціалізувати обробники подій
            initMapperEvents();

            // Ініціалізувати сортування таблиць
            initMapperSorting();

        } catch (error) {
            console.error('❌ Помилка завантаження даних:', error);
            renderErrorState();
        }
    } else {
        renderAuthRequiredState();
    }
}

/**
 * Ініціалізувати пагінацію
 */
function initMapperPagination() {
    const footer = document.querySelector('.footer');
    if (!footer) {
        console.warn('⚠️ Footer не знайдено');
        return;
    }

    const paginationAPI = initPagination(footer, {
        currentPage: mapperState.pagination.currentPage,
        pageSize: mapperState.pagination.pageSize,
        totalItems: mapperState.pagination.totalItems,
        onPageChange: (page, pageSize) => {
            mapperState.pagination.currentPage = page;
            mapperState.pagination.pageSize = pageSize;
            renderCurrentTab();
        }
    });

    mapperState.paginationAPI = paginationAPI;

}

/**
 * Відрендерити стан "Потрібна авторизація"
 */
function renderAuthRequiredState() {
    const containers = [
        'mapper-categories-table-container',
        'mapper-characteristics-table-container',
        'mapper-options-table-container',
        'mapper-marketplaces-table-container'
    ];

    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (!container) return;

        const avatarHtml = renderAvatarState('authLogin', {
            message: 'Авторизуйтесь для завантаження даних',
            size: 'medium',
            containerClass: 'empty-state-container',
            avatarClass: 'empty-state-avatar',
            messageClass: 'avatar-state-message',
            showMessage: true
        });

        container.innerHTML = avatarHtml;
    });
}

/**
 * Відрендерити стан помилки
 */
function renderErrorState() {
    const activeTab = mapperState.activeTab;
    const container = document.getElementById(`mapper-${activeTab}-table-container`);
    if (!container) return;

    const avatarHtml = renderAvatarState('error', {
        message: 'Помилка завантаження даних',
        size: 'medium',
        containerClass: 'empty-state-container',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });

    container.innerHTML = avatarHtml;
}

/**
 * Завантажити aside панель
 */
async function loadAsideMapper() {
    const panelRightContent = document.getElementById('panel-right-content');
    if (!panelRightContent) return;

    try {
        const response = await fetch('templates/aside/aside-mapper.html');
        if (!response.ok) throw new Error('Failed to load aside-mapper.html');

        const html = await response.text();
        panelRightContent.innerHTML = html;


        // Ініціалізувати пошук
        const searchInput = document.getElementById('search-mapper');
        if (searchInput) {
            initMapperSearch(searchInput);
        }

        // Ініціалізувати кнопку очистки пошуку
        const clearSearchBtn = document.getElementById('clear-search-mapper');
        if (clearSearchBtn && searchInput) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                mapperState.searchQuery = '';
                mapperState.pagination.currentPage = 1;
                clearSearchBtn.classList.add('u-hidden');
                renderCurrentTab();
            });

            // Показати/сховати кнопку очистки при введенні
            searchInput.addEventListener('input', () => {
                if (searchInput.value.trim()) {
                    clearSearchBtn.classList.remove('u-hidden');
                } else {
                    clearSearchBtn.classList.add('u-hidden');
                }
            });
        }

        // Ініціалізувати search columns selector
        updateSearchColumnsSelector(mapperState.activeTab || 'categories');

        // Ініціалізувати кнопки додавання в aside
        const addCategoryBtn = document.getElementById('btn-add-category-aside');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', async () => {
                const { showAddCategoryModal } = await import('./mapper-categories.js');
                showAddCategoryModal();
            });
        }

        const addCharacteristicBtn = document.getElementById('btn-add-characteristic-aside');
        if (addCharacteristicBtn) {
            addCharacteristicBtn.addEventListener('click', async () => {
                const { showAddCharacteristicModal } = await import('./mapper-characteristics.js');
                showAddCharacteristicModal();
            });
        }

        const addOptionBtn = document.getElementById('btn-add-option-aside');
        if (addOptionBtn) {
            addOptionBtn.addEventListener('click', async () => {
                const { showAddOptionModal } = await import('./mapper-options.js');
                showAddOptionModal();
            });
        }

        // Ініціалізувати кнопку імпорту
        const importBtn = document.getElementById('btn-import-aside');
        if (importBtn) {
            importBtn.addEventListener('click', async () => {
                // Завантажуємо адаптери маркетплейсів
                await import('./mapper-import-rozetka.js');
                await import('./mapper-import-epicentr.js');
                await import('./mapper-import-etalon.js');
                const { showImportModal } = await import('./mapper-import.js');
                showImportModal();
            });
        }

        // Ініціалізувати кнопки маппінг-візардів
        const mappingWizardBtn = document.getElementById('btn-mapping-wizard-aside');
        if (mappingWizardBtn) {
            mappingWizardBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const { showMappingWizard } = await import('./mapper-mapping-wizard.js');
                showMappingWizard();
            });
        }

        const charWizardBtn = document.getElementById('btn-mapping-wizard-characteristics-aside');
        if (charWizardBtn) {
            charWizardBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const { showCharacteristicMappingWizard } = await import('./mapper-mapping-wizard-characteristics.js');
                showCharacteristicMappingWizard();
            });
        }

        const optWizardBtn = document.getElementById('btn-mapping-wizard-options-aside');
        if (optWizardBtn) {
            optWizardBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const { showOptionMappingWizard } = await import('./mapper-mapping-wizard-options.js');
                showOptionMappingWizard();
            });
        }

    } catch (error) {
        console.error('❌ Помилка завантаження aside-mapper.html:', error);
    }
}

// getActiveTab / setActiveTab — використовуйте з mapper-state.js
