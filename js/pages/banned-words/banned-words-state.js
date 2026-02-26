// js/pages/banned-words/banned-words-state.js

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

    // Пагінація для кожного табу (check tabs)
    tabPaginations: {},

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

// ── Cache Utilities ──

/**
 * Отримати результати з кешу
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
