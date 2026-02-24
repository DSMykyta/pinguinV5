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
import { initTooltips } from '../../components/ui-tooltip.js';
import { initDropdowns } from '../../components/ui-dropdown.js';
import { registerAsideInitializer } from '../../layout/layout-main.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';

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

            // Charm pagination — deactivate/activate при tab switch
            const brandsContainer = document.getElementById('brands-table-container');
            const linesContainer = document.getElementById('lines-table-container');

            if (tabName === 'lines') {
                brandsContainer?._paginationCharm?.deactivate();
                linesContainer?._paginationCharm?.activate();
            } else {
                linesContainer?._paginationCharm?.deactivate();
                brandsContainer?._paginationCharm?.activate();
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
    const container = document.getElementById('brands-table-container');
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
    const container = document.getElementById('brands-table-container');
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

registerAsideInitializer('aside-brands', () => {
    const fabMenu = document.getElementById('fab-brands-aside');
    if (!fabMenu) return;

    fabMenu.addEventListener('click', async (e) => {
        if (e.target.closest('.fab-menu-trigger')) {
            fabMenu.classList.toggle('open');
            return;
        }
        const item = e.target.closest('.fab-menu-item');
        if (!item) return;

        fabMenu.classList.remove('open');

        if (item.id === 'btn-add-brand-aside') {
            const { showAddBrandModal } = await import('./brands-crud.js');
            showAddBrandModal();
        } else if (item.id === 'btn-add-line-aside') {
            const { showAddLineModal } = await import('./lines-crud.js');
            showAddLineModal();
        }
    });

    document.addEventListener('click', (e) => {
        if (!fabMenu.contains(e.target)) fabMenu.classList.remove('open');
    });
});
