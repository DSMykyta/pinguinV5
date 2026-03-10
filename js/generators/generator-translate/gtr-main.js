// js/generators/generator-translate/gtr-main.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   GTR — TRANSLATE MAIN                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Фабрика генератора перекладу, завантаження плагінів          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { registerAsideInitializer } from '../../layout/layout-main.js';

const PLUGINS = [() => import('./gtr-reset.js')];

async function loadPlugins() {
    const results = await Promise.allSettled(
        PLUGINS.map(fn => fn())
    );
    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            result.value.init();
        } else if (result.status === 'rejected') {
            console.warn(`[Translate] Plugin ${index} failed`);
        }
    });
}

// Реєструємо наш запускач в системі правої панелі
registerAsideInitializer('aside-translate', async () => {
    await loadPlugins();
});
