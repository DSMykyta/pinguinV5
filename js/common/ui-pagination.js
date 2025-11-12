// js/common/ui-pagination.js
// Універсальна система пагінації (спільний модуль для всього проєкту)

/**
 * Ініціалізує пагінацію для контейнера
 * @param {HTMLElement} footerEl - Footer елемент з пагінацією
 * @param {Object} options - Опції пагінації
 * @param {Function} options.onPageChange - Callback при зміні сторінки (page, pageSize)
 * @param {number} options.currentPage - Поточна сторінка
 * @param {number} options.pageSize - Розмір сторінки
 * @param {number} options.totalItems - Загальна кількість елементів
 */
export function initPagination(footerEl, options) {
    if (!footerEl) return null;

    const paginationState = {
        currentPage: options.currentPage || 1,
        pageSize: options.pageSize || 25,
        totalItems: options.totalItems || 0,
        onPageChange: options.onPageChange || (() => {})
    };

    const navContainer = footerEl.querySelector('#pagination-nav-container') ||
                         footerEl.querySelector('.pagination-nav');
    const pageSizeSelector = footerEl.querySelector('#page-size-selector') ||
                            footerEl.querySelector('.page-size-selector');

    if (!navContainer) {
        console.warn('Pagination nav container not found');
        return null;
    }

    // Перевірка чи вже ініціалізовано (уникнути duplicate listeners)
    if (footerEl.dataset.paginationInit === 'true') {
        console.warn('⚠️ Pagination вже ініціалізовано для цього footer');
        // Оновити state і повернути існуючий API
        if (footerEl._paginationAPI) {
            footerEl._paginationAPI.updateTotalItems(options.totalItems);
            return footerEl._paginationAPI;
        }
    }
    footerEl.dataset.paginationInit = 'true';

    // Обробка кліків на кнопки пагінації
    footerEl.addEventListener('click', (event) => {
        const button = event.target.closest('.page-btn, .page-size-option');
        if (!button) return;

        const action = button.dataset.action;
        const page = button.dataset.page;
        const newPageSize = button.dataset.pageSize;

        if (newPageSize) {
            // Зміна розміру сторінки
            if (pageSizeSelector) {
                pageSizeSelector.classList.remove('is-open');
            }
            if (parseInt(newPageSize) !== paginationState.pageSize) {
                paginationState.pageSize = parseInt(newPageSize);
                paginationState.currentPage = 1;
                paginationState.onPageChange(paginationState.currentPage, paginationState.pageSize);
                updatePaginationUI(navContainer, pageSizeSelector, paginationState);
            }
        } else if (page) {
            // Клік на конкретну сторінку
            const newPageNum = parseInt(page);
            if (newPageNum !== paginationState.currentPage) {
                paginationState.currentPage = newPageNum;
                paginationState.onPageChange(paginationState.currentPage, paginationState.pageSize);
                updatePaginationUI(navContainer, pageSizeSelector, paginationState);
            }
        } else if (action) {
            // Клік на стрілки
            const totalPages = Math.ceil(paginationState.totalItems / paginationState.pageSize);
            let newPage = paginationState.currentPage;
            if (action === 'prev') newPage = Math.max(1, paginationState.currentPage - 1);
            if (action === 'next') newPage = Math.min(totalPages, paginationState.currentPage + 1);
            if (newPage !== paginationState.currentPage) {
                paginationState.currentPage = newPage;
                paginationState.onPageChange(paginationState.currentPage, paginationState.pageSize);
                updatePaginationUI(navContainer, pageSizeSelector, paginationState);
            }
        }
    });

    // Обробка відкриття/закриття page size selector
    if (pageSizeSelector) {
        pageSizeSelector.addEventListener('click', (e) => {
            if (e.target.closest('.page-size-trigger')) {
                pageSizeSelector.classList.toggle('is-open');
            }
        });

        document.addEventListener('click', (e) => {
            if (!pageSizeSelector.contains(e.target)) {
                pageSizeSelector.classList.remove('is-open');
            }
        });
    }

    // Початковий рендер
    updatePaginationUI(navContainer, pageSizeSelector, paginationState);

    const paginationAPI = {
        updateTotalItems(totalItems) {
            paginationState.totalItems = totalItems;
            updatePaginationUI(navContainer, pageSizeSelector, paginationState);
        },
        getCurrentPage() {
            return paginationState.currentPage;
        },
        getPageSize() {
            return paginationState.pageSize;
        },
        setPage(page) {
            paginationState.currentPage = page;
            updatePaginationUI(navContainer, pageSizeSelector, paginationState);
        },
        update(newOptions) {
            if (newOptions.totalItems !== undefined) paginationState.totalItems = newOptions.totalItems;
            if (newOptions.currentPage !== undefined) paginationState.currentPage = newOptions.currentPage;
            if (newOptions.pageSize !== undefined) paginationState.pageSize = newOptions.pageSize;
            updatePaginationUI(navContainer, pageSizeSelector, paginationState);
        }
    };

    // Зберегти API в елементі для повторного використання
    footerEl._paginationAPI = paginationAPI;

    return paginationAPI;
}

