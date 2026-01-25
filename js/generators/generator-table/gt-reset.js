// js/generators/generator-table/gt-reset.js
import { getTableDOM } from './gt-dom.js';
import { resetRowCounter } from './gt-state.js';
import { clearSession } from './gt-session-manager.js';
import { initializeFirstRow } from './gt-row-manager.js'; // Потрібно для відновлення

/**
 * Виконує фактичне очищення секції таблиць та UI.
 */
function performTableReset() {
    const dom = getTableDOM();
    if (!dom.rowsContainer) return;
    const icon = dom.reloadBtn?.querySelector('span');

    // --- Анімація СТАРТ ---
    if (dom.reloadBtn) dom.reloadBtn.disabled = true;
    if (dom.reloadBtn) dom.reloadBtn.style.color = 'var(--color-primary)';
    icon?.classList.add('is-spinning');
    // ---------------------

    // Виконуємо очищення
    dom.rowsContainer.innerHTML = '';
    resetRowCounter();
    clearSession();
    initializeFirstRow();

    // --- Анімація СТОП (одразу) ---
    if (dom.reloadBtn) dom.reloadBtn.disabled = false;
    if (dom.reloadBtn) dom.reloadBtn.style.color = 'var(--text-disabled)';
    icon?.classList.remove('is-spinning');
    // Переконуємось, що transform скинуто
    if(icon) icon.style.transform = 'none';
    // -------------------------
}

/**
 * Ініціалізує логіку кнопки очищення для таблиць (з модальним вікном).
 */
export function initTableReset() {
    const dom = getTableDOM();
    if (!dom.reloadBtn) return;

    // 1. Кнопка "Оновити" просто відкриває модал
    dom.reloadBtn.dataset.modalTrigger = 'confirm-clear-modal';
    dom.reloadBtn.dataset.modalSize = 'small';

    // 2. Слухаємо кнопку "Так, очистити" всередині модалу
    document.body.addEventListener('click', (e) => {
        const confirmBtn = e.target.closest('#confirm-clear-action');
        if (confirmBtn) {
            performTableReset(); // Викликаємо очищення
            // Закриття модалу обробляється ui-modal.js через data-modal-close
        }
    });
}