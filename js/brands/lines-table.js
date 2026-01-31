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
import { createPseudoTable } from '../common/ui-table.js';
import { escapeHtml } from '../utils/text-utils.js';
import { renderAvatarState } from '../utils/avatar-states.js';
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

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати конфігурацію колонок для таблиці лінійок
 */
export function getLinesColumns() {
    return [
        {
            id: 'line_id',
            label: 'ID',
            className: 'cell-id',
            sortable: true,
            searchable: true,
            render: (value) => `<span class="word-chip">${escapeHtml(value || '')}</span>`
        },
        {
            id: 'brand_id',
            label: 'Бренд',
            sortable: true,
            searchable: true,
            render: (value) => {
                const brand = getBrandById(value);
                if (brand) {
                    return `<span class="word-chip">${escapeHtml(brand.name_uk)}</span>`;
                }
                return `<span class="word-chip text-muted">${escapeHtml(value || '-')}</span>`;
            }
        },
        {
            id: 'name_uk',
            label: 'Назва лінійки',
            sortable: true,
            searchable: true,
            className: 'cell-main-name',
            render: (value) => `<strong>${escapeHtml(value || '')}</strong>`
        },
        {
            id: 'line_logo_url',
            label: 'Логотип',
            sortable: false,
            className: 'cell-logo',
            render: (value) => {
                if (value) {
                    return `<span class="material-symbols-outlined text-success" title="Є логотип">image</span>`;
                }
                return `<span class="material-symbols-outlined text-muted" title="Немає логотипу">image</span>`;
            }
        }
    ];
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
        : ['line_id', 'brand_id', 'name_uk'];

    linesTableAPI = createPseudoTable(container, {
        columns: getLinesColumns(),
        visibleColumns: visibleCols,
        rowActionsHeader: ' ',
        rowActionsCustom: (row) => actionButton({
            action: 'edit',
            rowId: row.line_id,
            context: 'brand-lines'
        }),
        getRowId: (row) => row.line_id,
        emptyState: {
            icon: 'category',
            message: 'Лінійки не знайдено'
        },
        withContainer: false,
        onAfterRender: (container) => initActionHandlers(container, 'brand-lines')
    });

    // Зберігаємо в state
    brandsState.linesTableAPI = linesTableAPI;
}

/**
 * Отримати пагіновані дані лінійок
 */
function getLinesPagedData() {
    const lines = getBrandLines();
    const filteredLines = applyFilters(lines);

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

    console.log('🎨 Рендеринг таблиці лінійок...');

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

    console.log(`✅ Відрендерено ${paginated.length} з ${filtered.length} лінійок`);
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
        const columns = brandsState.linesSearchColumns || ['line_id', 'name_uk', 'brand_id'];

        filtered = filtered.filter(line => {
            return columns.some(column => {
                const value = line[column];

                // Для brand_id шукаємо також по назві бренду
                if (column === 'brand_id') {
                    const brand = getBrandById(value);
                    if (brand && brand.name_uk.toLowerCase().includes(query)) {
                        return true;
                    }
                }

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

console.log('[Lines Table] Плагін завантажено');
