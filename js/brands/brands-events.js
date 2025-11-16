// js/brands/brands-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - EVENT HANDLERS                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Обробники подій для сторінки брендів.
 */

import { brandsState } from './brands-init.js';
import { renderBrandsTable, updateSorting } from './brands-table.js';
import { showAddBrandModal, showEditBrandModal, showDeleteBrandConfirm } from './brands-crud.js';
import { loadBrands } from './brands-data.js';
import { showToast } from '../common/ui-toast.js';

/**
 * Ініціалізувати всі обробники подій
 */
export function initBrandsEvents() {
    console.log('🎯 Ініціалізація обробників подій для брендів...');

    initAddButton();
    initRefreshButton();
    initFilterButtons();
    initSortingHeaders();
    initTableActions();
    initSelectAll();

    console.log('✅ Обробники подій ініціалізовано');
}

/**
 * Ініціалізувати кнопку додавання
 */
function initAddButton() {
    const addBtn = document.getElementById('btn-add-brand');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
        showAddBrandModal();
    });
}

/**
 * Ініціалізувати кнопку оновлення
 */
function initRefreshButton() {
    const refreshBtn = document.getElementById('refresh-tab-brands');
    if (!refreshBtn) return;

    refreshBtn.addEventListener('click', async () => {
        const icon = refreshBtn.querySelector('.material-symbols-outlined');
        refreshBtn.disabled = true;
        icon?.classList.add('is-spinning');

        try {
            await loadBrands();
            renderBrandsTable();
            showToast('Дані оновлено', 'success');
        } catch (error) {
            console.error('❌ Помилка оновлення:', error);
            showToast('Помилка оновлення даних', 'error');
        } finally {
            setTimeout(() => {
                refreshBtn.disabled = false;
                icon?.classList.remove('is-spinning');
            }, 500);
        }
    });
}

/**
 * Ініціалізувати кнопки фільтрів
 */
function initFilterButtons() {
    const filterContainer = document.getElementById('filter-pills-tab-brands');
    if (!filterContainer) return;

    filterContainer.addEventListener('click', (e) => {
        const filterBtn = e.target.closest('.filter-pill');
        if (!filterBtn) return;

        const filter = filterBtn.dataset.filter;

        // Оновити активний стан кнопок
        filterContainer.querySelectorAll('.filter-pill').forEach(btn => {
            btn.classList.remove('active');
        });
        filterBtn.classList.add('active');

        // Застосувати фільтр
        brandsState.filter = filter;
        brandsState.pagination.currentPage = 1; // Скинути на першу сторінку

        renderBrandsTable();
    });
}

/**
 * Ініціалізувати заголовки для сортування
 */
function initSortingHeaders() {
    const headers = document.querySelectorAll('#tab-brands .sortable-header');

    headers.forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sortKey;
            if (sortKey) {
                updateSorting(sortKey);
            }
        });
    });
}

/**
 * Ініціалізувати дії в таблиці (редагування, видалення)
 */
function initTableActions() {
    const tableBody = document.querySelector('#tab-brands .pseudo-table-body');
    if (!tableBody) return;

    tableBody.addEventListener('click', (e) => {
        // Редагування
        const editBtn = e.target.closest('.btn-edit');
        if (editBtn) {
            const brandId = editBtn.dataset.brandId;
            if (brandId) {
                showEditBrandModal(brandId);
            }
            return;
        }

        // Видалення
        const deleteBtn = e.target.closest('.btn-delete');
        if (deleteBtn) {
            const brandId = deleteBtn.dataset.brandId;
            if (brandId) {
                showDeleteBrandConfirm(brandId);
            }
            return;
        }

        // Чекбокс рядка
        const checkbox = e.target.closest('.row-checkbox');
        if (checkbox) {
            const brandId = checkbox.dataset.brandId;
            if (brandId) {
                toggleRowSelection(brandId, checkbox.checked);
            }
            return;
        }
    });
}

/**
 * Ініціалізувати чекбокс "Вибрати всі"
 */
function initSelectAll() {
    const selectAllCheckbox = document.querySelector('#tab-brands .header-select-all');
    if (!selectAllCheckbox) return;

    selectAllCheckbox.addEventListener('change', (e) => {
        const checked = e.target.checked;
        const checkboxes = document.querySelectorAll('#tab-brands .row-checkbox');

        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const brandId = checkbox.dataset.brandId;
            if (brandId) {
                if (checked) {
                    brandsState.selectedIds.add(brandId);
                } else {
                    brandsState.selectedIds.delete(brandId);
                }
            }
        });

        renderBrandsTable();
    });
}

/**
 * Перемкнути вибір рядка
 * @param {string} brandId - ID бренду
 * @param {boolean} selected - Вибрано чи ні
 */
function toggleRowSelection(brandId, selected) {
    if (selected) {
        brandsState.selectedIds.add(brandId);
    } else {
        brandsState.selectedIds.delete(brandId);
    }

    renderBrandsTable();
}

/**
 * Ініціалізувати пошук
 * @param {HTMLElement} searchInput - Поле пошуку
 */
export function initBrandsSearch(searchInput) {
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        brandsState.searchQuery = e.target.value.trim();
        brandsState.pagination.currentPage = 1; // Скинути на першу сторінку
        renderBrandsTable();
    });
}
