// js/common/avatar/avatar-text.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              AVATAR PLUGIN - TEXT AVATARS                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Плагін для текстових аватарів (ініціали з кольоровим фоном).
 * Використовується коли немає зображення аватара.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - getInitials(name) - Отримати ініціали з імені
 * - getAvatarColor(name) - Отримати колір на основі імені
 * - renderTextAvatar(name, options) - Згенерувати HTML
 */

import { markPluginLoaded } from './avatar-state.js';
import { TEXT_AVATAR_COLORS, AVATAR_SIZES } from './avatar-config.js';

export const PLUGIN_NAME = 'avatar-text';

/**
 * Ініціалізація плагіна
 */
function init() {
    markPluginLoaded(PLUGIN_NAME);
}

/**
 * Отримати ініціали з імені
 *
 * @param {string} name - Ім'я користувача
 * @returns {string} Ініціали (1-2 літери)
 *
 * @example
 * getInitials('John Doe')    // → 'JD'
 * getInitials('Admin')       // → 'AD'
 * getInitials('Test User')   // → 'TU'
 */
export function getInitials(name) {
    if (!name) return '?';

    const trimmed = name.trim();
    if (!trimmed) return '?';

    const parts = trimmed.split(/\s+/);

    if (parts.length >= 2) {
        // Дві або більше частин - беремо перші літери перших двох слів
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    // Одне слово - беремо перші дві літери
    return trimmed.substring(0, 2).toUpperCase();
}

/**
 * Генерувати колір аватара на основі імені
 * Один і той же колір для одного імені
 *
 * @param {string} name - Ім'я для хешування
 * @returns {string} HEX колір
 *
 * @example
 * getAvatarColor('John')  // → '#3f51b5'
 * getAvatarColor('Admin') // → '#f44336'
 */
export function getAvatarColor(name) {
    if (!name) return '#9e9e9e'; // Сірий для порожнього імені

    // Простий хеш на основі символів імені
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Вибираємо колір з палітри
    const index = Math.abs(hash) % TEXT_AVATAR_COLORS.length;
    return TEXT_AVATAR_COLORS[index];
}

/**
 * Отримати контрастний колір тексту
 *
 * @param {string} bgColor - HEX колір фону
 * @returns {string} Колір тексту (білий або чорний)
 */
export function getContrastColor(bgColor) {
    // Конвертуємо HEX в RGB
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Розраховуємо яскравість (YIQ формула)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    return brightness > 128 ? '#000000' : '#ffffff';
}

/**
 * Згенерувати HTML для текстового аватара
 *
 * @param {string} name - Ім'я користувача
 * @param {Object} options - Опції
 * @param {string} options.size - Розмір: 'xs', 'sm', 'md', 'lg', 'xl'
 * @param {string} options.className - Додатковий клас
 * @param {string} options.color - Примусовий колір фону
 * @returns {string} HTML код
 *
 * @example
 * renderTextAvatar('John Doe', { size: 'md' })
 * // → <span class="avatar avatar-md avatar-text" style="background-color: #3f51b5; color: #fff;">JD</span>
 */
export function renderTextAvatar(name, options = {}) {
    const {
        size = 'md',
        className = '',
        color = null
    } = options;

    const initials = getInitials(name);
    const bgColor = color || getAvatarColor(name);
    const textColor = getContrastColor(bgColor);

    const classes = ['avatar', `avatar-${size}`, 'avatar-text', className].filter(Boolean).join(' ');

    return `
        <span class="${classes}" style="background-color: ${bgColor}; color: ${textColor};">
            ${initials}
        </span>
    `;
}

/**
 * Створити DOM елемент текстового аватара
 *
 * @param {string} name - Ім'я
 * @param {Object} options - Опції
 * @returns {HTMLElement}
 */
export function createTextAvatarElement(name, options = {}) {
    const {
        size = 'md',
        className = '',
        color = null
    } = options;

    const initials = getInitials(name);
    const bgColor = color || getAvatarColor(name);
    const textColor = getContrastColor(bgColor);

    const span = document.createElement('span');
    span.className = ['avatar', `avatar-${size}`, 'avatar-text', className].filter(Boolean).join(' ');
    span.style.backgroundColor = bgColor;
    span.style.color = textColor;
    span.textContent = initials;

    return span;
}

// Автоматична ініціалізація при завантаженні модуля
init();
