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
 * ║  ├── .aside.expanded   / .collapsed / .closed                            ║
 * ║  ├── body.aside-expanded / .aside-collapsed / .aside-closed              ║
 * ║  ├── .aside-trigger.open  (rotate шарм, є коли панель відкрита)          ║
 * ║  └── .aside-expand.open   (flip шарм, є коли collapsed)                  ║
 * ║                                                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🎯 ВИКОРИСТАННЯ:                                                        ║
 * ║  HTML — початковий стан через клас на aside:                             ║
 * ║     <aside class="aside expanded">   ← або collapsed / closed            ║
 * ║                                                                          ║
 * ║  JS — змінити стан програмно:                                            ║
 * ║     import { setAsideState } from './layout/layout-main.js';             ║
 * ║     setAsideState('collapsed');                                          ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { ASIDE_STATES, getAsideState, getLastOpen, updateAsideState } from './layout-state.js';

// ═══════════════════════════════════════════════════════════════════════════
// ВНУТРІШНІЙ СТАН
// ═══════════════════════════════════════════════════════════════════════════

let _aside, _trigger, _expandBtn;

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

    if (_expandBtn) {
        _expandBtn.classList.toggle('open', state === 'collapsed');
    }
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

    _expandBtn = document.querySelector('.aside-expand');

    // Toggle: closed ↔ lastOpen
    _trigger.addEventListener('click', () => {
        const current = getAsideState();
        setAsideState(current === 'closed' ? getLastOpen() : 'closed');
    });

    // Expand: expanded ↔ collapsed
    if (_expandBtn) {
        _expandBtn.addEventListener('click', () => {
            setAsideState(getAsideState() === 'expanded' ? 'collapsed' : 'expanded');
        });
    }

    // Початковий стан з HTML-класу
    const initial = ASIDE_STATES.find(s => _aside.classList.contains(s)) || 'expanded';
    setAsideState(initial);
}
