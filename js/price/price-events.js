// js/price/price-events.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - EVENT HANDLERS                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Обробники подій для таблиці прайсу.
 * Пошук, колонки, сортування, column filters — через createManagedTable (price-table.js).
 */

import { priceState } from './price-init.js';
import { updateItemStatus, updateItemArticle } from './price-data.js';
import { renderPriceTable, renderPriceTableRowsOnly } from './price-table.js';
import { showToast } from '../common/ui-toast.js';

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
    container.addEventListener('focusout', handleArticleBlur);

    // Обробник табів резервів
    initReserveTabsEvents();

    // Обробник charm:refresh
    initRefreshHandler();

    // Обробник batch actions
    initBatchActions();
}

/**
 * Обробник кліків по таблиці
 */
async function handleTableClick(e) {
    const badge = e.target.closest('.badge.clickable');
    if (badge) {
        e.preventDefault();
        await handleStatusBadgeClick(badge);
        return;
    }

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

    if (e.key === 'Enter') {
        e.preventDefault();
        articleInput.blur();
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
            articleInput.replaceWith(createArticleSpan(value));
        } catch (error) {
            console.error('Помилка збереження артикулу:', error);
            showToast('Помилка збереження артикулу', 'error');
        }
    }
}

/**
 * Обробник кліку по badge статусу
 */
async function handleStatusBadgeClick(badge) {
    const badgeId = badge.dataset.badgeId;
    if (!badgeId) return;

    const [code, field] = badgeId.split(':');
    if (!code || !field) return;

    // Reserve — окрема логіка
    if (field === 'reserve') {
        try {
            const { getCurrentUserName } = await import('../common/avatar/avatar-state.js');
            const { reserveItem } = await import('./price-data.js');
            const userName = getCurrentUserName();
            if (!userName) return;

            badge.classList.add('is-loading');
            await reserveItem(code, userName);
            renderPriceTableRowsOnly();
        } catch (error) {
            console.error('Помилка резервування:', error);
        } finally {
            badge.classList.remove('is-loading');
        }
        return;
    }

    const currentValue = badge.classList.contains('c-green');
    const newValue = !currentValue ? 'TRUE' : 'FALSE';

    try {
        badge.classList.add('is-loading');
        await updateItemStatus(code, field, newValue);
        renderPriceTableRowsOnly();
    } catch (error) {
        console.error('Помилка оновлення статусу:', error);
        showToast('Помилка оновлення статусу', 'error');
    } finally {
        badge.classList.remove('is-loading');
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
    const sectionNavigator = document.getElementById('tabs-head-container');
    if (sectionNavigator) {
        sectionNavigator.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.btn-icon.expand[data-reserve-filter]');
            if (!tabBtn) return;

            sectionNavigator.querySelectorAll('.btn-icon.expand').forEach(btn => {
                btn.classList.remove('active');
            });
            tabBtn.classList.add('active');

            priceState.currentReserveFilter = tabBtn.dataset.reserveFilter;

            // refilter через managed table (preFilter читає currentReserveFilter)
            renderPriceTableRowsOnly();
        });
    }

    const statusTabsContainer = document.getElementById('status-filter-tabs');
    if (statusTabsContainer) {
        statusTabsContainer.addEventListener('charm:filter', (e) => {
            priceState.currentStatusFilter = e.detail.value;
            renderPriceTableRowsOnly();
        });
    }
}

/**
 * Обробник charm:refresh на контейнері
 */
function initRefreshHandler() {
    const container = document.getElementById('price-table-container');
    if (!container) return;

    container.addEventListener('charm:refresh', (e) => {
        e.detail.waitUntil((async () => {
            const { loadPriceData } = await import('./price-data.js');
            await loadPriceData();
            renderPriceTable();
        })());
    });
}

/**
 * Ініціалізувати batch actions
 */
function initBatchActions() {
    const batchBar = document.getElementById('batch-actions-bar');
    const selectedCount = document.getElementById('selected-count');
    const container = document.getElementById('price-table-container');

    if (!container || !batchBar) return;

    container.addEventListener('change', (e) => {
        if (e.target.classList.contains('row-checkbox') || e.target.id === 'select-all-price') {
            updateBatchBar();
        }
    });

    document.getElementById('batch-reserve-btn')?.addEventListener('click', async () => {
        const selected = getSelectedCodes();
        if (selected.length === 0) return;

        if (!window.isAuthorized || !window.currentUser) {
            showToast('Потрібно авторизуватися для резервування', 'error');
            return;
        }

        const userName = window.currentUser.display_name;
        if (!userName) {
            showToast('Не вдалося отримати ім\'я користувача', 'error');
            return;
        }

        const alreadyReserved = selected.filter(code => {
            const item = priceState.priceItems.find(i => i.code === code);
            return item && item.reserve && item.reserve.trim() !== '';
        });

        if (alreadyReserved.length > 0) {
            showToast(`${alreadyReserved.length} товар(ів) вже зарезервовано іншими користувачами`, 'error');
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
        container.querySelectorAll('.row-checkbox:checked').forEach(cb => {
            cb.checked = false;
        });
        const selectAll = document.getElementById('select-all-price');
        if (selectAll) selectAll.checked = false;
        updateBatchBar();
    }

    async function batchReserve(codes, userName) {
        try {
            const { reserveItem } = await import('./price-data.js');
            for (const code of codes) {
                await reserveItem(code, userName);
            }
            clearSelection();
            renderPriceTableRowsOnly();
        } catch (error) {
            console.error('Batch reserve error:', error);
            showToast('Помилка масового резервування', 'error');
        }
    }

    async function batchUpdateStatus(codes, field, value) {
        try {
            for (const code of codes) {
                await updateItemStatus(code, field, value);
            }
            clearSelection();
            renderPriceTableRowsOnly();
        } catch (error) {
            console.error('Batch update error:', error);
            showToast('Помилка масового оновлення', 'error');
        }
    }
}

// Пошук, applyFilters, applySorting — тепер через createManagedTable (price-table.js)
