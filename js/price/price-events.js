// js/price/price-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - EVENT HANDLERS                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Обробники подій для таблиці прайсу.
 */

import { priceState } from './price-init.js';
import { updateItemStatus, updateItemArticle, filterByReserve } from './price-data.js';
import { renderPriceTable } from './price-table.js';
import { initTableSorting } from '../common/ui-table-sort.js';

let eventsInitialized = false;

/**
 * Ініціалізувати обробники подій
 */
export function initPriceEvents() {
    if (eventsInitialized) return;
    eventsInitialized = true;

    const container = document.getElementById('price-table-container');
    if (!container) return;

    // Делегування подій на контейнер
    container.addEventListener('click', handleTableClick);
    container.addEventListener('change', handleTableChange);
    container.addEventListener('keydown', handleTableKeydown);

    // Обробник табів резервів
    initReserveTabsEvents();

    // Обробник кнопки оновлення
    initRefreshButton();

    // Обробник пошуку
    initSearchEvents();

    // Обробник batch actions
    initBatchActions();

    console.log('✅ Price events initialized');
}

/**
 * Обробник кліків по таблиці
 */
async function handleTableClick(e) {
    // Клік по badge статусу
    const badge = e.target.closest('.badge.clickable');
    if (badge) {
        e.preventDefault();
        await handleStatusBadgeClick(badge);
        return;
    }

    // Клік по кнопці редагування
    const editBtn = e.target.closest('.btn-edit-item');
    if (editBtn) {
        e.preventDefault();
        handleEditClick(editBtn);
        return;
    }
}

/**
 * Обробник зміни значень
 */
async function handleTableChange(e) {
    // Зміна в input артикулу
    const articleInput = e.target.closest('.input-article');
    if (articleInput) {
        // Артикул вводиться одноразово через paste
        return;
    }

    // Select all checkbox
    if (e.target.id === 'select-all-price') {
        handleSelectAll(e.target.checked);
        return;
    }
}

/**
 * Обробник клавіатури (для paste артикулу)
 */
async function handleTableKeydown(e) {
    const articleInput = e.target.closest('.input-article');
    if (!articleInput) return;

    // Дозволяємо тільки Ctrl+V або Cmd+V для вставки
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // Paste дозволено
        setTimeout(async () => {
            const code = articleInput.dataset.code;
            const value = articleInput.value.trim();
            if (code && value) {
                try {
                    await updateItemArticle(code, value);
                    // Замінюємо input на текст
                    articleInput.replaceWith(createArticleSpan(value));
                } catch (error) {
                    console.error('Помилка збереження артикулу:', error);
                    alert('Помилка збереження артикулу');
                }
            }
        }, 100);
    } else if (!e.ctrlKey && !e.metaKey && e.key.length === 1) {
        // Блокуємо ручний ввід
        e.preventDefault();
    }
}

/**
 * Обробник кліку по badge статусу
 */
async function handleStatusBadgeClick(badge) {
    const code = badge.dataset.code;
    const field = badge.dataset.field;
    const currentValue = badge.dataset.value === 'true';
    const newValue = !currentValue ? 'TRUE' : 'FALSE';

    try {
        // Показуємо loading стан
        badge.classList.add('is-loading');

        await updateItemStatus(code, field, newValue);

        // Оновлюємо badge
        updateBadgeVisual(badge, newValue === 'TRUE', field);

    } catch (error) {
        console.error('Помилка оновлення статусу:', error);
        alert('Помилка оновлення статусу');
    } finally {
        badge.classList.remove('is-loading');
    }
}

/**
 * Оновити візуальний стан badge
 */
function updateBadgeVisual(badge, isTrue, type) {
    badge.dataset.value = isTrue;

    if (isTrue) {
        badge.classList.remove('badge-secondary');
        badge.classList.add('badge-success');
    } else {
        badge.classList.remove('badge-success');
        badge.classList.add('badge-secondary');
    }

    const icon = badge.querySelector('.material-symbols-outlined');
    const label = badge.querySelector('.badge-label');

    if (icon) {
        icon.textContent = isTrue ? 'check' : 'close';
    }

    if (label) {
        if (type === 'status') {
            label.textContent = isTrue ? 'Викладено' : 'Не викладено';
        } else {
            label.textContent = isTrue ? 'Перевірено' : 'Не перевірено';
        }
    }
}

