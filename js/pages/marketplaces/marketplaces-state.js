// js/pages/marketplaces/marketplaces-state.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MARKETPLACES - STATE MANAGEMENT                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Фабрика state + hooks (єдине джерело правди)                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Створити state для Marketplaces модуля.
 * Hooks та helpers — методи на об'єкті, як вимагає контракт.
 */
export function createMarketplacesState() {
    const hooks = {};

    return {
        // Пошук
        searchQuery: '',
        searchColumns: ['id', 'name', 'slug'],

        // Фільтри
        filters: {},
        columnFilters: {},
        columnFiltersAPI: null,

        // Видимі колонки
        visibleColumns: ['id', 'name', 'slug', 'is_active'],

        // Сортування
        sortState: { column: null, direction: null },

        // Вибрані рядки
        selectedRows: new Set(),

        // Завантажені плагіни
        loadedPlugins: new Set(),

        // ── Hooks ──────────────────────────────────────────────────────────

        registerHook(name, fn, opts = {}) {
            (hooks[name] ??= []).push({ fn, plugin: opts.plugin ?? '?' });
        },

        runHook(name, ...args) {
            (hooks[name] ?? []).forEach(({ fn, plugin }) => {
                try { fn(...args); } catch (e) { console.error(`[Marketplaces:${plugin}] hook "${name}":`, e); }
            });
        },

        // ── Helpers ────────────────────────────────────────────────────────

        clearSelection() {
            this.selectedRows.clear();
            this.runHook('onRowSelect', []);
        },

        markPluginLoaded(name) {
            this.loadedPlugins.add(name);
        },

        isPluginLoaded(name) {
            return this.loadedPlugins.has(name);
        },
    };
}
