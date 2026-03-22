// js/engine/entity-engine.js

/**
 * ENTITY ENGINE — Universal entity orchestrator
 *
 * One function creates everything for any entity:
 * state, plugins, data layer, table, CRUD — all from a single config object.
 *
 * USAGE:
 *   import { createEntity } from '../../engine/entity-engine.js';
 *   import config from '../../configs/banners.config.js';
 *
 *   const entity = createEntity(config);
 *   export const initBanners = () => entity.init();
 */

import { createPage } from '../components/page/page-main.js';
import { createPageState } from '../components/page/page-state.js';
import { createPluginRegistry } from '../components/page/page-plugins.js';
import { createEntityData } from './entity-data.js';
import { createEntityTablePlugin } from './entity-table.js';
import { createEntityCrud } from './entity-crud.js';

/**
 * Create a complete entity module from config
 *
 * @param {Object} config - Entity configuration
 * @param {string} config.name - Entity name (e.g. 'banners')
 * @param {string} config.entityName - Human-readable name (e.g. 'Банер')
 * @param {Object} config.dataSource - Data source configuration
 * @param {Object} config.table - Table configuration
 * @param {Object} [config.crud] - CRUD modal configuration
 * @param {Object} [config.page] - Page-level overrides
 * @param {Function[]} [config.extensions] - Extension functions: fn(ctx) => void
 * @returns {{ init, state, plugins, data }}
 */
export function createEntity(config) {
    // 1. Create state
    const state = createPageState({
        custom: {
            [config.dataSource.stateKey]: [],
            _dataLoaded: false,
            tableAPI: null,
            managedTable: null,
        }
    });

    // 2. Create plugin registry
    const plugins = createPluginRegistry(config.name);

    // 3. Create data layer
    const data = createEntityData(config.dataSource, state);

    // 4. Create table plugin (unless skipped by config)
    const skipTable = config.table?._skipEngineTable;
    const tablePlugin = skipTable ? null : createEntityTablePlugin(config, data, state, plugins);

    // 5. Create CRUD (lazy — initialized when table needs it)
    let crudInstance = null;
    function getCrud() {
        if (!crudInstance && config.crud) {
            crudInstance = createEntityCrud(config, data, state, plugins);
        }
        return crudInstance;
    }

    // 6. Build PLUGINS array
    const pagePlugins = [
        // Table plugin (wrapped as lazy import result) — if not skipped
        ...(tablePlugin ? [() => Promise.resolve(tablePlugin)] : []),
        // CRUD initializer plugin
        ...(config.crud ? [() => Promise.resolve({
            init() {
                getCrud();
            }
        })] : []),
        // Extra plugins from page config
        ...(config.page?.extraPlugins || []),
    ];

    // 7. Apply extensions
    const ctx = { state, plugins, data, getCrud, config };
    if (config.extensions) {
        config.extensions.forEach(ext => {
            if (typeof ext === 'function') ext(ctx);
        });
    }

    // 8. Create page
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
