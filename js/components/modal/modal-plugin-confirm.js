// js/components/modal/modal-plugin-confirm.js

/*
╔══════════════════════════════════════════════════════════════════════════╗
║  ПЛАГІН — ДІАЛОГИ ПІДТВЕРДЖЕННЯ                                        ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Promise-based confirm діалоги з аватарами.                              ║
║  ├── showConfirmModal(options) — простий діалог (modal-confirm)         ║
║  └── showCascadeConfirm(options) — каскадний діалог (confirm-cascade)  ║
║                                                                          ║
║  Сторінки передають тексти і дані, плагін керує UI.                    ║
║  title/message підтримують HTML (innerHTML).                           ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
*/

import { showModal, closeModal } from './modal-core.js';
import { renderAvatarState } from '../avatar/avatar-ui-states.js';
import { initCustomSelects } from '../forms/select.js';

export function init() {}


// ══════════════════════════════════════════════════════════════════════════
// showConfirmModal — простий діалог підтвердження
// ══════════════════════════════════════════════════════════════════════════

/**
 * @param {Object} options
 * @param {string} options.title — заголовок (HTML)
 * @param {string} options.message — повідомлення (HTML)
 * @param {string[]} options.details — каскадні наслідки (опціонально)
 * @param {string} options.confirmText — текст кнопки підтвердження
 * @param {string} options.cancelText — текст кнопки скасування
 * @param {string|false} options.avatarState — стан аватара
 * @returns {Promise<boolean>}
 */