/**
 * Обробник кліку по кнопці редагування
 */
async function handleEditClick(btn) {
    const code = btn.dataset.code;
    const item = priceState.priceItems.find(i => i.code === code);

    if (!item) {
        console.error('Item not found:', code);
        return;
    }

    // Відкриваємо модал редагування
    const { openEditModal } = await import('./price-edit-modal.js');
    openEditModal(item);
}

/**
 * Select all handler
 */
function handleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checked;
    });
}

/**
 * Створити span для артикулу
 */
function createArticleSpan(value) {
    const span = document.createElement('span');
    span.className = 'article-value';
    span.textContent = value;
    return span;
}

/**
 * Ініціалізувати обробники табів статусів
 */
function initReserveTabsEvents() {
    const tabsContainer = document.getElementById('status-filter-tabs');
    if (!tabsContainer) return;

    tabsContainer.addEventListener('click', async (e) => {
        const tabBtn = e.target.closest('.nav-icon');
        if (!tabBtn) return;

        // Видаляємо active з усіх
        tabsContainer.querySelectorAll('.nav-icon').forEach(btn => {
            btn.classList.remove('active');
        });

        // Додаємо active до поточного
        tabBtn.classList.add('active');

        // Фільтруємо дані по статусу
        const filter = tabBtn.dataset.statusFilter;
        priceState.currentStatusFilter = filter;
        applyFilters();

        // Скидаємо пагінацію
        priceState.pagination.currentPage = 1;

        // Перерендерюємо таблицю
        await renderPriceTable();

        // Оновлюємо пагінацію
        if (priceState.paginationAPI) {
            priceState.paginationAPI.update({
                totalItems: priceState.filteredItems.length,
                currentPage: 1
            });
        }
    });
}

/**
 * Ініціалізувати пошук
 */
function initSearchEvents() {
    const searchInput = document.getElementById('search-price');
    const clearBtn = document.getElementById('clear-search-price');

    if (!searchInput) return;

    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim().toLowerCase();
        priceState.searchQuery = query;

        // Показуємо/ховаємо кнопку очистки
        if (clearBtn) {
            clearBtn.classList.toggle('u-hidden', !query);
        }

        // Фільтруємо
        applyFilters();

        // Перерендерюємо
        await renderPriceTable();

        // Оновлюємо пагінацію
        if (priceState.paginationAPI) {
            priceState.paginationAPI.update({
                totalItems: priceState.filteredItems.length,
                currentPage: 1
            });
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            searchInput.value = '';
            priceState.searchQuery = '';
            clearBtn.classList.add('u-hidden');

            applyFilters();
            await renderPriceTable();

            if (priceState.paginationAPI) {
                priceState.paginationAPI.update({
                    totalItems: priceState.filteredItems.length,
                    currentPage: 1
                });
            }
        });
    }
}

/**
 * Застосувати всі фільтри (статус + пошук)
 */
function applyFilters() {
    let items = [...priceState.priceItems];

    // Фільтр по статусу
    const statusFilter = priceState.currentStatusFilter || 'all';
    if (statusFilter !== 'all') {
        // Отримуємо поточного юзера
        const currentUser = window.currentUser?.display_name || '';

        switch (statusFilter) {
            case 'reserved':
                // Зарезервовані поточним юзером
                items = items.filter(item => item.reserve === currentUser);
                break;
            case 'posted':
                // Викладені (status = TRUE) поточним юзером
                items = items.filter(item =>
                    item.reserve === currentUser &&
                    (item.status === 'TRUE' || item.status === true)
                );
                break;
            case 'checked':
                // Перевірені (check = TRUE) поточним юзером
                items = items.filter(item =>
                    item.reserve === currentUser &&
                    (item.check === 'TRUE' || item.check === true)
                );
                break;
            case 'paid':
                // Оплачені (payment = TRUE) поточним юзером
                items = items.filter(item =>
                    item.reserve === currentUser &&
                    (item.payment === 'TRUE' || item.payment === true)
                );
                break;
        }
    }

    // Фільтр по пошуку
    if (priceState.searchQuery) {
        const query = priceState.searchQuery.toLowerCase();
        const cols = priceState.searchColumns || ['code', 'article', 'name'];

        items = items.filter(item => {
            return cols.some(col => {
                const val = item[col];
                return val && String(val).toLowerCase().includes(query);
            });
        });
    }

    priceState.filteredItems = items;
}

