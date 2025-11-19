// js/common/ui-modal-confirm.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            ДІАЛОГИ ПІДТВЕРДЖЕННЯ ДЛЯ МОДАЛЬНИХ ВІКОН                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Функції для створення простих діалогів підтвердження дій (Так/Ні).
 * Використовує базову інфраструктуру модальних вікон.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - showConfirmModal(options) - Показати діалог підтвердження
 *
 * ЗАЛЕЖНОСТІ:
 * - ui-modal.js (базові функції модалів)
 * - templates/modals/modal-confirm.html
 */

import { showModal, closeModal } from './ui-modal.js';

/**
 * Показати просте підтвердження з кнопками Так/Ні
 *
 * @param {Object} options - Опції підтвердження
 * @param {string} options.title - Заголовок вікна (за замовчуванням 'Підтвердження')
 * @param {string} options.message - Текст повідомлення
 * @param {string} options.confirmText - Текст кнопки підтвердження (за замовчуванням 'Так')
 * @param {string} options.cancelText - Текст кнопки скасування (за замовчуванням 'Ні')
 * @param {string} options.confirmClass - Клас для кнопки підтвердження (за замовчуванням 'btn-danger')
 *
 * @returns {Promise<boolean>} Promise що резолвиться в true якщо підтверджено, false якщо скасовано
 *
 * @example
 * const confirmed = await showConfirmModal({
 *   title: 'Видалити елемент?',
 *   message: 'Ця дія незворотна. Ви впевнені?',
 *   confirmText: 'Видалити',
 *   cancelText: 'Скасувати',
 *   confirmClass: 'btn-danger'
 * });
 *
 * if (confirmed) {
 *   // Виконати дію
 * }
 */
export async function showConfirmModal(options = {}) {
    const {
        title = 'Підтвердження',
        message = 'Ви впевнені?',
        confirmText = 'Так',
        cancelText = 'Ні',
        confirmClass = 'btn-danger'
    } = options;

    return new Promise(async (resolve) => {
        // Створюємо тригер елемент з атрибутом data-modal-size
        const triggerElement = document.createElement('div');
        triggerElement.dataset.modalSize = 'small';

        // Відкриваємо модал з шаблону
        await showModal('modal-confirm', triggerElement);

        // Після відкриття оновлюємо контент
        const modalTitle = document.querySelector('.modal-title');
        const messageElement = document.getElementById('modal-confirm-message-text');
        const cancelBtn = document.getElementById('modal-confirm-cancel-btn');
        const confirmBtn = document.getElementById('modal-confirm-confirm-btn');

        if (modalTitle) {
            modalTitle.textContent = title;
        }

        if (messageElement) {
            messageElement.textContent = message;
        }

        if (cancelBtn) {
            cancelBtn.textContent = cancelText;
        }

        if (confirmBtn) {
            confirmBtn.textContent = confirmText;
            // Додаємо/замінюємо клас
            confirmBtn.className = `btn-primary ${confirmClass}`;
            confirmBtn.dataset.confirmAction = 'confirm';
        }

        // Обробник кліків на кнопки
        const handleClick = (e) => {
            const action = e.target.closest('[data-confirm-action]')?.dataset.confirmAction;

            if (action === 'confirm') {
                closeModal();
                cleanup();
                resolve(true);
            } else if (action === 'cancel') {
                closeModal();
                cleanup();
                resolve(false);
            }
        };

        // Обробник закриття модалу
        const handleModalClose = () => {
            cleanup();
            resolve(false);
        };

        // Cleanup функція
        const cleanup = () => {
            document.removeEventListener('click', handleClick);
            document.removeEventListener('modal-closed', handleModalClose);
        };

        // Додати слухачі
        document.addEventListener('click', handleClick);
        document.addEventListener('modal-closed', handleModalClose);
    });
}