export async function showConfirmModal(options = {}) {
    const {
        title = 'Підтвердження',
        message = 'Ви впевнені?',
        details = [],
        confirmText = 'Так',
        cancelText = 'Ні',
        avatarState = 'confirmDelete',
    } = options;

    return new Promise(async (resolve) => {
        let resolved = false;

        await showModal('modal-confirm');

        const modalEl = document.getElementById('modal-modal-confirm');
        const titleEl = modalEl?.querySelector('.modal-header h2');
        const messageEl = document.getElementById('modal-confirm-message-text');
        const avatarContainer = document.getElementById('modal-confirm-avatar-container');
        const cancelBtn = document.getElementById('modal-confirm-cancel-btn');
        const confirmBtn = document.getElementById('modal-confirm-confirm-btn');

        if (titleEl) titleEl.innerHTML = title;

        let fullMessage = message;
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

        if (cancelBtn) cancelBtn.textContent = cancelText;
        if (confirmBtn) confirmBtn.textContent = confirmText;

        const handleClick = (e) => {
            const action = e.target.closest('[data-confirm-action]')?.dataset.confirmAction;
            if (!action || resolved) return;
            e.stopPropagation();
            e.preventDefault();
            resolved = true;
            cleanup();
            closeModal();
            resolve(action === 'confirm');
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
// showCascadeConfirm — каскадний діалог (switch + move)
// ══════════════════════════════════════════════════════════════════════════

/**
 * @param {Object} options
 * @param {string} options.title — заголовок (HTML)
 * @param {string} options.message — повідомлення (HTML)
 * @param {string[]} options.details — каскадні наслідки (опціонально)
 * @param {string} options.confirmText — текст кнопки підтвердження
 * @param {string} options.cancelText — текст кнопки скасування
 * @param {string|false} options.avatarState — стан аватара
 * @param {Object} options.children — конфіг дітей (switch + move)
 * @param {string} options.children.switchLabel — лейбл свіча
 * @param {string} options.children.moveLabel — лейбл селекту
 * @param {Array<{value: string, text: string}>} options.children.moveOptions — опції селекту
 * @param {string} options.children.orphanLabel — підказка під селектом
 * @returns {Promise<false|{deleteChildren: boolean, moveTargetId: string}>}
 */
export async function showCascadeConfirm(options = {}) {
    const {
        title = 'Видалити?',
        message = 'Ви впевнені?',
        details = [],
        children = null,
        confirmText = 'Видалити',
        cancelText = 'Скасувати',
        avatarState = 'confirmDelete',
    } = options;

    return new Promise(async (resolve) => {
        let resolved = false;

        await showModal('confirm-cascade');

        const titleEl = document.getElementById('cascade-title');
        const messageEl = document.getElementById('cascade-message');
        const avatarContainer = document.getElementById('cascade-avatar-container');
        const detailsList = document.getElementById('cascade-details-list');
        const childrenSection = document.getElementById('cascade-children-section');

        if (titleEl) titleEl.innerHTML = title;
        if (messageEl) messageEl.innerHTML = message;

        // Details
        if (detailsList) {
            detailsList.innerHTML = '';
            if (Array.isArray(details) && details.length > 0) {
                details.forEach(d => {
                    const li = document.createElement('li');
                    li.innerHTML = d;
                    detailsList.appendChild(li);
                });
            }
        }

        // Avatar
        if (avatarContainer && avatarState !== false) {
            avatarContainer.innerHTML = renderAvatarState(avatarState, {
                size: 'lg',
                containerClass: 'modal-confirm-avatar',
                avatarClass: 'modal-confirm-avatar-image',
                messageClass: 'modal-confirm-avatar-message',
                showMessage: false,
            });
        }

        // Children section — switch + move
        const cleanups = [];

        if (children && childrenSection) {
            childrenSection.classList.remove('u-hidden');

            const optionsHTML = (children.moveOptions || [])
                .map(o => `<option value="${o.value}">${o.text}</option>`)
                .join('');

            childrenSection.innerHTML = `
                <div class="group column">
                    <label class="label-l">${children.switchLabel}</label>
                    <div class="switch switch-outline">
                        <input type="radio" id="cascade-switch-yes" name="cascade-delete-switch" value="yes" checked>
                        <label for="cascade-switch-yes" class="switch-label">Так</label>
                        <input type="radio" id="cascade-switch-no" name="cascade-delete-switch" value="no">
                        <label for="cascade-switch-no" class="switch-label">Ні</label>
                    </div>
                </div>
                <div class="u-reveal" id="cascade-move-section">
                    <div class="group column">
                        <label class="label-l">${children.moveLabel}</label>
                        <select data-custom-select id="cascade-move-target">
                            <option value="">— Не переносити —</option>
                            ${optionsHTML}
                        </select>
                        <label class="label-s">${children.orphanLabel || ''}</label>
                    </div>
                </div>`;

            // Switch logic
            const switchInputs = childrenSection.querySelectorAll('input[name="cascade-delete-switch"]');
            const moveSection = document.getElementById('cascade-move-section');
            let selectInited = false;

            const handleSwitch = () => {
                const deleteChildren = document.getElementById('cascade-switch-yes')?.checked;
                if (moveSection) {
                    moveSection.classList.toggle('is-open', !deleteChildren);
                    if (!deleteChildren && !selectInited) {
                        initCustomSelects(moveSection);
                        selectInited = true;
                    }
                }
            };

            switchInputs.forEach(input => input.addEventListener('change', handleSwitch));
            cleanups.push(() => switchInputs.forEach(input => input.removeEventListener('change', handleSwitch)));
        }

        // Result
        const getResult = () => {
            if (!children) return true;
            const deleteChildren = document.getElementById('cascade-switch-yes')?.checked;
            const moveTarget = document.getElementById('cascade-move-target');
            return {
                deleteChildren,
                moveTargetId: !deleteChildren ? (moveTarget?.value || '') : '',
            };
        };

        // Handlers
        const handleClick = (e) => {
            const action = e.target.closest('[data-confirm-action]')?.dataset.confirmAction;
            if (!action || resolved) return;
            e.stopPropagation();
            e.preventDefault();
            resolved = true;
            const result = action === 'confirm' ? getResult() : false;
            cleanup();
            closeModal();
            resolve(result);
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
            cleanups.forEach(fn => fn());
        };

        document.addEventListener('click', handleClick);
        document.addEventListener('modal-closed', handleModalClose);
    });
}
