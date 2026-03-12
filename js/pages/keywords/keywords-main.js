// js/pages/keywords/keywords-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - INITIALIZATION                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { keywordsState } from './keywords-state.js';
import { keywordsPlugins } from './keywords-plugins.js';
import { loadKeywords } from './keywords-data.js';
import { registerAsideInitializer } from '../../layout/layout-main.js';
import { createPage } from '../../components/page/page-main.js';

export { keywordsState } from './keywords-state.js';

const page = createPage({
    name: 'Keywords',
    state: keywordsState,
    plugins: keywordsPlugins,
    PLUGINS: [
        () => import('./keywords-table.js'),
        () => import('./keywords-events.js'),
        () => import('./keywords-crud.js'),
    ],
    dataLoaders: [loadKeywords],
    containers: ['keywords-table-container'],
});

export async function initKeywords() {
    await page.init();
}

registerAsideInitializer('aside-keywords', () => {
    const addBtn = document.getElementById('btn-add-keyword-aside');
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            const { showAddKeywordModal } = await import('./keywords-crud.js');
            showAddKeywordModal();
        });
    }
});
