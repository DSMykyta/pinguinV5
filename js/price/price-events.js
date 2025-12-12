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
import { renderPriceTable, getColumns } from './price-table.js';
import { initTableFilters } from '../common/ui-table-filter.js';

let eventsInitialized = false;
let isRestoringFilters = false; // Флаг для запобігання циклу при відновленні фільтрів

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
    const editBtn = e.target.closest('.btn-edit');
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
 * Формат data-badge-id: "code:field" (наприклад "CN16085:status")
 */
async function handleStatusBadgeClick(badge) {
    const badgeId = badge.dataset.badgeId;
    if (!badgeId) return;

    // Парсимо формат "code:field"
    const [code, field] = badgeId.split(':');
    if (!code || !field) return;

    // Визначаємо поточний стан по класу
    const currentValue = badge.classList.contains('badge-success');
    const newValue = !currentValue ? 'TRUE' : 'FALSE';

    try {
        // Показуємо loading стан
        badge.classList.add('is-loading');

        await updateItemStatus(code, field, newValue);

        // Перерендерюємо таблицю для оновлення badge
        await renderPriceTable();

    } catch (error) {
        console.error('Помилка оновлення статусу:', error);
        alert('Помилка оновлення статусу');
    } finally {
        badge.classList.remove('is-loading');
    }
}

/**
 * Оновити візуальний стан badge (deprecated - тепер використовуємо renderPriceTable)
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
 * Ініціалізувати обробники табів резервів (юзерів) та статусів
 */
