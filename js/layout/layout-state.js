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

export const ASIDE_STATES = ['expanded', 'closed'];

const _state = {
    current: 'expanded',
};

export function getAsideState() {
    return _state.current;
}

export function updateAsideState(newState) {
    if (!ASIDE_STATES.includes(newState)) return;
    _state.current = newState;
}
