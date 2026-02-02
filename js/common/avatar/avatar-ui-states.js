// js/common/avatar/avatar-ui-states.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              AVATAR PLUGIN - UI STATES RENDERING                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Плагін для рендерингу станів UI з аватарами.
 * Використовується для empty states, помилок, завантаження, підтверджень.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - getAvatarState(stateType, options) - Отримати дані стану
 * - renderAvatarState(stateType, options) - Згенерувати HTML
 * - getRandomMessage(stateType) - Випадкове повідомлення
 * - getStateEmotion(stateType) - Емоція для стану
 */

import { markPluginLoaded, registerHook, getCurrentUserAvatar, runHook } from './avatar-state.js';
import {
    AVATAR_HD_PATH,
    DEFAULT_ANIMAL,
    AVATAR_SIZES,
    UI_STATES_CONFIG,
    EMOTION_ALIASES
} from './avatar-config.js';

export const PLUGIN_NAME = 'avatar-ui-states';

/**
 * Ініціалізація плагіна
 */
function init() {
    markPluginLoaded(PLUGIN_NAME);
}

/**
 * Отримати дані стану аватара
 *
 * @param {string} stateType - Тип стану (empty, success, noResults, error, loading, confirmClose, etc.)
 * @param {Object} options - Додаткові опції
 * @param {string} options.message - Кастомне повідомлення
 * @param {string} options.size - Розмір: 'sm', 'md', 'lg', 'xl', 'xxl'
 * @param {string} options.animal - Примусовий вибір тварини
 * @returns {Object|null} Об'єкт з даними стану
 *
 * @example
 * const state = getAvatarState('empty');
 * // { avatarPath, message, emotion, fallbackPath, size, animal }
 */
export function getAvatarState(stateType, options = {}) {
    const stateConfig = UI_STATES_CONFIG[stateType];

    if (!stateConfig) {
        console.warn(`[Avatar] Unknown state type: ${stateType}`);
        return null;
    }

    // Отримуємо тварину (користувача або вказану)
    const animal = options.animal || getCurrentUserAvatar() || DEFAULT_ANIMAL;

    // Нормалізуємо емоцію
    const emotion = EMOTION_ALIASES[stateConfig.emotion] || stateConfig.emotion;

    // Випадкове або кастомне повідомлення
    const message = options.message || getRandomFromArray(stateConfig.messages);

    // Розмір
    const sizeKey = options.size || 'lg';
    const size = AVATAR_SIZES[sizeKey] || AVATAR_SIZES.lg;

    return {
        avatarPath: `${AVATAR_HD_PATH}/${animal}-${emotion}.png`,
        message,
        emotion,
        fallbackPath: `${AVATAR_HD_PATH}/${DEFAULT_ANIMAL}-${emotion}.png`,
        size,
        sizeKey,
        animal
    };
}

/**
 * Згенерувати HTML для стану UI з аватаром
 *
 * @param {string} stateType - Тип стану
 * @param {Object} options - Опції
 * @param {string} options.message - Кастомне повідомлення
 * @param {string} options.size - Розмір
 * @param {string} options.containerClass - Клас контейнера
 * @param {string} options.avatarClass - Клас для img
 * @param {string} options.messageClass - Клас для тексту
 * @param {boolean} options.showMessage - Показувати повідомлення (default: true)
 * @returns {string} HTML код
 *
 * @example
 * const html = renderAvatarState('empty', {
 *     containerClass: 'my-empty-state',
 *     size: 'xl'
 * });
 */
export function renderAvatarState(stateType, options = {}) {
    const state = getAvatarState(stateType, options);

    if (!state) {
        return '<p class="text-error">Error: Invalid state</p>';
    }

    const {
        containerClass = 'avatar-state-container',
        avatarClass = 'avatar-state-image',
        messageClass = 'avatar-state-message',
        showMessage = true
    } = options;

    // Запускаємо хук
    runHook('onUIStateRender', stateType, state);

    return `
        <div class="${containerClass}">
            <img
                src="${state.avatarPath}"
                alt="${state.animal} ${state.emotion}"
                class="${avatarClass}"
                style="width: ${state.size}; height: ${state.size};"
                onerror="this.onerror=null; this.src='${state.fallbackPath}'"
            >
            ${showMessage ? `<p class="${messageClass}">${state.message}</p>` : ''}
        </div>
    `;
}

/**
 * Отримати випадкове повідомлення для стану
 *
 * @param {string} stateType - Тип стану
 * @returns {string} Випадкове повідомлення
 */
export function getRandomMessage(stateType) {
    const stateConfig = UI_STATES_CONFIG[stateType];
    if (!stateConfig || !stateConfig.messages) {
        return '';
    }
    return getRandomFromArray(stateConfig.messages);
}

/**
 * Отримати емоцію для стану
 *
 * @param {string} stateType - Тип стану
 * @returns {string} Назва емоції
 */
export function getStateEmotion(stateType) {
    const stateConfig = UI_STATES_CONFIG[stateType];
    if (!stateConfig) {
        return 'calm';
    }
    return EMOTION_ALIASES[stateConfig.emotion] || stateConfig.emotion;
}

/**
 * Перевірити чи стан існує
 *
 * @param {string} stateType - Тип стану
 * @returns {boolean}
 */
export function isValidState(stateType) {
    return !!UI_STATES_CONFIG[stateType];
}

/**
 * Отримати всі доступні стани
 *
 * @returns {string[]} Масив назв станів
 */
export function getAvailableStates() {
    return Object.keys(UI_STATES_CONFIG);
}

/**
 * Випадковий елемент з масиву
 * @private
 */
function getRandomFromArray(arr) {
    if (!arr || arr.length === 0) return '';
    return arr[Math.floor(Math.random() * arr.length)];
}

// Автоматична ініціалізація при завантаженні модуля
init();
