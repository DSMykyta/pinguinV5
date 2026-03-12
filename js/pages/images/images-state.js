// js/pages/images/images-state.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      IMAGES — STATE                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createPageState } from '../../components/page/page-state.js';

export const imagesState = createPageState({
    custom: {
        images: [],
        _dataLoaded: false,
        tableAPI: null,
        managedTable: null,
    }
});
