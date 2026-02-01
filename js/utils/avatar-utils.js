/**
 * Avatar Text Utilities
 *
 * Функції для роботи з текстовими аватарами (ініціали з кольоровим фоном)
 */

/**
 * Отримати ініціали з імені
 * @param {string} name - Ім'я користувача
 * @returns {string} Ініціали (1-2 літери)
 * @example getInitials('John Doe') → 'JD'
 * @example getInitials('Admin') → 'AD'
 */
export function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

/**
 * Генерувати колір аватарки на основі імені
 * @param {string} name - Ім'я для хешування
 * @returns {string} HEX колір
 * @example getAvatarColor('John') → '#3f51b5'
 */
export function getAvatarColor(name) {
    if (!name) return '#9e9e9e';

    const colors = [
        '#f44336', '#e91e63', '#9c27b0', '#673ab7',
        '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
        '#009688', '#4caf50', '#8bc34a', '#cddc39',
        '#ffc107', '#ff9800', '#ff5722', '#795548'
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
}

/**
 * Генерує HTML для текстового аватара
 * @param {string} name - Ім'я
 * @param {string} size - Розмір CSS клас (sm, md, lg)
 * @returns {string} HTML код аватара
 */
export function renderTextAvatar(name, size = 'md') {
    const initials = getInitials(name);
    const color = getAvatarColor(name);

    return `
        <span class="avatar avatar-${size} avatar-text" style="background-color: ${color};">
            ${initials}
        </span>
    `;
}
