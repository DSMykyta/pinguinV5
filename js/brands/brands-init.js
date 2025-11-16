// js/brands/brands-init.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - INITIALIZATION                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Головний файл ініціалізації модуля управління брендами.
 */

import { loadBrands } from './brands-data.js';
import { renderBrandsTable } from './brands-table.js';
import { initBrandsEvents, initBrandsSearch } from './brands-events.js';
import { showAddBrandModal } from './brands-crud.js';
import { initPagination } from '../common/ui-pagination.js';
import { initTooltips } from '../common/ui-tooltip.js';
import { initDropdowns } from '../common/ui-dropdown.js';

/**
 * Глобальний стан для brands модуля
 */
export const brandsState = {
    // Пошук
    searchQuery: '',
    searchColumns: ['brand_id', 'name_uk', 'names_alt', 'country_name'],

    // Видимі колонки
    visibleColumns: ['brand_id', 'name_uk', 'country_name'],

    // Сортування
    sortKey: null,
    sortOrder: 'asc', // asc | desc

    // Пагінація
    pagination: {
        currentPage: 1,
        pageSize: 10,
        totalItems: 0
    },

    // API пагінації
    paginationAPI: null
};

/**
 * Головна функція ініціалізації модуля Brands
 */
export function initBrands() {
    console.log('📋 Ініціалізація Brands...');

    // Ініціалізувати tooltip систему
    initTooltips();

    // Завантажити aside
    loadAsideBrands();

    // Ініціалізувати dropdowns
    initDropdowns();

    // Ініціалізувати пагінацію
    initBrandsPagination();

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
 * Перевірити авторизацію та завантажити дані
 */
async function checkAuthAndLoadData() {
    console.log('🔐 Перевірка авторизації...');

    // Перевіряємо глобальний стан авторизації
    if (window.isAuthorized) {
        console.log('✅ Користувач авторизований, завантажуємо дані...');

        try {
            // Завантажити бренди
            await loadBrands();

            // Заповнити UI компоненти (чекбокси пошуку та колонок)
            const { populateSearchColumns, populateTableColumns } = await import('./brands-ui.js');
            populateSearchColumns();
            populateTableColumns();

            // Відрендерити таблицю
            renderBrandsTable();

            // Ініціалізувати обробники подій
            initBrandsEvents();

            console.log('✅ Brands готовий до роботи');
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
function initBrandsPagination() {
    const footer = document.querySelector('.fixed-footer');
    if (!footer) {
        console.warn('⚠️ Footer не знайдено');
        return;
    }

    const paginationAPI = initPagination(footer, {
        currentPage: brandsState.pagination.currentPage,
        pageSize: brandsState.pagination.pageSize,
        totalItems: brandsState.pagination.totalItems,
        onPageChange: (page, pageSize) => {
            brandsState.pagination.currentPage = page;
            brandsState.pagination.pageSize = pageSize;
            renderBrandsTable();
        }
    });

    brandsState.paginationAPI = paginationAPI;

    console.log('✅ Пагінація ініціалізована');
}

/**
 * Відрендерити стан "Потрібна авторизація"
 */
function renderAuthRequiredState() {
    const tableBody = document.querySelector('#tab-brands .pseudo-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `
        <div class="loading-state">
            <span class="material-symbols-outlined">key</span>
            <p>Авторизуйтесь для завантаження даних</p>
        </div>
    `;
}

/**
 * Відрендерити стан помилки
 */
function renderErrorState() {
    const tableBody = document.querySelector('#tab-brands .pseudo-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `
        <div class="loading-state">
            <span class="material-symbols-outlined">error</span>
            <p>Помилка завантаження даних</p>
        </div>
    `;
}

/**
 * Завантажити aside панель
 */
async function loadAsideBrands() {
    const panelRightContent = document.getElementById('panel-right-content');
    if (!panelRightContent) return;

    try {
        const response = await fetch('templates/aside/aside-brands.html');
        if (!response.ok) throw new Error('Failed to load aside-brands.html');

        const html = await response.text();
        panelRightContent.innerHTML = html;

        console.log('✅ aside-brands.html завантажено');

        // Ініціалізувати пошук
        const searchInput = document.getElementById('search-brands');
        if (searchInput) {
            initBrandsSearch(searchInput);
        }

        // Ініціалізувати кнопку "Додати бренд"
        const addBtn = document.getElementById('btn-add-brand-aside');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                showAddBrandModal();
            });
        }

        // Ініціалізувати кнопку очистки пошуку
        const clearSearchBtn = document.getElementById('clear-search-brands');
        if (clearSearchBtn && searchInput) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                brandsState.searchQuery = '';
                brandsState.pagination.currentPage = 1;
                clearSearchBtn.classList.add('u-hidden');
                renderBrandsTable();
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
    } catch (error) {
        console.error('❌ Помилка завантаження aside-brands.html:', error);
    }
}
