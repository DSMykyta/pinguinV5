// js/pages/entities/entities-state.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    ENTITIES - STATE MANAGEMENT                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Фабрика state + hooks (єдине джерело правди)                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Створити state для Entities модуля.
 * Hooks та helpers — методи на об'єкті, як вимагає контракт.
 */
export function createEntitiesState() {
    const hooks = {};

    return {
        activeTab: 'categories',

        // Пошук
        searchQuery: '',
        searchColumns: {
            categories: ['id', 'name_ua', 'name_ru'],
            characteristics: ['id', 'name_ua', 'name_ru', 'type'],
            options: ['id', 'value_ua', 'value_ru'],
        },

        // Фільтри
        filters: { categories: {}, characteristics: {}, options: {} },
        columnFilters: { categories: {}, characteristics: {}, options: {} },
        columnFiltersAPI: { categories: null, characteristics: null, options: null },

        // Видимі колонки
        visibleColumns: {
            categories: ['id', 'nesting_level', 'name_ua', 'parent_id', 'grouping', 'bindings'],
            characteristics: ['id', 'raw_category_ids', 'name_ua', 'type', 'is_global', 'bindings'],
            options: ['id', 'characteristic_id', 'value_ua', 'bindings'],
        },

        // Сортування
        sortState: {
            categories: { column: null, direction: null },
            characteristics: { column: null, direction: null },
            options: { column: null, direction: null },
        },

        // Вибрані рядки
        selectedRows: {
            categories: new Set(),
            characteristics: new Set(),
            options: new Set(),
        },

        // Завантажені плагіни
        loadedPlugins: new Set(),

        // ── Hooks ──────────────────────────────────────────────────────────

        registerHook(name, fn, opts = {}) {
            (hooks[name] ??= []).push({ fn, plugin: opts.plugin ?? '?' });
        },

        runHook(name, ...args) {
            (hooks[name] ?? []).forEach(({ fn, plugin }) => {
                try { fn(...args); } catch (e) { console.error(`[Entities:${plugin}] hook "${name}":`, e); }
            });
        },

        // ── Helpers ────────────────────────────────────────────────────────

        clearSelection(tabName) {
            if (this.selectedRows[tabName]) {
                this.selectedRows[tabName].clear();
                this.runHook('onRowSelect', tabName, []);
            }
        },

        markPluginLoaded(name) {
            this.loadedPlugins.add(name);
        },

        isPluginLoaded(name) {
            return this.loadedPlugins.has(name);
        },
    };
}
