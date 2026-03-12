// js/pages/images/images-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         IMAGES SYSTEM                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { imagesState } from './images-state.js';
import { imagesPlugins } from './images-plugins.js';
import { loadImages } from './images-data.js';
import { createPage } from '../../components/page/page-main.js';

const page = createPage({
    name: 'Images',
    state: imagesState,
    plugins: imagesPlugins,
    PLUGINS: [
        () => import('./images-table.js'),
        () => import('./images-ui.js')
    ],
    dataLoaders: [loadImages],
    containers: ['images-table-container'],
});

export async function initImages() {
    await page.init();
}
