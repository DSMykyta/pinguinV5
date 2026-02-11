// js/brands/brands-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - TABLE RENDERING                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — можна видалити, система працюватиме без таблиці брендів.
 *
 * Рендеринг таблиці брендів з підтримкою пагінації, сортування та фільтрації.
 */

import { registerBrandsPlugin, runHook } from './brands-plugins.js';
import { getBrands } from './brands-data.js';
import { getBrandLines } from './lines-data.js';
import { brandsState } from './brands-state.js';
import { createTable, filterData, col } from '../common/table/table-main.js';
import { escapeHtml } from '../utils/text-utils.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../common/ui-actions.js';

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ОБРОБНИКІВ ДІЙ
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('brands', {
    edit: async (rowId) => {
        const { showEditBrandModal } = await import('./brands-crud.js');
        await showEditBrandModal(rowId);
    }
});

// Table API instance
let tableAPI = null;

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати конфігурацію колонок для таблиці брендів
 * ПРИМІТКА: Колонка 'brand_text' (Опис) видалена за запитом
 */
export function getColumns() {
    return [
        col('brand_id', 'ID', 'word-chip'),
        col('name_uk', 'Назва', 'name'),
        col('names_alt', 'Альтернативні назви', 'words-list', { searchable: true }),
        col('country_option_id', 'Країна', 'text', { filterable: true }),
        col('brand_status', 'Статус', 'status-dot', { filterable: true }),
        col('brand_links', 'Посилання', 'links'),
        col('bindings', 'Лінійки', 'binding-chip')
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLE API INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати таблицю (викликається один раз)
 */
function initTableAPI() {
    const container = document.getElementById('brands-table-container');
    if (!container || tableAPI) return;

    const visibleCols = brandsState.visibleColumns.length > 0
        ? brandsState.visibleColumns
        : ['brand_id', 'name_uk', 'country_option_id', 'brand_links'];

    tableAPI = createTable(container, {
        columns: getColumns(),
        visibleColumns: visibleCols,
        rowActionsHeader: ' ',
        rowActions: (row) => actionButton({
            action: 'edit',
            rowId: row.brand_id,
            context: 'brands'
        }),
        getRowId: (row) => row.brand_id,
        emptyState: {
            message: 'Бренди не знайдено'
        },
        withContainer: false,
        onAfterRender: (container) => initActionHandlers(container, 'brands'),
        plugins: {
            sorting: {
                dataSource: () => {
                    const lines = brandsState.brandLines || [];
                    return getBrands().map(b => {
                        const count = lines.filter(l => l.brand_id === b.brand_id).length;
                        b.bindings = { count, tooltip: `Лінійок: ${count}` };
                        return b;
                    });
                },
                onSort: async (sortedData) => {
                    brandsState.brands = sortedData;
                    renderBrandsTable();
                },
                columnTypes: {
                    brand_id: 'id-text',
                    name_uk: 'string',
                    names_alt: 'string',
                    country_option_id: 'string',
                    brand_status: 'string',
                    bindings: 'binding-chip'
                }
            },
            filters: {
                dataSource: () => getBrands(),
                filterColumns: [
                    { id: 'country_option_id', label: 'Країна', filterType: 'values' },
                    { id: 'brand_status', label: 'Статус', filterType: 'values' }
                ],
                onFilter: (filters) => {
                    brandsState.columnFilters = filters;
                    brandsState.pagination.currentPage = 1;
                    runHook('onRender');
                }
            }
        }
    });

    // Зберігаємо в state для доступу з інших модулів
    brandsState.tableAPI = tableAPI;
}

/**
 * Отримати пагіновані дані
 */
function getPaginatedData() {
    const brands = getBrands();
    const lines = brandsState.brandLines || [];
    brands.forEach(b => {
        const count = lines.filter(l => l.brand_id === b.brand_id).length;
        b.bindings = { count, tooltip: `Лінійок: ${count}` };
    });
    const filteredBrands = applyFilters(brands);

    // Зберігаємо totalItems в state для коректного перемикання табів
    brandsState.pagination.totalItems = filteredBrands.length;

    const { currentPage, pageSize } = brandsState.pagination;
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, filteredBrands.length);

    return {
        all: brands,
        filtered: filteredBrands,
        paginated: filteredBrands.slice(start, end)
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Оновити тільки рядки таблиці (заголовок залишається)
 * Використовується при фільтрації/сортуванні/пагінації/пошуку
 */
export function renderBrandsTableRowsOnly() {
    if (!tableAPI) {
        renderBrandsTable();
        return;
    }

    const { all, filtered, paginated } = getPaginatedData();

    // Оновлюємо пагінацію
    if (brandsState.paginationAPI) {
        brandsState.paginationAPI.update({
            currentPage: brandsState.pagination.currentPage,
            pageSize: brandsState.pagination.pageSize,
            totalItems: filtered.length
        });
    }

    // Оновлюємо тільки рядки
    tableAPI.updateRows(paginated);

    updateStats(filtered.length, all.length);
}

/**
 * Рендерити таблицю брендів (повний рендер)
 */
export function renderBrandsTable() {

    const container = document.getElementById('brands-table-container');
    if (!container) return;

    const brands = getBrands();
    if (!brands || brands.length === 0) {
        renderEmptyState();
        return;
    }

    // Ініціалізуємо API якщо потрібно
    if (!tableAPI) {
        initTableAPI();
    }

    const { all, filtered, paginated } = getPaginatedData();

    // Оновити пагінацію
    if (brandsState.paginationAPI) {
        brandsState.paginationAPI.update({
            currentPage: brandsState.pagination.currentPage,
            pageSize: brandsState.pagination.pageSize,
            totalItems: filtered.length
        });
    }

    // Повний рендер таблиці
    tableAPI.render(paginated);

    // Оновити статистику
    updateStats(filtered.length, all.length);

}

// ═══════════════════════════════════════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Застосувати фільтри
 * @param {Array} brands - Масив брендів
 * @returns {Array} Відфільтровані бренди
 */
function applyFilters(brands) {
    let filtered = [...brands];

    // Фільтри колонок (країна, статус)
    if (brandsState.columnFilters && Object.keys(brandsState.columnFilters).length > 0) {
        const filterColumns = [
            { id: 'country_option_id', filterType: 'values' },
            { id: 'brand_status', filterType: 'values' }
        ];
        filtered = filterData(filtered, brandsState.columnFilters, filterColumns);
    }

    // Пошук
    if (brandsState.searchQuery) {
        const query = brandsState.searchQuery.toLowerCase();
        const columns = brandsState.searchColumns || ['brand_id', 'name_uk', 'names_alt', 'country_option_id'];

        filtered = filtered.filter(brand => {
            return columns.some(column => {
                const value = brand[column];

                // Масив (names_alt)
                if (Array.isArray(value)) {
                    return value.some(v => v.toLowerCase().includes(query));
                }

                // Рядок
                return value?.toString().toLowerCase().includes(query);
            });
        });
    }

    return filtered;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Відрендерити порожній стан
 */
function renderEmptyState() {
    const container = document.getElementById('brands-table-container');
    if (!container) return;

    const avatarHtml = renderAvatarState('empty', {
        size: 'medium',
        containerClass: 'empty-state-container',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });

    container.innerHTML = avatarHtml;
    updateStats(0, 0);
}

/**
 * Оновити статистику
 * @param {number} visible - Кількість видимих
 * @param {number} total - Загальна кількість
 */
function updateStats(visible, total) {
    const statsEl = document.getElementById('tab-stats-brands');
    if (!statsEl) return;

    statsEl.textContent = `Показано ${visible} з ${total}`;
}

/**
 * Скинути tableAPI (для реініціалізації)
 */
export function resetTableAPI() {
    tableAPI = null;
    brandsState.tableAPI = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

// Реєструємо на хук onInit — рендеримо таблицю після завантаження даних
registerBrandsPlugin('onInit', () => {
    renderBrandsTable();
});

// Реєструємо на хук onRender — для оновлення таблиці (тільки на активному табі)
registerBrandsPlugin('onRender', () => {
    if (brandsState.activeTab === 'brands') {
        renderBrandsTable();
    }
});

