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
 * Заповнити таби резервів
 */
export function populateReserveTabs() {
    const tabsContainer = document.getElementById('reserve-filter-tabs');
    if (!tabsContainer) return;

    // Очищаємо всі крім "Всі"
    const allTab = tabsContainer.querySelector('[data-reserve-filter="all"]');
    tabsContainer.innerHTML = '';

    // Додаємо таб "Всі"
    if (allTab) {
        tabsContainer.appendChild(allTab);
    } else {
        const newAllTab = document.createElement('button');
        newAllTab.className = 'tab-btn active';
        newAllTab.dataset.reserveFilter = 'all';
        newAllTab.textContent = 'Всі';
        tabsContainer.appendChild(newAllTab);
    }

    // Додаємо таби для кожного резерву
    priceState.reserveNames.forEach(name => {
        const tab = document.createElement('button');
        tab.className = 'tab-btn';
        tab.dataset.reserveFilter = name;
        tab.textContent = name;
        tabsContainer.appendChild(tab);
    });

    console.log(`✅ Заповнено ${priceState.reserveNames.length + 1} табів резервів`);
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
        { id: 'date', label: 'Дата', checked: true }
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
 * Оновити активний стан навігатора секцій
 */
export function updateSectionNavigator(activeSectionId) {
    const navigator = document.getElementById('section-navigator');
    if (!navigator) return;

    navigator.querySelectorAll('.nav-icon').forEach(icon => {
        const href = icon.getAttribute('href');
        if (href === `#${activeSectionId}`) {
            icon.classList.add('is-active');
        } else {
            icon.classList.remove('is-active');
        }
    });
}
