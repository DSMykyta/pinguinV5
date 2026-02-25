// js/layout/layout-state.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         LAYOUT — ЧИСТИЙ СТАН                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Тільки дані. Без DOM, без подій, без зовнішніх імпортів.               ║
 * ║  Читається і оновлюється через layout-core.js.                          ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export const ASIDE_STATES = ['expanded', 'collapsed', 'closed'];

const _state = {
    current: 'expanded',
    lastOpen: 'expanded',
};

export function getAsideState() {
    return _state.current;
}

export function getLastOpen() {
    return _state.lastOpen;
}

export function updateAsideState(newState) {
    if (!ASIDE_STATES.includes(newState)) return;
    if (newState !== 'closed') _state.lastOpen = newState;
    _state.current = newState;
}
