// js/generators/generator-ai-magic/aim-dom.js

/**
 * DOM lookups for the AI Magic surface.
 */

export function getAiMagicDOM(surface = document.getElementById('ai-magic-surface')) {
    if (!surface) return null;

    return {
        surface,
        avatarContainer: surface.querySelector('#ai-magic-avatar-container'),
        avatarMessage: surface.querySelector('#ai-magic-avatar-message'),
        sourceInput: surface.querySelector('#ai-magic-source'),
        sourceText: surface.querySelector('#ai-magic-source-text'),
        rules: surface.querySelector('#ai-magic-rules'),
        generateBtn: surface.querySelector('#ai-magic-generate-btn'),
        loaderContainer: surface.querySelector('#ai-magic-loader'),
        resultSection: surface.querySelector('#ai-magic-result'),
        status: surface.querySelector('#ai-magic-status'),
        notes: surface.querySelector('#ai-magic-notes'),
    };
}

export function getField(surface, id) {
    return surface?.querySelector(`#${id}`) || null;
}
