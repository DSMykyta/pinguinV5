// js/banned-words/banned-words-init.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            BANNED WORDS - MAIN INITIALIZATION MODULE                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Головний файл ініціалізації системи перевірки заборонених слів.
 * Відповідає тільки за координацію ініціалізації всіх модулів.
 * Уся логіка винесена в окремі модулі.
 */

import { initTooltips } from '../common/ui-tooltip.js';
import { loadAside, initCheckPanelEvents, initManageTabEvents, initRefreshButton } from './banned-words-aside.js';
import { showAsidePanels } from './banned-words-ui.js';
import { initTabHandlers } from './banned-words-tabs.js';
import { initPaginationForBannedWords } from './banned-words-pagination.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';

/**
 * Глобальний state для banned words модуля
 */
export const bannedWordsState = {
    // Дані
    bannedWords: [],           // Список заборонених слів з таблиці Banned
    sheetNames: [],            // Назви аркушів для перевірки

    // Поточний таб
    currentTab: 'tab-manage',  // tab-manage | sheet-{name}

    // Для табу перевірки (мультиселект)
    selectedSheets: [],        // Масив обраних аркушів для перевірки
    selectedWords: [],         // Масив обраних заборонених слів для перевірки
    selectedColumns: [],       // Масив обраних колонок для перевірки
    // Зворотна сумісність (перше вибране значення)
    selectedSheet: null,       // Обраний аркуш для перевірки
    selectedWord: null,        // Обране заборонене слово для перевірки
    selectedColumn: null,      // Обрана колонка для перевірки
    checkResults: [],          // Результати останньої перевірки

    // Для табу управління
    searchQuery: '',           // Пошук в таблиці заборонених слів
    searchColumns: [],         // Колонки для пошуку
    visibleColumns: [],        // Видимі колонки таблиці
    hideChecked: false,        // Приховати перевірені рядки

    // Пагінація
    pagination: {
        currentPage: 1,
        pageSize: 10,
        totalItems: 0
    },

    // Пагінація для кожного табу
    tabPaginations: {},

    // Pagination API (зберігається для оновлення)
    paginationAPI: null,

    // Кеш для результатів перевірки
    checkCache: {
        // Структура: { "sheetName-wordId-columnName": { data: [...], timestamp: Date, ttl: 300000 } }
    },
    cacheTTL: 5 * 60 * 1000,  // 5 хвилин у мілісекундах

    // Фільтри для кожного check табу
    tabFilters: {
        // Структура: { "check-{sheet}-{word}-{column}": "all" | "checked" | "unchecked" }
    },

    // Batch actions - вибрані товари
    selectedProducts: {
        // Структура: { "check-{sheet}-{word}-{column}": Set<productId> }
    },

    // Літери колонок cheaked_line для кожного аркуша
    sheetCheckedColumns: {
        // Структура: { "sheetName": "G" }
    }
};

/**
 * Головна функція ініціалізації модуля Banned Words
 */
export function initBannedWords() {
    // Ініціалізувати tooltip систему
    initTooltips();

    // Завантажити UI одразу (без даних)
    initializeUIWithoutData();

    // Перевірити стан авторизації
    checkAuthAndLoadData();

    // Слухати події зміни авторизації
    document.addEventListener('auth-state-changed', (event) => {
        if (event.detail.isAuthorized) {
            checkAuthAndLoadData();
        }
    });
}

/**
 * Перевірити авторизацію та завантажити дані
 */
async function checkAuthAndLoadData() {
    // Перевіряємо глобальний стан авторизації з custom-auth.js
    if (window.isAuthorized) {

        // Завантажити ТІЛЬКИ заборонені слова
        const { loadBannedWords } = await import('./banned-words-data.js');
        await loadBannedWords();

        // Отримати список аркушів
        const { loadSheetNames } = await import('./banned-words-data.js');
        await loadSheetNames();

        // Оновити UI з даними
        await updateUIWithData();

        // Відновити збережені таби після перезавантаження
        const { restoreSavedTabs } = await import('./banned-words-tabs.js');
        await restoreSavedTabs();
    }
}

