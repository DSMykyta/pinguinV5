// js/common/avatar/avatar-modal.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              AVATAR PLUGIN - MODAL AUTO-RENDERING                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Плагін для автоматичного рендерингу аватарів в модальних вікнах.
 * Слухає подію modal-opened та вставляє відповідні аватари.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - registerModalAvatar(modalId, config) - Зареєструвати модал для аватара
 * - unregisterModalAvatar(modalId) - Видалити реєстрацію
 * - renderModalAvatar(modalId, modalElement) - Вручну відрендерити
 */

import { markPluginLoaded, registerHook, runHook } from './avatar-state.js';
import { MODAL_AVATAR_MAPPING } from './avatar-config.js';
import { renderAvatarState, getAvatarState } from './avatar-ui-states.js';

export const PLUGIN_NAME = 'avatar-modal';

/**
 * Локальний маппінг модалів (можна розширювати)
 */
const modalAvatarRegistry = { ...MODAL_AVATAR_MAPPING };

/**
 * Ініціалізація плагіна
 */
export function init(state) {
    markPluginLoaded(PLUGIN_NAME);

    // Слухаємо подію відкриття модалу
    document.addEventListener('modal-opened', handleModalOpened);
}

/**
 * Обробник події відкриття модалу
 */
function handleModalOpened(event) {
    const { modalId, modalElement } = event.detail;

    // Перевіряємо чи є маппінг для цього модалу
    const config = modalAvatarRegistry[modalId];
    if (!config) {
        return;
    }

    renderModalAvatar(modalId, modalElement, config);
}

/**
 * Відрендерити аватар в модалі
 *
 * @param {string} modalId - ID модалу
 * @param {HTMLElement} modalElement - DOM елемент модалу
 * @param {Object} config - Конфігурація (опціонально, береться з registry)
 */
export function renderModalAvatar(modalId, modalElement, config = null) {
    const mapping = config || modalAvatarRegistry[modalId];

    if (!mapping) {
        console.warn(`[Avatar Modal] No mapping for modal: ${modalId}`);
        return;
    }

    const { stateType, avatarContainerId, messageContainerId } = mapping;

    // Знаходимо контейнери
    const avatarContainer = modalElement
        ? modalElement.querySelector(`#${avatarContainerId}`)
        : document.getElementById(avatarContainerId);

    const messageContainer = modalElement
        ? modalElement.querySelector(`#${messageContainerId}`)
        : document.getElementById(messageContainerId);

    if (!avatarContainer) {
        console.warn(`[Avatar Modal] Container not found: ${avatarContainerId}`);
        return;
    }

    // Рендеримо аватар
    const avatarHtml = renderAvatarState(stateType, {
        size: 'lg',
        showMessage: false,
        containerClass: 'modal-avatar-container',
        avatarClass: 'modal-avatar-image'
    });

    avatarContainer.innerHTML = avatarHtml;

    // Рендеримо повідомлення
    if (messageContainer) {
        const state = getAvatarState(stateType);
        if (state) {
            messageContainer.textContent = state.message;
        }
    }

    // Запускаємо хук
    runHook('onModalOpen', modalId, stateType);
}

/**
 * Зареєструвати модал для автоматичного аватара
 *
 * @param {string} modalId - ID модалу
 * @param {Object} config - Конфігурація
 * @param {string} config.stateType - Тип стану аватара
 * @param {string} config.avatarContainerId - ID контейнера для аватара
 * @param {string} config.messageContainerId - ID контейнера для повідомлення (опціонально)
 *
 * @example
 * registerModalAvatar('my-confirm-modal', {
 *     stateType: 'confirmDelete',
 *     avatarContainerId: 'my-confirm-avatar',
 *     messageContainerId: 'my-confirm-message'
 * });
 */
export function registerModalAvatar(modalId, config) {
    if (!modalId || !config.stateType || !config.avatarContainerId) {
        console.warn('[Avatar Modal] Invalid config for registerModalAvatar');
        return;
    }

    modalAvatarRegistry[modalId] = config;
}

/**
 * Видалити реєстрацію модалу
 *
 * @param {string} modalId - ID модалу
 */
export function unregisterModalAvatar(modalId) {
    delete modalAvatarRegistry[modalId];
}

/**
 * Перевірити чи модал зареєстрований
 *
 * @param {string} modalId - ID модалу
 * @returns {boolean}
 */
export function isModalRegistered(modalId) {
    return !!modalAvatarRegistry[modalId];
}

/**
 * Отримати конфігурацію модалу
 *
 * @param {string} modalId - ID модалу
 * @returns {Object|null}
 */
export function getModalConfig(modalId) {
    return modalAvatarRegistry[modalId] || null;
}

/**
 * Отримати всі зареєстровані модалі
 *
 * @returns {string[]} Масив ID модалів
 */
export function getRegisteredModals() {
    return Object.keys(modalAvatarRegistry);
}

// Ініціалізація викликається з avatar-main.js через init(state)
