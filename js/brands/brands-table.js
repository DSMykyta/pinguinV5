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

/**
 * Рендерити таблицю брендів
 */
export function renderBrandsTable() {
    console.log('🎨 Рендеринг таблиці брендів...');

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
        brandsState.paginationAPI.updatePagination({
            currentPage,
            pageSize,
            totalItems: filteredBrands.length
        });
    }

    // Рендерити рядки
    const tableBody = document.querySelector('#tab-brands .pseudo-table-body');
    if (!tableBody) {
        console.error('❌ Не знайдено .pseudo-table-body');
        return;
    }

    tableBody.innerHTML = '';

    paginatedBrands.forEach(brand => {
        const row = createBrandRow(brand);
        tableBody.appendChild(row);
    });

    // Оновити статистику
    updateStats(filteredBrands.length, brands.length);

    console.log(`✅ Відрендерено ${paginatedBrands.length} з ${filteredBrands.length} брендів`);
}

/**
 * Створити рядок для бренду
 * @param {Object} brand - Бренд
 * @returns {HTMLElement} Рядок таблиці
 */
function createBrandRow(brand) {
    const row = document.createElement('div');
    row.className = 'pseudo-table-row';
    row.dataset.brandId = brand.brand_id;

    const isChecked = brand.checked === 'TRUE' || brand.checked === true;
    const isSelected = brandsState.selectedIds.has(brand.brand_id);

    row.innerHTML = `
        <div class="pseudo-table-cell cell-actions" data-column="actions">
            <input type="checkbox" class="row-checkbox" data-brand-id="${brand.brand_id}" ${isSelected ? 'checked' : ''}>
            <button class="btn-icon btn-edit" data-brand-id="${brand.brand_id}" title="Редагувати">
                <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon btn-delete" data-brand-id="${brand.brand_id}" title="Видалити">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
        <div class="pseudo-table-cell cell-id ${isChecked ? 'cell-checked' : ''}" data-column="brand_id">${brand.brand_id}</div>
        <div class="pseudo-table-cell cell-main-name" data-column="name_uk">${brand.name_uk}</div>
        <div class="pseudo-table-cell" data-column="names_alt">${brand.names_alt || '-'}</div>
        <div class="pseudo-table-cell" data-column="country_name">${brand.country_name || '-'}</div>
        <div class="pseudo-table-cell" data-column="brand_text" title="${brand.brand_text || ''}">
            ${brand.brand_text ? (brand.brand_text.substring(0, 50) + (brand.brand_text.length > 50 ? '...' : '')) : '-'}
        </div>
        <div class="pseudo-table-cell" data-column="brand_site_link">
            ${brand.brand_site_link ? `<a href="${brand.brand_site_link}" target="_blank" rel="noopener noreferrer">${brand.brand_site_link}</a>` : '-'}
        </div>
    `;

    return row;
}

/**
 * Застосувати фільтри
 * @param {Array} brands - Масив брендів
 * @returns {Array} Відфільтровані бренди
 */
function applyFilters(brands) {
    let filtered = [...brands];

    // Фільтр за статусом перевірки
    if (brandsState.filter === 'checked') {
        filtered = filtered.filter(b => b.checked === 'TRUE' || b.checked === true);
    } else if (brandsState.filter === 'unchecked') {
        filtered = filtered.filter(b => !b.checked || b.checked === 'FALSE' || b.checked === false);
    }

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
    const tableBody = document.querySelector('#tab-brands .pseudo-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `
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

    const selectedCount = brandsState.selectedIds.size;
    let text = `Показано ${visible} з ${total}`;
    if (selectedCount > 0) {
        text += ` • Вибрано ${selectedCount}`;
    }

    statsEl.textContent = text;
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
