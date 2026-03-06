// js/pages/blog/blog-ui.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                          BLOG — UI                                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { registerBlogPlugin } from './blog-plugins.js';
import { blogState } from './blog-state.js';
import { loadBlogPosts } from './blog-data.js';
import { renderBlogTable, getActiveManagedTable } from './blog-table.js';
import { handleBlogAdd } from './blog-crud.js';
import { showToast } from '../../components/feedback/toast.js';

export function init() {
    registerBlogPlugin('onInit', setupUI);
    registerBlogPlugin('onDataLoaded', renderTableStateLog);
}

function setupUI() {
    const containers = [
        document.getElementById('news-table-container'),
        document.getElementById('blog-table-container')
    ].filter(Boolean);

    if (containers.length === 0) {
        console.warn('[Blog UI] Table containers not found');
    }

    containers.forEach((tableContainer) => {
        if (tableContainer._blogRefreshInit) return;
        tableContainer._blogRefreshInit = true;
        tableContainer.addEventListener('charm:refresh', (e) => {
            const refreshTask = (async () => {
                await loadBlogPosts();
                renderBlogTable();
                showToast('Дані оновлено', 'success');
            })();
            if (e?.detail?.waitUntil) e.detail.waitUntil(refreshTask);
        });
    });

    const addNewsBtn = document.getElementById('btn-add-news');
    if (addNewsBtn && !addNewsBtn._blogAddInit) {
        addNewsBtn._blogAddInit = true;
        addNewsBtn.addEventListener('click', () => {
            blogState.activeTab = 'news';
            handleBlogAdd(blogState.managedTables.news, 'news');
        });
    }

    const addBlogBtn = document.getElementById('btn-add-blog');
    if (addBlogBtn && !addBlogBtn._blogAddInit) {
        addBlogBtn._blogAddInit = true;
        addBlogBtn.addEventListener('click', () => {
            blogState.activeTab = 'blog';
            handleBlogAdd(blogState.managedTables.blog, 'blog');
        });
    }

    const addAsideBtn = document.getElementById('btn-add-blog-aside');
    if (addAsideBtn && !addAsideBtn._blogAddInit) {
        addAsideBtn._blogAddInit = true;
        addAsideBtn.addEventListener('click', () => {
            const managedTable = getActiveManagedTable();
            const type = blogState.activeTab === 'blog' ? 'blog' : 'news';
            handleBlogAdd(managedTable, type);
        });
    }
}

function renderTableStateLog() {
    console.log('[Blog UI] Loaded posts:', blogState.posts.length);
}
