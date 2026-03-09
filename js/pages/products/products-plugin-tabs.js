// js/pages/products/products-plugin-tabs.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS — TAB SWITCHING                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — перемикання табів (товари / варіанти / групи)
 */

import { productsState } from './products-state.js';
import { runHook } from './products-plugins.js';

export function init() {
    const tabButtons = document.querySelectorAll('[data-tab-target]');
    const tabContents = document.querySelectorAll('[data-tab-content]');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tabTarget;

            // Оновити активну кнопку
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Оновити видимий контент
            tabContents.forEach(content => {
                if (content.dataset.tabContent === targetTab) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });

            // Оновити стан
            const tabName = targetTab.replace('tab-', '');
            productsState.activeTab = tabName;

            // Charm pagination — deactivate/activate при tab switch
            const productsContainer = document.getElementById('products-table-container');
            const variantsContainer = document.getElementById('variants-table-container');
            const groupsContainer = document.getElementById('groups-table-container');

            // Деактивувати всі
            productsContainer?._paginationCharm?.deactivate();
            variantsContainer?._paginationCharm?.deactivate();
            groupsContainer?._paginationCharm?.deactivate();

            if (tabName === 'variants') {
                variantsContainer?._paginationCharm?.activate();
                import('./variants-table.js').then(({ renderVariantsTable }) => {
                    renderVariantsTable();
                }).catch(() => {});
            } else if (tabName === 'groups') {
                groupsContainer?._paginationCharm?.activate();
                import('./groups-table.js').then(({ renderGroupsTable }) => {
                    renderGroupsTable();
                }).catch(() => {});
            } else {
                productsContainer?._paginationCharm?.activate();
            }

            // Запустити хук
            runHook('onTabChange', tabName);
            runHook('onRender');
        });
    });
}
