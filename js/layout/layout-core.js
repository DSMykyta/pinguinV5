// js/layout/layout-core.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   LAYOUT — ЯДРО ASIDE (DOM + КНОПКИ)                     ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  DOM-синхронізація стану aside та обробка кнопок.                        ║
 * ║  Стан зберігається в layout-state.js.                                    ║
 * ║                                                                          ║
 * ║  📋 CSS КЛАСИ (синхронізуються автоматично):                             ║
 * ║  ├── .aside.expanded / .closed                                           ║
 * ║  ├── body.aside-expanded / .aside-closed                                 ║
 * ║  └── .aside-trigger.open  (rotate шарм, є коли панель відкрита)          ║
 * ║                                                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🎯 ВИКОРИСТАННЯ:                                                        ║
 * ║  HTML — початковий стан через клас на aside:                             ║
 * ║     <aside class="aside expanded">   ← або closed                        ║
 * ║                                                                          ║
 * ║  JS — змінити стан програмно:                                            ║
 * ║     import { setAsideState } from './layout/layout-main.js';             ║
 * ║     setAsideState('closed');                                             ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { ASIDE_STATES, getAsideState, updateAsideState } from './layout-state.js';

// ═══════════════════════════════════════════════════════════════════════════
// ВНУТРІШНІЙ СТАН
// ═══════════════════════════════════════════════════════════════════════════

let _aside, _trigger;
let _eventsBound = false;

function handleTriggerClick(event) {
    event.stopPropagation();

    // Keep the visible DOM state authoritative for the toggle.
    const nextState = _aside.classList.contains('closed') ? 'expanded' : 'closed';
    setAsideState(nextState);
}

function handleDocumentKeydown(event) {
    if (event.key !== 'Escape' || getAsideState() === 'closed') return;
    setAsideState('closed');
    _trigger.focus();
}

// ═══════════════════════════════════════════════════════════════════════════
// ВНУТРІШНЯ ЛОГІКА
// ═══════════════════════════════════════════════════════════════════════════

function applyDOM(state) {
    if (!_aside || !_trigger) return;

    ASIDE_STATES.forEach(s => {
        _aside.classList.remove(s);
        document.body.classList.remove('aside-' + s);
    });

    _aside.classList.add(state);
    document.body.classList.add('aside-' + state);

    _trigger.classList.toggle('open', state !== 'closed');
    _trigger.setAttribute('aria-expanded', String(state !== 'closed'));
    _aside.setAttribute('aria-hidden', String(state === 'closed'));
}

// ═══════════════════════════════════════════════════════════════════════════
// ПУБЛІЧНЕ API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Встановити стан aside ззовні: оновлює модель і синхронізує DOM.
 * Використовується aside-observer та зовнішнім кодом.
 */
export function setAsideState(state) {
    updateAsideState(state);
    applyDOM(state);
}

/**
 * Ініціалізує DOM-зв'язки та кнопки aside.
 * Викликається першим у initLayout().
 */
export function init() {
    _aside = document.querySelector('.aside');
    _trigger = document.querySelector('.aside-trigger');

    if (!_aside || !_trigger) return;

    if (!_aside.id) _aside.id = 'page-aside';
    _trigger.setAttribute('aria-controls', _aside.id);
    _trigger.setAttribute('aria-haspopup', 'dialog');

    if (document.body.classList.contains('layout-v2')) {
        document.body.classList.add('aside-unavailable');
    }

    if (!_eventsBound) {
        _trigger.addEventListener('click', handleTriggerClick);

        if (document.body.classList.contains('layout-v2')) {
            document.addEventListener('keydown', handleDocumentKeydown);
        }

        _eventsBound = true;
    }

    // Початковий стан з HTML-класу
    const initial = ASIDE_STATES.find(s => _aside.classList.contains(s)) || 'expanded';
    setAsideState(initial);
}
