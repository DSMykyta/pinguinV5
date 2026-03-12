// js/pages/banners/banners-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         BANNERS SYSTEM                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { bannersState } from './banners-state.js';
import { bannersPlugins } from './banners-plugins.js';
import { loadBanners } from './banners-data.js';
import { createPage } from '../../components/page/page-main.js';

const page = createPage({
    name: 'Banners',
    state: bannersState,
    plugins: bannersPlugins,
    PLUGINS: [
        () => import('./banners-table.js'),
        () => import('./banners-ui.js')
    ],
    dataLoaders: [loadBanners],
    containers: ['banners-table-container'],
});

export async function initBanners() {
    await page.init();
}
