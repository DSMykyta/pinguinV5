// js/pages/banners/banners-plugins.js

/**
 * Система хуків для сторінки Banners.
 */

const hooks = {
    onInit: [],
    onRender: [],
    onDataLoaded: [],
    onModalOpen: [],
    onModalClose: []
};

export function registerBannersPlugin(hookName, callback) {
    if (hooks[hookName]) {
        hooks[hookName].push(callback);
    } else {
        console.warn(`[Banners Plugins] Unknown hook: ${hookName}`);
    }
}

export function runHook(hookName, ...args) {
    if (hooks[hookName]) {
        hooks[hookName].forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`[Banners Plugins] Error in hook ${hookName}:`, error);
            }
        });
    }
}
