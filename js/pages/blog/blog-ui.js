// js/pages/blog/blog-ui.js

/**
 * BLOG — UI
 */

import { registerBlogPlugin } from './blog-plugins.js';
import { blogState } from './blog-state.js';
import { loadBlogPosts } from './blog-data.js';
import { renderBlogTable } from './blog-table.js';
import { showAddBlogModal } from './blog-crud.js';
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
            showAddBlogModal('news');
        });
    }

    const addBlogBtn = document.getElementById('btn-add-blog');
    if (addBlogBtn && !addBlogBtn._blogAddInit) {
        addBlogBtn._blogAddInit = true;
        addBlogBtn.addEventListener('click', () => {
            showAddBlogModal('blog');
        });
    }

    const addAsideBtn = document.getElementById('btn-add-blog-aside');
    if (addAsideBtn && !addAsideBtn._blogAddInit) {
        addAsideBtn._blogAddInit = true;
        addAsideBtn.addEventListener('click', () => {
            const type = blogState.activeTab === 'blog' ? 'blog' : 'news';
            showAddBlogModal(type);
        });
    }
}

function renderTableStateLog() {
    console.log('[Blog UI] Loaded posts:', blogState.posts.length);
}
