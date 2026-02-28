// js/pages/keywords/keywords-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - INITIALIZATION                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { loadKeywords } from './keywords-data.js';
import { renderKeywordsTable } from './keywords-table.js';
import { initKeywordsEvents } from './keywords-events.js';
import { showAddKeywordModal } from './keywords-crud.js';
import { initTooltips } from '../../components/feedback/tooltip.js';
import { initDropdowns } from '../../components/forms/dropdown.js';
import { registerAsideInitializer } from '../../layout/layout-main.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import { keywordsState } from './keywords-state.js';

export { keywordsState } from './keywords-state.js';

// ═══════════════════════════════════════════════════════════════════════════
// LEGO PLUGINS
// ═══════════════════════════════════════════════════════════════════════════

const PLUGINS = [
    './keywords-table.js',
    './keywords-events.js',
    './keywords-crud.js',
];

async function loadPlugins(state) {
    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );
    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            result.value.init(state);
        } else if (result.status === 'rejected') {
            console.warn(`[Keywords] Plugin failed: ${PLUGINS[index]}`);
        }
    });
}

export async function initKeywords() {

    initTooltips();
    await loadPlugins(keywordsState);
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

registerAsideInitializer('aside-keywords', () => {
    const addBtn = document.getElementById('btn-add-keyword-aside');
    if (addBtn) {
        addBtn.addEventListener('click', () => showAddKeywordModal());
    }
});
