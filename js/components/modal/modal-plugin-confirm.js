// js/components/modal/modal-plugin-confirm.js

/*
╔══════════════════════════════════════════════════════════════════════════╗
║  🔌 ПЛАГІН — ДІАЛОГИ ПІДТВЕРДЖЕННЯ                                      ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Promise-based confirm діалоги з аватарами.                              ║
║  ├── showConfirmModal(options) — загальний діалог                        ║
║  ├── showDeleteConfirm(options) — видалення                              ║
║  ├── showResetConfirm(options) — скидання                                ║
║  └── showCloseConfirm(options) — закриття без збереження                 ║
║                                                                          ║
║  🎯 Функції викликаються напряму, init() — noop.                        ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
*/

import { showModal, closeModal } from './modal-core.js';
import { renderAvatarState } from '../avatar/avatar-ui-states.js';

/**
 * Плагін init — noop (confirm не потребує глобальної ініціалізації)
 */
export function init() {}

/**
 * Типи кнопок → стани аватарів
 */
const BUTTON_TO_AVATAR_STATE = {
    'danger': 'confirmDelete',
    'btn-warning': 'confirmReset',
    'btn-primary': 'confirmClose',
    'btn-secondary': 'confirmClose'
};

const DEFAULT_AVATAR_STATE = 'confirmClose';

/**
 * Показати діалог підтвердження
 *
 * @param {Object} options
 * @param {string} options.title — заголовок (за замовч. 'Підтвердження')
 * @param {string} options.message — текст повідомлення
 * @param {string} options.confirmText — текст кнопки підтвердження
 * @param {string} options.cancelText — текст кнопки скасування
 * @param {string} options.confirmClass — CSS клас кнопки ('danger', 'btn-warning', 'btn-primary')
 * @param {string} options.details — HTML каскадних попереджень
 * @param {string|false|null} options.avatarState — тип аватара або false для вимкнення
 * @param {string} options.avatarSize — 'sm' | 'md' | 'lg'
 * @returns {Promise<boolean>}
 */
export async function showConfirmModal(options = {}) {
    const {
        title = 'Підтвердження',
        message = 'Ви впевнені?',
        confirmText = 'Так',
        cancelText = 'Ні',
        confirmClass = 'danger',
        avatarState = null,
        avatarSize = 'lg',
        details = ''
    } = options;

    return new Promise(async (resolve) => {
        let resolved = false;

        const triggerElement = document.createElement('div');
        triggerElement.dataset.modalSize = 'small';

        await showModal('modal-confirm', triggerElement);

        // Оновлюємо контент
        const modalTitle = document.querySelector('.modal-title');
        const messageElement = document.getElementById('modal-confirm-message-text');
        const avatarContainer = document.getElementById('modal-confirm-avatar-container');
        const cancelBtn = document.getElementById('modal-confirm-cancel-btn');
        const confirmBtn = document.getElementById('modal-confirm-confirm-btn');

        if (modalTitle) modalTitle.textContent = title;
        if (messageElement) messageElement.textContent = message;

        // Деталі наслідків
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

        // Аватар
        let effectiveAvatarState = avatarState;
        if (avatarState === null) {
            effectiveAvatarState = BUTTON_TO_AVATAR_STATE[confirmClass] || DEFAULT_AVATAR_STATE;
        }

        if (avatarContainer && effectiveAvatarState !== false) {
            avatarContainer.innerHTML = renderAvatarState(effectiveAvatarState, {
                size: avatarSize,
                containerClass: 'modal-confirm-avatar',
                avatarClass: 'modal-confirm-avatar-image',
                messageClass: 'modal-confirm-avatar-message',
                showMessage: false,
            });
        }

        if (cancelBtn) cancelBtn.textContent = cancelText;
        if (confirmBtn) {
            confirmBtn.textContent = confirmText;
            confirmBtn.className = `btn ${confirmClass}`;
            confirmBtn.dataset.confirmAction = 'confirm';
        }

        // Обробник кліків
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

        const handleModalClose = () => {
            if (resolved) return;
            resolved = true;
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            document.removeEventListener('click', handleClick);
            document.removeEventListener('modal-closed', handleModalClose);
        };

        document.addEventListener('click', handleClick);
        document.addEventListener('modal-closed', handleModalClose);
    });
}

/**
 * Shortcut: підтвердження видалення
 */
export async function showDeleteConfirm(options = {}) {
    const { itemName = '', title = null, message = null } = options;
    return showConfirmModal({
        title: title || `Видалити${itemName ? ` "${itemName}"` : ''}?`,
        message: message || 'Ця дія незворотна. Ви впевнені?',
        confirmText: 'Видалити',
        cancelText: 'Скасувати',
        confirmClass: 'danger',
        avatarState: 'confirmDelete',
    });
}

/**
 * Shortcut: підтвердження скидання
 */
export async function showResetConfirm(options = {}) {
    const { title = 'Скинути зміни?', message = 'Всі незбережені зміни буде втрачено.' } = options;
    return showConfirmModal({
        title,
        message,
        confirmText: 'Скинути',
        cancelText: 'Скасувати',
        confirmClass: 'btn-warning',
        avatarState: 'confirmReset',
    });
}

/**
 * Shortcut: підтвердження закриття
 */
export async function showCloseConfirm(options = {}) {
    const { title = 'Закрити без збереження?', message = 'Всі незбережені зміни буде втрачено.' } = options;
    return showConfirmModal({
        title,
        message,
        confirmText: 'Закрити',
        cancelText: 'Залишити',
        confirmClass: 'danger',
        avatarState: 'confirmClose',
    });
}
