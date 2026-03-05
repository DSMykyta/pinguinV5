// js/pages/redirect-target/redirect-target-ui.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   REDIRECT TARGET — UI                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Відповідає за маніпуляції з DOM та рендер                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export function init(state) {
    // Підписуємось на ініціалізацію
    state.registerHook('onDidInit', () => setupUI(state), { plugin: 'ui' });
    
    // Підписуємось на оновлення даних
    state.registerHook('onDataLoaded', () => renderTable(state), { plugin: 'ui' });
}

function setupUI(state) {
    console.log('[ui] Підготовка інтерфейсу Redirect Target');
}

function renderTable(state) {
    if (!state.dom.tableContainer) return;
    console.log('[ui] Рендер таблиці, даних:', state.data.length);
    // state.dom.tableContainer.innerHTML = ...
}