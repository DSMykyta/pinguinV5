// js/keywords/keywords-init.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - INITIALIZATION                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { loadKeywords } from './keywords-data.js';
import { renderKeywordsTable, renderKeywordsTableRowsOnly } from './keywords-table.js';
import { initKeywordsEvents, initKeywordsSearch } from './keywords-events.js';
import { showAddKeywordModal } from './keywords-crud.js';
import { initPagination } from '../common/ui-pagination.js';
import { initTooltips } from '../common/ui-tooltip.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';

export const keywordsState = {
    keywords: [],
    searchQuery: '',
    searchColumns: ['local_id', 'name_uk', 'trigers', 'keywords_ua'],
    visibleColumns: ['local_id', 'name_uk', 'trigers', 'keywords_ua'],
    paramTypeFilter: 'all',
    columnFilters: {},       // Фільтри по колонках { columnId: ['value1', 'value2'] }
    sortKey: null,
    sortOrder: 'asc',
    pagination: {
        currentPage: 1,
        pageSize: 10,
        totalItems: 0
    },
    paginationAPI: null,
    sortAPI: null
};

export function initKeywords() {

    initTooltips();
    loadAsideKeywords();
    initKeywordsPagination();
    checkAuthAndLoadData();

    document.addEventListener('auth-state-changed', (event) => {
        if (event.detail.isAuthorized) {
            checkAuthAndLoadData();
        }
    });
}

async function checkAuthAndLoadData() {

    if (window.isAuthorized) {

        try {
            await loadKeywords();

            const { populateSearchColumns, populateTableColumns, initParamTypeFilters } = await import('./keywords-ui.js');
            populateTableColumns();
            populateSearchColumns();
            initParamTypeFilters();

            const { initDropdowns } = await import('../common/ui-dropdown.js');
            initDropdowns();

            renderKeywordsTable();
            // Сортування/фільтри тепер через Table LEGO плагіни (keywords-table.js)
            initKeywordsEvents();

        } catch (error) {
            console.error('❌ Помилка завантаження даних:', error);
            renderErrorState();
        }
    } else {
        renderAuthRequiredState();
    }
}

function initKeywordsPagination() {
    const footer = document.querySelector('.fixed-footer');
    if (!footer) {
        console.warn('⚠️ Footer не знайдено');
        return;
    }

    const paginationAPI = initPagination(footer, {
        currentPage: keywordsState.pagination.currentPage,
        pageSize: keywordsState.pagination.pageSize,
        totalItems: keywordsState.pagination.totalItems,
        onPageChange: (page, pageSize) => {
            keywordsState.pagination.currentPage = page;
            keywordsState.pagination.pageSize = pageSize;
            // Оновлюємо тільки рядки, зберігаючи заголовок з dropdown
            renderKeywordsTableRowsOnly();
        }
    });

    keywordsState.paginationAPI = paginationAPI;

}

function renderAuthRequiredState() {
    const tableBody = document.querySelector('#tab-keywords .pseudo-table-body');
    if (!tableBody) return;

    // Використовуємо глобальну систему аватарів для вимоги авторизації
    const avatarHtml = renderAvatarState('authLogin', {
        message: 'Авторизуйтесь для завантаження даних',
        size: 'medium',
        containerClass: 'empty-state-container',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });

    tableBody.innerHTML = avatarHtml;
}

function renderErrorState() {
    const tableBody = document.querySelector('#tab-keywords .pseudo-table-body');
    if (!tableBody) return;

    // Використовуємо глобальну систему аватарів для помилок
    const avatarHtml = renderAvatarState('error', {
        message: 'Помилка завантаження даних',
        size: 'medium',
        containerClass: 'empty-state-container',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });

    tableBody.innerHTML = avatarHtml;
}

async function loadAsideKeywords() {
    const panelRightContent = document.getElementById('panel-right-content');
    if (!panelRightContent) return;

    try {
        const response = await fetch('templates/aside/aside-keywords.html');
        if (!response.ok) throw new Error('Failed to load aside-keywords.html');

        const html = await response.text();
        panelRightContent.innerHTML = html;


        const searchInput = document.getElementById('search-keywords');
        if (searchInput) {
            initKeywordsSearch(searchInput);
        }

        const addBtn = document.getElementById('btn-add-keyword-aside');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                showAddKeywordModal();
            });
        }

        const clearSearchBtn = document.getElementById('clear-search-keywords');
        if (clearSearchBtn && searchInput) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                keywordsState.searchQuery = '';
                keywordsState.pagination.currentPage = 1;
                clearSearchBtn.classList.add('u-hidden');
                // Оновлюємо тільки рядки, зберігаючи заголовок з dropdown
                renderKeywordsTableRowsOnly();
            });

            searchInput.addEventListener('input', () => {
                if (searchInput.value.trim()) {
                    clearSearchBtn.classList.remove('u-hidden');
                } else {
                    clearSearchBtn.classList.add('u-hidden');
                }
            });
        }
    } catch (error) {
        console.error('❌ Помилка завантаження aside-keywords.html:', error);
    }
}
