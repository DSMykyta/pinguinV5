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
 * ВАЖЛИВО: Всі модалі підтвердження автоматично отримують аватари!
 * Це забезпечує консистентність UI.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - showConfirmModal(options) - Показати діалог підтвердження
 * - showDeleteConfirm(options) - Shortcut для видалення
 * - showResetConfirm(options) - Shortcut для скидання
 * - showCloseConfirm(options) - Shortcut для закриття
 *
 * ЗАЛЕЖНОСТІ:
 * - ui-modal.js (базові функції модалів)
 * - avatar/avatar-ui-states.js (рендеринг аватарів)
 */

import { showModal, closeModal } from './ui-modal.js';
import { renderAvatarState } from './avatar/avatar-ui-states.js';

/**
 * Типи кнопок з відповідними станами аватарів
 * Автоматично визначає який аватар показати
 */
const BUTTON_TO_AVATAR_STATE = {
    'btn-delete': 'confirmDelete',
    'btn-warning': 'confirmReset',
    'btn-primary': 'confirmClose',
    'btn-secondary': 'confirmClose'
};

/**
 * Дефолтний стан аватара для модалів підтвердження
 */
const DEFAULT_AVATAR_STATE = 'confirmClose';

/**
 * Показати просте підтвердження з кнопками Так/Ні
 *
 * ВАЖЛИВО: Всі модалі підтвердження автоматично отримують аватари!
 * Якщо не вказано avatarState - визначається автоматично на основі confirmClass.
 *
 * @param {Object} options - Опції підтвердження
 * @param {string} options.title - Заголовок вікна (за замовчуванням 'Підтвердження')
 * @param {string} options.message - Текст повідомлення
 * @param {string} options.confirmText - Текст кнопки підтвердження (за замовчуванням 'Так')
 * @param {string} options.cancelText - Текст кнопки скасування (за замовчуванням 'Ні')
 * @param {string} options.confirmClass - Клас для кнопки підтвердження (за замовчуванням 'btn-delete')
 * @param {string} options.details - HTML-рядок з деталями наслідків (каскадні попередження), показується під message
 * @param {string|false} options.avatarState - Тип стану аватара або false для вимкнення
 *   - 'confirmClose' - закриття
 *   - 'confirmReset' - скидання
 *   - 'confirmDelete' - видалення
 *   - 'confirmReload' - перезавантаження
 *   - false - без аватара (не рекомендується для консистентності)
 * @param {string} options.avatarSize - Розмір аватара: 'sm', 'md', 'lg' (за замовчуванням 'lg')
 *
 * @returns {Promise<boolean>} Promise що резолвиться в true якщо підтверджено, false якщо скасовано
 *
 * @example
 * // Стандартне підтвердження видалення (аватар визначиться автоматично)
 * const confirmed = await showConfirmModal({
 *   title: 'Видалити елемент?',
 *   message: 'Ця дія незворотна. Ви впевнені?',
 *   confirmText: 'Видалити',
 *   cancelText: 'Скасувати',
 *   confirmClass: 'btn-delete'  // → автоматично avatarState: 'confirmDelete'
 * });
 *
 * @example
 * // З явним вказанням стану аватара
 * const confirmed = await showConfirmModal({
 *   title: 'Закрити без збереження?',
 *   message: 'Всі незбережені зміни буде втрачено',
 *   confirmText: 'Закрити',
 *   avatarState: 'confirmClose',
 *   avatarSize: 'md'
 * });
 *
 * @example
 * // Вимкнення аватара (не рекомендується)
 * const confirmed = await showConfirmModal({
 *   title: 'Простий діалог',
 *   message: 'Без аватара',
 *   avatarState: false
 * });
 */
