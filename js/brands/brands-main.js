// js/brands/brands-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         BRANDS SYSTEM                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── brands-main.js     — Точка входу, завантаження плагінів             ║
 * ║  ├── brands-plugins.js  — Система реєстрації плагінів (хуки)             ║
 * ║  ├── brands-state.js    — Глобальний стан (brandsState)                  ║
 * ║  └── brands-data.js     — Google Sheets API (CRUD операції)              ║
 * ║                                                                          ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  ├── brands-table.js    — Рендеринг таблиці брендів                      ║
 * ║  ├── brands-crud.js     — Модальні вікна (додати/редагувати/видалити)    ║
 * ║  ├── brands-events.js   — Обробники подій (пошук, оновлення, сортування) ║
 * ║  └── brands-ui.js       — UI компоненти (чекбокси колонок і т.д.)        ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * СТРУКТУРА КОЛОНОК В GOOGLE SHEETS (Brands):
 * ┌─────────┬────────────────────┬─────────────────────────────────────────┐
 * │ Колонка │ Поле               │ Формат                                  │
 * ├─────────┼────────────────────┼─────────────────────────────────────────┤
 * │ A       │ brand_id           │ bran-XXXXXX                             │
 * │ B       │ name_uk            │ текст                                   │
 * │ C       │ names_alt          │ JSON масив: ["alt1", "alt2"]            │
 * │ D       │ country_option_id  │ текст (Польша, США, ...)                │
 * │ E       │ brand_text         │ HTML текст                              │
 * │ F       │ brand_status       │ active | inactive                       │
 * │ G       │ brand_links        │ JSON масив: [{name, url}, ...]          │
 * │ H       │ mapper_option_id   │ ID опції Mapper (зарезервовано)         │
 * │ I       │ brand_logo_url     │ URL логотипу (зарезервовано)            │
 * └─────────┴────────────────────┴─────────────────────────────────────────┘
 *
 * СТРУКТУРА ДАНИХ БРЕНДУ (в JS):
 * {
 *   brand_id: "bran-000001",
 *   name_uk: "Optimum Nutrition",
 *   names_alt: ["ON", "Optimum", "Оптимум"],     // JSON масив
 *   country_option_id: "США",
 *   brand_text: "<p>HTML опис...</p>",
 *   brand_status: "active",                      // active | inactive
 *   brand_links: [                               // JSON масив посилань
 *     { name: "ua", url: "https://..." },
 *     { name: "de", url: "https://..." }
 *   ],
 *   mapper_option_id: "",                        // ID опції Mapper (зарезервовано)
 *   brand_logo_url: "",                          // URL логотипу (зарезервовано)
 *   _rowIndex: 2                                 // Внутрішній індекс рядка
 * }
 */

import { brandsState } from './brands-state.js';
import { loadBrands } from './brands-data.js';
import { loadBrandLines } from './lines-data.js';
import { runHook, runHookAsync } from './brands-plugins.js';
import { initPagination } from '../common/ui-pagination.js';
import { initTooltips } from '../common/ui-tooltip.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';

// ═══════════════════════════════════════════════════════════════════════════
// ПЛАГІНИ - можна видалити будь-який, система працюватиме
// ═══════════════════════════════════════════════════════════════════════════

const PLUGINS = [
    './brands-table.js',
    './brands-crud.js',
    './brands-events.js',
    './brands-ui.js',
    './lines-table.js',
    './lines-crud.js',
];

/**
 * Завантажити плагіни динамічно
 */
