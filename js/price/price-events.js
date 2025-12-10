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
function handleEditClick(btn) {
    const code = btn.dataset.code;
    console.log('Edit item:', code);
    // TODO: Відкрити модал редагування
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
 * Ініціалізувати обробники табів резервів
 */
function initReserveTabsEvents() {
    const tabsContainer = document.getElementById('reserve-filter-tabs');
    if (!tabsContainer) return;

    tabsContainer.addEventListener('click', async (e) => {
        const tabBtn = e.target.closest('.tab-btn');
        if (!tabBtn) return;

        // Видаляємо active з усіх
        tabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Додаємо active до поточного
        tabBtn.classList.add('active');

        // Фільтруємо дані
        const filter = tabBtn.dataset.reserveFilter;
        filterByReserve(filter);

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
