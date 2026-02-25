// js/common/avatar/avatar-user.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              AVATAR PLUGIN - USER AVATAR RENDERING                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Плагін для рендерингу аватарів користувачів.
 * Відповідає за відображення аватарів в панелі користувача та таблицях.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - getAvatarPath(animalName, emotion, useHD) - Отримати шлях до файлу
 * - renderAvatar(animalName, options) - Згенерувати HTML аватара
 * - updateUserAvatar(avatarName, containerId) - Оновити аватар в контейнері
 */

import { markPluginLoaded, registerHook, getCurrentUserAvatar } from './avatar-state.js';
import { capitalizeFirst } from '../../utils/common-utils.js';
import {
    AVATAR_BASE_PATH,
    AVATAR_HD_PATH,
    DEFAULT_ANIMAL,
    DEFAULT_EMOTION,
    AVATAR_SIZES,
    EMOTION_ALIASES,
    AVAILABLE_ANIMALS
} from './avatar-config.js';

export const PLUGIN_NAME = 'avatar-user';

/**
 * Ініціалізація плагіна
 */
export function init(state) {
    markPluginLoaded(PLUGIN_NAME);

    // Реєструємо хук для оновлення аватара при зміні користувача
    registerHook('onUserChange', handleUserChange);
}

/**
 * Обробник зміни користувача
 */
function handleUserChange(user) {
    // Оновлюємо аватар в панелі користувача
    updateUserAvatar(user?.avatar, 'auth-user-avatar-container');
}

/**
 * Отримати шлях до файлу аватара
 *
 * @param {string} animalName - Назва тварини
 * @param {string} emotion - Емоція (calm, happy, sad, angry, confused, suspicion)
 * @param {boolean} useHD - Використовувати HD версію (1056/)
 * @returns {string} Шлях до файлу
 *
 * @example
 * getAvatarPath('penguin', 'happy', true)
 * // → 'resources/avatars/1056/penguin-happy.png'
 */
export function getAvatarPath(animalName, emotion = DEFAULT_EMOTION, useHD = false) {
    // Валідація та fallback
    const animal = AVAILABLE_ANIMALS.includes(animalName) ? animalName : DEFAULT_ANIMAL;

    // Нормалізація емоції (mad → angry)
    const normalizedEmotion = EMOTION_ALIASES[emotion] || emotion || DEFAULT_EMOTION;

    const basePath = useHD ? AVATAR_HD_PATH : AVATAR_BASE_PATH;
    return `${basePath}/${animal}-${normalizedEmotion}.png`;
}

/**
 * Отримати fallback шлях (penguin)
 */
export function getFallbackPath(emotion = DEFAULT_EMOTION, useHD = false) {
    const normalizedEmotion = EMOTION_ALIASES[emotion] || emotion || DEFAULT_EMOTION;
    const basePath = useHD ? AVATAR_HD_PATH : AVATAR_BASE_PATH;
    return `${basePath}/${DEFAULT_ANIMAL}-${normalizedEmotion}.png`;
}

/**
 * Згенерувати HTML для аватара
 *
 * @param {string} animalName - Назва тварини
 * @param {Object} options - Опції рендерингу
 * @param {string} options.size - Розмір: 'xs', 'sm', 'md', 'lg', 'xl', 'xxl'
 * @param {string} options.emotion - Емоція
 * @param {boolean} options.useHD - Використовувати HD
 * @param {string} options.className - Додатковий клас
 * @param {string} options.alt - Alt текст
 * @returns {string} HTML код
 *
 * @example
 * renderAvatar('koala', { size: 'md', emotion: 'happy' })
 */
export function renderAvatar(animalName, options = {}) {
    const {
        size = 'md',
        emotion = DEFAULT_EMOTION,
        useHD = false,
        className = '',
        alt = null
    } = options;

    // Якщо немає аватара - показуємо іконку person
    if (!animalName) {
        return renderFallbackIcon(size, className);
    }

    const path = getAvatarPath(animalName, emotion, useHD);
    const fallbackPath = getFallbackPath(emotion, useHD);
    const sizeValue = AVATAR_SIZES[size] || AVATAR_SIZES.md;
    const altText = alt || capitalizeFirst(animalName);

    const classes = ['avatar', `avatar-${size}`, className].filter(Boolean).join(' ');

    return `
        <span class="${classes}">
            <img
                src="${path}"
                alt="${altText}"
                style="width: ${sizeValue}; height: ${sizeValue};"
                onerror="this.onerror=null; this.src='${fallbackPath}'"
            >
        </span>
    `;
}

/**
 * Рендер fallback іконки (person)
 */
function renderFallbackIcon(size = 'md', className = '') {
    const classes = ['avatar', `avatar-${size}`, 'avatar-icon', className].filter(Boolean).join(' ');

    return `
        <span class="${classes}">
            <span class="material-symbols-outlined" style="font-size: inherit;">person</span>
        </span>
    `;
}

/**
 * Оновити аватар користувача в контейнері
 *
 * @param {string} avatarName - Назва тварини аватара
 * @param {string} containerId - ID контейнера
 *
 * @example
 * updateUserAvatar('penguin', 'auth-user-avatar-container');
 */
export function updateUserAvatar(avatarName, containerId = 'auth-user-avatar-container') {
    const container = document.getElementById(containerId);

    if (!container) {
        return;
    }

    if (avatarName) {
        const path = getAvatarPath(avatarName, 'calm', false);
        const fallbackPath = getFallbackPath('calm', false);

        container.innerHTML = `
            <div class="auth-avatar">
                <img
                    src="${path}"
                    alt="Avatar"
                    onerror="this.onerror=null; this.parentElement.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\'>person</span>'"
                >
            </div>
        `;
    } else {
        container.innerHTML = `
            <span class="material-symbols-outlined">person</span>
        `;
    }
}

/**
 * Отримати аватар поточного користувача з опціями
 *
 * @param {Object} options - Опції рендерингу
 * @returns {string} HTML код
 */
export function renderCurrentUserAvatar(options = {}) {
    const avatar = getCurrentUserAvatar();
    return renderAvatar(avatar, options);
}

// Ініціалізація викликається з avatar-main.js через init(state)
