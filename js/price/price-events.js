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
import { renderPriceTable, renderPriceTableRowsOnly, getColumns } from './price-table.js';
import { initTableSorting, updateSortIndicators } from '../common/ui-table-controls.js';

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
    container.addEventListener('focusout', handleArticleBlur);

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
 * Обробник клавіатури (Enter для збереження артикулу)
 */
async function handleTableKeydown(e) {
    const articleInput = e.target.closest('.input-article');
    if (!articleInput) return;

    // Enter - зберегти і вийти
    if (e.key === 'Enter') {
        e.preventDefault();
        articleInput.blur(); // Викличе handleArticleBlur
    }
}

/**
 * Обробник втрати фокусу - зберегти артикул
 */
async function handleArticleBlur(e) {
    const articleInput = e.target.closest('.input-article');
    if (!articleInput) return;

    const code = articleInput.dataset.code;
    const value = articleInput.value.trim();

    if (code && value) {
        try {
            await updateItemArticle(code, value);
            // Замінюємо input на span
            articleInput.replaceWith(createArticleSpan(value));
        } catch (error) {
            console.error('Помилка збереження артикулу:', error);
            alert('Помилка збереження артикулу');
        }
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

        // Тільки рядки - заголовок з dropdown-ами НЕ чіпаємо!
        await renderPriceTableRowsOnly();

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

            // Тільки рядки - заголовок з dropdown-ами НЕ чіпаємо!
            await renderPriceTableRowsOnly();

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

            // Тільки рядки - заголовок з dropdown-ами НЕ чіпаємо!
            await renderPriceTableRowsOnly();

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

        // Тільки рядки - заголовок з dropdown-ами НЕ чіпаємо!
        await renderPriceTableRowsOnly();

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
            // Тільки рядки - заголовок з dropdown-ами НЕ чіпаємо!
            await renderPriceTableRowsOnly();

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
        const cols = priceState.searchColumns || ['code', 'article', 'brand', 'name', 'category', 'packaging', 'flavor'];

        items = items.filter(item => {
            return cols.some(col => {
                const val = item[col];
                return val && String(val).toLowerCase().includes(query);
            });
        });
    }

    // 4. Фільтри по колонках (з dropdown в заголовках)
    if (priceState.columnFilters && Object.keys(priceState.columnFilters).length > 0) {
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

                    if (normalizedValue) {
                        // Є значення - перевіряємо чи воно дозволене
                        if (!allowedSet.has(normalizedValue)) {
                            return false;
                        }
                    } else {
                        // Порожнє значення - перевіряємо чи дозволено __empty__
                        if (!allowedSet.has('__empty__')) {
                            return false;
                        }
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

    // Кнопка "Зарезервувати" - резервує на поточного авторизованого користувача
    document.getElementById('batch-reserve-btn')?.addEventListener('click', async () => {
        const selected = getSelectedCodes();
        if (selected.length === 0) return;

        // Перевіряємо авторизацію
        if (!window.isAuthorized || !window.currentUser) {
            alert('Потрібно авторизуватися для резервування');
            return;
        }

        const userName = window.currentUser.display_name;
        if (!userName) {
            alert('Не вдалося отримати ім\'я користувача');
            return;
        }

        // Перевіряємо чи є вже зарезервовані товари
        const alreadyReserved = selected.filter(code => {
            const item = priceState.priceItems.find(i => i.code === code);
            return item && item.reserve && item.reserve.trim() !== '';
        });

        if (alreadyReserved.length > 0) {
            alert(`${alreadyReserved.length} товар(ів) вже зарезервовано іншими користувачами. Змінити резерв можна тільки через кнопку редагування.`);
            // Фільтруємо тільки незарезервовані
            const toReserve = selected.filter(code => !alreadyReserved.includes(code));
            if (toReserve.length === 0) return;
            await batchReserve(toReserve, userName);
        } else {
            await batchReserve(selected, userName);
        }
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

    // Кнопка "Скасувати вибір"
    document.getElementById('batch-clear-btn')?.addEventListener('click', () => {
        clearSelection();
    });

    function updateBatchBar() {
        const checkboxes = container.querySelectorAll('.row-checkbox:checked');
        const count = checkboxes.length;

        if (count > 0) {
            batchBar.classList.add('visible');
            if (selectedCount) selectedCount.textContent = count;
        } else {
            batchBar.classList.remove('visible');
        }
    }

    function getSelectedCodes() {
        const checkboxes = container.querySelectorAll('.row-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.dataset.code);
    }

    function clearSelection() {
        // Знімаємо всі чекбокси
        container.querySelectorAll('.row-checkbox:checked').forEach(cb => {
            cb.checked = false;
        });
        // Знімаємо "вибрати все"
        const selectAll = document.getElementById('select-all-price');
        if (selectAll) selectAll.checked = false;
        // Оновлюємо панель
        updateBatchBar();
    }

    async function batchReserve(codes, userName) {
        try {
            const { reserveItem } = await import('./price-data.js');
            for (const code of codes) {
                await reserveItem(code, userName);
            }
            clearSelection();
            await renderPriceTableRowsOnly();
        } catch (error) {
            console.error('Batch reserve error:', error);
            alert('Помилка масового резервування');
        }
    }

    async function batchUpdateStatus(codes, field, value) {
        try {
            for (const code of codes) {
                await updateItemStatus(code, field, value);
            }
            clearSelection();
            // Тільки рядки - заголовок з dropdown-ами НЕ чіпаємо!
            await renderPriceTableRowsOnly();
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
        const icon = refreshBtn.querySelector('.material-symbols-outlined');
        if (icon) icon.classList.add('is-spinning');

        try {
            const { loadPriceData } = await import('./price-data.js');
            await loadPriceData();

            // Застосовуємо поточний фільтр
            filterByReserve(priceState.currentReserveFilter);

            // Повний перерендер бо нові дані з сервера
            await renderPriceTable();

            // Реініціалізуємо фільтри з новими даними
            reinitColumnFiltersAfterRender();

            // Оновлюємо пагінацію
            if (priceState.paginationAPI) {
                priceState.paginationAPI.update({
                    totalItems: priceState.filteredItems.length
                });
            }
        } catch (error) {
            console.error('Помилка оновлення:', error);
        } finally {
            if (icon) icon.classList.remove('is-spinning');
        }
    });
}

/**
 * Ініціалізація сортування та фільтрації колонок для таблиці прайсу
 * - Клік по заголовку = сортування
 * - Hover 2 сек на заголовку з .filterable = dropdown з фільтрами
 */
export function initPriceColumnFilters() {
    const container = document.getElementById('price-table-container');
    if (!container) {
        console.warn('⚠️ price-table-container не знайдено');
        return null;
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

    // Колонки з фільтрами (для hover dropdown)
    const filterColumns = columns
        .filter(col => col.filterable)
        .map(col => ({
            id: col.id,
            label: col.label,
            filterType: col.filterType || 'values'
        }));

    const sortAPI = initTableSorting(container, {
        dataSource: () => priceState.priceItems,
        columnTypes: columnTypes,
        filterColumns: filterColumns,
        onSort: async (sortedData) => {
            // Зберігаємо стан сортування
            const sortState = sortAPI.getState();
            priceState.sortState = {
                column: sortState.column,
                direction: sortState.direction
            };

            // Застосовуємо фільтри (які тепер включають сортування)
            applyFilters();

            // Перерендерюємо ТІЛЬКИ РЯДКИ таблиці
            await renderPriceTableRowsOnly();

            // Відновлюємо індикатори сортування після рендерингу
            if (sortState.column && sortState.direction) {
                updateSortIndicators(container, sortState.column, sortState.direction);
            }
        },
        onFilter: async (activeFilters) => {
            // Пропускаємо якщо це відновлення стану
            if (isRestoringFilters) return;

            // Зберігаємо фільтри в state
            priceState.columnFilters = activeFilters;

            // Застосовуємо всі фільтри
            applyFilters();

            // Скидаємо пагінацію
            priceState.pagination.currentPage = 1;

            // Перерендерюємо ТІЛЬКИ РЯДКИ таблиці
            await renderPriceTableRowsOnly();

            // Оновлюємо пагінацію
            if (priceState.paginationAPI) {
                priceState.paginationAPI.update({
                    totalItems: priceState.filteredItems.length,
                    currentPage: 1
                });
            }
        }
    });

    priceState.columnFiltersAPI = sortAPI;
    console.log('✅ Сортування та фільтрація колонок прайсу ініціалізовано');
    return sortAPI;
}

/**
 * Реініціалізувати сортування/фільтрацію після рендерингу таблиці
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
        console.log('ℹ️ Таблиця порожня, пропускаємо реініціалізацію');
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

    // Колонки з фільтрами (для hover dropdown)
    const filterColumns = columns
        .filter(col => col.filterable)
        .map(col => ({
            id: col.id,
            label: col.label,
            filterType: col.filterType || 'values'
        }));

    const sortAPI = initTableSorting(container, {
        dataSource: () => priceState.priceItems,
        columnTypes: columnTypes,
        filterColumns: filterColumns,
        onSort: async (sortedData) => {
            const sortState = sortAPI.getState();
            priceState.sortState = {
                column: sortState.column,
                direction: sortState.direction
            };
            applyFilters();
            await renderPriceTableRowsOnly();

            if (sortState.column && sortState.direction) {
                updateSortIndicators(container, sortState.column, sortState.direction);
            }
        },
        onFilter: async (activeFilters) => {
            if (isRestoringFilters) return;

            priceState.columnFilters = activeFilters;
            applyFilters();
            priceState.pagination.currentPage = 1;
            await renderPriceTableRowsOnly();

            if (priceState.paginationAPI) {
                priceState.paginationAPI.update({
                    totalItems: priceState.filteredItems.length,
                    currentPage: 1
                });
            }
        }
    });

    // Відновлюємо попередній стан фільтрів
    if (savedFilters && Object.keys(savedFilters).length > 0) {
        isRestoringFilters = true;
        sortAPI.setFilters(savedFilters);
        isRestoringFilters = false;
    }

    // Відновлюємо попередній стан сортування
    if (priceState.sortState?.column && priceState.sortState?.direction) {
        updateSortIndicators(container, priceState.sortState.column, priceState.sortState.direction);
    }

    priceState.columnFiltersAPI = sortAPI;
}

/**
 * Deprecated: Ініціалізація сортування (тепер інтегровано в initPriceColumnFilters)
 */
export function initPriceSorting() {
    console.log('ℹ️ initPriceSorting deprecated - сортування тепер в dropdown меню фільтрів');
    return null;
}