/**
 * Ініціалізувати batch actions
 */
function initBatchActions() {
    const batchBar = document.getElementById('batch-actions-bar');
    const selectedCount = document.getElementById('selected-count');
    const container = document.getElementById('price-table-container');

    if (!container || !batchBar) return;

    // Делегування для чекбоксів
    container.addEventListener('change', (e) => {
        if (e.target.classList.contains('row-checkbox') || e.target.id === 'select-all-price') {
            updateBatchBar();
        }
    });

    // Batch кнопки
    document.getElementById('batch-reserve-btn')?.addEventListener('click', () => {
        const selected = getSelectedCodes();
        if (selected.length === 0) return;
        // TODO: відкрити модал вибору резерву
        console.log('Резервувати:', selected);
    });

    document.getElementById('batch-status-btn')?.addEventListener('click', async () => {
        const selected = getSelectedCodes();
        if (selected.length === 0) return;
        await batchUpdateStatus(selected, 'status', 'TRUE');
    });

    document.getElementById('batch-check-btn')?.addEventListener('click', async () => {
        const selected = getSelectedCodes();
        if (selected.length === 0) return;
        await batchUpdateStatus(selected, 'check', 'TRUE');
    });

    function updateBatchBar() {
        const checkboxes = container.querySelectorAll('.row-checkbox:checked');
        const count = checkboxes.length;

        if (count > 0) {
            batchBar.classList.add('visible');
            if (selectedCount) selectedCount.textContent = `${count} вибрано`;
        } else {
            batchBar.classList.remove('visible');
        }
    }

    function getSelectedCodes() {
        const checkboxes = container.querySelectorAll('.row-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.dataset.code);
    }

    async function batchUpdateStatus(codes, field, value) {
        try {
            for (const code of codes) {
                await updateItemStatus(code, field, value);
            }
            await renderPriceTable();
        } catch (error) {
            console.error('Batch update error:', error);
            alert('Помилка масового оновлення');
        }
    }
}

/**
 * Ініціалізувати кнопку оновлення
 */
function initRefreshButton() {
    const refreshBtn = document.getElementById('refresh-tab-price');
    if (!refreshBtn) return;

    refreshBtn.addEventListener('click', async () => {
        refreshBtn.classList.add('rotating');

        try {
            const { loadPriceData } = await import('./price-data.js');
            await loadPriceData();

            // Застосовуємо поточний фільтр
            filterByReserve(priceState.currentReserveFilter);

            await renderPriceTable();

            // Оновлюємо пагінацію
            if (priceState.paginationAPI) {
                priceState.paginationAPI.update({
                    totalItems: priceState.filteredItems.length
                });
            }
        } catch (error) {
            console.error('Помилка оновлення:', error);
        } finally {
            refreshBtn.classList.remove('rotating');
        }
    });
}

/**
 * Ініціалізація сортування для таблиці прайсу
 */
export function initPriceSorting() {
    const container = document.getElementById('price-table-container');
    if (!container) {
        console.warn('⚠️ price-table-container не знайдено');
        return null;
    }

    const sortAPI = initTableSorting(container, {
        dataSource: () => priceState.filteredItems,
        onSort: async (sortedData) => {
            // Оновити масив відфільтрованих товарів
            priceState.filteredItems = sortedData;

            // Перерендерити таблицю
            await renderPriceTable();

            // Відновити візуальні індикатори після рендерингу
            const sortState = sortAPI.getState();
            if (sortState.column && sortState.direction) {
                const { updateSortIndicators } = await import('../common/ui-table-sort.js');
                updateSortIndicators(container, sortState.column, sortState.direction);
            }
        },
        columnTypes: {
            code: 'string',
            article: 'string',
            product: 'string',
            reserve: 'string',
            status: 'boolean',
            check: 'boolean',
            payment: 'boolean',
            shiping_date: 'string',
            update_date: 'date'
        }
    });

    console.log('✅ Сортування прайсу ініціалізовано');
    return sortAPI;
}
