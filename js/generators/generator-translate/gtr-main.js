// js/generators/generator-translate/gtr-main.js
import { registerAsideInitializer } from '../../layout/layout-main.js';

const PLUGINS = ['./gtr-reset.js'];

async function loadPlugins() {
    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );
    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            result.value.init();
        } else if (result.status === 'rejected') {
            console.warn(`[Translate] Plugin failed: ${PLUGINS[index]}`);
        }
    });
}

// Реєструємо наш запускач в системі правої панелі
registerAsideInitializer('aside-translate', async () => {
    await loadPlugins();
});
