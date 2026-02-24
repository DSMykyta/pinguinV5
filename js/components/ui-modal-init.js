// js/common/ui-modal-init.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              ІНІЦІАЛІЗАЦІЯ ГЛОБАЛЬНИХ СЛУХАЧІВ МОДАЛІВ                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Реєстрація глобальних слухачів подій для модальних вікон.
 * Викликається один раз при завантаженні застосунку.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - initModals() - Ініціалізувати слухачі подій для модалів
 *
 * ЗАЛЕЖНОСТІ:
 * - ui-modal.js (базові функції модалів)
 */

import { showModal, closeModal } from './ui-modal.js';

/**
 * Ініціалізує глобальні слухачі подій для модальних вікон
 *
 * СЛУХАЧІ:
 * 1. Click на [data-modal-trigger] - відкриває модальне вікно
 * 2. Click на [data-modal-close] або .modal-close-btn - закриває модальне вікно
 * 3. ESC key - закриває модальне вікно
 *
 * ВИКОРИСТАННЯ:
 * Викликати один раз в app.js або головному файлі
 *
 * @example
 * import { initModals } from './common/ui-modal-init.js';
 * initModals();
 */
export function initModals() {
    // Слухач для відкриття та закриття модалів
    document.addEventListener('click', (e) => {
        // Відкриття модалу через [data-modal-trigger]
        const trigger = e.target.closest('[data-modal-trigger]');
        if (trigger) {
            e.preventDefault();
            const modalId = trigger.dataset.modalTrigger;
            showModal(modalId, trigger);
        }

        // Закриття модалу через [data-modal-close] або .modal-close-btn
        const closeTrigger = e.target.closest('[data-modal-close], .modal-close-btn');
        if (closeTrigger && closeTrigger.closest('.modal-container, .modal-fullscreen-container')) {
             e.preventDefault();
             closeModal();
        }
    });

    // Слухач для закриття модалу клавішею ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('modal-open')) {
            closeModal();
        }
    });
}
