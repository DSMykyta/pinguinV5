// js/pages/products/products-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         PRODUCTS SYSTEM                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── products-main.js     — Точка входу, завантаження плагінів           ║
 * ║  ├── products-plugins.js  — Система реєстрації плагінів (хуки)          ║
 * ║  ├── products-state.js    — Глобальний стан (productsState)             ║
 * ║  ├── products-data.js     — Google Sheets API (CRUD товарів)            ║
 * ║  └── variants-data.js     — Google Sheets API (CRUD варіантів)          ║
 * ║                                                                          ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  ├── products-table.js          — Таблиця товарів (сторінка)            ║
 * ║  ├── products-crud.js           — Модал товару (open/fill/save)         ║
 * ║  ├── products-crud-characteristics.js — Характеристики                  ║
 * ║  ├── products-crud-variants.js  — Варіанти в модалі                     ║
 * ║  ├── products-crud-photos.js    — Фото товару (до 10, Google Drive)     ║
 * ║  ├── products-delete.js         — Delete товару (confirm + API)         ║
 * ║  ├── products-events.js         — Обробники подій (refresh)             ║
 * ║  ├── variants-table.js          — Таблиця варіантів (сторінка)          ║
 * ║  └── variants-events.js         — Обробники подій варіантів             ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { productsState } from './products-state.js';
import { loadProducts } from './products-data.js';
import { loadProductVariants } from './variants-data.js';
import { loadProductGroups } from './groups-data.js';
import { loadCategories, getCategories, loadOptions, getOptions } from '../mapper/mapper-data-own.js';
import { getBrands, loadBrands } from '../brands/brands-data.js';
import { runHook, runHookAsync } from './products-plugins.js';
import { initTooltips } from '../../components/feedback/tooltip.js';
import { registerAsideInitializer } from '../../layout/layout-main.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';

// ═══════════════════════════════════════════════════════════════════════════
// ПЛАГІНИ - можна видалити будь-який, система працюватиме
// ═══════════════════════════════════════════════════════════════════════════

const PLUGINS = [
    './products-table.js',
    './products-crud.js',
    './products-events.js',
    './variants-table.js',
    './variants-events.js',
];

/**
 * Завантажити плагіни динамічно
 */
async function loadPlugins() {
    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            result.value.init(productsState);
        } else if (result.status === 'rejected') {
            console.warn(`[Products] ⚠️ Плагін не завантажено: ${PLUGINS[index]}`, result.reason?.message || '');
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// ІНІЦІАЛІЗАЦІЯ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Головна функція ініціалізації модуля Products
 */
export async function initProducts() {

    // Ініціалізувати базові UI компоненти
    initTooltips();

    // Завантажити плагіни
    await loadPlugins();

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

        // Завантажити товари, варіанти, бренди та категорії паралельно
        const [productsResult, variantsResult, groupsResult, brandsResult, categoriesResult] = await Promise.allSettled([
            loadProducts(),
            loadProductVariants(),
            loadProductGroups(),
            getBrands().length === 0 ? loadBrands() : Promise.resolve(),
            getCategories().length === 0 ? loadCategories() : Promise.resolve()
        ]);

        if (productsResult.status === 'rejected') {
            console.error('❌ Помилка завантаження товарів:', productsResult.reason);
        }
        if (variantsResult.status === 'rejected') {
            console.error('❌ Помилка завантаження варіантів:', variantsResult.reason);
        }
        if (groupsResult.status === 'rejected') {
            console.error('❌ Помилка завантаження груп:', groupsResult.reason);
        }

        // Зберігаємо бренди і категорії для dataTransform в таблиці
        window.__productsPageBrands = getBrands();
        window.__productsPageCategories = getCategories();

        if (productsResult.status === 'rejected') {
            renderErrorState();
            return;
        }

        // Запустити хук onInit для плагінів
        await runHookAsync('onInit', productsState.products);

        // Запустити polling для виявлення змін іншими користувачами
        const { startPolling } = await import('./products-polling.js');
        startPolling();
    } else {
        renderAuthRequiredState();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════════════════════

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
            productsState.activeTab = tabName;

            // Charm pagination — deactivate/activate при tab switch
            const productsContainer = document.getElementById('products-table-container');
            const variantsContainer = document.getElementById('variants-table-container');
            const groupsContainer = document.getElementById('groups-table-container');

            // Деактивувати всі
            productsContainer?._paginationCharm?.deactivate();
            variantsContainer?._paginationCharm?.deactivate();
            groupsContainer?._paginationCharm?.deactivate();

            if (tabName === 'variants') {
                variantsContainer?._paginationCharm?.activate();
                import('./variants-table.js').then(({ renderVariantsTable }) => {
                    renderVariantsTable();
                }).catch(() => {});
            } else if (tabName === 'groups') {
                groupsContainer?._paginationCharm?.activate();
                import('./groups-table.js').then(({ renderGroupsTable }) => {
                    renderGroupsTable();
                }).catch(() => {});
            } else {
                productsContainer?._paginationCharm?.activate();
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
    const container = document.getElementById('products-table-container');
    if (!container) return;

    container.innerHTML = renderAvatarState('authLogin', {
        message: 'Авторизуйтесь для завантаження даних',
        size: 'medium',
        containerClass: 'empty-state',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });
}

/**
 * Відрендерити стан помилки
 */
function renderErrorState() {
    const container = document.getElementById('products-table-container');
    if (!container) return;

    container.innerHTML = renderAvatarState('error', {
        message: 'Помилка завантаження даних',
        size: 'medium',
        containerClass: 'empty-state',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });
}

registerAsideInitializer('aside-products', () => {
    const fabMenu = document.getElementById('fab-products-aside');
    if (!fabMenu) return;

    fabMenu.addEventListener('click', async (e) => {
        if (e.target.closest('.fab-menu-trigger')) {
            fabMenu.classList.toggle('open');
            return;
        }
        const item = e.target.closest('.fab-menu-item');
        if (!item) return;

        fabMenu.classList.remove('open');

        if (item.id === 'btn-add-product-aside') {
            const { showAddProductModal } = await import('./products-crud.js');
            showAddProductModal();
        } else if (item.id === 'btn-wizard-product-aside') {
            const { showProductWizard } = await import('./products-wizard.js');
            showProductWizard();
        }
    });

    document.addEventListener('click', (e) => {
        if (!fabMenu.contains(e.target)) fabMenu.classList.remove('open');
    });
});
