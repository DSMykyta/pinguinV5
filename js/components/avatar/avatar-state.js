// js/components/avatar/avatar-state.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      AVATAR SYSTEM - STATE & HOOKS                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Централізований стан системи аватарів та система хуків для комунікації
 * між плагінами.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - avatarState - глобальний стан
 * - registerHook(hookName, callback) - реєстрація хука
 * - runHook(hookName, ...args) - виконання хука
 * - markPluginLoaded(pluginName) - позначити плагін завантаженим
 * - isPluginLoaded(pluginName) - перевірити чи плагін завантажений
 */

import { createHookRegistry } from '../../utils/utils-hooks.js';

import {
    AVAILABLE_ANIMALS,
    DEFAULT_ANIMAL,
    DEFAULT_EMOTION
} from './avatar-config.js';

/**
 * Глобальний стан системи аватарів
 */
export const avatarState = {
    // Чи система ініціалізована
    initialized: false,

    // Завантажені плагіни
    loadedPlugins: new Set(),

    // Поточний користувач (для персоналізації)
    currentUser: {
        avatar: null,
        displayName: null
    },

    // Кеш завантажених аватарів
    cache: {
        animals: [...AVAILABLE_ANIMALS],
        preloadedImages: new Set()
    },

    // Налаштування
    settings: {
        defaultAnimal: DEFAULT_ANIMAL,
        defaultEmotion: DEFAULT_EMOTION,
        useHDImages: true
    }
};

export const { registerHook, runHook, runHookAsync } = createHookRegistry({
    name: 'Avatar',
    events: ['onInit', 'onUserChange', 'onRender', 'onAvatarSelect', 'onModalOpen', 'onUIStateRender'],
});

/**
 * Позначити плагін як завантажений
 *
 * @param {string} pluginName - Назва плагіна
 */
export function markPluginLoaded(pluginName) {
    avatarState.loadedPlugins.add(pluginName);
}

/**
 * Перевірити чи плагін завантажений
 *
 * @param {string} pluginName - Назва плагіна
 * @returns {boolean}
 */
export function isPluginLoaded(pluginName) {
    return avatarState.loadedPlugins.has(pluginName);
}

/**
 * Оновити дані поточного користувача
 *
 * @param {Object} userData - Дані користувача
 * @param {string} userData.avatar - Назва тварини аватара
 * @param {string} userData.displayName - Ім'я для відображення
 */
export function setCurrentUser(userData) {
    const oldUser = { ...avatarState.currentUser };

    avatarState.currentUser = {
        avatar: userData?.avatar || null,
        displayName: userData?.displayName || userData?.display_name || null
    };

    // Виконуємо хук якщо дані змінились
    if (oldUser.avatar !== avatarState.currentUser.avatar) {
        runHook('onUserChange', avatarState.currentUser);
    }
}

/**
 * Отримати аватар поточного користувача
 *
 * @returns {string} Назва тварини або дефолтна
 */
export function getCurrentUserAvatar() {
    return avatarState.currentUser.avatar || avatarState.settings.defaultAnimal;
}

/**
 * Отримати ім'я поточного користувача
 *
 * @returns {string|null}
 */
export function getCurrentUserName() {
    return avatarState.currentUser.displayName;
}

/**
 * Перевірити чи тварина доступна
 *
 * @param {string} animalName - Назва тварини
 * @returns {boolean}
 */
export function isValidAnimal(animalName) {
    return avatarState.cache.animals.includes(animalName);
}
