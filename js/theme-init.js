/**
 * Theme Init - FOUC Prevention
 * Блокуючий скрипт що запобігає миготінню при завантаженні.
 * Має бути підключений в <head> як звичайний (не module) скрипт.
 */
(function() {
    var mode = localStorage.getItem('theme-mode') || 'system';
    var theme;

    if (mode === 'dark') {
        theme = 'dark';
    } else if (mode === 'light') {
        theme = 'light';
    } else {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
})();
