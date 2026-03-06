// js/pages/blog/blog-plugins.js

/**
 * Система хуків для сторінки Blog.
 */

const hooks = {
    onInit: [],
    onRender: [],
    onDataLoaded: [],
    onTabChange: [],
    onModalOpen: [],
    onModalClose: []
};

export function registerBlogPlugin(hookName, callback) {
    if (hooks[hookName]) {
        hooks[hookName].push(callback);
    } else {
        console.warn(`[Blog Plugins] Unknown hook: ${hookName}`);
    }
}

export function runHook(hookName, ...args) {
    if (hooks[hookName]) {
        hooks[hookName].forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`[Blog Plugins] Error in hook ${hookName}:`, error);
            }
        });
    }
}
