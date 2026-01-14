// js/mapper/mapper-init.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - INITIALIZATION                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Головний файл ініціалізації модуля Marketplace Mapper.
 * Управління маппінгом власних даних до даних маркетплейсів.
 */

import { loadMapperData } from './mapper-data.js';
import { renderCurrentTab } from './mapper-table.js';
import { initMapperEvents, initMapperSearch } from './mapper-events.js';
import { initPagination } from '../common/ui-pagination.js';
import { initTooltips } from '../common/ui-tooltip.js';
import { renderAvatarState } from '../utils/avatar-states.js';

/**
 * Глобальний стан для mapper модуля
 */
export const mapperState = {
    // Активний таб
    activeTab: 'categories', // categories | characteristics | options | marketplaces

    // Дані
    categories: [],
    characteristics: [],
    options: [],
    marketplaces: [],

    // Дані маркетплейсів (для модалки перегляду)
    mpCategories: [],
    mpCharacteristics: [],
    mpOptions: [],

    // Маппінги
    mapCategories: [],
    mapCharacteristics: [],
    mapOptions: [],

    // Вибрані елементи для маппінгу (unified selection)
    selectedItems: {
        characteristics: new Set(), // Set of unique keys: "own:id" or "mp:marketplace_id:external_id"
        options: new Set()
    },

    // Пошук
    searchQuery: '',
    searchColumns: {
        categories: ['id', 'name_ua', 'name_ru'],
        characteristics: ['id', 'name_ua', 'name_ru', 'type'],
        options: ['id', 'value_ua', 'value_ru'],
        marketplaces: ['id', 'name', 'slug']
    },

    // Фільтри
    filters: {
        categories: 'all',
        characteristics: 'all', // all | mapped | unmapped
        options: 'all', // all | mapped | unmapped
        marketplaces: 'all'
    },

    // Видимі колонки для кожного табу
    visibleColumns: {
        categories: ['id', 'name_ua', 'parent_id'],
        characteristics: ['id', 'name_ua', 'type', 'is_global'],
        options: ['id', 'characteristic_id', 'value_ua'],
        marketplaces: ['id', 'name', 'slug', 'is_active']
    },

    // Сортування
    sortKey: null,
    sortOrder: 'asc', // asc | desc

    // Пагінація
    pagination: {
        currentPage: 1,
        pageSize: 25,
        totalItems: 0
    },

    // API пагінації
    paginationAPI: null,

    // Вибраний маркетплейс для перегляду даних
    selectedMarketplace: null
};

/**
 * Головна функція ініціалізації модуля Mapper
 */
export function initMapper() {
    console.log('🗺️ Ініціалізація Mapper...');

    // Ініціалізувати tooltip систему
    initTooltips();

    // Завантажити aside
    loadAsideMapper();

    // Ініціалізувати пагінацію
    initMapperPagination();

    // Ініціалізувати обробники табів
    initTabSwitching();

    // Перевірити авторизацію та завантажити дані
    checkAuthAndLoadData();

    // Слухати події зміни авторизації
    document.addEventListener('auth-state-changed', (event) => {
        console.log('🔐 Подія auth-state-changed:', event.detail);
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

            console.log(`📑 Переключено на таб: ${tabName}`);
        });
    });
}

/**
 * Перевірити авторизацію та завантажити дані
 */
async function checkAuthAndLoadData() {
    console.log('🔐 Перевірка авторизації...');

    // Перевіряємо глобальний стан авторизації
    if (window.isAuthorized) {
        console.log('✅ Користувач авторизований, завантажуємо дані...');

        try {
            // Завантажити дані
            await loadMapperData();

            // Ініціалізувати dropdowns після заповнення
            const { initDropdowns } = await import('../common/ui-dropdown.js');
            initDropdowns();

            // Відрендерити поточний таб
            renderCurrentTab();

            // Ініціалізувати обробники подій
            initMapperEvents();

            console.log('✅ Mapper готовий до роботи');
        } catch (error) {
            console.error('❌ Помилка завантаження даних:', error);
            renderErrorState();
        }
    } else {
        console.log('⚠️ Користувач не авторизований');
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

    console.log('✅ Пагінація ініціалізована');
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

        console.log('✅ aside-mapper.html завантажено');

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

        // Ініціалізувати кнопку імпорту
        const importBtn = document.getElementById('btn-import-aside');
        if (importBtn) {
            importBtn.addEventListener('click', async () => {
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
