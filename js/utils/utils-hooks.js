/**
 * Hook subscriptions shared by pages, components and generators.
 * Each registry owns its subscriptions; `events` optionally limits allowed names.
 */
export function createHookRegistry({ name = 'Hooks', events = null } = {}) {
    const allowedEvents = events === null ? null : new Set(events);
    const hooks = new Map((events || []).map(event => [event, []]));

    function reportError(event, plugin, error) {
        console.error(`[${name}:${plugin}] Hook "${event}" failed:`, error);
    }

    /**
     * @param {string} event
     * @param {Function} callback
     * @param {{ plugin?: string, priority?: number }|number} [options]
     * @returns {Function} Idempotent unsubscribe for this registration only.
     */
    function registerHook(event, callback, options = {}) {
        if (typeof event !== 'string' || (allowedEvents && !allowedEvents.has(event))) {
            console.warn(`[${name}] Unknown hook: ${String(event)}`);
            return () => {};
        }
        if (typeof callback !== 'function') {
            console.warn(`[${name}] Hook callback must be a function`);
            return () => {};
        }

        const config = typeof options === 'number' ? { priority: options } : (options || {});
        const entry = {
            callback,
            plugin: config.plugin || 'anonymous',
            priority: Number.isFinite(config.priority) ? config.priority : 10,
            active: true,
        };
        if (!hooks.has(event)) hooks.set(event, []);
        const entries = hooks.get(event);
        entries.push(entry);
        entries.sort((a, b) => a.priority - b.priority);

        return () => {
            if (!entry.active) return;
            entry.active = false;
            const index = entries.indexOf(entry);
            if (index !== -1) entries.splice(index, 1);
        };
    }

    function runHook(event, ...args) {
        for (const entry of [...(hooks.get(event) || [])]) {
            if (!entry.active) continue;
            try {
                const { callback } = entry;
                const result = callback(...args);
                // Sync dispatch stays synchronous, but still owns async failures.
                if (result && typeof result.then === 'function') {
                    Promise.resolve(result).catch(error => reportError(event, entry.plugin, error));
                }
            } catch (error) {
                reportError(event, entry.plugin, error);
            }
        }
    }

    async function runHookAsync(event, ...args) {
        for (const entry of [...(hooks.get(event) || [])]) {
            if (!entry.active) continue;
            try {
                const { callback } = entry;
                await callback(...args);
            } catch (error) {
                reportError(event, entry.plugin, error);
            }
        }
    }

    function clearHooks() {
        for (const entries of hooks.values()) {
            entries.forEach(entry => { entry.active = false; });
            entries.length = 0;
        }
    }

    function getRegisteredHooks() {
        return Object.fromEntries([...hooks].map(([event, entries]) => [event, entries.length]));
    }

    return { registerHook, runHook, runHookAsync, clearHooks, getRegisteredHooks };
}