export async function showConfirmModal(options = {}) {
    const {
        title = 'Підтвердження',
        message = 'Ви впевнені?',
        confirmText = 'Так',
        cancelText = 'Ні',
        confirmClass = 'btn-delete',
        avatarState = null,  // null = автовизначення
        avatarSize = 'lg',
        details = ''
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

        // Деталі наслідків (каскадні попередження)
        const detailsEl = document.getElementById('modal-confirm-details');
        if (detailsEl) {
            if (details) {
                detailsEl.innerHTML = details;
                detailsEl.classList.remove('u-hidden');
            } else {
                detailsEl.innerHTML = '';
                detailsEl.classList.add('u-hidden');
            }
        }

        // Визначаємо стан аватара
        let effectiveAvatarState = avatarState;

        if (avatarState === null) {
            // Автовизначення на основі confirmClass
            effectiveAvatarState = BUTTON_TO_AVATAR_STATE[confirmClass] || DEFAULT_AVATAR_STATE;
        }

        // Вставляємо аватар (за замовчуванням - завжди, якщо не вимкнено явно)
        if (avatarContainer && effectiveAvatarState !== false) {
            const html = renderAvatarState(effectiveAvatarState, {
                size: avatarSize,
                containerClass: 'modal-confirm-avatar',
                avatarClass: 'modal-confirm-avatar-image',
                messageClass: 'modal-confirm-avatar-message',
                showMessage: false // Не показуємо текст з аватара, бо є окреме повідомлення
            });
            avatarContainer.innerHTML = html;
        }

        if (cancelBtn) {
            cancelBtn.textContent = cancelText;
        }

        if (confirmBtn) {
            confirmBtn.textContent = confirmText;
            // Додаємо/замінюємо клас
            confirmBtn.className = `btn ${confirmClass}`;
            confirmBtn.dataset.confirmAction = 'confirm';
        }

        // Обробник кліків на кнопки
        const handleClick = (e) => {
            const action = e.target.closest('[data-confirm-action]')?.dataset.confirmAction;

            if (action === 'confirm') {
                e.stopPropagation();
                e.preventDefault();
                if (resolved) return;
                resolved = true;
                cleanup();
                closeModal();
                resolve(true);
            } else if (action === 'cancel') {
                e.stopPropagation();
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

/**
 * Показати діалог підтвердження видалення
 * Shortcut для showConfirmModal з налаштуваннями для видалення
 *
 * @param {Object} options
 * @param {string} options.itemName - Назва елемента для видалення
 * @param {string} options.title - Кастомний заголовок
 * @param {string} options.message - Кастомне повідомлення
 * @returns {Promise<boolean>}
 */
export async function showDeleteConfirm(options = {}) {
    const {
        itemName = '',
        title = null,
        message = null
    } = options;

    return showConfirmModal({
        title: title || `Видалити${itemName ? ` "${itemName}"` : ''}?`,
        message: message || 'Ця дія незворотна. Ви впевнені?',
        confirmText: 'Видалити',
        cancelText: 'Скасувати',
        confirmClass: 'btn-delete',
        avatarState: 'confirmDelete'
    });
}

/**
 * Показати діалог підтвердження скидання
 * Shortcut для showConfirmModal з налаштуваннями для скидання
 *
 * @param {Object} options
 * @param {string} options.title - Кастомний заголовок
 * @param {string} options.message - Кастомне повідомлення
 * @returns {Promise<boolean>}
 */
export async function showResetConfirm(options = {}) {
    const {
        title = 'Скинути зміни?',
        message = 'Всі незбережені зміни буде втрачено.'
    } = options;

    return showConfirmModal({
        title,
        message,
        confirmText: 'Скинути',
        cancelText: 'Скасувати',
        confirmClass: 'btn-warning',
        avatarState: 'confirmReset'
    });
}

/**
 * Показати діалог підтвердження закриття
 * Shortcut для showConfirmModal з налаштуваннями для закриття
 *
 * @param {Object} options
 * @param {string} options.title - Кастомний заголовок
 * @param {string} options.message - Кастомне повідомлення
 * @returns {Promise<boolean>}
 */
export async function showCloseConfirm(options = {}) {
    const {
        title = 'Закрити без збереження?',
        message = 'Всі незбережені зміни буде втрачено.'
    } = options;

    return showConfirmModal({
        title,
        message,
        confirmText: 'Закрити',
        cancelText: 'Залишити',
        confirmClass: 'btn-delete',
        avatarState: 'confirmClose'
    });
}
