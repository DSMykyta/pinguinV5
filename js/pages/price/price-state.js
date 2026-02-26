// js/pages/price/price-state.js

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
