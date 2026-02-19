// js/common/charms/pagination/pagination-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PAGINATION LEGO — MAIN                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔒 ЯДРО — Charm discovery, MutationObserver, public API                 ║
 * ║                                                                          ║
 * ║  CHARM USAGE:                                                            ║
 * ║  <div pagination="25">          — 25 елементів на сторінку               ║
 * ║  <div pagination>               — дефолт 25                              ║
 * ║  <div pagination="10"                                                    ║
 * ║       data-pagination-stats="tab-stats-keywords">  — з лічильником       ║
 * ║                                                                          ║
 * ║  API на елементі:                                                        ║
 * ║  el._paginationCharm.setPage(2)                                          ║
 * ║  el._paginationCharm.setPageSize(50)                                     ║
 * ║  el._paginationCharm.activate() / deactivate()  — для табів              ║
 * ║  el._paginationCharm.update()   — примусово перерахувати                 ║
 * ║  el._paginationCharm.destroy()  — знищити інстанс                        ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { renderPageNumbers } from './pagination-ui.js';
import { initFab } from './pagination-fab.js';

// ═══════════════════════════════════════════════════════════════════════════
// CHARM DISCOVERY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Знайти всі [pagination] елементи в scope та ініціалізувати charm
 * @param {HTMLElement|Document} scope
 */
