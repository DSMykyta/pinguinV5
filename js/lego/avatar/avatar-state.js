// js/lego/avatar/avatar-state.js

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

/**
 * Система хуків для комунікації між плагінами
 */
const hooks = {
    // Виклик при ініціалізації системи
    onInit: [],

    // Виклик при зміні користувача
    onUserChange: [],

    // Виклик при рендерингу аватара
    onRender: [],

    // Виклик при виборі аватара в селекторі
    onAvatarSelect: [],

    // Виклик при відкритті модалу
    onModalOpen: [],

    // Виклик при рендерингу UI state
    onUIStateRender: []
};

/**
 * Реєстрація callback для хука
 *
 * @param {string} hookName - Назва хука
 * @param {Function} callback - Функція-обробник
 *
 * @example
 * registerHook('onUserChange', (user) => {
 *     console.log('User changed:', user);
 * });
 */
export function registerHook(hookName, callback) {
    if (!hooks[hookName]) {
        console.warn(`[Avatar] Unknown hook: ${hookName}`);
        return;
    }

    if (typeof callback !== 'function') {
        console.warn(`[Avatar] Hook callback must be a function`);
        return;
    }

    hooks[hookName].push(callback);
}

/**
 * Виконання хука синхронно
 *
 * @param {string} hookName - Назва хука
 * @param {...any} args - Аргументи для передачі в callbacks
 *
 * @example
 * runHook('onRender', avatarElement, options);
 */
export function runHook(hookName, ...args) {
    if (!hooks[hookName]) {
        return;
    }

    hooks[hookName].forEach(callback => {
        try {
            callback(...args);
        } catch (error) {
            console.error(`[Avatar] Hook error (${hookName}):`, error);
        }
    });
}

/**
 * Виконання хука асинхронно
 *
 * @param {string} hookName - Назва хука
 * @param {...any} args - Аргументи для передачі в callbacks
 * @returns {Promise<void>}
 */
export async function runHookAsync(hookName, ...args) {
    if (!hooks[hookName]) {
        return;
    }

    for (const callback of hooks[hookName]) {
        try {
            await callback(...args);
        } catch (error) {
            console.error(`[Avatar] Async hook error (${hookName}):`, error);
        }
    }
}

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
