// js/pages/blog/blog-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                           BLOG SYSTEM                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { runHook } from './blog-plugins.js';
import { loadBlogPosts } from './blog-data.js';
import { blogState } from './blog-state.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';

const PLUGINS = [
    () => import('./blog-table.js'),
    () => import('./blog-ui.js')
];

async function loadPlugins() {
    const results = await Promise.allSettled(
        PLUGINS.map(fn => fn())
    );

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            result.value.init(blogState);
        } else if (result.status === 'rejected') {
            console.warn(`[Blog] ⚠️ Плагін ${index} не завантажено`, result.reason?.message || '');
        }
    });
}

export async function initBlog() {
    await loadPlugins();

    // Слухати перемикання табів (generic event від layout-plugin-nav-tabs)
    document.addEventListener('tab-switched', (e) => {
        const tabName = e.detail.tabId.replace('tab-', '');
        blogState.activeTab = tabName;
        runHook('onTabChange', tabName);
        runHook('onRender');
    });

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
            await loadBlogPosts();
            runHook('onInit');
            runHook('onDataLoaded');
        } catch (error) {
            console.error('[Blog Main] Init Error:', error);
            renderErrorState();
        }
    } else {
        renderAuthRequiredState();
    }
}

function renderAuthRequiredState() {
    [
        document.querySelector('#tab-news .pseudo-table-body') || document.querySelector('#news-table-container'),
        document.querySelector('#tab-blog .pseudo-table-body') || document.querySelector('#blog-table-container')
    ].forEach((tbody) => {
        if (!tbody) return;
        tbody.innerHTML = renderAvatarState('authLogin', {
            message: 'Авторизуйтесь для завантаження даних',
            showMessage: true,
            containerClass: 'empty-state'
        });
    });
}

function renderErrorState() {
    [
        document.querySelector('#tab-news .pseudo-table-body') || document.querySelector('#news-table-container'),
        document.querySelector('#tab-blog .pseudo-table-body') || document.querySelector('#blog-table-container')
    ].forEach((tbody) => {
        if (!tbody) return;
        tbody.innerHTML = renderAvatarState('error', {
            message: 'Помилка завантаження блогу',
            showMessage: true,
            containerClass: 'empty-state'
        });
    });
}
