// js/brands/lines-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRAND LINES - TABLE RENDERING                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — можна видалити, система працюватиме без таблиці лінійок.
 *
 * Рендеринг таблиці лінійок брендів з підтримкою пагінації та фільтрації.
 */

import { registerBrandsPlugin } from './brands-plugins.js';
import { getBrandLines } from './lines-data.js';
import { getBrandById } from './brands-data.js';
import { brandsState } from './brands-state.js';
import { createTable, col } from '../common/table/table-main.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../common/ui-actions.js';

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ОБРОБНИКІВ ДІЙ
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('brand-lines', {
    edit: async (rowId) => {
        const { showEditLineModal } = await import('./lines-crud.js');
        await showEditLineModal(rowId);
    }
});

// Table API instance
let linesTableAPI = null;
let _actionCleanup = null;

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати конфігурацію колонок для таблиці лінійок
 */
export function getLinesColumns() {
    return [
        col('line_id', 'ID', 'word-chip'),
        col('_brandName', 'Бренд', 'text'),
        col('name_uk', 'Назва лінійки', 'name'),
        col('_hasLogo', 'Логотип', 'status-dot', { className: 'cell-xs cell-center' })
    ];
}

/**
 * Збагачує дані лінійок обчисленими полями
 */
function enrichLinesData(lines) {
    return lines.map(l => ({
        ...l,
        _brandName: getBrandById(l.brand_id)?.name_uk || l.brand_id || '—',
        _hasLogo: l.line_logo_url ? 'active' : 'inactive'
    }));
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLE API INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати таблицю лінійок (викликається один раз)
 */
function initLinesTableAPI() {
    const container = document.getElementById('lines-table-container');
    if (!container || linesTableAPI) return;

    const visibleCols = brandsState.linesVisibleColumns.length > 0
        ? brandsState.linesVisibleColumns
        : ['line_id', '_brandName', 'name_uk'];

    linesTableAPI = createTable(container, {
        columns: getLinesColumns(),
        visibleColumns: visibleCols,
        rowActionsHeader: ' ',
        rowActions: (row) => actionButton({
            action: 'edit',
            rowId: row.line_id,
            context: 'brand-lines'
        }),
        getRowId: (row) => row.line_id,
        emptyState: {
            message: 'Лінійки не знайдено'
        },
        withContainer: false,
        onAfterRender: (container) => {
            if (_actionCleanup) _actionCleanup();
            _actionCleanup = initActionHandlers(container, 'brand-lines');
        },
        plugins: {
            sorting: {
                dataSource: () => enrichLinesData(brandsState.brandLines || []),
                onSort: async (sortedData) => {
                    brandsState.brandLines = sortedData;
                    renderLinesTable();
                },
                columnTypes: {
                    line_id: 'id-text',
                    _brandName: 'string',
                    name_uk: 'string'
                }
            }
        }
    });

    // Зберігаємо в state
    brandsState.linesTableAPI = linesTableAPI;
}

/**
 * Отримати пагіновані дані лінійок
 */
function getLinesPagedData() {
    const lines = enrichLinesData(getBrandLines());
    const filteredLines = applyFilters(lines);

    // Зберігаємо totalItems в state для коректного перемикання табів
    brandsState.linesPagination.totalItems = filteredLines.length;

    const { currentPage, pageSize } = brandsState.linesPagination;
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, filteredLines.length);

    return {
        all: lines,
        filtered: filteredLines,
        paginated: filteredLines.slice(start, end)
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Оновити тільки рядки таблиці лінійок (заголовок залишається)
 */
export function renderLinesTableRowsOnly() {
    if (brandsState.activeTab !== 'lines') return;

    if (!linesTableAPI) {
        renderLinesTable();
        return;
    }

    const { all, filtered, paginated } = getLinesPagedData();

    // Оновлюємо пагінацію
    if (brandsState.paginationAPI) {
        brandsState.paginationAPI.update({
            currentPage: brandsState.linesPagination.currentPage,
            pageSize: brandsState.linesPagination.pageSize,
            totalItems: filtered.length
        });
    }

    // Оновлюємо тільки рядки
    linesTableAPI.updateRows(paginated);

    updateStats(filtered.length, all.length);
}

/**
 * Рендерити таблицю лінійок (повний рендер)
 */
export function renderLinesTable() {
    // Перевіряємо чи активний таб лінійок
    if (brandsState.activeTab !== 'lines') {
        return;
    }


    const container = document.getElementById('lines-table-container');
    if (!container) return;

    const lines = getBrandLines();
    if (!lines || lines.length === 0) {
        renderEmptyState();
        return;
    }

    // Ініціалізуємо API якщо потрібно
    if (!linesTableAPI) {
        initLinesTableAPI();
    }

    const { all, filtered, paginated } = getLinesPagedData();

    // Оновити пагінацію
    if (brandsState.paginationAPI) {
        brandsState.paginationAPI.update({
            currentPage: brandsState.linesPagination.currentPage,
            pageSize: brandsState.linesPagination.pageSize,
            totalItems: filtered.length
        });
    }

    // Повний рендер таблиці
    linesTableAPI.render(paginated);

    // Оновити статистику
    updateStats(filtered.length, all.length);

}

// ═══════════════════════════════════════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Застосувати фільтри
 * @param {Array} lines - Масив лінійок
 * @returns {Array} Відфільтровані лінійки
 */
function applyFilters(lines) {
    let filtered = [...lines];

    // Пошук
    if (brandsState.linesSearchQuery) {
        const query = brandsState.linesSearchQuery.toLowerCase();
        const columns = brandsState.linesSearchColumns || ['line_id', 'name_uk', '_brandName'];

        filtered = filtered.filter(line => {
            return columns.some(column => {
                const value = line[column];
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
    const container = document.getElementById('lines-table-container');
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
    const statsEl = document.getElementById('tab-stats-lines');
    if (!statsEl) return;

    statsEl.textContent = `Показано ${visible} з ${total}`;
}

/**
 * Скинути linesTableAPI (для реініціалізації)
 */
export function resetLinesTableAPI() {
    linesTableAPI = null;
    brandsState.linesTableAPI = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

// Реєструємо на хук onInit — рендеримо таблицю після завантаження даних
registerBrandsPlugin('onInit', () => {
    if (brandsState.activeTab === 'lines') {
        renderLinesTable();
    }
});

// Реєструємо на хук onRender — для оновлення таблиці
registerBrandsPlugin('onRender', () => {
    if (brandsState.activeTab === 'lines') {
        renderLinesTable();
    }
});

// Реєструємо на хук onTabChange — для рендерингу при перемиканні табу
registerBrandsPlugin('onTabChange', (tab) => {
    if (tab === 'lines') {
        renderLinesTable();
    }
});

