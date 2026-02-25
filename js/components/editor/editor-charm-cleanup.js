// js/components/editor/editor-charm-cleanup.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ✨ ШАРМ [cleanup] — Тогли очистки (links / images / styles)                     ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Кнопки в нижньому правому куті редактора.                               ║
 * ║  Активна = цей тип контенту видаляється. Неактивна = лишається.          ║
 * ║  Можна видалити — редактор використає дефолтні налаштування.             ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export function init(state) {
    const { dom, id } = state;
    const container = dom.container;

    const togglesWrapper = container.querySelector(`#${id}-cleanup-toggles`);
    if (!togglesWrapper) return;

    const toggleButtons = togglesWrapper.querySelectorAll('[data-cleanup-toggle]');

    // Встановити початковий візуальний стан (active = чистить, inactive = лишає)
    toggleButtons.forEach(btn => {
        const key = btn.dataset.cleanupToggle;
        updateButtonVisual(btn, !state[key]);
    });

    // Обробка кліків
    togglesWrapper.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-cleanup-toggle]');
        if (!btn) return;

        const key = btn.dataset.cleanupToggle;
        state[key] = !state[key];
        updateButtonVisual(btn, !state[key]);
    });

    // Ховати в режимі коду, показувати в тексті
    state.registerHook('onModeChange', (mode) => {
        togglesWrapper.style.display = mode === 'text' ? 'flex' : 'none';
    }, { plugin: 'cleanup' });
}

function updateButtonVisual(btn, isActive) {
    btn.classList.toggle('active', isActive);
}
