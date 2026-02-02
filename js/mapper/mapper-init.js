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
import { renderCurrentTab } from './mapper-table.js';
import { initMapperEvents, initMapperSearch, initMapperSorting } from './mapper-events.js';
import { initPagination } from '../common/ui-pagination.js';
import { initTooltips } from '../common/ui-tooltip.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';
import { loadMapperPlugins } from './mapper-main.js';

// Re-export mapperState для зворотної сумісності
export { mapperState } from './mapper-state.js';
import { mapperState } from './mapper-state.js';

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
        button.addEventListener('click', () => {
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

            renderCurrentTab();

        });
    });
}

/**
 * Перевірити авторизацію та завантажити дані
 */
async function checkAuthAndLoadData() {

    // Перевіряємо глобальний стан авторизації
    if (window.isAuthorized) {

        try {
            // Завантажити основні дані
            await loadMapperData();

            // Завантажити MP дані та маппінги паралельно
            const { loadMpCategories, loadMpCharacteristics, loadMpOptions, loadMapCategories, loadMapCharacteristics, loadMapOptions } = await import('./mapper-data.js');
            await Promise.all([
                loadMpCategories(),
                loadMpCharacteristics(),
                loadMpOptions(),
                loadMapCategories(),
                loadMapCharacteristics(),
                loadMapOptions()
            ]);

            // Ініціалізувати dropdowns після заповнення
            const { initDropdowns } = await import('../common/ui-dropdown.js');
            initDropdowns();

            // Відрендерити поточний таб
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
    const footer = document.querySelector('.fixed-footer');
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
                // TODO: Перенести в mapper-import.js
                const { showImportModal } = await import('./mapper-crud.js');
                showImportModal();
            });
        }

    } catch (error) {
        console.error('❌ Помилка завантаження aside-mapper.html:', error);
    }
}

/**
 * Отримати активний таб
 */
export function getActiveTab() {
    return mapperState.activeTab;
}

/**
 * Встановити активний таб
 */
export function setActiveTab(tabName) {
    mapperState.activeTab = tabName;
}
