// js/generators/generator-image/gim-dom.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    IMAGE TOOL - DOM                                     ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Кешовані DOM-елементи генератора зображень                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
let domCache = null;

export function getImageDom() {
    if (domCache) {
        return domCache;
    }

    domCache = {
        // Головна секція
        imageInput: document.getElementById('gim-image-input'),
        imageCanvas: document.getElementById('gim-image-canvas'),
        thumbnailsArea: document.getElementById('gim-thumbnails-area'),
        emptyState: document.getElementById('gim-empty-state'),
        dropzone: document.getElementById('gim-dropzone'),
        selectFileBtn: document.getElementById('gim-select-file-btn'),
        imageUrlInput: document.getElementById('gim-image-url'),
        loadUrlBtn: document.getElementById('gim-load-url-btn'),

        // Aside (футер)
        saveBtn: document.getElementById('gim-save-btn'),
        outputFormat: document.getElementById('gim-output-format'),
        
        // Перемикачі режимів
        modeResizeContent: document.getElementById('gim-mode-resize-content'),
        modeCanvasContent: document.getElementById('gim-mode-canvas-content'),
        modeSwitchContainer: document.getElementById('gim-mode-switch-container'),
        
        // Зміна розміру зображення
        resizeWidth: document.getElementById('gim-resize-width'),
        resizeHeight: document.getElementById('gim-resize-height'),

        applyResizeBtn: document.getElementById('gim-apply-resize'),
        
        // Зміна розміру полотна
        canvasWidth: document.getElementById('gim-canvas-width'),
        canvasHeight: document.getElementById('gim-canvas-height'),

        applyCanvasBtn: document.getElementById('gim-apply-canvas'),

        squarifyBtn: document.getElementById('gim-squarify-btn'),
    };

    return domCache;
}