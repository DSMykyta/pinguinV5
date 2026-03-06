// js/pages/images/images-plugins.js

/**
 * Система хуків для сторінки Images.
 */

const hooks = {
    onInit: [],
    onRender: [],
    onDataLoaded: []
};

export function registerImagesPlugin(hookName, callback) {
    if (hooks[hookName]) {
        hooks[hookName].push(callback);
    } else {
        console.warn(`[Images Plugins] Unknown hook: ${hookName}`);
    }
}

export function runHook(hookName, ...args) {
    if (hooks[hookName]) {
        hooks[hookName].forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`[Images Plugins] Error in hook ${hookName}:`, error);
            }
        });
    }
}
