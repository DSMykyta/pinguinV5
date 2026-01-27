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
 * ║  ├── brands-search.js   — Пошук та фільтрація (в brands-events.js)       ║
 * ║  └── brands-ui.js       — UI компоненти (чекбокси колонок і т.д.)        ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * СТРУКТУРА ДАНИХ БРЕНДУ:
 * {
 *   brand_id: "bran-000001",
 *   name_uk: "Optimum Nutrition",
 *   names_alt: ["ON", "Optimum", "Оптимум"],     // JSON масив
 *   country_option_id: "США",                    // Поки текст, потім select
 *   brand_status: "active",                      // active | inactive
 *   brand_logo_url: "",                          // Зарезервовано для диску
 *   brand_links: [                               // JSON масив посилань
 *     { name: "ua", url: "https://..." },
 *     { name: "de", url: "https://..." }
 *   ],
 *   brand_text: "<p>HTML опис...</p>",
 *   mapper_option_id: ""                         // Зарезервовано для mapper
 * }
 */

import { brandsState } from './brands-state.js';
import { loadBrands } from './brands-data.js';
import { runHook, runHookAsync } from './brands-plugins.js';
import { initPagination } from '../common/ui-pagination.js';
import { initTooltips } from '../common/ui-tooltip.js';
import { renderAvatarState } from '../utils/avatar-states.js';

// ═══════════════════════════════════════════════════════════════════════════
// ПЛАГІНИ - можна видалити будь-який, система працюватиме
// ═══════════════════════════════════════════════════════════════════════════

const PLUGINS = [
    './brands-table.js',
    './brands-crud.js',
    './brands-events.js',
    './brands-ui.js',
];

/**
 * Завантажити плагіни динамічно
 */
async function loadPlugins() {
    console.log('[Brands] Завантаження плагінів...');

    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            console.log(`[Brands] ✅ Плагін завантажено: ${PLUGINS[index]}`);
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
    console.log('📋 Ініціалізація Brands...');

    // Ініціалізувати базові UI компоненти
    initTooltips();

    // Завантажити плагіни
    await loadPlugins();

    // Завантажити aside
    await loadAsideBrands();

    // Ініціалізувати пагінацію
    initBrandsPagination();

    // Перевірити авторизацію та завантажити дані
    await checkAuthAndLoadData();

    // Слухати події зміни авторизації
    document.addEventListener('auth-state-changed', async (event) => {
        console.log('🔐 Подія auth-state-changed:', event.detail);
        if (event.detail.isAuthorized) {
            await checkAuthAndLoadData();
        }
    });
}

/**
 * Перевірити авторизацію та завантажити дані
 */
async function checkAuthAndLoadData() {
    console.log('🔐 Перевірка авторизації...');

    if (window.isAuthorized) {
        console.log('✅ Користувач авторизований, завантажуємо дані...');

        try {
            // Завантажити бренди
            await loadBrands();

            // Запустити хук onInit для плагінів
            await runHookAsync('onInit', brandsState.brands);

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
            runHook('onRender');
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

        console.log('✅ aside-brands.html завантажено');
    } catch (error) {
        console.error('❌ Помилка завантаження aside-brands.html:', error);
    }
}
