// js/components/charms/pagination/pagination-ui.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PAGINATION LEGO — UI RENDERING                       ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Рендеринг кнопок навігації (стрілки, номери, ellipsis)       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Відрендерити кнопки навігації в контейнер
 * @param {HTMLElement} navContainer - .pagination-nav елемент
 * @param {number} currentPage
 * @param {number} totalPages
 */
export function renderPageNumbers(navContainer, currentPage, totalPages) {
    navContainer.innerHTML = '';

    // Кнопка "Назад"
    navContainer.appendChild(createPageButton({
        icon: '<span class="material-symbols-outlined">chevron_left</span>',
        action: 'prev',
        disabled: currentPage === 1
    }));

    // Номери сторінок
    const pageNumbers = getPageNumbers(totalPages, currentPage);

    pageNumbers.forEach(pageNum => {
        if (typeof pageNum === 'string') {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'page-ellipsis';
            ellipsis.textContent = '...';
            navContainer.appendChild(ellipsis);
        } else {
            navContainer.appendChild(createPageButton({
                text: pageNum,
                page: pageNum,
                active: pageNum === currentPage
            }));
        }
    });

    // Кнопка "Вперед"
    navContainer.appendChild(createPageButton({
        icon: '<span class="material-symbols-outlined">chevron_right</span>',
        action: 'next',
        disabled: currentPage >= totalPages
    }));
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Створити кнопку пагінації
 */
export function createPageButton({ text, icon, page, action, active = false, disabled = false }) {
    const btn = document.createElement('button');
    btn.className = 'page-btn';
    if (active) btn.classList.add('active');
    if (page) btn.dataset.page = page;
    if (action) btn.dataset.action = action;
    btn.disabled = disabled;
    btn.innerHTML = text ?? icon;
    return btn;
}

/**
 * Розрахувати номери сторінок з ellipsis
 * @param {number} totalPages
 * @param {number} currentPage
 * @param {number} maxVisible - Максимум видимих кнопок (дефолт 7)
 * @returns {Array<number|string>}
 */
export function getPageNumbers(totalPages, currentPage, maxVisible = 7) {
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
