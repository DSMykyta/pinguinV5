// js/components/modal/modal-plugin-confirm.js

/*
╔══════════════════════════════════════════════════════════════════════════╗
║  ПЛАГІН — ДІАЛОГ ПІДТВЕРДЖЕННЯ                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Promise-based confirm діалог з аватаром.                                ║
║                                                                          ║
║  📋 API:                                                                 ║
║  showConfirmModal({ action, entity, name })                              ║
║  ├── action   — дія: "видалити", "від'язати", "замінити"                ║
║  ├── entity   — сутність: "бренд", "лінійку", "логотип"                ║
║  └── name     — назва (опціонально, виділяється червоним тегом)         ║
║                                                                          ║
║  Плагін сам формує:                                                      ║
║  ├── Title:   "Видалити?"                                                ║
║  ├── З name:  "Ви впевнені, що хочете видалити бренд <tag>NAME</tag>?" ║
║  └── Без name: "Ви впевнені, що хочете замінити логотип?"              ║
║                                                                          ║
║  confirmText / cancelText теж автоматичні (з action),                   ║
║  але можна перевизначити.                                                ║
║                                                                          ║
║  Для нестандартних випадків залишено title/message override.              ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
*/

import { showModal, closeModal } from './modal-core.js';
import { renderAvatarState } from '../avatar/avatar-ui-states.js';

export function init() {}


// ══════════════════════════════════════════════════════════════════════════
// showConfirmModal
// ══════════════════════════════════════════════════════════════════════════

/**
 * @param {Object} options
 * @param {string} [options.action]     — дія ("видалити", "від'язати", "замінити")
 * @param {string} [options.entity]     — сутність ("бренд", "лінійку", "посилання")
 * @param {string} [options.name]       — назва сутності
 * @param {string} [options.title]      — override заголовку
 * @param {string} [options.message]    — override повідомлення
 * @param {string[]} [options.details]  — каскадні наслідки (список)
 * @param {string} [options.confirmText] — текст кнопки підтвердження
 * @param {string} [options.cancelText]  — текст кнопки скасування
 * @param {string|false} [options.avatarState] — стан аватара
 * @returns {Promise<boolean>}
 */
export async function showConfirmModal(options = {}) {
    const {
        action,
        entity,
        name,
        title,
        message,
        details = [],
        confirmText,
        cancelText,
        avatarState = 'confirmDelete',
    } = options;

    // Auto-generate title: capitalize(action) + "?"
    const resolvedTitle = title
        || (action ? capitalize(action) + '?' : 'Підтвердження');

    // Auto-generate message: "Ви впевнені, що хочете [action] [entity] <tag>[name]</tag>?"
    const resolvedMessage = message
        || ((action && entity && name)
            ? `Ви впевнені, що хочете ${action} ${entity} <span class="c-red">${name}</span>?`
            : (action && entity)
                ? `Ви впевнені, що хочете ${action} ${entity}?`
                : 'Ви впевнені?');

    // Auto-generate button text from action
    const resolvedConfirmText = confirmText || (action ? capitalize(action) : 'Так');
    const resolvedCancelText = cancelText || 'Скасувати';

    return new Promise(async (resolve) => {
        let resolved = false;

        await showModal('modal-confirm');

        const modalEl = document.getElementById('modal-modal-confirm');
        const titleEl = modalEl?.querySelector('.modal-header h2');
        const messageEl = document.getElementById('modal-confirm-message-text');
        const avatarContainer = document.getElementById('modal-confirm-avatar-container');
        const cancelBtn = document.getElementById('modal-confirm-cancel-btn');
        const confirmBtn = document.getElementById('modal-confirm-confirm-btn');

        if (titleEl) titleEl.innerHTML = resolvedTitle;

        let fullMessage = resolvedMessage;
        if (Array.isArray(details) && details.length > 0) {
            const items = details.map(d => `<li>${d}</li>`).join('');
            fullMessage += `<ul class="confirm-details">${items}</ul>`;
        }
        if (messageEl) messageEl.innerHTML = fullMessage;

        if (avatarContainer && avatarState !== false) {
            avatarContainer.innerHTML = renderAvatarState(avatarState, {
                size: 'lg',
                containerClass: 'modal-confirm-avatar',
                avatarClass: 'modal-confirm-avatar-image',
                messageClass: 'modal-confirm-avatar-message',
                showMessage: false,
            });
        }

        if (cancelBtn) cancelBtn.textContent = resolvedCancelText;
        if (confirmBtn) confirmBtn.textContent = resolvedConfirmText;

        const handleClick = (e) => {
            const act = e.target.closest('[data-confirm-action]')?.dataset.confirmAction;
            if (!act || resolved) return;
            e.stopPropagation();
            e.preventDefault();
            resolved = true;
            cleanup();
            closeModal();
            resolve(act === 'confirm');
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


// ══════════════════════════════════════════════════════════════════════════
// Utils
// ══════════════════════════════════════════════════════════════════════════

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
