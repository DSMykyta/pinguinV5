// js/mapper/mapper-init.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - INITIALIZATION                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Пошук, колонки видимості, колонки пошуку — все через createManagedTable.
 * Aside: кнопка очистки пошуку + кнопки додавання.
 */

import { loadMapperData } from './mapper-data.js';
import {
    renderCurrentTab, invalidateLookupCaches,
    initAllMapperTables, ensureTabManagedTable, switchMapperTab,
    getMapperManagedTable
} from './mapper-table.js';
import { initMapperEvents } from './mapper-events.js';
import { createLazyLoader } from '../common/util-lazy-load.js';
import { initPagination } from '../common/ui-pagination.js';
import { initTooltips } from '../common/ui-tooltip.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';
import { loadMapperPlugins } from './mapper-main.js';

export { mapperState } from './mapper-state.js';
import { mapperState, runHook } from './mapper-state.js';

/**
 * Головна функція ініціалізації модуля Mapper
 */
export async function initMapper() {
    initTooltips();
    loadAsideMapper();
    initMapperPagination();
    initTabSwitching();
    await loadMapperPlugins();
    checkAuthAndLoadData();

    document.addEventListener('auth-state-changed', (event) => {
        if (event.detail.isAuthorized) {
            checkAuthAndLoadData();
        }
    });
}

/**
 * Ініціалізація перемикання табів — використовує switchMapperTab (activate/deactivate)
 */
function initTabSwitching() {
    const tabButtons = document.querySelectorAll('[data-tab-target^="tab-mapper-"]');

    tabButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const tabId = button.dataset.tabTarget;
            const newTab = tabId.replace('tab-mapper-', '');
            const oldTab = mapperState.activeTab;

            mapperState.activeTab = newTab;
            mapperState.pagination.currentPage = 1;

            // Очистити пошуковий інпут
            const searchInput = document.getElementById('search-mapper');
            if (searchInput) {
                searchInput.value = '';
                const clearBtn = document.getElementById('clear-search-mapper');
                if (clearBtn) clearBtn.classList.add('u-hidden');
            }

            // switchMapperTab: deactivate old → activate new (search columns перебудовуються)
            switchMapperTab(newTab, oldTab);

            // Lazy load даних для цього табу
            await ensureTabData(newTab);

            // Ensure managed table exists
            ensureTabManagedTable(newTab);

            // Рендер
            renderCurrentTab();
        });
    });
}

// Lazy loaders
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

export async function ensureTabData(tabName) {
    if (tabName === 'characteristics' && lazyCharacteristics) {
        await lazyCharacteristics.load();
    } else if (tabName === 'options' && lazyOptions) {
        if (lazyCharacteristics) await lazyCharacteristics.load();
        await lazyOptions.load();
    }
}

async function checkAuthAndLoadData() {
    if (window.isAuthorized) {
        try {
            await loadMapperData();

            const { loadMpCategories, loadMapCategories } = await import('./mapper-data.js');
            await Promise.all([loadMpCategories(), loadMapCategories()]);

            createTabLoaders();

            // Ініціалізувати dropdowns
            const { initDropdowns } = await import('../common/ui-dropdown.js');
            initDropdowns();

            runHook('onDataLoaded');

            // Lazy load даних для активного табу
            await ensureTabData(mapperState.activeTab);

            // Створити managed tables (categories + marketplaces)
            initAllMapperTables();

            // Ensure active tab has managed table
            ensureTabManagedTable(mapperState.activeTab);

            // Рендер
            renderCurrentTab();

            // Ініціалізувати dropdowns після рендеру
            initDropdowns();

            // Ініціалізувати обробники подій
            initMapperEvents();

        } catch (error) {
            console.error('❌ Помилка завантаження даних:', error);
            renderErrorState();
        }
    } else {
        renderAuthRequiredState();
    }
}

/**
 * Ініціалізувати пагінацію — спільна для всіх табів.
 * onPageChange → setPage() активного managed table.
 */
function initMapperPagination() {
    const footer = document.querySelector('.footer');
    if (!footer) return;

    const paginationAPI = initPagination(footer, {
        currentPage: mapperState.pagination.currentPage,
        pageSize: mapperState.pagination.pageSize,
        totalItems: mapperState.pagination.totalItems,
        onPageChange: (page, pageSize) => {
            mapperState.pagination.currentPage = page;
            mapperState.pagination.pageSize = pageSize;

            const mt = getMapperManagedTable(mapperState.activeTab);
            if (mt) {
                mt.setPage(page, pageSize);
            }
        }
    });

    mapperState.paginationAPI = paginationAPI;
}

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
        container.innerHTML = renderAvatarState('authLogin', {
            message: 'Авторизуйтесь для завантаження даних',
            size: 'medium',
            containerClass: 'empty-state-container',
            avatarClass: 'empty-state-avatar',
            messageClass: 'avatar-state-message',
            showMessage: true
        });
    });
}

function renderErrorState() {
    const activeTab = mapperState.activeTab;
    const container = document.getElementById(`mapper-${activeTab}-table-container`);
    if (!container) return;
    container.innerHTML = renderAvatarState('error', {
        message: 'Помилка завантаження даних',
        size: 'medium',
        containerClass: 'empty-state-container',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });
}

/**
 * Завантажити aside панель.
 * Пошук тепер керується через createManagedTable (searchInputId).
 * Тут тільки кнопка очистки + кнопки додавання.
 */
async function loadAsideMapper() {
    const panelRightContent = document.getElementById('panel-right-content');
    if (!panelRightContent) return;

    try {
        const response = await fetch('templates/aside/aside-mapper.html');
        if (!response.ok) throw new Error('Failed to load aside-mapper.html');

        const html = await response.text();
        panelRightContent.innerHTML = html;

        // Кнопка очистки пошуку — setSearchQuery('')
        const clearSearchBtn = document.getElementById('clear-search-mapper');
        const searchInput = document.getElementById('search-mapper');

        if (clearSearchBtn && searchInput) {
            clearSearchBtn.addEventListener('click', () => {
                const mt = getMapperManagedTable(mapperState.activeTab);
                if (mt) mt.setSearchQuery('');
                clearSearchBtn.classList.add('u-hidden');
            });

            searchInput.addEventListener('input', () => {
                clearSearchBtn.classList.toggle('u-hidden', !searchInput.value.trim());
            });
        }

        // Кнопки додавання в aside
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

        const importBtn = document.getElementById('btn-import-aside');
        if (importBtn) {
            importBtn.addEventListener('click', async () => {
                await import('./mapper-import-rozetka.js');
                await import('./mapper-import-epicentr.js');
                await import('./mapper-import-etalon.js');
                const { showImportModal } = await import('./mapper-import.js');
                showImportModal();
            });
        }

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
