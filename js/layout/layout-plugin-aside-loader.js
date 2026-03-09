// js/layout/layout-plugin-aside-loader.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║             ПРАВА ПАНЕЛЬ — ЗАВАНТАЖЕННЯ ШАБЛОНІВ (ASIDE LOADER)          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Завантажує HTML шаблони з templates/aside/ і розставляє їх по зонах.   ║
 * ║                                                                          ║
 * ║  📋 ЗОНИ ШАБЛОНУ:                                                        ║
 * ║  ├── .panel-content-fix    → .aside-body (закріплений верх)              ║
 * ║  ├── .panel-content-scroll → .aside-body (скролиться)                    ║
 * ║  └── .panel-content-footer → .aside-fab  (завжди видимий низ)           ║
 * ║                                                                          ║
 * ║  📋 ДВА РЕЖИМИ ЗАВАНТАЖЕННЯ:                                             ║
 * ║  ├── init()                         — всі секції паралельно (в initLayout)║
 * ║  └── loadSingleAsideTemplate(name)  — один шаблон (brands, keywords...)  ║
 * ║                                                                          ║
 * ║  📋 РЕЄСТР ІНІЦІАЛІЗАТОРІВ:                                              ║
 * ║  registerAsideInitializer(name, fn) — fn викликається після завантаження ║
 * ║                                                                          ║
 * ║  🎯 ВИКОРИСТАННЯ:                                                        ║
 * ║  import { registerAsideInitializer } from './layout/layout-main.js';    ║
 * ║  registerAsideInitializer('aside-table', () => initTableGenerator());    ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { loadHTML } from '../utils/utils-html-loader.js';
import { initDropdowns } from '../components/forms/dropdown.js';

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТР ІНІЦІАЛІЗАТОРІВ
// ═══════════════════════════════════════════════════════════════════════════

const asideInitializers = {};

/**
 * Реєструє ініціалізатор для шаблону aside.
 * @param {string} templateName — назва шаблону (напр. 'aside-table')
 * @param {Function} initFn — функція ініціалізації
 */
export function registerAsideInitializer(templateName, initFn) {
    asideInitializers[templateName] = initFn;
}

// ═══════════════════════════════════════════════════════════════════════════
// ВНУТРІШНЯ ЛОГІКА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Завантажує шаблон в aside-body, переміщує footer в aside-fab.
 * @param {string} name — назва шаблону
 * @param {HTMLElement} body — контейнер aside-body
 * @param {HTMLElement|null} fab — контейнер aside-fab
 * @param {boolean} active — чи зразу показувати
 */
async function loadTemplate(name, body, fab, active = false) {
    // Body fragment
    const bodyFragment = document.createElement('div');
    bodyFragment.id = name;
    bodyFragment.className = 'aside-fragment' + (active ? ' active' : '');
    body.appendChild(bodyFragment);

    await loadHTML(`templates/aside/${name}.html`, bodyFragment);

    // Footer → fab
    if (fab) {
        const footer = bodyFragment.querySelector('.panel-content-footer');
        if (footer) {
            const fabFragment = document.createElement('div');
            fabFragment.className = 'aside-fab-fragment' + (active ? ' active' : '');
            fabFragment.dataset.for = name;
            fabFragment.appendChild(footer);
            fab.appendChild(fabFragment);
        }
    }

    // Ініціалізатор
    if (asideInitializers[name]) {
        asideInitializers[name]();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПУБЛІЧНЕ API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🔌 ПЛАГІН — завантажує всі шаблони секцій паралельно.
 * Викликається через PLUGINS у layout-main.js.
 */
export async function init() {
    const body = document.querySelector('.aside .aside-body');
    const fab = document.querySelector('.aside-fab');
    if (!body) return;

    const sections = document.querySelectorAll('[data-aside-template]');
    const templateNames = new Set();
    sections.forEach(s => {
        const name = s.dataset.asideTemplate;
        if (name) templateNames.add(name);
    });

    await Promise.allSettled(
        Array.from(templateNames).map(name => loadTemplate(name, body, fab))
    );

    initDropdowns();
}

/**
 * Завантажує один шаблон (для простих сторінок з одним aside).
 * @param {string} templateName — назва шаблону
 */
export async function loadSingleAsideTemplate(templateName) {
    const body = document.querySelector('.aside .aside-body');
    const fab = document.querySelector('.aside-fab');
    if (!body || document.getElementById(templateName)) return;

    await loadTemplate(templateName, body, fab, true);
    initDropdowns();
}

/**
 * Показує потрібний шаблон, ховає інші.
 * @param {string|null} templateName — назва шаблону або null для absent
 */
export function showAsidePanel(templateName) {
    const body = document.querySelector('.aside .aside-body');
    const fab = document.querySelector('.aside-fab');
    if (!body) return;

    // Ховаємо всі body fragments
    body.querySelectorAll('.aside-fragment').forEach(f => f.classList.remove('active'));

    // Ховаємо всі fab fragments
    if (fab) {
        fab.querySelectorAll('.aside-fab-fragment').forEach(f => f.classList.remove('active'));
    }

    if (!templateName) return; // absent

    // Показуємо активний body fragment
    const active = document.getElementById(templateName);
    if (active) active.classList.add('active');

    // Показуємо активний fab fragment
    if (fab) {
        const activeFab = fab.querySelector(`[data-for="${templateName}"]`);
        if (activeFab) activeFab.classList.add('active');
    }
}
