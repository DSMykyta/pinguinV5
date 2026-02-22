// js/price/price-init.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PRICE - MAIN INITIALIZATION MODULE                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Головний файл ініціалізації системи прайсу/чекліста викладки.
 * Координує ініціалізацію всіх модулів.
 */

import { initTooltips } from '../common/ui-tooltip.js';
import { loadAside, initAsideEvents } from './price-aside.js';
import { initPriceImport } from './price-import.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';

/**
 * Глобальний state для price модуля
 */
export const priceState = {
    // Дані
    priceItems: [],              // Всі товари з прайсу
    filteredItems: [],           // Відфільтровані товари
    importedData: [],            // Дані з імпортованого XLSX

    // Фільтри
    currentReserveFilter: 'all', // Поточний фільтр по резерву (юзеру)
    currentStatusFilter: 'all',  // Поточний фільтр по статусу
    columnFilters: {},           // Фільтри по колонках { columnId: ['value1', 'value2'] }
    columnFiltersAPI: null,      // API для управління фільтрами колонок
    searchQuery: '',             // Пошуковий запит
    searchColumns: [],           // Колонки для пошуку
    visibleColumns: [],          // Видимі колонки таблиці

    // Колонки прайсу (з Google Sheets)
    columns: [
        'code',           // Унікальний код
        'article',        // Артикул (one-time paste)
        'brand',          // Бренд
        'category',       // Категорія
        'name',           // Назва товару
        'packaging',      // Упаковка
        'flavor',         // Смак
        'shiping_date',   // Дата відправки
        'reserve',        // Резерв (display_name)
        'status',         // Викладено (TRUE/FALSE)
        'status_date',    // Дата статусу
        'check',          // Перевірено (TRUE/FALSE)
        'check_date',     // Дата перевірки
        'payment',        // Оплата (TRUE/FALSE)
        'payment_date',   // Дата оплати
        'update_date'     // Дата оновлення
    ],

    // Унікальні резерви для табів
    reserveNames: [],

    // Мапа користувачів для аватарів (display_name -> avatar)
    usersMap: {},

    // Стан сортування
    sortState: {
        column: null,
        direction: null
    },

    // API сортування
    sortAPI: null
};

/**
 * Головна функція ініціалізації модуля Price
 */
export function initPrice() {
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
    if (window.isAuthorized) {
        // Завантажити дані прайсу та користувачів паралельно
        const { loadPriceData, loadUsersData } = await import('./price-data.js');
        await Promise.all([
            loadPriceData(),
            loadUsersData()
        ]);

        // Оновити UI з даними
        await updateUIWithData();
    }
}

/**
 * Ініціалізація UI без даних
 */
async function initializeUIWithoutData() {
    // 1. Завантажити aside
    await loadAside();

    // 2. Ініціалізувати dropdowns для aside
    const { initDropdowns } = await import('../common/ui-dropdown.js');
    initDropdowns();

    // 3. Ініціалізувати імпорт (drag-drop та file input)
    initPriceImport();

    // 3. Показати порожню таблицю з аватаром
    const container = document.getElementById('price-table-container');
    if (container) {
        container.innerHTML = renderAvatarState('authLogin', {
            message: 'Авторизуйтесь для завантаження даних',
            size: 'medium',
            containerClass: 'empty-state',
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
    // 1. Ініціалізувати події aside
    initAsideEvents();

    // 2. Ініціалізувати dropdowns
    const { initDropdowns } = await import('../common/ui-dropdown.js');
    initDropdowns();

    // 3. Заповнити таби резервів (юзерів з аватарками)
    const { populateReserveTabs } = await import('./price-ui.js');
    populateReserveTabs();

    // 5. Відрендерити таблицю (createManagedTable створює колонки + пошук автоматично)
    const { renderPriceTable } = await import('./price-table.js');
    renderPriceTable();

    // 6. Ініціалізувати dropdowns
    const { initDropdowns } = await import('../common/ui-dropdown.js');
    initDropdowns();

    // 7. Ініціалізувати події таблиці
    const { initPriceEvents } = await import('./price-events.js');
    initPriceEvents();
}

/**
 * Публічна функція для оновлення таблиці
 */
export async function refreshPriceTable() {
    const { loadPriceData } = await import('./price-data.js');
    await loadPriceData();

    const { renderPriceTable } = await import('./price-table.js');
    await renderPriceTable();
}

// Експорт для window (backward compatibility)
window.refreshPriceTable = refreshPriceTable;
