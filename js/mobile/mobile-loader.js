/**
 * MOBILE LOADER
 *
 * Автоматично завантажує CSS та JS для мобільної адаптації.
 * Підключається одним рядком: <script src="js/mobile/mobile-loader.js"></script>
 *
 * Повністю ізольований - не торкається існуючого коду.
 */

(function MobileLoader() {
    'use strict';

    const MOBILE_BREAKPOINT = 768;
    const CSS_PATH = '/css/mobile/mobile-instruments.css';
    const JS_PATH = '/js/mobile/mobile-instruments.js';

    let cssLoaded = false;
    let jsLoaded = false;

    function loadCSS() {
        if (cssLoaded) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = CSS_PATH;
        link.id = 'mobile-instruments-css';
        document.head.appendChild(link);
        cssLoaded = true;
    }

    function loadJS() {
        if (jsLoaded) return;

        const script = document.createElement('script');
        script.src = JS_PATH;
        script.id = 'mobile-instruments-js';
        document.body.appendChild(script);
        jsLoaded = true;
    }

    function init() {
        // Always load CSS (media queries handle visibility)
        loadCSS();

        // Load JS
        loadJS();
    }

    // Init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