function updatePaginationUI(navContainer, pageSizeSelector, state) {
    const { currentPage, pageSize, totalItems } = state;
    const totalPages = Math.ceil(totalItems / pageSize);

    // Оновлюємо текст селектора розміру сторінки
    if (pageSizeSelector) {
        const label = pageSizeSelector.querySelector('.page-size-label, #page-size-label');
        if (label) {
            label.textContent = pageSize > 1000 ? 'Всі' : pageSize;
        }
    }

    // Генеруємо кнопки навігації
    renderPageNumbers(navContainer, currentPage, totalPages);
}

function renderPageNumbers(navContainer, currentPage, totalPages) {
    navContainer.innerHTML = '';

    // Кнопка "Назад"
    const prevBtn = createPageButton({
        icon: '<span class="material-symbols-outlined">chevron_left</span>',
        action: 'prev',
        disabled: currentPage === 1
    });
    navContainer.appendChild(prevBtn);

    const pageNumbers = getPageNumbers(totalPages, currentPage);

    pageNumbers.forEach(pageNum => {
        if (typeof pageNum === 'string') {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'page-ellipsis';
            ellipsis.textContent = '...';
            navContainer.appendChild(ellipsis);
        } else {
            const pageBtn = createPageButton({
                text: pageNum,
                page: pageNum,
                active: pageNum === currentPage
            });
            navContainer.appendChild(pageBtn);
        }
    });

    // Кнопка "Вперед"
    const nextBtn = createPageButton({
        icon: '<span class="material-symbols-outlined">chevron_right</span>',
        action: 'next',
        disabled: currentPage >= totalPages
    });
    navContainer.appendChild(nextBtn);
}

function createPageButton({ text, icon, page, action, active = false, disabled = false }) {
    const btn = document.createElement('button');
    btn.className = 'page-btn';
    if (active) btn.classList.add('active');
    if (page) btn.dataset.page = page;
    if (action) btn.dataset.action = action;
    btn.disabled = disabled;
    btn.innerHTML = text || icon;
    return btn;
}

function getPageNumbers(totalPages, currentPage, maxVisible = 7) {
    if (totalPages <= maxVisible) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const sideWidth = Math.floor((maxVisible - 3) / 2);
    const leftWidth = currentPage - 1;
    const rightWidth = totalPages - currentPage;

    if (leftWidth < sideWidth + 1) {
        return [
            ...Array.from({ length: maxVisible - 2 }, (_, i) => i + 1),
            '...',
            totalPages
        ];
    }

    if (rightWidth < sideWidth + 1) {
        return [
            1,
            '...',
            ...Array.from({ length: maxVisible - 2 }, (_, i) => totalPages - (maxVisible - 3) + i)
        ];
    }

    return [
        1,
        '...',
        ...Array.from({ length: maxVisible - 4 }, (_, i) => currentPage - sideWidth + 2 + i),
        '...',
        totalPages
    ];
}
