// js/pages/redirect-target/redirect-target-state.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   REDIRECT TARGET — STATE                                ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Єдине джерело правди та зберігання даних сторінки             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createPageState } from '../../components/page/page-state.js';

export const redirectTargetState = createPageState({
    custom: {
        redirects: [],
        _dataLoaded: false,
        tableAPI: null,
        managedTable: null,
    }
});
