// js/utils/polling.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         POLLING                                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Універсальний polling-движок з fingerprint-порівнянням та pause/resume  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Generic Polling Engine.
 * Періодично полить джерела даних, порівнює fingerprint,
 * при змінах — оновлює стейт і викликає onChanged.
 *
 * Використання:
 *   const polling = createPolling({
 *       interval: 20_000,
 *       sources: [
 *           {
 *               name: 'categories',
 *               fetch: () => fetchData('Sheet!A:D'),
 *               getState: () => state.categories,
 *               setState: (data) => { state.categories = data; },
 *           },
 *       ],
 *       onChanged: () => rerender(),
 *   });
 *
 *   polling.start();
 *   polling.pause();   // write lock (counter-based, nested-safe)
 *   polling.resume();  // знімає lock + оновлює snapshots
 *   polling.stop();
 *   polling.resetSnapshots();
 */

/**
 * @param {Object} config
 * @param {number} config.interval - Інтервал полінгу в ms
 * @param {Array<{name: string, fetch: Function, getState: Function, setState: Function}>} config.sources
 * @param {Function} config.onChanged - Callback при виявленні змін
 * @returns {{ start, stop, pause, resume, resetSnapshots }}
 */
export function createPolling(config) {
    const { interval, sources, onChanged } = config;

    let intervalId = null;
    let writeLockCount = 0;
    let polling = false;
    const snapshots = {};

    // ── Fingerprint ──

    function fingerprint(items) {
        return items.map(m => m.id).sort().join(',');
    }

    function resetSnapshots() {
        for (const src of sources) {
            snapshots[src.name] = fingerprint(src.getState());
        }
    }

    // ── Poll cycle ──

    async function poll() {
        if (writeLockCount > 0 || document.hidden || polling) return;

        polling = true;
        try {
            const settled = await Promise.allSettled(sources.map(src => src.fetch()));
            const results = settled.map(r => r.status === 'fulfilled' ? r.value : null);

            let changed = false;
            for (let i = 0; i < sources.length; i++) {
                const fp = fingerprint(results[i]);
                if (fp !== snapshots[sources[i].name]) {
                    sources[i].setState(results[i]);
                    snapshots[sources[i].name] = fp;
                    changed = true;
                }
            }

            if (changed) {
                await onChanged();
            }
        } catch (error) {
            console.warn('⚠️ Polling error:', error.message);
        } finally {
            polling = false;
        }
    }

    // ── Visibility ──

    function handleVisibility() {
        if (!intervalId && document.hidden) return;

        if (document.hidden) {
            clearInterval(intervalId);
            intervalId = null;
        } else if (intervalId === null) {
            poll();
            intervalId = setInterval(poll, interval);
        }
    }

    // ── Public API ──

    function start() {
        if (intervalId) return;
        resetSnapshots();
        intervalId = setInterval(poll, interval);
        document.addEventListener('visibilitychange', handleVisibility);
    }

    function stop() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        document.removeEventListener('visibilitychange', handleVisibility);
    }

    function pause() {
        writeLockCount++;
    }

    function resume() {
        writeLockCount = Math.max(0, writeLockCount - 1);
        if (writeLockCount === 0) {
            resetSnapshots();
        }
    }

    return { start, stop, pause, resume, resetSnapshots };
}
