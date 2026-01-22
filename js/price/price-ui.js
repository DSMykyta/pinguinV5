// js/price/price-ui.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - UI MANAGEMENT                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Управління UI елементами для прайсу.
 */

import { priceState } from './price-init.js';
import { createColumnSelector } from '../common/ui-table-columns.js';
import { getAvatarPath } from '../utils/avatar-loader.js';

/**
 * Заповнити таби резервів (юзерів) з аватарками в section-navigator
 */
export function populateReserveTabs() {
    // Використовуємо окремий контейнер для динамічних табів
    const reserveTabsContainer = document.getElementById('reserve-tabs-container');
    if (!reserveTabsContainer) return;

    // Очищаємо тільки динамічні таби
    reserveTabsContainer.innerHTML = '';

    // Додаємо таби для кожного резерву з аватаркою
    priceState.reserveNames.forEach(name => {
        const tab = document.createElement('button');
        tab.className = 'nav-icon';
        tab.dataset.tabTarget = 'tab-price';
        tab.dataset.reserveFilter = name;

        // Перевіряємо чи є аватар в usersMap (пробуємо оригінал і lowercase)
        const userAvatar = priceState.usersMap?.[name] || priceState.usersMap?.[name.toLowerCase()];

        if (userAvatar) {
            // Є аватар - показуємо картинку
            const avatarPath = getAvatarPath(userAvatar, 'calm');
            tab.innerHTML = `
                <img src="${avatarPath}" alt="${name}" class="avatar avatar-sm" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                <span class="nav-icon-label">${name}</span>
            `;
        } else {
            // Fallback на ініціали
            const initials = getInitials(name);
            const avatarColor = getAvatarColor(name);
            tab.innerHTML = `
                <span class="avatar avatar-sm" style="background-color: ${avatarColor}; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600;">${initials}</span>
                <span class="nav-icon-label">${name}</span>
            `;
        }
        reserveTabsContainer.appendChild(tab);
    });

    console.log(`✅ Заповнено ${priceState.reserveNames.length} табів резервів`);
}

/**
 * Отримати ініціали з імені
 */
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

/**
 * Генерувати колір аватарки на основі імені
 */
function getAvatarColor(name) {
    const colors = [
        '#f44336', '#e91e63', '#9c27b0', '#673ab7',
        '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
        '#009688', '#4caf50', '#8bc34a', '#cddc39',
        '#ffc107', '#ff9800', '#ff5722', '#795548'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

/**
 * Заповнити колонки для пошуку в aside
 * Динамічно з getColumns() - колонки з searchable: true
 */
export async function populateSearchColumns() {
    const { getColumns } = await import('./price-table.js');
    const columns = getColumns();

    // Колонки з searchable: true
    const allSearchColumns = columns
        .filter(col => col.searchable)
        .map((col, index) => ({
            id: col.id,
            label: col.label,
            checked: index < 3  // Перші 3 вибрані за замовчуванням
        }));

    // Видимі колонки таблиці
    const visibleTableColumns = priceState.visibleColumns.length > 0
        ? priceState.visibleColumns
        : columns.map(c => c.id);

    // Фільтруємо тільки ті колонки пошуку, що є серед видимих
    const allowedSearchColumns = allSearchColumns
        .map(col => col.id)
        .filter(id => visibleTableColumns.includes(id));

    createColumnSelector('search-columns-list-price', allSearchColumns, {
        checkboxPrefix: 'search-col-price',
        filterBy: allowedSearchColumns,
        onChange: (selectedIds) => {
            priceState.searchColumns = selectedIds;
            console.log('🔍 Колонки пошуку:', priceState.searchColumns);
        }
    });

    console.log('✅ Колонки пошуку заповнено');
}

/**
 * Заповнити колонки таблиці в dropdown
 * Динамічно з getColumns()
 */
export async function populateTableColumns() {
    const { getColumns } = await import('./price-table.js');
    const columns = getColumns();

    // Всі колонки для вибору видимості
    const tableColumns = columns.map(col => ({
        id: col.id,
        label: col.label,
        checked: true  // За замовчуванням всі видимі
    }));

    const columnSelector = createColumnSelector('table-columns-list-price', tableColumns, {
        checkboxPrefix: 'price-col',
        onChange: async (selectedIds) => {
            priceState.visibleColumns = selectedIds;
            console.log('📋 Видимі колонки:', priceState.visibleColumns);

            // Оновлюємо колонки пошуку відповідно до видимих колонок
            await populateSearchColumns();

            // Повний перерендер бо змінюється структура таблиці
            const { renderPriceTable } = await import('./price-table.js');
            await renderPriceTable();

            // Реініціалізуємо фільтри
            const { initPriceColumnFilters } = await import('./price-events.js');
            if (priceState.columnFiltersAPI) {
                priceState.columnFiltersAPI.destroy();
            }
            initPriceColumnFilters();
        }
    });

    if (columnSelector) {
        priceState.visibleColumns = columnSelector.getSelected();
    }

    console.log('✅ Колонки таблиці заповнено');
}

/**
 * Показати/сховати секцію
 */
export function toggleSection(sectionId, show) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    if (show) {
        section.classList.remove('u-hidden');
        section.classList.add('active');
    } else {
        section.classList.add('u-hidden');
        section.classList.remove('active');
    }
}

/**
 * Оновити активний стан навігатора табів
 */
export function updateSectionNavigator(activeTabId) {
    const navigator = document.getElementById('tabs-head-container');
    if (!navigator) return;

    navigator.querySelectorAll('.nav-icon').forEach(icon => {
        const tabTarget = icon.dataset.tabTarget;
        if (tabTarget === activeTabId) {
            icon.classList.add('active');
        } else {
            icon.classList.remove('active');
        }
    });
}
