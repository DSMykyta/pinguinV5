// js/components/modal/modal-plugin-cascade.js

/*
╔══════════════════════════════════════════════════════════════════════════╗
║  ПЛАГІН — КАСКАДНЕ ПІДТВЕРДЖЕННЯ                                        ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Promise-based каскадний діалог: видалення з дітьми (switch + move).    ║
║                                                                          ║
║  📋 API:                                                                 ║
║  showCascadeConfirm({ action, entity, name, count, countEntity })       ║
║  ├── action       — дія: "видалити"                                     ║
║  ├── entity       — сутність: "бренд"                                   ║
║  ├── name         — назва: "Optimum Nutrition"                          ║
║  ├── count        — кількість дітей: 3                                  ║
║  └── countEntity  — назва дітей (plural): "лінійки"                    ║
║                                                                          ║
║  Плагін формує:                                                          ║
║  ├── Title:   "Видалити?"                                                ║
║  └── Message: "Ви впевнені, що хочете видалити бренд <tag>NAME</tag>?" ║
║               "Буде видалено <tag>3</tag> його лінійки"                 ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
*/

import { showModal, closeModal } from './modal-core.js';
import { renderAvatarState } from '../avatar/avatar-ui-states.js';
import { initCustomSelects } from '../forms/select.js';

export function init() {}


// ══════════════════════════════════════════════════════════════════════════
// showCascadeConfirm
// ══════════════════════════════════════════════════════════════════════════

/**
 * @param {Object} options
 * @param {string} [options.action]       — дія ("видалити")
 * @param {string} [options.entity]       — сутність ("бренд")
 * @param {string} [options.name]         — назва сутності
 * @param {number} [options.count]        — кількість дітей
 * @param {string} [options.countEntity]  — назва дітей у правильній формі ("лінійки")
 * @param {string} [options.title]        — override заголовку
 * @param {string} [options.message]      — override повідомлення
 * @param {string[]} [options.details]    — каскадні наслідки (список)
 * @param {string} [options.confirmText]  — текст кнопки підтвердження
 * @param {string} [options.cancelText]   — текст кнопки скасування
 * @param {string|false} [options.avatarState] — стан аватара
 * @param {Object} options.children       — конфіг дітей (switch + move)
 * @param {string} options.children.switchLabel — лейбл свіча
 * @param {string} options.children.moveLabel — лейбл селекту
 * @param {Array<{value: string, text: string}>} options.children.moveOptions — опції селекту
 * @param {string} options.children.orphanLabel — підказка під селектом
 * @returns {Promise<false|{deleteChildren: boolean, moveTargetId: string}>}
 */
export async function showCascadeConfirm(options = {}) {
    const {
        action,
        entity,
        name,
        count,
        countEntity,
        title,
        message,
        details = [],
        children = null,
        confirmText,
        cancelText,
        avatarState = 'confirmDelete',
    } = options;

    // Auto-generate title
    const resolvedTitle = title
        || (action ? capitalize(action) + '?' : 'Видалити?');

    // Auto-generate message
    let resolvedMessage = message;
    if (!resolvedMessage && action && entity && name) {
        resolvedMessage = `Ви впевнені, що хочете ${action} ${entity} <span class="tag c-red">${name}</span>?`;
        if (count && countEntity) {
            resolvedMessage += ` Буде видалено <span class="tag c-red">${count}</span> його ${countEntity}`;
        }
    }
    resolvedMessage = resolvedMessage || 'Ви впевнені?';

    // Auto-generate button text
    const resolvedConfirmText = confirmText || (action ? capitalize(action) : 'Видалити');
    const resolvedCancelText = cancelText || 'Скасувати';

    return new Promise(async (resolve) => {
        let resolved = false;

        await showModal('confirm-cascade');

        const titleEl = document.getElementById('cascade-title');
        const messageEl = document.getElementById('cascade-message');
        const avatarContainer = document.getElementById('cascade-avatar-container');
        const detailsList = document.getElementById('cascade-details-list');
        const childrenSection = document.getElementById('cascade-children-section');
        const cancelBtn = document.querySelector('#modal-confirm-cascade [data-confirm-action="cancel"]');
        const confirmBtn = document.querySelector('#modal-confirm-cascade [data-confirm-action="confirm"]');

        if (titleEl) titleEl.innerHTML = resolvedTitle;
        if (messageEl) messageEl.innerHTML = resolvedMessage;

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

        // Button text
        if (cancelBtn) cancelBtn.textContent = resolvedCancelText;
        if (confirmBtn) confirmBtn.textContent = resolvedConfirmText;

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
            const act = e.target.closest('[data-confirm-action]')?.dataset.confirmAction;
            if (!act || resolved) return;
            e.stopPropagation();
            e.preventDefault();
            resolved = true;
            const result = act === 'confirm' ? getResult() : false;
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


// ══════════════════════════════════════════════════════════════════════════
// Utils
// ══════════════════════════════════════════════════════════════════════════

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
