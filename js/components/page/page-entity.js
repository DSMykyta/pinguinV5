// js/components/page/page-entity.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PAGE ENTITY — Універсальна фабрика сторінки           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Один виклик створює повну сторінку з конфігурації:            ║
 * ║  state, plugins, data, table, CRUD.                                     ║
 * ║                                                                          ║
 * ║  📋 Використовує існуючі фабрики:                                        ║
 * ║  ├── createPage (page-main.js)                                          ║
 * ║  ├── createPageState (page-state.js)                                    ║
 * ║  ├── createPluginRegistry (page-plugins.js)                             ║
 * ║  ├── createEntityData (page-entity-data.js)                             ║
 * ║  ├── createEntityTable (page-entity-table.js)                           ║
 * ║  └── createEntityCrud (page-entity-crud.js)                             ║
 * ║                                                                          ║
 * ║  🎯 Використання:                                                        ║
 * ║  import { createEntity } from '../../components/page/page-entity.js';   ║
 * ║  const entity = createEntity(config);                                   ║
 * ║  export const initBanners = () => entity.init();                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createPage } from './page-main.js';
import { createPageState } from './page-state.js';
import { createPluginRegistry } from './page-plugins.js';
import { createEntityData } from './page-entity-data.js';
import { createEntityTable } from './page-entity-table.js';
import { createEntityCrud } from './page-entity-crud.js';

/**
 * Створити повну сторінку-сутність з конфігурації
 *
 * @param {Object} config
 * @param {string} config.name — Ім'я модуля (для логів)
 * @param {string} config.entityName — Людська назва ('Банер', 'Редирект')
 * @param {Object} config.dataSource — Конфігурація джерела даних
 * @param {Object} config.table — Конфігурація таблиці
 * @param {Object} [config.crud] — Конфігурація CRUD модалки
 * @param {Object} [config.page] — Додаткові налаштування сторінки
 * @param {Function[]} [config.extensions] — Розширення: fn(ctx) => void
 * @returns {{ init, state, plugins, data, getCrud }}
 */
export function createEntity(config) {
    const state = createPageState({
        custom: {
            [config.dataSource.stateKey]: [],
            _dataLoaded: false,
            tableAPI: null,
            managedTable: null,
        }
    });

    const plugins = createPluginRegistry(config.name);
    const data = createEntityData(config.dataSource, state);

    const skipTable = config.table?._skipEngineTable;
    const tablePlugin = skipTable ? null : createEntityTable(config, data, state, plugins);

    let crudInstance = null;
    function getCrud() {
        if (!crudInstance && config.crud) {
            crudInstance = createEntityCrud(config, data, state, plugins);
        }
        return crudInstance;
    }

    const pagePlugins = [
        ...(tablePlugin ? [() => Promise.resolve(tablePlugin)] : []),
        ...(config.crud ? [() => Promise.resolve({ init() { getCrud(); } })] : []),
        ...(config.page?.extraPlugins || []),
    ];

    const ctx = { state, plugins, data, getCrud, config };
    if (config.extensions) {
        config.extensions.forEach(ext => {
            if (typeof ext === 'function') ext(ctx);
        });
    }

    const page = createPage({
        name: config.name,
        state,
        plugins,
        PLUGINS: pagePlugins,
        dataLoaders: [data.load],
        containers: config.page?.containers || [config.table.containerId],
        ...(config.page || {}),
    });

    return {
        init: () => page.init(),
        state,
        plugins,
        data,
        getCrud,
    };
}
