// js/generators/generator-highlight/ghl-dom.js

let domCache = null;

export function getHighlightDOM() {
    if (domCache) {
        return domCache;
    }

    domCache = {
        // Редактори
        editor: document.getElementById('ghl-editor'),
        codeEditor: document.getElementById('ghl-code-editor'),

        // Результати валідації
        validationResults: document.getElementById('ghl-validation-results'),

        // Тулбар
        toolbar: document.getElementById('ghl-format-toolbar'),

        // Кнопки форматування
        btnBold: document.getElementById('ghl-format-bold'),
        btnItalic: document.getElementById('ghl-format-italic'),
        btnH1: document.getElementById('ghl-format-h1'),
        btnH2: document.getElementById('ghl-format-h2'),
        btnH3: document.getElementById('ghl-format-h3'),
        btnList: document.getElementById('ghl-format-list'),
        btnLowercase: document.getElementById('ghl-format-lowercase'),

        // Перемикачі режимів
        btnModeText: document.getElementById('ghl-mode-text'),
        btnModeCode: document.getElementById('ghl-mode-code'),

        // Find and Replace
        findInput: document.getElementById('ghl-find-input'),
        replaceInput: document.getElementById('ghl-replace-input'),
        replaceAllBtn: document.getElementById('ghl-replace-all-btn'),
    };

    return domCache;
}

export function resetHighlightDOM() {
    domCache = null;
}
