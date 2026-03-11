// js/pages/entities/entities-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    ENTITIES PAGE                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Bootstrap + public API                                      ║
 * ║                                                                          ║
 * ║  ЯДРО (не видаляти):                                                     ║
 * ║  ├── entities-main.js       — Bootstrap, завантаження плагінів          ║
 * ║  ├── entities-state.js      — Фабрика state + hooks                    ║
 * ║  ├── entities-core.js       — Lifecycle: auth, data, tabs, aside       ║
 * ║  └── entities-table.js      — Рендеринг таблиць                        ║
 * ║                                                                          ║
 * ║  ПЛАГІНИ (можна видалити):                                               ║
 * ║  ├── entities-events.js          — Обробники подій                     ║
 * ║  ├── entities-categories.js      — Категорії CRUD + модалки            ║
 * ║  ├── entities-characteristics.js — Характеристики CRUD + модалки       ║
 * ║  ├── entities-options.js         — Опції CRUD + модалки                ║
 * ║  ├── entities-polling.js         — Фоновий polling маппінгів           ║
 * ║  ├── entities-mapping-wizard.js              — Wizard категорій        ║
 * ║  ├── entities-mapping-wizard-characteristics.js — Wizard характеристик ║
 * ║  └── entities-mapping-wizard-options.js         — Wizard опцій         ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createEntitiesState } from './entities-state.js';

// ═══════════════════════════════════════════════════════════════════════════
// PLUGINS
// ═══════════════════════════════════════════════════════════════════════════

const PLUGINS = [
    () => import('./entities-core.js'),
    () => import('./entities-table.js'),
    () => import('./entities-events.js'),
    () => import('./entities-categories.js'),
    () => import('./entities-characteristics.js'),
    () => import('./entities-options.js'),
    () => import('./entities-mapping-wizard.js'),
    () => import('./entities-mapping-wizard-characteristics.js'),
    () => import('./entities-mapping-wizard-options.js'),
    () => import('./entities-polling.js'),
];

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

let _state = null;

export function getEntitiesState() { return _state; }

/**
 * Головна функція ініціалізації модуля Entities.
 * Створює state, завантажує плагіни — і все. Жодної бізнес-логіки.
 */
export async function initEntities() {
    _state = createEntitiesState();

    const results = await Promise.allSettled(PLUGINS.map(fn => fn()));

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            try {
                result.value.init(_state);
            } catch (e) {
                console.error(`[Entities] Plugin ${index}:`, e);
            }
        } else if (result.status === 'rejected') {
            console.warn(`[Entities] Плагін ${index} — не завантажено:`, result.reason);
        }
    });
}
