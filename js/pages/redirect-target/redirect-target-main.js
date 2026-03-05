// js/pages/redirect-target/redirect-target-main.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   REDIRECT TARGET — MAIN                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Оркестратор та завантажувач плагінів                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createRedirectTargetState } from './redirect-target-state.js';

// Список всіх плагінів сторінки
const PLUGINS = [
    './redirect-target-ui.js',
    './redirect-target-events.js',
    './redirect-target-data.js'
];

export async function initRedirectTarget() {
    const state = createRedirectTargetState();

    // Завантажуємо плагіни безпечно і паралельно (Закон III)
    const results = await Promise.allSettled(PLUGINS.map(p => import(p)));

    // Ініціалізуємо тільки ті, що успішно завантажились
    results.forEach(r => {
        if (r.status === 'fulfilled' && r.value.init) {
            r.value.init(state);
        } else if (r.status === 'rejected') {
            console.error('[RedirectTarget] Failed to load plugin:', r.reason);
        }
    });

    // Сповіщаємо плагіни про готовність
    state.runHook('onDidInit');
}