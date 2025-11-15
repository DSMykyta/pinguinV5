/**
 * MODULE: Test Table
 *
 * ПРИЗНАЧЕННЯ:
 * Демонстрація роботи системи завантаження шаблонів таблиць
 *
 * АРХІТЕКТУРА:
 * - Незалежний модуль для тестового табу
 * - Використовує ui-table-loader.js для завантаження шаблону
 * - Генерує тестові дані
 * - Можна видалити без впливу на інші частини
 */

import {
    loadTableTemplate,
    populateTable,
    showTableLoading,
    showTableEmpty
} from './common/ui-table-loader.js';

// Стан таблиці
let tableState = {
    data: [],
    template: null,
    sortKey: 'id',
    sortDirection: 'asc'
};

/**
 * Генерує тестові дані для таблиці
 *
 * @returns {Array<Object>} Масив тестових даних
 */
function generateTestData() {
    const categories = ['Категорія 1', 'Категорія 2', 'Категорія 3', 'Без категорії'];
    const words = [
        'заборонене',
        'неприпустиме',
        'небажане',
        'проблемне',
        'контроверсійне',
        'сумнівне',
        'ризиковане',
        'помилкове',
        'тестове',
        'демонстраційне'
    ];

    const testData = [];

    for (let i = 1; i <= 10; i++) {
        const isActive = Math.random() > 0.3;
        const categoryIndex = Math.floor(Math.random() * categories.length);
        const wordIndex = Math.floor(Math.random() * words.length);

        testData.push({
            id: i,
            word: `${words[wordIndex]} ${i}`,
            category: categories[categoryIndex],
            statusBadge: isActive
                ? '<span class="chip chip-success">Активно</span>'
                : '<span class="chip chip-error">Неактивно</span>'
        });
    }

    return testData;
}

/**
 * Сортує дані за вказаним ключем
 *
 * @param {Array} data - Масив даних
 * @param {string} key - Ключ для сортування
 * @param {string} direction - Напрямок ('asc' або 'desc')
 * @returns {Array} Відсортований масив
 */
function sortData(data, key, direction) {
    return [...data].sort((a, b) => {
        let aVal = a[key];
        let bVal = b[key];

        // Для чисел
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Для рядків
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();

        if (direction === 'asc') {
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
            return bVal < aVal ? -1 : bVal > aVal ? 1 : 0;
        }
    });
}

/**
 * Оновлює індикатори сортування в header
 */
function updateSortIndicators() {
    const container = document.getElementById('test-table-container');
    if (!container) return;

    // Скидаємо всі індикатори
    container.querySelectorAll('.sortable-header').forEach(header => {
        header.classList.remove('sorted-asc', 'sorted-desc');
    });

    // Встановлюємо активний індикатор
    const activeHeader = container.querySelector(`.sortable-header[data-sort-key="${tableState.sortKey}"]`);
    if (activeHeader) {
        activeHeader.classList.add(`sorted-${tableState.sortDirection}`);
    }
}

/**
 * Відображає дані в таблиці
 */
function renderTable() {
    const container = document.getElementById('test-table-container');
    if (!container || !tableState.template) return;

    // Сортуємо дані
    const sortedData = sortData(tableState.data, tableState.sortKey, tableState.sortDirection);

    // Заповнюємо таблицю
    populateTable(container, tableState.template, sortedData, {
        onRowClick: (row, data) => {
            console.log('Clicked row:', data);
            alert(`Клік на рядок ID: ${data.id}\nСлово: ${data.word}\nКатегорія: ${data.category}`);
        },
        clearExisting: true
    });

    // Оновлюємо індикатори
    updateSortIndicators();
}

/**
 * Обробник кліку на sortable header
 */
function handleSort(sortKey) {
    if (tableState.sortKey === sortKey) {
        // Перемикаємо напрямок
        tableState.sortDirection = tableState.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // Нова колонка - починаємо з asc
        tableState.sortKey = sortKey;
        tableState.sortDirection = 'asc';
    }

    renderTable();
}

/**
 * Ініціалізує обробники сортування
 */
function initSorting() {
    const container = document.getElementById('test-table-container');
    if (!container) return;

    container.querySelectorAll('.sortable-header').forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sortKey;
            if (sortKey) {
                handleSort(sortKey);
            }
        });
    });
}

/**
 * Завантажує та відображає тестову таблицю
 */
async function loadTestTable() {
    const container = document.getElementById('test-table-container');

    if (!container) {
        console.error('Test table container not found');
        return;
    }

    // Показуємо стан завантаження
    showTableLoading(container, 'Завантаження шаблону...');

    try {
        // Завантажуємо шаблон (якщо ще не завантажено)
        if (!tableState.template) {
            const template = await loadTableTemplate('table-test');

            if (!template) {
                showTableEmpty(container, 'Помилка завантаження шаблону');
                return;
            }

            tableState.template = template;

            // Ініціалізуємо сортування після завантаження шаблону
            initSorting();
        }

        // Генеруємо тестові дані
        tableState.data = generateTestData();

        if (tableState.data.length === 0) {
            showTableEmpty(container, 'Немає даних для відображення');
            return;
        }

        // Відображаємо таблицю
        renderTable();

        console.log(`Test table loaded: ${tableState.data.length} rows`);

    } catch (error) {
        console.error('Error loading test table:', error);
        showTableEmpty(container, 'Помилка завантаження даних');
    }
}

/**
 * Ініціалізація тестового табу
 */
export function initTestTable() {
    console.log('Initializing test table...');

    // Кнопка оновлення
    const refreshBtn = document.getElementById('refresh-tab-test');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('Refreshing test table...');
            loadTestTable();
        });
    }

    // Завантажуємо таблицю при ініціалізації
    loadTestTable();
}

/**
 * Автоматична ініціалізація при завантаженні DOM
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTestTable);
} else {
    initTestTable();
}
