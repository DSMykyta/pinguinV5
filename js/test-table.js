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
        // Завантажуємо шаблон
        const template = await loadTableTemplate('table-test');

        if (!template) {
            showTableEmpty(container, 'Помилка завантаження шаблону');
            return;
        }

        // Генеруємо тестові дані
        const testData = generateTestData();

        if (testData.length === 0) {
            showTableEmpty(container, 'Немає даних для відображення');
            return;
        }

        // Заповнюємо таблицю
        populateTable(container, template, testData, {
            onRowClick: (row, data) => {
                console.log('Clicked row:', data);
                alert(`Клік на рядок ID: ${data.id}\nСлово: ${data.word}\nКатегорія: ${data.category}`);
            },
            clearExisting: true
        });

        console.log(`Test table loaded: ${testData.length} rows`);

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
