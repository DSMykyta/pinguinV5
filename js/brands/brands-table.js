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

import { registerBrandsPlugin } from './brands-plugins.js';
import { getBrands } from './brands-data.js';
import { brandsState } from './brands-state.js';
import { createPseudoTable } from '../common/ui-table.js';
import { escapeHtml } from '../utils/text-utils.js';
import { renderAvatarState } from '../utils/avatar-states.js';

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
        {
            id: 'brand_id',
            label: 'ID',
            className: 'cell-id',
            sortable: true,
            searchable: true,
            render: (value) => `<span class="word-chip">${escapeHtml(value || '')}</span>`
        },
        {
            id: 'name_uk',
            label: 'Назва',
            sortable: true,
            searchable: true,
            className: 'cell-main-name',
            render: (value) => `<strong>${escapeHtml(value || '')}</strong>`
        },
        {
            id: 'names_alt',
            label: 'Альтернативні назви',
            sortable: true,
            searchable: true,
            render: (value) => {
                // value тепер масив
                if (Array.isArray(value) && value.length > 0) {
                    return value.map(n => `<span class="word-chip">${escapeHtml(n)}</span>`).join(' ');
                }
                return '-';
            }
        },
        {
            id: 'country_option_id',
            label: 'Країна',
            sortable: true,
            searchable: true,
            render: (value) => escapeHtml(value || '-')
        },
        {
            id: 'brand_status',
            label: 'Статус',
            sortable: true,
            className: 'cell-status',
            render: (value) => {
                const isActive = value !== 'inactive';
                const badgeClass = isActive ? 'badge-success' : 'badge-warning';
                const text = isActive ? 'Активний' : 'Неактивний';
                return `<span class="badge ${badgeClass}">${text}</span>`;
            }
        },
        {
            id: 'brand_links',
            label: 'Посилання',
            sortable: false,
            className: 'cell-links',
            render: (value) => {
                // value тепер масив [{name, url}, ...]
                if (!Array.isArray(value) || value.length === 0) {
                    return `<span class="material-symbols-outlined text-muted" title="Немає посилань">link_off</span>`;
                }

                // Показати кількість посилань
                const count = value.length;
                return `
                    <span class="badge badge-outline" title="${count} посилань">
                        <span class="material-symbols-outlined">link</span>
                        ${count}
                    </span>
                `;
            }
        }
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

    tableAPI = createPseudoTable(container, {
        columns: getColumns(),
        visibleColumns: visibleCols,
        rowActionsHeader: ' ',
        rowActionsCustom: (row) => {
            return `
                <button class="btn-icon btn-edit" data-brand-id="${escapeHtml(row.brand_id)}" title="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            `;
        },
        getRowId: (row) => row.brand_id,
        emptyState: {
            icon: 'shopping_bag',
            message: 'Бренди не знайдено'
        },
        withContainer: false,
        onAfterRender: attachRowEventHandlers
    });

    // Зберігаємо в state для доступу з інших модулів
    brandsState.tableAPI = tableAPI;
}

/**
 * Додати обробники подій для кнопок у рядках
 */
function attachRowEventHandlers(container) {
    container.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const brandId = button.dataset.brandId;
            if (brandId) {
                const { showEditBrandModal } = await import('./brands-crud.js');
                await showEditBrandModal(brandId);
            }
        });
    });
}

/**
 * Отримати пагіновані дані
 */
function getPaginatedData() {
    const brands = getBrands();
    const filteredBrands = applyFilters(brands);

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
    console.log('🎨 Рендеринг таблиці брендів...');

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

    console.log(`✅ Відрендерено ${paginated.length} з ${filtered.length} брендів`);
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

// Реєструємо на хук onRender — для оновлення таблиці
registerBrandsPlugin('onRender', () => {
    renderBrandsTable();
});

console.log('[Brands Table] Плагін завантажено');
