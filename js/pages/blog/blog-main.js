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
    './blog-table.js',
    './blog-ui.js'
];

async function loadPlugins() {
    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            result.value.init(blogState);
        } else if (result.status === 'rejected') {
            console.warn(`[Blog] ⚠️ Плагін не завантажено: ${PLUGINS[index]}`, result.reason?.message || '');
        }
    });
}

export async function initBlog() {
    await loadPlugins();
    initTabSwitching();
    checkAuthAndLoadData();

    document.addEventListener('auth-state-changed', (event) => {
        if (event.detail.isAuthorized) {
            checkAuthAndLoadData();
        }
    });
}

function initTabSwitching() {
    const tabButtons = document.querySelectorAll('[data-tab-target]');
    const tabContents = document.querySelectorAll('[data-tab-content]');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tabTarget;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabContents.forEach(content => {
                if (content.dataset.tabContent === targetTab) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });

            const tabName = targetTab.replace('tab-', '');
            blogState.activeTab = tabName;

            const newsContainer = document.getElementById('news-table-container');
            const blogContainer = document.getElementById('blog-table-container');

            newsContainer?._paginationCharm?.deactivate();
            blogContainer?._paginationCharm?.deactivate();

            if (tabName === 'blog') {
                blogContainer?._paginationCharm?.activate();
            } else {
                newsContainer?._paginationCharm?.activate();
            }

            runHook('onTabChange', tabName);
            runHook('onRender');
        });
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
