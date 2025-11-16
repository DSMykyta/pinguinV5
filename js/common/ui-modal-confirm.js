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
 */

import { createModalStructure, getModalWrapper, closeModal } from './ui-modal.js';

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
export function showConfirmModal(options = {}) {
    const {
        title = 'Підтвердження',
        message = 'Ви впевнені?',
        confirmText = 'Так',
        cancelText = 'Ні',
        confirmClass = 'btn-danger'
    } = options;

    return new Promise((resolve) => {
        // Створити структуру модалу якщо її немає
        let modalWrapper = getModalWrapper();
        if (!modalWrapper) {
            createModalStructure();
            modalWrapper = getModalWrapper();
        }

        // Заповнити контент
        const titleTarget = modalWrapper.querySelector('.modal-title');
        const headerActionsTarget = modalWrapper.querySelector('#modal-header-actions');
        const bodyTarget = modalWrapper.querySelector('.modal-body');

        titleTarget.textContent = title;

        // Створити тіло модалу з повідомленням (використовуємо CSS класи замість inline стилів)
        bodyTarget.innerHTML = `
            <div class="modal-confirm-body">
                <p class="modal-confirm-message">${message}</p>
                <div class="modal-confirm-actions">
                    <button class="btn-secondary" data-confirm-action="cancel">${cancelText}</button>
                    <button class="btn-primary ${confirmClass}" data-confirm-action="confirm">${confirmText}</button>
                </div>
            </div>
        `;

        // Додати кнопку закриття в header
        headerActionsTarget.innerHTML = '';
        const group = document.createElement('div');
        group.className = 'connected-button-group-square';

        const closeButton = document.createElement('button');
        closeButton.className = 'segment modal-close-btn';
        closeButton.setAttribute('aria-label', 'Закрити');
        closeButton.innerHTML = `<div class="state-layer"><span class="material-symbols-outlined">close</span></div>`;
        group.appendChild(closeButton);

        headerActionsTarget.appendChild(group);

        // Показати модал
        document.body.classList.add('is-modal-open');
        modalWrapper.classList.add('is-open');

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

        // Обробник закриття (ESC або клік поза модалом)
        const handleClose = () => {
            cleanup();
            resolve(false);
        };

        // Cleanup функція
        const cleanup = () => {
            bodyTarget.removeEventListener('click', handleClick);
            modalWrapper.removeEventListener('click', handleModalWrapperClick);
            document.removeEventListener('modal-closed', handleClose);
        };

        // Обробник кліку на overlay
        const handleModalWrapperClick = (e) => {
            if (e.target === modalWrapper) {
                closeModal();
                handleClose();
            }
        };

        // Додати слухачі
        bodyTarget.addEventListener('click', handleClick);
        modalWrapper.addEventListener('click', handleModalWrapperClick);

        // Слухаємо подію закриття модалу (ESC або кнопка X)
        const modalCloseHandler = () => {
            if (!modalWrapper.classList.contains('is-open')) {
                handleClose();
                document.removeEventListener('modal-closed', modalCloseHandler);
            }
        };
        document.addEventListener('modal-closed', modalCloseHandler);
    });
}
