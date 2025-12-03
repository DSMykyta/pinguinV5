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
import { renderAvatarState } from '../utils/avatar-states.js';

/**
 * Показати просте підтвердження з кнопками Так/Ні
 *
 * @param {Object} options - Опції підтвердження
 * @param {string} options.title - Заголовок вікна (за замовчуванням 'Підтвердження')
 * @param {string} options.message - Текст повідомлення
 * @param {string} options.confirmText - Текст кнопки підтвердження (за замовчуванням 'Так')
 * @param {string} options.cancelText - Текст кнопки скасування (за замовчуванням 'Ні')
 * @param {string} options.confirmClass - Клас для кнопки підтвердження (за замовчуванням 'btn-danger')
 * @param {string} options.avatarState - Тип стану аватара: 'confirmClose', 'confirmReload', 'confirmReset', або null (без аватара)
 * @param {string} options.avatarSize - Розмір аватара: 'small', 'medium', 'large' (за замовчуванням 'medium')
 *
 * @returns {Promise<boolean>} Promise що резолвиться в true якщо підтверджено, false якщо скасовано
 *
 * @example
 * // З аватаром
 * const confirmed = await showConfirmModal({
 *   title: 'Закрити без збереження?',
 *   message: 'Всі незбережені зміни буде втрачено',
 *   confirmText: 'Закрити',
 *   cancelText: 'Скасувати',
 *   confirmClass: 'btn-danger',
 *   avatarState: 'confirmClose',
 *   avatarSize: 'small'
 * });
 *
 * // Без аватара (стандартний режим)
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
        confirmClass = 'btn-danger',
        avatarState = null,
        avatarSize = 'medium'
    } = options;

    return new Promise(async (resolve) => {
        // Прапорець для запобігання повторного resolve
        let resolved = false;

        // Створюємо тригер елемент з атрибутом data-modal-size
        const triggerElement = document.createElement('div');
        triggerElement.dataset.modalSize = 'small';

        // Відкриваємо модал з шаблону
        await showModal('modal-confirm', triggerElement);

        // Після відкриття оновлюємо контент
        const modalTitle = document.querySelector('.modal-title');
        const messageElement = document.getElementById('modal-confirm-message-text');
        const avatarContainer = document.getElementById('modal-confirm-avatar-container');
        const cancelBtn = document.getElementById('modal-confirm-cancel-btn');
        const confirmBtn = document.getElementById('modal-confirm-confirm-btn');

        if (modalTitle) {
            modalTitle.textContent = title;
        }

        if (messageElement) {
            messageElement.textContent = message;
        }

        // Вставляємо аватар якщо вказано
        if (avatarContainer && avatarState) {
            const html = renderAvatarState(avatarState, {
                size: avatarSize,
                containerClass: 'modal-confirm-avatar',
                avatarClass: 'modal-confirm-avatar-image',
                messageClass: 'modal-confirm-avatar-message',
                showMessage: false // Не показуємо текст з аватара, бо є окреме повідомлення
            });
            avatarContainer.innerHTML = html;
            console.log('🎨 Avatar rendered for confirmation:', avatarState);
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
                e.stopPropagation(); // Запобігаємо поширенню до інших обробників
                e.preventDefault();
                if (resolved) return;
                resolved = true;
                cleanup();
                closeModal();
                resolve(true);
            } else if (action === 'cancel') {
                e.stopPropagation(); // Запобігаємо поширенню до інших обробників
                e.preventDefault();
                if (resolved) return;
                resolved = true;
                cleanup();
                closeModal();
                resolve(false);
            }
        };

        // Обробник закриття модалу
        const handleModalClose = () => {
            if (resolved) return;
            resolved = true;
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
