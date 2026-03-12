// js/pages/banners/banners-state.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      BANNERS — STATE                                     ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Єдине джерело правди та стан сторінки                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createPageState } from '../../components/page/page-state.js';

export const bannersState = createPageState({
    custom: {
        banners: [],
        _dataLoaded: false,
        tableAPI: null,
        managedTable: null,
    }
});
