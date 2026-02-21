// js/keywords/keywords-init.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - INITIALIZATION                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { loadKeywords } from './keywords-data.js';
import { renderKeywordsTable } from './keywords-table.js';
import { initKeywordsEvents } from './keywords-events.js';
import { showAddKeywordModal } from './keywords-crud.js';
import { initPaginationCharm } from '../common/charms/pagination/pagination-main.js';
import { initTooltips } from '../common/ui-tooltip.js';
import { initDropdowns } from '../common/ui-dropdown.js';
import { loadSingleAsideTemplate } from '../aside/aside-main.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';

export const keywordsState = {
    keywords: [],
    _dataLoaded: false,      // Прапорець: дані завантажено
    searchQuery: '',
    searchColumns: ['local_id', 'name_uk', 'trigers', 'keywords_ua'],
    visibleColumns: ['local_id', 'name_uk', 'trigers', 'keywords_ua'],
    paramTypeFilter: 'all',
    columnFilters: {},       // Фільтри по колонках { columnId: ['value1', 'value2'] }
    sortKey: null,
    sortOrder: 'asc',
    sortAPI: null
};

export function initKeywords() {

    initTooltips();
    loadAsideKeywords();
    initPaginationCharm();
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

            // Рендер таблиці (createManagedTable створює колонки + пошук автоматично)
            renderKeywordsTable();
            initDropdowns();

            // Фільтри типів (кнопки в header)
            const { initParamTypeFilters } = await import('./keywords-ui.js');
            initParamTypeFilters();

            initKeywordsEvents();

        } catch (error) {
            console.error('❌ Помилка завантаження даних:', error);
            renderErrorState();
        }
    } else {
        renderAuthRequiredState();
    }
}


function renderAuthRequiredState() {
    const tableBody = document.querySelector('#tab-keywords .pseudo-table-body');
    if (!tableBody) return;

    // Використовуємо глобальну систему аватарів для вимоги авторизації
    const avatarHtml = renderAvatarState('authLogin', {
        message: 'Авторизуйтесь для завантаження даних',
        size: 'medium',
        containerClass: 'empty-state',
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
        containerClass: 'empty-state',
        avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message',
        showMessage: true
    });

    tableBody.innerHTML = avatarHtml;
}

async function loadAsideKeywords() {
    await loadSingleAsideTemplate('aside-keywords');

    const addBtn = document.getElementById('btn-add-keyword-aside');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            showAddKeywordModal();
        });
    }
}
