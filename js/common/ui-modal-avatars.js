// js/common/ui-modal-avatars.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   АВТОМАТИЧНИЙ РЕНДЕРИНГ АВАТАРІВ                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Автоматично рендерить аватари в модалах підтвердження при відкритті
 *
 * ЗАЛЕЖНОСТІ:
 * - ui-modal.js (слухає подію modal-opened)
 * - avatar-states.js (renderAvatarState, getAvatarState)
 */

import { renderAvatarState, getAvatarState } from '../utils/avatar-states.js';

/**
 * Мапа modal ID -> avatar state type
 */
const MODAL_AVATAR_MAPPING = {
    'confirm-delete-modal': {
        stateType: 'confirmReset',
        avatarContainerId: 'confirm-delete-avatar-container',
        messageContainerId: 'confirm-delete-avatar-message'
    },
    'confirm-clear-modal': {
        stateType: 'confirmReset',
        avatarContainerId: 'confirm-clear-avatar-container',
        messageContainerId: 'confirm-clear-avatar-message'
    },
    'auth-login-modal': {
        stateType: 'authLogin',
        avatarContainerId: 'auth-login-avatar-container',
        messageContainerId: 'auth-login-avatar-message'
    }
};

/**
 * Ініціалізація автоматичного рендерингу аватарів
 */
export function initModalAvatars() {

    // Слухаємо подію відкриття модалу
    document.addEventListener('modal-opened', handleModalOpened);
}

/**
 * Обробник події відкриття модалу
 */
function handleModalOpened(event) {
    const { modalId, modalElement } = event.detail;

    // Перевіряємо чи це модал з аватаром
    const mapping = MODAL_AVATAR_MAPPING[modalId];
    if (!mapping) {
        return; // Не наш модал
    }


    // Знаходимо контейнери в повній структурі модалу
    const avatarContainer = modalElement.querySelector(`#${mapping.avatarContainerId}`);
    const messageContainer = modalElement.querySelector(`#${mapping.messageContainerId}`);

    if (!avatarContainer) {
        console.warn(`⚠️ Контейнер аватара не знайдено: ${mapping.avatarContainerId}`);
        return;
    }

    // Рендеримо аватар
    const avatarHtml = renderAvatarState(mapping.stateType, {
        size: 'medium',
        showMessage: false
    });
    avatarContainer.innerHTML = avatarHtml;

    // Рендеримо випадкове повідомлення
    if (messageContainer) {
        const state = getAvatarState(mapping.stateType);
        messageContainer.textContent = state.message;
    }

}

// Автоматична ініціалізація при завантаженні модуля
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModalAvatars);
} else {
    initModalAvatars();
}
