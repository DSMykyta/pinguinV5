// js/generators/generator-translate/gtr-reset.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      GTR — RESET                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Скидання секції перекладу (перезавантаження iframe)         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Скидання секції перекладу — перезавантаження iframe.
 * Слухає charm:refresh на секції (кнопка створюється charm-refresh.js).
 */

export function init() {
    initTranslateReset();
}

export function initTranslateReset() {
    const section = document.getElementById('section-translate');
    const iframeContainer = section?.querySelector('.section-content');

    if (!section || !iframeContainer) return;

    section.addEventListener('charm:refresh', (e) => {
        const oldIframe = iframeContainer.querySelector('iframe');
        if (!oldIframe) return;

        const initialSrc = oldIframe.getAttribute('src');
        let cleanSrc = initialSrc.split('&_=')[0].split('?_=')[0];
        const separator = cleanSrc.includes('?') ? '&' : '?';
        const newSrc = `${cleanSrc}${separator}_=${Date.now()}`;

        const newIframe = document.createElement('iframe');
        newIframe.style.cssText = oldIframe.style.cssText;
        newIframe.title = oldIframe.title;
        newIframe.src = newSrc;

        const loadPromise = new Promise((resolve) => {
            newIframe.onload = () => resolve();
            newIframe.onerror = () => resolve();
        });

        iframeContainer.replaceChild(newIframe, oldIframe);
        e.detail?.waitUntil(loadPromise);
    });
}
