// js/pages/redirect-target/redirect-target-data.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   REDIRECT TARGET — DATA                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН (viewless) — Завантаження та збереження даних API             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export function init(state) {
    state.registerHook('onDidInit', () => loadData(state), { plugin: 'data' });
}

async function loadData(state) {
    try {
        state.runHook('onWillLoadData');
        
        // Імітація запиту до API
        // const response = await fetch(...);
        // state.data = await response.json();
        
        state.data = [{ id: 1, url: '/old', target: '/new' }];
        
        // Оповіщаємо всі плагіни (включно з UI), що дані готові
        state.runHook('onDataLoaded');
    } catch (error) {
        console.error('[data] Error loading data', error);
    }
}