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
║  Кнопки: cancel = btn-ghost, confirm = danger (з HTML шаблону).          ║
║  JS змінює тільки текст кнопок, заголовок, повідомлення та аватар.       ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
*/

import { showModal, closeModal } from './modal-core.js';
import { renderAvatarState } from '../avatar/avatar-ui-states.js';
import { initCustomSelects } from '../forms/select.js';

/**
 * Плагін init — noop (confirm не потребує глобальної ініціалізації)
 */
export function init() {}

const DEFAULT_AVATAR_STATE = 'confirmClose';


/**
 * Показати діалог підтвердження
 *
 * @param {Object} options
 * @param {string} options.title — заголовок
 * @param {string} options.message — текст повідомлення (підтримує HTML)
 * @param {string[]} options.details — масив каскадних наслідків (опціонально)
 * @param {string} options.confirmText — текст кнопки підтвердження
 * @param {string} options.cancelText — текст кнопки скасування
 * @param {string|false} options.avatarState — стан аватара або false
 * @param {string} options.avatarSize — 'sm' | 'md' | 'lg'
 * @returns {Promise<boolean>}
 */
export async function showConfirmModal(options = {}) {
    const {
        title = 'Підтвердження',
        message = 'Ви впевнені?',
        details = [],
        confirmText = 'Так',
        cancelText = 'Ні',
        avatarState = DEFAULT_AVATAR_STATE,
        avatarSize = 'lg',
    } = options;

    return new Promise(async (resolve) => {
        let resolved = false;

        const triggerElement = document.createElement('div');
        triggerElement.dataset.modalSize = 'small';

        await showModal('modal-confirm', triggerElement);

        const modalEl = document.getElementById('modal-modal-confirm');
        const modalTitle = modalEl?.querySelector('.modal-header h2');
        const messageElement = document.getElementById('modal-confirm-message-text');
        const avatarContainer = document.getElementById('modal-confirm-avatar-container');
        const cancelBtn = document.getElementById('modal-confirm-cancel-btn');
        const confirmBtn = document.getElementById('modal-confirm-confirm-btn');

        if (modalTitle) modalTitle.textContent = title;

        // Повідомлення + каскадні деталі
        let fullMessage = message;
        if (Array.isArray(details) && details.length > 0) {
            const items = details.map(d => `<li>${d}</li>`).join('');
            fullMessage += `<ul class="confirm-details">${items}</ul>`;
        } else if (typeof details === 'string' && details) {
            fullMessage += details;
        }
        if (messageElement) messageElement.innerHTML = fullMessage;

        // Аватар
        if (avatarContainer && avatarState !== false) {
            avatarContainer.innerHTML = renderAvatarState(avatarState, {
                size: avatarSize,
                containerClass: 'modal-confirm-avatar',
                avatarClass: 'modal-confirm-avatar-image',
                messageClass: 'modal-confirm-avatar-message',
                showMessage: false,
            });
        }

        if (cancelBtn) cancelBtn.textContent = cancelText;
        if (confirmBtn) confirmBtn.textContent = confirmText;

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
        avatarState: 'confirmClose',
    });
}

