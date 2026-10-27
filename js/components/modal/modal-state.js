// js/components/modal/modal-state.js

/*
╔══════════════════════════════════════════════════════════════════════════╗
║  🔒 ЯДРО — МОДАЛІ STATE                                                ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Чистий стан модальної системи — синглтон.                              ║
║  ├── openModalsStack — стек відкритих модалів                           ║
║  ├── templateCache — кеш завантажених HTML шаблонів                     ║
║  └── hooks — registerHook / runHook для плагінів                        ║
║                                                                          ║
║  📋 HOOKS:                                                               ║
║  ├── onBeforeOpen(modalId, trigger)                                      ║
║  ├── onAfterOpen(modalId, trigger, modalElement)                         ║
║  ├── onBeforeClose(modalId, modalElement)                                ║
║  └── onAfterClose(modalId)                                               ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
*/

import { createHookRegistry } from '../../utils/utils-hooks.js';

export const { registerHook, runHook, runHookAsync } = createHookRegistry({
    name: 'Modal',
    events: ['onBeforeOpen', 'onAfterOpen', 'onBeforeClose', 'onAfterClose'],
});

/** @type {string[]} */
const openModalsStack = [];

/** @type {Map<string, string>} */
const templateCache = new Map();

// ── Stack API ──

export function pushModal(modalId) {
    if (!openModalsStack.includes(modalId)) {
        openModalsStack.push(modalId);
    }
}

export function popModal(modalId = null) {
    if (modalId) {
        const index = openModalsStack.indexOf(modalId);
        if (index > -1) openModalsStack.splice(index, 1);
    } else if (openModalsStack.length > 0) {
        openModalsStack.pop();
    }
}

export function peekModal() {
    return openModalsStack.length > 0
        ? openModalsStack[openModalsStack.length - 1]
        : null;
}

export function getOpenModals() {
    return [...openModalsStack];
}

export function hasOpenModals() {
    return openModalsStack.length > 0;
}

// ── Cache API ──

export function getCachedTemplate(modalId) {
    return templateCache.get(modalId) ?? null;
}

export function setCachedTemplate(modalId, html) {
    templateCache.set(modalId, html);
}

export function clearTemplateCache() {
    templateCache.clear();
}
