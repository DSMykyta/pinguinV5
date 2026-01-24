// js/generators/generator-highlight/ghl-dom.js

let domCache = null;

export function getHighlightDOM() {
    if (domCache) {
        return domCache;
    }

    // Версія до Claude
    //
    //domCache = {
    //    editorContainer: document.getElementById('ghl-editor-container'),
    //    textarea: document.getElementById('ghl-input-textarea'),
    //    validationResults: document.getElementById('ghl-validation-results'),
    //};

    domCache = {
    editorContainer: document.getElementById('ghl-editor-container'),
    validationResults: document.getElementById('ghl-validation-results'),
};



    return domCache;
}