export function initPaginationCharm(scope = document) {
    scope.querySelectorAll('[pagination]').forEach(el => {
        if (el._paginationCharm) return;
        createInstance(el);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

function createInstance(el) {
    const pageSize = parseInt(el.getAttribute('pagination')) || 25;

    // Автодетект: якщо елемент в неактивному .tab-content → стартувати як deactivated
    const tabContent = el.closest('.tab-content');
    const isActive = !tabContent || tabContent.classList.contains('active');

    const instance = {
        el,
        state: { currentPage: 1, pageSize, totalItems: 0 },
        navContainer: null,
        fab: null,
        statsEl: null,
        observer: null,
        _mutationTimer: null,
        _active: isActive
    };

    // Stats element
    const statsId = el.dataset.paginationStats;
    if (statsId) {
        instance.statsEl = document.getElementById(statsId);
    }

    // Controls (nav + FAB)
    setupControls(instance);

    // MutationObserver
    setupObserver(instance);

    // Initial pagination
    applyPage(instance);

    // Public API
    el._paginationCharm = {
        setPage(page) {
            instance.state.currentPage = page;
            applyPage(instance);
        },
        getPage() {
            return instance.state.currentPage;
        },
        setPageSize(size) {
            instance.state.pageSize = size;
            instance.state.currentPage = 1;
            if (instance.fab) instance.fab.updateLabel(size);
            applyPage(instance);
        },
        activate() {
            instance._active = true;
            applyPage(instance);
        },
        deactivate() {
            instance._active = false;
            if (instance.navContainer) instance.navContainer.innerHTML = '';
        },
        update() {
            applyPage(instance);
        },
        destroy() {
            if (instance.observer) instance.observer.disconnect();
            if (instance._mutationTimer) clearTimeout(instance._mutationTimer);
            delete el._paginationCharm;
        }
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTROLS SETUP
// ═══════════════════════════════════════════════════════════════════════════

function setupControls(instance) {
    const el = instance.el;

    // Знайти footer з pagination controls
    const footer = findFooter(el);

    if (footer) {
        // Переиспользовувати існуючий .pagination-container в footer
        let paginationContainer = footer.querySelector('.pagination-container');
        if (!paginationContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.className = 'pagination-container';
            footer.appendChild(paginationContainer);
        }

        instance.navContainer =
            paginationContainer.querySelector('.pagination-nav') ||
            paginationContainer.querySelector('#pagination-nav-container');

        if (!instance.navContainer) {
            instance.navContainer = document.createElement('div');
            instance.navContainer.className = 'pagination-nav';
            paginationContainer.insertBefore(instance.navContainer, paginationContainer.firstChild);
        }

        // FAB plugin — підключитись до існуючого або створити
        // Guard: multi-tab — тільки активний charm реагує на FAB
        instance.fab = initFab(paginationContainer, instance.state.pageSize, (newSize) => {
            if (!instance._active) return;
            instance.state.pageSize = newSize;
            instance.state.currentPage = 1;
            applyPage(instance);
        });
    } else {
        // Створити нові controls після елемента
        const container = document.createElement('div');
        container.className = 'pagination-container';

        instance.navContainer = document.createElement('div');
        instance.navContainer.className = 'pagination-nav';
        container.appendChild(instance.navContainer);

        instance.fab = initFab(container, instance.state.pageSize, (newSize) => {
            if (!instance._active) return;
            instance.state.pageSize = newSize;
            instance.state.currentPage = 1;
            applyPage(instance);
        });

        el.after(container);
    }

    // Click delegation на nav — ідемпотентний (один listener, масив callbacks)
    setupNavClickHandler(instance.navContainer, instance);
}

/**
 * Ідемпотентний click handler для navContainer (shared між кількома charm інстансами)
 */
function setupNavClickHandler(navContainer, instance) {
    if (!navContainer._navState) {
        navContainer._navState = { instances: [] };

        navContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.page-btn');
            if (!btn || btn.disabled) return;

            // Знайти активний інстанс
            const active = navContainer._navState.instances.find(inst => inst._active);
            if (!active) return;

            const { currentPage, pageSize, totalItems } = active.state;
            const totalPages = Math.ceil(totalItems / pageSize);
            let newPage = currentPage;

            if (btn.dataset.page) {
                newPage = parseInt(btn.dataset.page);
            } else if (btn.dataset.action === 'prev') {
                newPage = Math.max(1, currentPage - 1);
            } else if (btn.dataset.action === 'next') {
                newPage = Math.min(totalPages, currentPage + 1);
            }

            if (newPage !== currentPage) {
                active.state.currentPage = newPage;
                applyPage(active);
            }
        });
    }

    navContainer._navState.instances.push(instance);
}

/**
 * Знайти .footer, піднімаючись по DOM дереву
 */
function findFooter(el) {
    let parent = el.parentElement;
    while (parent) {
        const footer = parent.querySelector(':scope > .footer');
        if (footer) return footer;
        parent = parent.parentElement;
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGINATION LOGIC
// ═══════════════════════════════════════════════════════════════════════════

const SKIP_SELECTORS = '.pseudo-table-header, .pseudo-table-empty, .empty-state, .loading-state';

/**
 * Отримати "data-дітей" — пропускає header, empty state тощо
 */
function getDataChildren(el) {
    return Array.from(el.children).filter(
        child => !child.matches(SKIP_SELECTORS)
    );
}

/**
 * Застосувати пагінацію — show/hide дітей, оновити UI
 */
function applyPage(instance) {
    if (!instance._active) return;

    const children = getDataChildren(instance.el);
    const { pageSize } = instance.state;
    const totalItems = children.length;
    const totalPages = pageSize >= 100000 ? 1 : Math.ceil(totalItems / pageSize);

    // Clamp page
    if (instance.state.currentPage > totalPages && totalPages > 0) {
        instance.state.currentPage = totalPages;
    }
    if (instance.state.currentPage < 1) {
        instance.state.currentPage = 1;
    }

    const start = (instance.state.currentPage - 1) * pageSize;
    const end = start + pageSize;

    // Show/hide children
    children.forEach((child, i) => {
        if (pageSize >= 100000 || (i >= start && i < end)) {
            child.classList.remove('paginated-hidden');
        } else {
            child.classList.add('paginated-hidden');
        }
    });

    instance.state.totalItems = totalItems;

    // Update nav
    if (instance.navContainer) {
        if (totalPages <= 1) {
            instance.navContainer.innerHTML = '';
        } else {
            renderPageNumbers(instance.navContainer, instance.state.currentPage, totalPages);
        }
    }

    // Update FAB label
    if (instance.fab) {
        instance.fab.updateLabel(pageSize);
    }

    // Update stats
    if (instance.statsEl) {
        const shown = pageSize >= 100000
            ? totalItems
            : Math.min(pageSize, totalItems - start);
        instance.statsEl.textContent = `Показано ${Math.max(0, shown)} з ${totalItems}`;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MUTATION OBSERVER
// ═══════════════════════════════════════════════════════════════════════════

function setupObserver(instance) {
    instance.observer = new MutationObserver(() => {
        clearTimeout(instance._mutationTimer);
        instance._mutationTimer = setTimeout(() => {
            const newTotal = getDataChildren(instance.el).length;
            if (newTotal !== instance.state.totalItems) {
                instance.state.currentPage = 1;
            }
            applyPage(instance);
        }, 16);
    });

    instance.observer.observe(instance.el, { childList: true });
}

