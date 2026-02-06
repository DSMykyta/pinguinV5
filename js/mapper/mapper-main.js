// js/mapper/mapper-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MARKETPLACE MAPPER                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── mapper-main.js       — Точка входу, завантаження плагінів           ║
 * ║  ├── mapper-state.js      — Централізований state + hooks                ║
 * ║  ├── mapper-data.js       — API операції з даними                        ║
 * ║  └── mapper-table.js      — Рендеринг таблиць                            ║
 * ║                                                                          ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  ├── mapper-categories.js      — Категорії CRUD + модалки                ║
 * ║  ├── mapper-characteristics.js — Характеристики CRUD + модалки           ║
 * ║  ├── mapper-options.js         — Опції CRUD + модалки                    ║
 * ║  ├── mapper-marketplaces.js    — Маркетплейси CRUD + модалки             ║
 * ║  └── mapper-import.js          — Імпорт даних                            ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { mapperState } from './mapper-state.js';

// Плагіни — можна видалити будь-який
const PLUGINS = [
    './mapper-categories.js',
    './mapper-characteristics.js',
    './mapper-options.js',
    './mapper-marketplaces.js',
    './mapper-import.js',
];

/**
 * Завантажити всі плагіни
 */
export async function loadMapperPlugins() {

    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );

    results.forEach((result, index) => {
        const pluginPath = PLUGINS[index];

        if (result.status === 'fulfilled' && result.value.init) {
            try {
                // init() кожного плагіна сам викликає markPluginLoaded()
                result.value.init();
            } catch (e) {
                console.error(`[Mapper] ❌ Error initializing ${pluginPath}:`, e);
            }
        } else if (result.status === 'rejected') {
            console.warn(`[Mapper] ⚠️ ${pluginPath} — не завантажено`);
        }
    });

}

/**
 * Динамічно імпортувати функцію з плагіна
 * @param {string} pluginName - Назва плагіна без шляху та розширення
 * @param {string} functionName - Назва функції
 */
export async function importPluginFunction(pluginName, functionName) {
    try {
        const module = await import(`./${pluginName}.js`);
        if (module[functionName]) {
            return module[functionName];
        }
        console.warn(`[Mapper] Function ${functionName} not found in ${pluginName}`);
        return null;
    } catch (e) {
        console.warn(`[Mapper] Could not import ${functionName} from ${pluginName}:`, e);
        return null;
    }
}
