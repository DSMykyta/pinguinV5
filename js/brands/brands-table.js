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
import { renderAvatarState } from '../utils/avatar-states.js';

/**
 * Отримати конфігурацію колонок для таблиці брендів
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
            render: (value) => escapeHtml(value || '-')
        },
        {
            id: 'country_option_id',
            label: 'Країна',
            sortable: true,
            searchable: true,
            render: (value) => escapeHtml(value || '-')
        },
        {
            id: 'brand_text',
            label: 'Опис',
            sortable: true,
            searchable: true,
            render: (value) => value ? escapeHtml(value) : '-'
        },
        {
            id: 'brand_site_link',
            label: ' ',
            sortable: false,
            className: 'cell-bool',
            render: (value, row) => {
                if (!value) {
                    return `<span class="material-symbols-outlined" title="Немає посилання">block</span>`;
                }
                return `
                    <button class="severity-badge severity-low btn-link" data-link="${escapeHtml(value)}" title="Відкрити сайт">
                        <span class="material-symbols-outlined">open_in_new</span>
                    </button>
                `;
            }
        }
    ];
}

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

    // Визначити які колонки показувати
    const visibleCols = brandsState.visibleColumns.length > 0
        ? brandsState.visibleColumns
        : ['brand_id', 'name_uk', 'country_option_id'];

    // Рендерити таблицю через універсальний компонент
    renderPseudoTable(container, {
        data: paginatedBrands,
        columns: getColumns(),
        visibleColumns: visibleCols,
        rowActionsHeader: ' ',
        rowActionsCustom: (row) => {
            const hasGlossary = row.glossary_text && row.glossary_text.trim();
            const eyeClass = hasGlossary ? 'severity-low' : 'severity-high';

            return `
                <button class="btn-icon btn-view-glossary ${eyeClass}" data-brand-id="${escapeHtml(row.brand_id)}" title="Переглянути глосарій">
                    <span class="material-symbols-outlined">visibility</span>
                </button>
                <button class="btn-icon btn-edit" data-brand-id="${escapeHtml(row.brand_id)}" title="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            `;
        },
        emptyState: {
            icon: 'shopping_bag',
            message: 'Бренди не знайдено'
        },
        withContainer: false
    });

    // Додати обробники для кнопок відкриття посилань
    container.querySelectorAll('.btn-link').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const link = button.dataset.link;
            if (link) {
                window.open(link, '_blank', 'noopener,noreferrer');
            }
        });
    });

    // Додати обробники для кнопок редагування
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

    // Додати обробники для кнопок перегляду глосарію
    container.querySelectorAll('.btn-view-glossary').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const brandId = button.dataset.brandId;
            if (brandId) {
                const { showGlossaryModal } = await import('./brands-crud.js');
                await showGlossaryModal(brandId);
            }
        });
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
        const columns = brandsState.searchColumns || ['brand_id', 'name_uk', 'names_alt', 'country_option_id'];

        filtered = filtered.filter(brand => {
            return columns.some(column => {
                const value = brand[column];
                return value?.toString().toLowerCase().includes(query);
            });
        });
    }

    return filtered;
}

/**
 * Відрендерити порожній стан
 */
function renderEmptyState() {
    const container = document.getElementById('brands-table-container');
    if (!container) return;

    // Використовуємо глобальну систему аватарів
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

