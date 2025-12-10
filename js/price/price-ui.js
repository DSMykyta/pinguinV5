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

/**
 * Заповнити таби резервів (юзерів) з аватарками в section-navigator
 */
export function populateReserveTabs() {
    const tabsContainer = document.getElementById('tabs-head-container');
    if (!tabsContainer) return;

    // Видаляємо старі таби юзерів (залишаємо тільки перший - "Прайс")
    const existingUserTabs = tabsContainer.querySelectorAll('.nav-icon[data-reserve-filter]');
    existingUserTabs.forEach(tab => tab.remove());

    // Додаємо таби для кожного резерву з аватаркою
    priceState.reserveNames.forEach(name => {
        const tab = document.createElement('button');
        tab.className = 'nav-icon';
        tab.dataset.reserveFilter = name;

        // Створюємо аватарку з ініціалами
        const initials = getInitials(name);
        const avatarColor = getAvatarColor(name);

        tab.innerHTML = `
            <span class="avatar avatar-sm" style="background-color: ${avatarColor}; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600;">${initials}</span>
            <span class="nav-icon-label">${name}</span>
        `;
        tabsContainer.appendChild(tab);
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
 */
export function populateSearchColumns() {
    const container = document.getElementById('search-columns-list-price');
    if (!container) return;

    const searchColumns = [
        { id: 'code', label: 'Код', checked: true },
        { id: 'article', label: 'Артикул', checked: true },
        { id: 'name', label: 'Назва', checked: true },
        { id: 'brand', label: 'Бренд', checked: false },
        { id: 'category', label: 'Категорія', checked: false },
        { id: 'reserve', label: 'Резерв', checked: false }
    ];

    container.innerHTML = searchColumns.map(col => `
        <label class="dropdown-item">
            <input type="checkbox" id="search-col-${col.id}" value="${col.id}" ${col.checked ? 'checked' : ''}>
            <span>${col.label}</span>
        </label>
    `).join('');

    // Зберігаємо початкові колонки для пошуку
    priceState.searchColumns = searchColumns.filter(c => c.checked).map(c => c.id);

    // Слухаємо зміни
    container.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const checked = container.querySelectorAll('input:checked');
            priceState.searchColumns = Array.from(checked).map(cb => cb.value);
            console.log('🔍 Колонки для пошуку:', priceState.searchColumns);
        }
    });

    console.log('✅ Колонки пошуку заповнено');
}

/**
 * Заповнити колонки таблиці в dropdown
 */
export function populateTableColumns() {
    const tableColumns = [
        { id: 'reserve', label: 'Резерв', checked: true },
        { id: 'code', label: 'Код', checked: true },
        { id: 'article', label: 'Артикул', checked: true },
        { id: 'product', label: 'Товар', checked: true },
        { id: 'shiping_date', label: 'Відправка', checked: true },
        { id: 'status', label: 'Викладено', checked: true },
        { id: 'check', label: 'Перевірено', checked: true },
        { id: 'payment', label: 'Оплата', checked: true },
        { id: 'update_date', label: 'Оновлено', checked: true }
    ];

    const columnSelector = createColumnSelector('table-columns-list-price', tableColumns, {
        checkboxPrefix: 'price-col',
        onChange: async (selectedIds) => {
            priceState.visibleColumns = selectedIds;
            console.log('📋 Видимі колонки:', priceState.visibleColumns);

            // Перемальовати таблицю з оновленими колонками
            const { renderPriceTable } = await import('./price-table.js');
            await renderPriceTable();
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
