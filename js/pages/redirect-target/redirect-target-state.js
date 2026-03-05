// js/pages/redirect-target/redirect-target-state.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   REDIRECT TARGET — STATE                                ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Єдине джерело правди та зберігання даних сторінки             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export const redirectTargetState = {
    redirects: [],
    _dataLoaded: false,
    
    // API таблиці
    tableAPI: null,
    managedTable: null,
    
    // Налаштування колонок
    visibleColumns: [],
    searchColumns: []
};