function initReserveTabsEvents() {
    // Таби резервів (юзери) в section-navigator
    const sectionNavigator = document.getElementById('tabs-head-container');
    if (sectionNavigator) {
        sectionNavigator.addEventListener('click', async (e) => {
            const tabBtn = e.target.closest('.nav-icon[data-reserve-filter]');
            if (!tabBtn) return;

            // Видаляємо active з усіх табів в navigator
            sectionNavigator.querySelectorAll('.nav-icon').forEach(btn => {
                btn.classList.remove('active');
            });

            // Додаємо active до поточного
            tabBtn.classList.add('active');

            // Фільтруємо дані по резерву
            const filter = tabBtn.dataset.reserveFilter;
            priceState.currentReserveFilter = filter;

            // Скидаємо фільтр колонки reserve щоб не конфліктував з табом
            if (priceState.columnFilters && priceState.columnFilters.reserve) {
                delete priceState.columnFilters.reserve;
            }

            applyFilters();

            // Скидаємо пагінацію
            priceState.pagination.currentPage = 1;

            // Перерендерюємо таблицю
            await renderPriceTable();

            // Реініціалізуємо dropdown-и
            reinitColumnFiltersAfterRender();

            // Оновлюємо пагінацію
            if (priceState.paginationAPI) {
                priceState.paginationAPI.update({
                    totalItems: priceState.filteredItems.length,
                    currentPage: 1
                });
            }
        });
    }

    // Таби статусів
    const statusTabsContainer = document.getElementById('status-filter-tabs');
    if (statusTabsContainer) {
        statusTabsContainer.addEventListener('click', async (e) => {
            const tabBtn = e.target.closest('.nav-icon');
            if (!tabBtn) return;

            // Видаляємо active з усіх
            statusTabsContainer.querySelectorAll('.nav-icon').forEach(btn => {
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

            // Реініціалізуємо dropdown-и
            reinitColumnFiltersAfterRender();

            // Оновлюємо пагінацію
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

        // Реініціалізуємо dropdown-и
        reinitColumnFiltersAfterRender();

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

            // Реініціалізуємо dropdown-и
            reinitColumnFiltersAfterRender();

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
 * Застосувати всі фільтри (експортована версія)
 */
export function applyAllFilters() {
    applyFilters();
}

/**
 * Застосувати всі фільтри (резерв + статус + пошук + колонки)
 */
function applyFilters() {
    let items = [...priceState.priceItems];

    // 1. Фільтр по резерву (юзеру) або спеціальний фільтр
    const reserveFilter = priceState.currentReserveFilter || 'all';
    if (reserveFilter === 'not_posted') {
        // Не викладено - рядки без артикулів
        items = items.filter(item => !item.article || item.article.trim() === '');
    } else if (reserveFilter === 'suggestions') {
        // Пропозиції - варіації товарів, де інші смаки вже викладені
        items = getSuggestions(items);
    } else if (reserveFilter !== 'all') {
        // Звичайний фільтр по резерву (ім'я користувача)
        items = items.filter(item => (item.reserve || '').trim() === reserveFilter);
    }

    // 2. Фільтр по статусу (в межах обраного резерву)
    const statusFilter = priceState.currentStatusFilter || 'all';
    if (statusFilter !== 'all') {
        switch (statusFilter) {
            case 'reserved':
                // Всі зарезервовані
                items = items.filter(item => item.reserve && item.reserve.trim() !== '');
                break;
            case 'posted':
                // Викладені (status = TRUE)
                items = items.filter(item =>
                    (item.status === 'TRUE' || item.status === true)
                );
                break;
            case 'checked':
                // Перевірені (check = TRUE)
                items = items.filter(item =>
                    (item.check === 'TRUE' || item.check === true)
                );
                break;
            case 'paid':
                // Оплачені (payment = TRUE)
                items = items.filter(item =>
                    (item.payment === 'TRUE' || item.payment === true)
                );
                break;
        }
    }

    // 3. Фільтр по пошуку
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

    // 4. Фільтри по колонках (з dropdown в заголовках)
    console.log('🔧 applyFilters: columnFilters =', priceState.columnFilters);
    if (priceState.columnFilters && Object.keys(priceState.columnFilters).length > 0) {
        console.log('🔧 Applying column filters...');
        const columns = getColumns();

        items = items.filter(item => {
            for (const [columnId, allowedValues] of Object.entries(priceState.columnFilters)) {
                const column = columns.find(c => c.id === columnId);
                const itemValue = item[columnId];
                const allowedSet = new Set(allowedValues);

                if (column?.filterType === 'exists') {
                    // Фільтр по наявності значення
                    const hasValue = itemValue && itemValue.toString().trim() !== '';

                    if (allowedSet.has('__exists__') && allowedSet.has('__empty__')) {
                        // Обидва вибрані - показуємо все
                        continue;
                    } else if (allowedSet.has('__exists__') && !allowedSet.has('__empty__') && !hasValue) {
                        return false;
                    } else if (allowedSet.has('__empty__') && !allowedSet.has('__exists__') && hasValue) {
                        return false;
                    } else if (!allowedSet.has('__exists__') && !allowedSet.has('__empty__')) {
                        return false;
                    }
                } else {
                    // Звичайний фільтр по значенню
                    const normalizedValue = itemValue ? itemValue.toString().trim() : '';

                    // Якщо значення пусте - показуємо якщо пусті дозволені або фільтр не активний
                    if (!normalizedValue) {
                        continue;
                    }

                    if (!allowedSet.has(normalizedValue)) {
                        return false;
                    }
                }
            }
            return true;
        });
    }

    // 5. Застосувати сортування якщо є збережений стан
    if (priceState.sortState?.column && priceState.sortState?.direction) {
        items = applySorting(items, priceState.sortState.column, priceState.sortState.direction);
    }

    priceState.filteredItems = items;
}

/**
 * Застосувати сортування до масиву
 */
function applySorting(items, column, direction) {
    const columnTypes = {
        code: 'string',
        article: 'string',
        product: 'product',
        reserve: 'string',
        status: 'boolean',
        check: 'boolean',
        payment: 'boolean',
        shiping_date: 'string',
        update_date: 'date'
    };

    const type = columnTypes[column] || 'string';
    const multiplier = direction === 'asc' ? 1 : -1;

    return [...items].sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        // Для product - сортуємо по name
        if (type === 'product') {
            aVal = a.name || '';
            bVal = b.name || '';
        }

        // Для boolean
        if (type === 'boolean') {
            aVal = (aVal === 'TRUE' || aVal === true) ? 1 : 0;
            bVal = (bVal === 'TRUE' || bVal === true) ? 1 : 0;
            return (aVal - bVal) * multiplier;
        }

        // Для дати
        if (type === 'date') {
            aVal = aVal ? new Date(aVal).getTime() : 0;
            bVal = bVal ? new Date(bVal).getTime() : 0;
            return (aVal - bVal) * multiplier;
        }

        // Для рядків
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
        return aVal.localeCompare(bVal, 'uk') * multiplier;
    });
}

/**
 * Отримати пропозиції - варіації товарів, де інші смаки/розміри вже викладені
 * Товар вважається варіацією якщо brand + name + packaging однакові
 */
function getSuggestions(items) {
    // Групуємо товари по brand + name + packaging (без flavor)
    const groups = new Map();

    for (const item of items) {
        const key = `${item.brand || ''}|${item.name || ''}|${item.packaging || ''}`.toLowerCase();
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(item);
    }

    const suggestions = [];

    for (const [key, groupItems] of groups) {
        // Шукаємо групи де є хоча б один викладений товар (з артикулом)
        const hasPosted = groupItems.some(item => item.article && item.article.trim() !== '');

        if (hasPosted) {
            // Додаємо всі НЕ викладені товари з цієї групи як пропозиції
            const notPosted = groupItems.filter(item => !item.article || item.article.trim() === '');
            suggestions.push(...notPosted);
        }
    }

    return suggestions;
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
 * Ініціалізація фільтрів та сортування колонок для таблиці прайсу
 * (Об'єднано в одну функцію - сортування тепер в dropdown меню)
 */
export function initPriceColumnFilters() {
    const container = document.getElementById('price-table-container');
    if (!container) {
        console.warn('⚠️ price-table-container не знайдено');
        return null;
    }

    const columns = getColumns();
    const hasDropdownColumns = columns.some(col => col.filterable || col.sortable);

    if (!hasDropdownColumns) {
        console.log('ℹ️ Немає колонок з filterable або sortable: true');
        return null;
    }

    const columnTypes = {
        code: 'string',
        article: 'string',
        product: 'product',
        reserve: 'string',
        status: 'boolean',
        check: 'boolean',
        payment: 'boolean',
        shiping_date: 'string',
        update_date: 'date'
    };

    const filterAPI = initTableFilters(container, {
        dataSource: () => priceState.priceItems,
        columns: columns,
        columnTypes: columnTypes,
        onFilter: async (activeFilters) => {
            // Пропускаємо якщо це відновлення стану
            if (isRestoringFilters) return;

            // Зберігаємо фільтри в state
            priceState.columnFilters = activeFilters;

            // Застосовуємо всі фільтри
            applyFilters();

            // Скидаємо пагінацію
            priceState.pagination.currentPage = 1;

            // Перерендерюємо таблицю
            await renderPriceTable();

            // Реініціалізуємо dropdown-и після рендерингу (з відновленням стану фільтрів)
            reinitColumnFiltersAfterRender();

            // Оновлюємо пагінацію
            if (priceState.paginationAPI) {
                priceState.paginationAPI.update({
                    totalItems: priceState.filteredItems.length,
                    currentPage: 1
                });
            }
        },
        onSort: async (sortedData, newSortState) => {
            // Зберігаємо стан сортування
            priceState.sortState = {
                column: newSortState.column,
                direction: newSortState.direction
            };

            // Застосовуємо фільтри (які тепер включають сортування)
            applyFilters();

            // Перерендерюємо таблицю
            await renderPriceTable();

            // Реініціалізуємо dropdown-и після рендерингу
            reinitColumnFiltersAfterRender();
        }
    });

    priceState.columnFiltersAPI = filterAPI;
    console.log('✅ Фільтри та сортування колонок прайсу ініціалізовано');
    return filterAPI;
}

/**
 * Реініціалізувати фільтри/сортування після рендерингу таблиці
 * (Викликається після renderPriceTable)
 */
function reinitColumnFiltersAfterRender() {
    // Якщо вже є API - знищуємо
    if (priceState.columnFiltersAPI) {
        priceState.columnFiltersAPI.destroy();
    }

    const container = document.getElementById('price-table-container');
    if (!container) return;

    // Перевіряємо чи є заголовок таблиці (якщо таблиця порожня - не реініціалізуємо)
    const hasHeader = container.querySelector('.pseudo-table-header');
    if (!hasHeader) {
        console.log('ℹ️ Таблиця порожня, пропускаємо реініціалізацію фільтрів');
        return;
    }

    const columns = getColumns();
    const columnTypes = {
        code: 'string',
        article: 'string',
        product: 'product',
        reserve: 'string',
        status: 'boolean',
        check: 'boolean',
        payment: 'boolean',
        shiping_date: 'string',
        update_date: 'date'
    };

    // Зберігаємо поточні фільтри перед перестворенням
    const savedFilters = priceState.columnFilters ? { ...priceState.columnFilters } : null;

    const filterAPI = initTableFilters(container, {
        dataSource: () => priceState.priceItems,
        columns: columns,
        columnTypes: columnTypes,
        onFilter: async (activeFilters) => {
            // Пропускаємо якщо це відновлення стану
            if (isRestoringFilters) return;

            priceState.columnFilters = activeFilters;
            applyFilters();
            priceState.pagination.currentPage = 1;
            await renderPriceTable();
            reinitColumnFiltersAfterRender();
            if (priceState.paginationAPI) {
                priceState.paginationAPI.update({
                    totalItems: priceState.filteredItems.length,
                    currentPage: 1
                });
            }
        },
        onSort: async (sortedData, newSortState) => {
            priceState.sortState = {
                column: newSortState.column,
                direction: newSortState.direction
            };
            applyFilters();
            await renderPriceTable();
            reinitColumnFiltersAfterRender();
        }
    });

    // Відновлюємо попередній стан фільтрів (з флагом щоб не викликати callback)
    if (savedFilters && Object.keys(savedFilters).length > 0) {
        isRestoringFilters = true;
        filterAPI.setFilters(savedFilters);
        isRestoringFilters = false;
    }

    // Відновлюємо попередній стан сортування (без виклику callback)
    if (priceState.sortState?.column && priceState.sortState?.direction) {
        // Використовуємо внутрішній метод оновлення індикаторів без тригера
        const trigger = container.querySelector(`[data-filter-column="${priceState.sortState.column}"].btn-filter`);
        if (trigger) {
            trigger.classList.add('is-filtered');
        }
        // Оновлюємо кнопки сортування
        const body = container.querySelector(`[data-filter-body="${priceState.sortState.column}"]`);
        if (body) {
            body.querySelectorAll('[data-sort-column]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.sortDirection === priceState.sortState.direction);
            });
        }
    }

    priceState.columnFiltersAPI = filterAPI;
}

/**
 * Deprecated: Ініціалізація сортування (тепер інтегровано в initPriceColumnFilters)
 */
export function initPriceSorting() {
    console.log('ℹ️ initPriceSorting deprecated - сортування тепер в dropdown меню фільтрів');
    return null;
}