/**
 * Каскадне видалення — окремий шаблон confirm-cascade.html
 *
 * @param {Object} options
 * @param {string} options.title — заголовок
 * @param {string} options.message — текст повідомлення
 * @param {string[]} options.details — масив каскадних наслідків
 * @param {string} options.confirmText — текст кнопки
 * @param {string} options.cancelText — текст кнопки скасування
 * @param {string|false} options.avatarState — стан аватара
 * @param {Object} [options.children] — секція дітей (каскад)
 * @param {number} options.children.count — кількість дітей
 * @param {string} options.children.countLabel — текст біля кількості (напр. "лінійок")
 * @param {string} options.children.checkboxLabel — текст чекбоксу
 * @param {string} options.children.moveLabel — лейбл селекта переносу
 * @param {Array<{value: string, text: string}>} options.children.moveOptions — варіанти переносу
 * @param {string} options.children.orphanLabel — лейбл-попередження про сиріт
 * @returns {Promise<false|{confirmed: true, deleteChildren: boolean, moveTargetId: string}>}
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
        avatarSize = 'lg',
    } = options;

    return new Promise(async (resolve) => {
        let resolved = false;

        const triggerElement = document.createElement('div');
        triggerElement.dataset.modalSize = 'small';

        await showModal('confirm-cascade', triggerElement);

        const modalTitle = document.getElementById('cascade-title');
        const messageEl = document.getElementById('cascade-message');
        const detailsList = document.getElementById('cascade-details-list');
        const avatarContainer = document.getElementById('cascade-avatar-container');
        const cancelBtn = document.getElementById('cascade-cancel-btn');
        const confirmBtn = document.getElementById('cascade-confirm-btn');

        if (modalTitle) modalTitle.textContent = title;
        if (messageEl) messageEl.innerHTML = message;

        // Каскадні деталі
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

        // Аватар
        if (avatarContainer && avatarState !== false) {
            avatarContainer.innerHTML = renderAvatarState(avatarState, {
                size: avatarSize,
                containerClass: 'modal-confirm-avatar',
                avatarClass: 'modal-confirm-avatar-image',
                messageClass: 'modal-confirm-avatar-message',
                showMessage: false,
            });
        }

        if (cancelBtn) cancelBtn.textContent = cancelText;
        if (confirmBtn) confirmBtn.textContent = confirmText;

        // ── Children section ──
        const childrenSection = document.getElementById('cascade-children-section');
        const checkbox = document.getElementById('cascade-delete-children');
        const moveSection = document.getElementById('cascade-move-section');
        let childrenCleanup = null;

        if (children && childrenSection) {
            childrenSection.classList.remove('u-hidden');

            // Checkbox label
            const checkboxLabelEl = document.getElementById('cascade-checkbox-label');
            if (checkboxLabelEl) checkboxLabelEl.textContent = children.checkboxLabel || 'Видалити дітей';
            if (checkbox) checkbox.checked = true;

            // Move label
            const moveLabelEl = document.getElementById('cascade-move-label');
            if (moveLabelEl) moveLabelEl.textContent = children.moveLabel || 'Оберіть куди перенести';

            // Orphan label
            const orphanLabelEl = document.getElementById('cascade-orphan-label');
            if (orphanLabelEl) orphanLabelEl.textContent = children.orphanLabel || '';

            // Populate move select
            const moveSelect = document.getElementById('cascade-move-target');
            if (moveSelect && Array.isArray(children.moveOptions)) {
                moveSelect.innerHTML = '<option value="">— Не переносити —</option>';
                children.moveOptions.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.text;
                    moveSelect.appendChild(option);
                });
                initCustomSelects(moveSection);
            }

            // Toggle move section on checkbox change
            const handleCheckboxChange = () => {
                const checked = checkbox.checked;
                if (moveSection) {
                    moveSection.classList.toggle('u-hidden', checked);
                }
            };
            if (checkbox) checkbox.addEventListener('change', handleCheckboxChange);
            handleCheckboxChange();

            childrenCleanup = () => {
                if (checkbox) checkbox.removeEventListener('change', handleCheckboxChange);
            };
        }

        const getResult = () => {
            if (!children) return true;
            return {
                confirmed: true,
                deleteChildren: checkbox ? checkbox.checked : true,
                moveTargetId: (!checkbox || !checkbox.checked)
                    ? (document.getElementById('cascade-move-target')?.value || '')
                    : '',
            };
        };

        const handleClick = (e) => {
            const action = e.target.closest('[data-confirm-action]')?.dataset.confirmAction;
            if (action === 'confirm') {
                e.stopPropagation();
                e.preventDefault();
                if (resolved) return;
                resolved = true;
                const result = getResult();
                cleanup();
                closeModal();
                resolve(result);
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
            if (childrenCleanup) childrenCleanup();
        };

        document.addEventListener('click', handleClick);
        document.addEventListener('modal-closed', handleModalClose);
    });
}
