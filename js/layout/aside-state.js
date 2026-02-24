// js/layout/aside-state.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      ПРАВА ПАНЕЛЬ — СТАНИ (ASIDE STATE)                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Керує трьома станами правої панелі та синхронізує CSS класи.            ║
 * ║                                                                          ║
 * ║  📋 СТАНИ:                                                               ║
 * ║  ├── expanded  — панель повністю відкрита                                ║
 * ║  ├── collapsed — панель зменшена (лише іконки)                           ║
 * ║  └── closed    — панель повністю прихована                               ║
 * ║                                                                          ║
 * ║  📋 CSS КЛАСИ (синхронізуються автоматично):                             ║
 * ║  ├── .aside.expanded   / .collapsed / .closed                            ║
 * ║  ├── body.aside-expanded / .aside-collapsed / .aside-closed              ║
 * ║  ├── .aside-trigger.open  (rotate шарм, є коли панель відкрита)          ║
 * ║  └── .aside-expand.open   (flip шарм, є коли collapsed)                  ║
 * ║                                                                          ║
 * ║  🎯 ВИКОРИСТАННЯ:                                                        ║
 * ║                                                                          ║
 * ║  1. Початковий стан при відкритті сторінки — задається в HTML:           ║
 * ║     <aside class="aside collapsed">  ← expanded | collapsed | closed     ║
 * ║                                                                          ║
 * ║  2. Змінити стан програмно під час роботи сторінки:                      ║
 * ║     import { setAsideState } from './layout/layout-main.js';              ║
 * ║     setAsideState('collapsed');                                          ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// КОНСТАНТИ ТА СТАН
// ═══════════════════════════════════════════════════════════════════════════

const STATES = ['expanded', 'collapsed', 'closed'];

let _aside, _trigger, _expandBtn, _lastOpen = 'expanded';

// ═══════════════════════════════════════════════════════════════════════════
// ВНУТРІШНЯ ЛОГІКА
// ═══════════════════════════════════════════════════════════════════════════

function applyState(state) {
    if (!_aside || !_trigger) return;

    STATES.forEach(s => {
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
 * Встановити стан aside ззовні.
 * Використовується aside-observer для перемикання стану при скролі.
 */
export function setAsideState(state) {
    if (state !== 'closed') _lastOpen = state;
    applyState(state);
}

/**
 * Ініціалізує aside стан і кнопки.
 */
export function initAsideState() {
    _aside = document.querySelector('.aside');
    _trigger = document.querySelector('.aside-trigger');

    if (!_aside || !_trigger) return;

    _expandBtn = document.querySelector('.aside-expand');

    // Toggle: closed ↔ lastOpen
    _trigger.addEventListener('click', () => {
        const current = STATES.find(s => _aside.classList.contains(s));
        if (current === 'closed') {
            applyState(_lastOpen);
        } else {
            _lastOpen = current;
            applyState('closed');
        }
    });

    // Expand: expanded ↔ collapsed
    if (_expandBtn) {
        _expandBtn.addEventListener('click', () => {
            applyState(_aside.classList.contains('expanded') ? 'collapsed' : 'expanded');
        });
    }

    // Початковий стан
    const initial = STATES.find(s => _aside.classList.contains(s)) || 'expanded';
    applyState(initial);
}
