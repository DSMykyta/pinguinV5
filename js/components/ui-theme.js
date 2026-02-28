// js/components/ui-theme.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      UI THEME — ПЕРЕМИКАЧ ТЕМИ                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 КОМПОНЕНТ — Управління темою (light / dark / system)                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const STORAGE_KEY = 'theme-mode';
const MODES = ['light', 'dark', 'system'];

const MODE_CONFIG = {
    light:  { icon: 'light_mode',      label: 'Світла' },
    dark:   { icon: 'dark_mode',        label: 'Темна' },
    system: { icon: 'brightness_auto',  label: 'Системна' }
};

function getStoredMode() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(stored) ? stored : 'system';
}

function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode) {
    const resolved = mode === 'system' ? getSystemTheme() : mode;

    if (resolved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

function updateToggleButton(mode) {
    const btn = document.getElementById('theme-toggle-btn');
    const icon = document.getElementById('theme-toggle-icon');
    const config = MODE_CONFIG[mode];

    if (icon) icon.textContent = config.icon;
    if (btn) {
        btn.setAttribute('data-tooltip', config.label);
        // Оновити активний tooltip якщо він зараз видимий
        const activeTooltip = document.querySelector('.custom-tooltip');
        if (activeTooltip) activeTooltip.textContent = config.label;
    }
}

function cycleTheme() {
    const current = getStoredMode();
    const nextIndex = (MODES.indexOf(current) + 1) % MODES.length;
    const next = MODES[nextIndex];

    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    updateToggleButton(next);
}

/**
 * Ініціалізація теми.
 * Викликати після DOMContentLoaded (всередині initCore або окремо).
 */
export function initTheme() {
    const mode = getStoredMode();

    // Застосовуємо тему (на випадок якщо theme-init.js не підключений)
    applyTheme(mode);
    updateToggleButton(mode);

    // Слухаємо зміну системної теми
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (getStoredMode() === 'system') {
            applyTheme('system');
        }
    });

    // Прив'язуємо кнопку
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
        btn.addEventListener('click', cycleTheme);
    }
}
