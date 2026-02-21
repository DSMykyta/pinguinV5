// js/aside/aside-state.js

/**
 * ASIDE: State
 *
 * Керує станом aside панелі: expanded, collapsed, closed.
 *
 * Елементи:
 * - .aside          — панель
 * - .aside-trigger  — toggle кнопка (в .aside-controls)
 * - .aside-expand   — expand кнопка (в .aside-controls)
 *
 * Синхронізує:
 * - Клас стану на .aside (.expanded / .collapsed / .closed)
 * - Клас на body (body.aside-expanded / .aside-collapsed / .aside-closed)
 * - .is-open на trigger (rotate шарм)
 * - .is-open на expand (flip шарм)
 *
 * CSS: css/layout/layout-aside.css
 */

const STATES = ['expanded', 'collapsed', 'closed'];

let _aside, _trigger, _expandBtn, _lastOpen = 'expanded';

function applyState(state) {
    if (!_aside || !_trigger) return;

    STATES.forEach(s => {
        _aside.classList.remove(s);
        document.body.classList.remove('aside-' + s);
    });

    _aside.classList.add(state);
    document.body.classList.add('aside-' + state);

    _trigger.classList.toggle('is-open', state !== 'closed');

    if (_expandBtn) {
        _expandBtn.classList.toggle('is-open', state === 'collapsed');
    }
}

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