/**
 * Ініціалізація UI без даних (показати aside, порожні таблиці)
 */
async function initializeUIWithoutData() {
    // 1. Завантажити aside
    await loadAside();

    // 2. Ініціалізувати обробники табів (не потребує даних)
    initTabHandlers();

    // 3. Показати aside-check-panel (з селектами для перевірки)
    const checkPanel = document.getElementById('aside-check-panel');
    if (checkPanel) checkPanel.classList.remove('u-hidden');

    // 4. Показати порожню таблицю з аватаром
    const container = document.getElementById('banned-words-table-container');
    if (container) {
        container.innerHTML = renderAvatarState('authLogin', {
            message: 'Авторизуйтесь для завантаження даних',
            size: 'medium',
            containerClass: 'empty-state-container',
            avatarClass: 'empty-state-avatar',
            messageClass: 'avatar-state-message',
            showMessage: true
        });
    }
}

/**
 * Оновити UI після завантаження даних
 */
async function updateUIWithData() {
    // 1. Показати панелі з даними (заповнює dropdowns)
    showAsidePanels();

    // 2. Реініціалізувати dropdowns після заповнення
    const { initDropdowns } = await import('../common/ui-dropdown.js');
    initDropdowns();

    // 3. Ініціалізувати pagination ПЕРЕД рендерингом таблиці
    initPaginationForBannedWords();

    // 4. Відрендерити таблицю (createManagedTable створює колонки + пошук автоматично)
    const { renderBannedWordsTable, initManageTabFilters } = await import('./banned-words-manage.js');
    await renderBannedWordsTable();

    // 4.5. Ініціалізувати фільтри для табу управління
    initManageTabFilters();

    // 5. Ініціалізувати події
    const { initBannedWordsEvents } = await import('./banned-words-events.js');
    initBannedWordsEvents();

    // 6. Ініціалізувати обробники табу управління та aside
    initManageTabEvents();
    initRefreshButton();
    initCheckPanelEvents();
}

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                       CACHE UTILITIES                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Отримати результати з кешу
 * @param {string} sheetName - Назва аркуша
 * @param {string} wordId - ID заборонного слова
 * @param {string} columnName - Назва колонки
 * @returns {Array|null} Кешовані результати або null якщо кеш застарів/відсутній
 */
export function getCachedCheckResults(sheetName, wordId, columnName) {
    const cacheKey = `${sheetName}-${wordId}-${columnName}`;
    const cached = bannedWordsState.checkCache[cacheKey];

    if (!cached) {
        return null;
    }

    const now = Date.now();
    const age = now - cached.timestamp;

    if (age > bannedWordsState.cacheTTL) {
        delete bannedWordsState.checkCache[cacheKey];
        return null;
    }

    return cached.data;
}

/**
 * Зберегти результати в кеш
 * @param {string} sheetName - Назва аркуша
 * @param {string} wordId - ID заборонного слова
 * @param {string} columnName - Назва колонки
 * @param {Array} results - Результати перевірки
 */
export function setCachedCheckResults(sheetName, wordId, columnName, results) {
    const cacheKey = `${sheetName}-${wordId}-${columnName}`;

    bannedWordsState.checkCache[cacheKey] = {
        data: results,
        timestamp: Date.now()
    };
}

/**
 * Інвалідувати кеш для конкретної перевірки
 * @param {string} sheetName - Назва аркуша
 * @param {string} wordId - ID заборонного слова
 * @param {string} columnName - Назва колонки
 */
export function invalidateCheckCache(sheetName, wordId, columnName) {
    const cacheKey = `${sheetName}-${wordId}-${columnName}`;

    if (bannedWordsState.checkCache[cacheKey]) {
        delete bannedWordsState.checkCache[cacheKey];
    }
}

/**
 * Очистити весь кеш перевірок
 */
export function clearAllCheckCache() {
    bannedWordsState.checkCache = {};
}
