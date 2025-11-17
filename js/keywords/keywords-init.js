// js/keywords/keywords-init.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - INITIALIZATION                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { loadKeywords } from './keywords-data.js';
import { renderKeywordsTable } from './keywords-table.js';
import { initKeywordsEvents, initKeywordsSearch, initKeywordsSorting } from './keywords-events.js';
import { showAddKeywordModal } from './keywords-crud.js';
import { initPagination } from '../common/ui-pagination.js';
import { initTooltips } from '../common/ui-tooltip.js';

export const keywordsState = {
    keywords: [],
    searchQuery: '',
    searchColumns: ['local_id', 'name_uk', 'param_type', 'trigers', 'keywords_ua'],
    visibleColumns: ['local_id', 'name_uk', 'param_type', 'trigers', 'keywords_ua'],
    paramTypeFilter: 'all',
    sortKey: null,
    sortOrder: 'asc',
    pagination: {
        currentPage: 1,
        pageSize: 10,
        totalItems: 0
    },
    paginationAPI: null
};

export function initKeywords() {
    console.log('📋 Ініціалізація Keywords...');

    initTooltips();
    loadAsideKeywords();
    initKeywordsPagination();
    checkAuthAndLoadData();

    document.addEventListener('auth-state-changed', (event) => {
        console.log('🔐 Подія auth-state-changed:', event.detail);
        if (event.detail.isAuthorized) {
            checkAuthAndLoadData();
        }
    });
}

async function checkAuthAndLoadData() {
    console.log('🔐 Перевірка авторизації...');

    if (window.isAuthorized) {
        console.log('✅ Користувач авторизований, завантажуємо дані...');

        try {
            await loadKeywords();

            const { populateSearchColumns, populateTableColumns, initParamTypeFilters } = await import('./keywords-ui.js');
            populateTableColumns();
            populateSearchColumns();
            initParamTypeFilters();

            const { initDropdowns } = await import('../common/ui-dropdown.js');
            initDropdowns();

            renderKeywordsTable();
            initKeywordsSorting();
            initKeywordsEvents();

            console.log('✅ Keywords готовий до роботи');
        } catch (error) {
            console.error('❌ Помилка завантаження даних:', error);
            renderErrorState();
        }
    } else {
        console.log('⚠️ Користувач не авторизований');
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
            renderKeywordsTable();
        }
    });

    keywordsState.paginationAPI = paginationAPI;

    console.log('✅ Пагінація ініціалізована');
}

function renderAuthRequiredState() {
    const tableBody = document.querySelector('#tab-keywords .pseudo-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `
        <div class="loading-state">
            <span class="material-symbols-outlined">key</span>
            <p>Авторизуйтесь для завантаження даних</p>
        </div>
    `;
}

function renderErrorState() {
    const tableBody = document.querySelector('#tab-keywords .pseudo-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `
        <div class="loading-state">
            <span class="material-symbols-outlined">error</span>
            <p>Помилка завантаження даних</p>
        </div>
    `;
}

async function loadAsideKeywords() {
    const panelRightContent = document.getElementById('panel-right-content');
    if (!panelRightContent) return;

    try {
        const response = await fetch('templates/aside/aside-keywords.html');
        if (!response.ok) throw new Error('Failed to load aside-keywords.html');

        const html = await response.text();
        panelRightContent.innerHTML = html;

        console.log('✅ aside-keywords.html завантажено');

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
                renderKeywordsTable();
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
