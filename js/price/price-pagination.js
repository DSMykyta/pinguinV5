// js/price/price-pagination.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - PAGINATION                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Пагінація для таблиці прайсу.
 */

import { priceState } from './price-init.js';
import { renderPriceTable } from './price-table.js';

/**
 * Ініціалізувати пагінацію для прайсу
 */
export function initPaginationForPrice() {
    const paginationContainer = document.getElementById('pagination-nav-container');
    const pageSizeSelector = document.getElementById('page-size-selector');

    if (!paginationContainer) {
        console.warn('⚠️ pagination-nav-container не знайдено');
        return;
    }

    // Створюємо API пагінації
    priceState.paginationAPI = createPaginationAPI({
        container: paginationContainer,
        totalItems: priceState.filteredItems.length,
        pageSize: priceState.pagination.pageSize,
        currentPage: priceState.pagination.currentPage,
        onPageChange: async (page) => {
            priceState.pagination.currentPage = page;
            await renderPriceTable();
        }
    });

    // Ініціалізуємо селектор розміру сторінки
    if (pageSizeSelector) {
        initPageSizeSelector(pageSizeSelector);
    }

    // Перший рендер пагінації
    priceState.paginationAPI.render();

    console.log('✅ Price pagination initialized');
}

/**
 * Створити API пагінації
 */
function createPaginationAPI(options) {
    let { container, totalItems, pageSize, currentPage, onPageChange } = options;

    const render = () => {
        const totalPages = Math.ceil(totalItems / pageSize);

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        const pages = generatePageNumbers(currentPage, totalPages);

        let html = '';

        // Кнопка "Попередня"
        html += `
            <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}"
                    data-page="${currentPage - 1}"
                    ${currentPage === 1 ? 'disabled' : ''}>
                <span class="material-symbols-outlined">chevron_left</span>
            </button>
        `;

        // Номери сторінок
        pages.forEach(page => {
            if (page === '...') {
                html += '<span class="pagination-ellipsis">...</span>';
            } else {
                html += `
                    <button class="pagination-btn ${page === currentPage ? 'active' : ''}"
                            data-page="${page}">
                        ${page}
                    </button>
                `;
            }
        });

        // Кнопка "Наступна"
        html += `
            <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}"
                    data-page="${currentPage + 1}"
                    ${currentPage === totalPages ? 'disabled' : ''}>
                <span class="material-symbols-outlined">chevron_right</span>
            </button>
        `;

        container.innerHTML = html;

        // Додаємо обробники кліків
        container.querySelectorAll('.pagination-btn:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page, 10);
                if (page !== currentPage && page >= 1 && page <= totalPages) {
                    currentPage = page;
                    onPageChange(page);
                    render();
                }
            });
        });
    };

    const update = (newOptions) => {
        if (newOptions.totalItems !== undefined) {
            totalItems = newOptions.totalItems;
        }
        if (newOptions.pageSize !== undefined) {
            pageSize = newOptions.pageSize;
        }
        if (newOptions.currentPage !== undefined) {
            currentPage = newOptions.currentPage;
        }
        render();
    };

    const goToPage = (page) => {
        const totalPages = Math.ceil(totalItems / pageSize);
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
            onPageChange(page);
            render();
        }
    };

    return { render, update, goToPage };
}

/**
 * Генерувати номери сторінок з ellipsis
 */
function generatePageNumbers(current, total) {
    const pages = [];
    const delta = 2; // Кількість сторінок з кожного боку від поточної

    if (total <= 7) {
        // Показуємо всі сторінки
        for (let i = 1; i <= total; i++) {
            pages.push(i);
        }
    } else {
        // Перша сторінка
        pages.push(1);

        // Ellipsis або сторінки
        if (current > delta + 2) {
            pages.push('...');
        }

        // Сторінки навколо поточної
        const start = Math.max(2, current - delta);
        const end = Math.min(total - 1, current + delta);

        for (let i = start; i <= end; i++) {
            if (!pages.includes(i)) {
                pages.push(i);
            }
        }

        // Ellipsis або сторінки
        if (current < total - delta - 1) {
            pages.push('...');
        }

        // Остання сторінка
        if (!pages.includes(total)) {
            pages.push(total);
        }
    }

    return pages;
}

/**
 * Ініціалізувати селектор розміру сторінки
 */
function initPageSizeSelector(selector) {
    const trigger = selector.querySelector('.page-size-trigger');
    const menu = selector.querySelector('.page-size-menu');
    const label = selector.querySelector('#page-size-label');
    const options = selector.querySelectorAll('.page-size-option');

    if (!trigger || !menu) return;

    // Toggle menu
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('is-open');
    });

    // Close on outside click
    document.addEventListener('click', () => {
        menu.classList.remove('is-open');
    });

    // Option click
    options.forEach(option => {
        option.addEventListener('click', async () => {
            const newSize = parseInt(option.dataset.pageSize, 10);

            // Оновлюємо label
            if (label) {
                label.textContent = newSize === 999999 ? 'Всі' : newSize;
            }

            // Оновлюємо state
            priceState.pagination.pageSize = newSize;
            priceState.pagination.currentPage = 1;

            // Перерендерюємо
            await renderPriceTable();

            // Оновлюємо пагінацію
            if (priceState.paginationAPI) {
                priceState.paginationAPI.update({
                    pageSize: newSize,
                    currentPage: 1
                });
            }

            menu.classList.remove('is-open');
        });
    });
}
