// js/pages/blog/blog-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                           BLOG SYSTEM                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { blogState } from './blog-state.js';
import { blogPlugins, runHook } from './blog-plugins.js';
import { loadBlogPosts } from './blog-data.js';
import { createPage } from '../../components/page/page-main.js';

const page = createPage({
    name: 'Blog',
    state: blogState,
    plugins: blogPlugins,
    PLUGINS: [
        () => import('./blog-table.js'),
        () => import('./blog-ui.js')
    ],
    dataLoaders: [loadBlogPosts],
    containers: ['news-table-container', 'blog-table-container'],
});

export async function initBlog() {
    await page.init();

    document.addEventListener('tab-switched', (e) => {
        const tabName = e.detail.tabId.replace('tab-', '');
        blogState.activeTab = tabName;
        runHook('onTabChange', tabName);
        runHook('onRender');
    });
}
