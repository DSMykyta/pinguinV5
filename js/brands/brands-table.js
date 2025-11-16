// js/brands/brands-table.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - TABLE RENDERING                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Рендеринг таблиці брендів з підтримкою пагінації, сортування та фільтрації.
 */

import { getBrands } from './brands-data.js';
import { brandsState } from './brands-init.js';
import { renderPseudoTable } from '../common/ui-table.js';
import { escapeHtml } from '../utils/text-utils.js';

/**
 * Рендерити таблицю брендів
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

    // Застосувати фільтри
    let filteredBrands = applyFilters(brands);

    // Застосувати сортування
    filteredBrands = applySorting(filteredBrands);

    // Застосувати пагінацію
    const { currentPage, pageSize } = brandsState.pagination;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const paginatedBrands = filteredBrands.slice(start, end);

    // Оновити пагінацію
    if (brandsState.paginationAPI) {
        brandsState.paginationAPI.update({
            currentPage,
            pageSize,
            totalItems: filteredBrands.length
        });
    }

    // Рендерити таблицю через універсальний компонент
    renderPseudoTable(container, {
        data: paginatedBrands,
        columns: [
            {
                id: 'brand_id',
                label: 'ID',
                sortable: true,
                className: 'cell-id',
                render: (value) => escapeHtml(value || '')
            },
            {
                id: 'name_uk',
                label: 'Назва (UA)',
                sortable: true,
                className: 'cell-main-name',
                render: (value) => `<strong>${escapeHtml(value || '')}</strong>`
            },
            {
                id: 'names_alt',
                label: 'Альтернативні назви',
                sortable: true,
                render: (value) => escapeHtml(value || '-')
            },
            {
                id: 'country_name',
                label: 'Країна',
                sortable: true,
                render: (value) => escapeHtml(value || '-')
            },
            {
                id: 'brand_text',
                label: 'Опис',
                sortable: true,
                render: (value, row) => {
                    const text = value || '';
                    const truncated = text.length > 50 ? text.substring(0, 50) + '...' : text;
                    return text ? `<span title="${escapeHtml(text)}">${escapeHtml(truncated)}</span>` : '-';
                }
            },
            {
                id: 'brand_site_link',
                label: 'Сайт',
                sortable: true,
                render: (value) => {
                    if (!value) return '-';
                    return `<a href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer">${escapeHtml(value)}</a>`;
                }
            }
        ],
        rowActionsCustom: (row) => `
            <button class="btn-icon btn-edit" data-brand-id="${escapeHtml(row.brand_id)}" title="Редагувати">
                <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon btn-delete" data-brand-id="${escapeHtml(row.brand_id)}" title="Видалити">
                <span class="material-symbols-outlined">delete</span>
            </button>
        `,
        emptyState: {
            icon: 'shopping_bag',
            message: 'Бренди не знайдено'
        },
        withContainer: false
    });

    // Оновити статистику
    updateStats(filteredBrands.length, brands.length);

    console.log(`✅ Відрендерено ${paginatedBrands.length} з ${filteredBrands.length} брендів`);
}

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
        filtered = filtered.filter(brand => {
            return (
                brand.name_uk?.toLowerCase().includes(query) ||
                brand.names_alt?.toLowerCase().includes(query) ||
                brand.country_name?.toLowerCase().includes(query) ||
                brand.brand_text?.toLowerCase().includes(query) ||
                brand.brand_site_link?.toLowerCase().includes(query)
            );
        });
    }

    return filtered;
}

/**
 * Застосувати сортування
 * @param {Array} brands - Масив брендів
 * @returns {Array} Відсортовані бренди
 */
function applySorting(brands) {
    if (!brandsState.sortKey) return brands;

    const sorted = [...brands];
    const key = brandsState.sortKey;
    const order = brandsState.sortOrder;

    sorted.sort((a, b) => {
        let aVal = a[key] || '';
        let bVal = b[key] || '';

        // Числове сортування для ID
        if (key === 'brand_id') {
            aVal = parseInt(aVal) || 0;
            bVal = parseInt(bVal) || 0;
            return order === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Текстове сортування (кирилиця)
        const comparison = aVal.localeCompare(bVal, 'uk');
        return order === 'asc' ? comparison : -comparison;
    });

    return sorted;
}

/**
 * Відрендерити порожній стан
 */
function renderEmptyState() {
    const container = document.getElementById('brands-table-container');
    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            <span class="material-symbols-outlined">shopping_bag</span>
            <p>Немає брендів</p>
        </div>
    `;

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
 * Оновити сортування при кліку на заголовок
 * @param {string} sortKey - Ключ сортування
 */
export function updateSorting(sortKey) {
    if (brandsState.sortKey === sortKey) {
        // Toggle order
        brandsState.sortOrder = brandsState.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        brandsState.sortKey = sortKey;
        brandsState.sortOrder = 'asc';
    }

    // Оновити індикатори сортування
    updateSortIndicators();

    // Перерендерити таблицю
    renderBrandsTable();
}

/**
 * Оновити візуальні індикатори сортування
 */
function updateSortIndicators() {
    const headers = document.querySelectorAll('#tab-brands .sortable-header');
    headers.forEach(header => {
        const key = header.dataset.sortKey;
        const indicator = header.querySelector('.sort-indicator');

        if (key === brandsState.sortKey) {
            header.classList.add('sorted');
            indicator.textContent = brandsState.sortOrder === 'asc' ? '▲' : '▼';
        } else {
            header.classList.remove('sorted');
            indicator.textContent = '';
        }
    });
}
