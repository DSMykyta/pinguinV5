// js/theme-init.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    THEME INIT — FOUC PREVENTION                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Блокуючий скрипт в <head>, запобігає миготінню теми          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
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
