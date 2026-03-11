// js/pages/marketplaces/marketplaces-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MARKETPLACES PAGE                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Bootstrap + public API                                      ║
 * ║                                                                          ║
 * ║  ЯДРО (не видаляти):                                                     ║
 * ║  ├── marketplaces-main.js       — Bootstrap, завантаження плагінів     ║
 * ║  ├── marketplaces-state.js      — Фабрика state + hooks               ║
 * ║  ├── marketplaces-core.js       — Lifecycle: auth, data, aside        ║
 * ║  └── marketplaces-table.js      — Рендеринг таблиці                   ║
 * ║                                                                          ║
 * ║  ПЛАГІНИ (можна видалити):                                               ║
 * ║  ├── marketplaces-events.js     — Обробники подій                     ║
 * ║  ├── marketplaces-crud.js       — Маркетплейси CRUD + модалки         ║
 * ║  └── marketplaces-import.js     — Імпорт даних                        ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createMarketplacesState } from './marketplaces-state.js';

// ═══════════════════════════════════════════════════════════════════════════
// PLUGINS
// ═══════════════════════════════════════════════════════════════════════════

const PLUGINS = [
    () => import('./marketplaces-core.js'),
    () => import('./marketplaces-table.js'),
    () => import('./marketplaces-events.js'),
    () => import('./marketplaces-crud.js'),
    () => import('./marketplaces-import.js'),
    () => import('./marketplaces-import-wizard.js'),
];

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

let _state = null;

export function getMarketplacesState() { return _state; }

/**
 * Головна функція ініціалізації модуля Marketplaces.
 * Створює state, завантажує плагіни — і все. Жодної бізнес-логіки.
 */
export async function initMarketplaces() {
    _state = createMarketplacesState();

    const results = await Promise.allSettled(PLUGINS.map(fn => fn()));

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            try {
                result.value.init(_state);
            } catch (e) {
                console.error(`[Marketplaces] Plugin ${index}:`, e);
            }
        } else if (result.status === 'rejected') {
            console.warn(`[Marketplaces] Плагін ${index} — не завантажено:`, result.reason);
        }
    });
}
