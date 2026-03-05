// js/pages/redirect-target/redirect-target-plugins.js

/**
 * Система хуків для сторінки Redirect Target.
 * Дозволяє плагінам підписуватись на події життєвого циклу сторінки.
 */

const hooks = {
    onInit: [],
    onRender: [],
    onDataLoaded: []
};

export function registerRedirectPlugin(hookName, callback) {
    if (hooks[hookName]) {
        hooks[hookName].push(callback);
    } else {
        console.warn(`[RedirectTarget Plugins] Unknown hook: ${hookName}`);
    }
}

export function runHook(hookName, ...args) {
    if (hooks[hookName]) {
        hooks[hookName].forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`[RedirectTarget Plugins] Error in hook ${hookName}:`, error);
            }
        });
    }
}