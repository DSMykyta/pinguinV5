// js/pages/products/products-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         PRODUCTS SYSTEM                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── products-main.js     — Точка входу, завантаження плагінів           ║
 * ║  ├── products-plugins.js  — Система реєстрації плагінів (хуки)           ║
 * ║  ├── products-state.js    — Глобальний стан (productsState)              ║
 * ║  ├── products-data.js     — Google Sheets API (CRUD товарів)             ║
 * ║  └── variants-data.js     — Google Sheets API (CRUD варіантів)           ║
 * ║                                                                          ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  ├── products-table.js              — Таблиця товарів (сторінка)         ║
 * ║  ├── products-crud.js               — Модал товару (open/fill/save)      ║
 * ║  ├── products-crud-names.js         — Генерація назв товару              ║
 * ║  ├── products-crud-url.js           — URL slug + валідація               ║
 * ║  ├── products-crud-seo.js           — Автогенерація SEO                  ║
 * ║  ├── products-crud-hierarchy.js     — Ієрархія parent-child (спільна)    ║
 * ║  ├── products-crud-characteristics.js — Характеристики                   ║
 * ║  ├── products-crud-variants.js      — Варіанти (модал + таблиця)         ║
 * ║  ├── products-crud-variant-names.js — Резолвінг назв варіантів           ║
 * ║  ├── products-crud-variant-chars.js — Характеристики варіанту (блок 8)   ║
 * ║  ├── products-crud-variant-pending.js — Pending варіанти (accordion)     ║
 * ║  ├── products-crud-wizard.js        — Wizard mode для модалу товару     ║
 * ║  ├── products-crud-photos.js        — Фото товару (до 10, Google Drive)  ║
 * ║  ├── products-crud-variant-weight.js — Вага варіанту                     ║
 * ║  ├── products-delete.js             — Delete товару (confirm + API)      ║
 * ║  ├── products-events.js             — Обробники подій (refresh)          ║
 * ║  ├── variants-table.js              — Таблиця варіантів (сторінка)       ║
 * ║  ├── variants-events.js             — Обробники подій варіантів          ║
 * ║  ├── groups-table.js                — Таблиця груп (сторінка)            ║
 * ║  ├── groups-crud.js                 — CRUD операції для груп             ║
 * ║  └── products-plugin-brand-status.js — Статус бренду                    ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { productsState } from './products-state.js';
import { loadProducts } from './products-data.js';
import { loadProductVariants } from './variants-data.js';
import { loadProductGroups } from './groups-data.js';
import { loadCategories, getCategories } from '../mapper/mapper-data-own.js';
import { getBrands, loadBrands } from '../brands/brands-data.js';
import { runHook, runHookAsync } from './products-plugins.js';
import { initTooltips } from '../../components/feedback/tooltip.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import { registerAsideInitializer } from '../../layout/layout-main.js';
import { initAsideFab } from '../../components/fab-menu.js';

// ═══════════════════════════════════════════════════════════════════════════
// ПЛАГІНИ - можна видалити будь-який, система працюватиме
// ═══════════════════════════════════════════════════════════════════════════

const PLUGINS = [
    './products-table.js',
    './products-crud.js',
    './products-events.js',
    './variants-table.js',
    './variants-events.js',
    './groups-table.js',
    './groups-crud.js',
    './products-crud-wizard.js',
    './products-crud-table-generator.js',
    './products-crud-variant-weight.js',
    './products-crud-article.js',
    './products-plugin-brand-status.js',
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

    // FAB aside — generic toggle/close + page-specific handlers
    registerAsideInitializer('aside-products', () => {
        initAsideFab('fab-products-aside', {
            'btn-wizard-product-aside': async () => {
                const { showAddProductModal } = await import('./products-crud.js');
                const { setPendingWizardMode } = await import('./products-crud-wizard.js');
                setPendingWizardMode();
                await showAddProductModal();
            },
            'btn-add-group-aside': async () => {
                const { showAddGroupModal } = await import('./groups-crud.js');
                showAddGroupModal();
            }
        });
    });

    // Слухати перемикання табів (generic event від layout-plugin-nav-tabs)
    document.addEventListener('tab-switched', (e) => {
        const tabName = e.detail.tabId.replace('tab-', '');
        productsState.activeTab = tabName;

        // Lazy load таблиць при першому відкритті
        if (tabName === 'variants') {
            import('./variants-table.js').then(m => m.renderVariantsTable()).catch(() => {});
        } else if (tabName === 'groups') {
            import('./groups-table.js').then(m => m.renderGroupsTable()).catch(() => {});
        }

        runHook('onTabChange', tabName);
        runHook('onRender');
    });

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
        productsState.brands = getBrands();
        productsState.categories = getCategories();

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