async function loadPlugins() {

    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
        } else {
            console.warn(`[Brands] ⚠️ Плагін не завантажено: ${PLUGINS[index]}`, result.reason?.message || '');
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// ІНІЦІАЛІЗАЦІЯ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Головна функція ініціалізації модуля Brands
 */
export async function initBrands() {

    // Ініціалізувати базові UI компоненти
    initTooltips();

    // Завантажити плагіни
    await loadPlugins();

    // Завантажити aside
    await loadAsideBrands();

    // Ініціалізувати пагінацію
    initBrandsPagination();

    // Ініціалізувати перемикання табів
    initTabSwitching();

    // Перевірити авторизацію та завантажити дані
    await checkAuthAndLoadData();

    // Слухати події зміни авторизації
    document.addEventListener('auth-state-changed', async (event) => {
        if (event.detail.isAuthorized) {
            await checkAuthAndLoadData();
        }
    });
}

/**
 * Перевірити авторизацію та завантажити дані
 */
async function checkAuthAndLoadData() {

    if (window.isAuthorized) {

        try {
            // Завантажити бренди та лінійки паралельно
            await Promise.all([
                loadBrands(),
                loadBrandLines()
            ]);

            // Запустити хук onInit для плагінів
            await runHookAsync('onInit', brandsState.brands);

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
function initBrandsPagination() {
    const footer = document.querySelector('.footer');
    if (!footer) {
        console.warn('⚠️ Footer не знайдено');
        return;
    }

    const paginationAPI = initPagination(footer, {
        currentPage: brandsState.pagination.currentPage,
        pageSize: brandsState.pagination.pageSize,
        totalItems: brandsState.pagination.totalItems,
        onPageChange: (page, pageSize) => {
            // Визначити яку пагінацію оновлювати
            if (brandsState.activeTab === 'lines') {
                brandsState.linesPagination.currentPage = page;
                brandsState.linesPagination.pageSize = pageSize;
            } else {
                brandsState.pagination.currentPage = page;
                brandsState.pagination.pageSize = pageSize;
            }
            runHook('onRender');
        }
    });

    brandsState.paginationAPI = paginationAPI;

}

/**
 * Ініціалізувати перемикання табів
 */
function initTabSwitching() {
    const tabButtons = document.querySelectorAll('[data-tab-target]');
    const tabContents = document.querySelectorAll('[data-tab-content]');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tabTarget;

            // Оновити активну кнопку
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Оновити видимий контент
            tabContents.forEach(content => {
                if (content.dataset.tabContent === targetTab) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });

            // Оновити стан
            const tabName = targetTab.replace('tab-', '');
            brandsState.activeTab = tabName;

            // Оновити пагінацію для нового табу
            if (brandsState.paginationAPI) {
                const pagination = tabName === 'lines'
                    ? brandsState.linesPagination
                    : brandsState.pagination;

                brandsState.paginationAPI.update({
                    currentPage: pagination.currentPage,
                    pageSize: pagination.pageSize,
                    totalItems: pagination.totalItems
                });
            }

            // Запустити хук
            runHook('onTabChange', tabName);
            runHook('onRender');

        });
    });

}

/**
 * Відрендерити стан "Потрібна авторизація"
 */
function renderAuthRequiredState() {
    const tableBody = document.querySelector('#tab-brands .pseudo-table-body');
    if (!tableBody) return;

    const avatarHtml = renderAvatarState('authLogin', {
        message: 'Авторизуйтесь для завантаження даних',
        size: 'medium',
        containerClass: 'empty-state-container',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });

    tableBody.innerHTML = avatarHtml;
}

/**
 * Відрендерити стан помилки
 */
function renderErrorState() {
    const tableBody = document.querySelector('#tab-brands .pseudo-table-body');
    if (!tableBody) return;

    const avatarHtml = renderAvatarState('error', {
        message: 'Помилка завантаження даних',
        size: 'medium',
        containerClass: 'empty-state-container',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });

    tableBody.innerHTML = avatarHtml;
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


        // Ініціалізувати пошук
        const searchInput = document.getElementById('search-brands');
        if (searchInput) {
            const { initBrandsSearch } = await import('./brands-events.js');
            initBrandsSearch(searchInput);
        }

        // Ініціалізувати кнопку "Додати бренд"
        const addBrandBtn = document.getElementById('btn-add-brand-aside');
        if (addBrandBtn) {
            addBrandBtn.addEventListener('click', async () => {
                const { showAddBrandModal } = await import('./brands-crud.js');
                showAddBrandModal();
            });
        }

        // Ініціалізувати кнопку "Додати лінійку"
        const addLineBtn = document.getElementById('btn-add-line-aside');
        if (addLineBtn) {
            addLineBtn.addEventListener('click', async () => {
                const { showAddLineModal } = await import('./lines-crud.js');
                showAddLineModal();
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
                runHook('onRender');
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
