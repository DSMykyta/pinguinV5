// js/utils/avatar-states.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   ГЛОБАЛЬНА СИСТЕМА СТАНІВ АВАТАРІВ                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Централізована система для відображення аватарів з емоціями та випадковими
 * повідомленнями в різних частинах інтерфейсу (empty states, modals, alerts).
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - getAvatarState(stateType, options) - Отримати дані стану аватара
 * - renderAvatarState(stateType, options) - Створити HTML для аватара
 *
 * ЗАЛЕЖНОСТІ:
 * - custom-auth.js (getUserData для персоналізації)
 */

import { getUserData } from '../auth/custom-auth.js';

/**
 * Конфігурація всіх станів аватарів
 */
const AVATAR_STATES = {
    // Порожній стан (немає даних)
    empty: {
        emotion: 'sad',
        messages: [
            'Поки про це нічого не відомо',
            'Ми не занємо що це таке якби мо знали цл це тваке ми б знали що це таке',
            'Дані відсутні як і мій інтеект',
            'Спочатку треба додати хо щось а потім читати'

        ]
    },

    // Успішна операція
    success: {
        emotion: 'happy',
        messages: [
            'Готово!',
            'Успішно збережено',
            'Чудово, все працює!',
            'Виконано без помилок'
        ]
    },

    // Результати пошуку не знайдені
    noResults: {
        emotion: 'confused',
        messages: [
            'Ти взагалі про що?',
            'Вперше про таке чую',
            'Я не певен що таке існує',
            'Я такого тобі не покажу',
            'Я нічого не зрозумів'
        ]
    },

    // Помилка
    error: {
        emotion: 'anger',
        messages: [
            'Щось пішло не так',
            'Помилка!',
            'Не вдалося виконати',
            'Це не спрацювало'
        ]
    },

    // Завантаження
    loading: {
        emotion: 'calm',
        messages: [
            'Завантаження...',
            'Зачекайте хвилинку',
            'Обробка даних...',
            'Майже готово'
        ]
    },

    // Підтвердження закриття
    confirmClose: {
        emotion: 'suspicion',
        messages: [
            'Точно закрити?',
            'Ти впевнений?',
            'Може залишимо?',
            'Не передумав?',
            'Закриваємо?'
        ]
    },

    // Підтвердження перезавантаження
    confirmReload: {
        emotion: 'confused',
        messages: [
            'Перезавантажити?',
            'Оновити сторінку?',
            'Почати з початку?',
            'Завантажити знову?',
            'Перезапустити?'
        ]
    },

    // Підтвердження скидання
    confirmReset: {
        emotion: 'anger',
        messages: [
            'Скинути все?',
            'Видалити зміни?',
            'Повернути як було?',
            'Втратити всі зміни?',
            'Точно скинути?'
        ]
    },

    // Авторизація/вхід
    authLogin: {
        emotion: 'suspicion',
        messages: [
            'Хто ти такий?',
            'Ти точно маєш доступ?',
            'Покажи свої креденшли',
            'А ти хто?',
            'Я тебе не знаю',
            'Підозріло...'
        ]
    }
};

/**
 * Розміри аватарів
 */
const AVATAR_SIZES = {
    small: '80px',
    medium: '120px',
    large: '160px'
};

/**
 * Отримати дані стану аватара
 *
 * @param {string} stateType - Тип стану (empty, success, noResults, etc.)
 * @param {Object} options - Додаткові опції
 * @param {string} options.message - Кастомне повідомлення (якщо не вказано - випадкове з масиву)
 * @param {string} options.size - Розмір аватара: 'small', 'medium', 'large' (за замовчуванням 'medium')
 * @param {string} options.animal - Примусовий вибір тварини (якщо не вказано - беремо з getUserData)
 *
 * @returns {Object} Об'єкт з даними стану
 * @returns {string} return.avatarPath - Шлях до зображення аватара
 * @returns {string} return.message - Повідомлення для відображення
 * @returns {string} return.emotion - Емоція аватара
 * @returns {string} return.fallbackPath - Резервний шлях (penguin)
 * @returns {string} return.size - Розмір аватара в px
 *
 * @example
 * const state = getAvatarState('empty');
 * // { avatarPath: 'resources/avatars/1056/koala-sad.png', message: 'Поки про це нічого не відомо', ... }
 *
 * const customState = getAvatarState('confirmClose', {
 *   message: 'Закрити без збереження?',
 *   size: 'small'
 * });
 */
export function getAvatarState(stateType, options = {}) {
    const state = AVATAR_STATES[stateType];

    if (!state) {
        console.error(`Unknown avatar state type: ${stateType}`);
        return null;
    }

    // Отримуємо тварину користувача
    const userData = getUserData();
    const avatarAnimal = options.animal || userData?.avatar || 'penguin';

    // Випадкове повідомлення або кастомне
    const message = options.message || state.messages[Math.floor(Math.random() * state.messages.length)];

    // Розмір аватара
    const size = AVATAR_SIZES[options.size || 'medium'];

    return {
        avatarPath: `resources/avatars/1056/${avatarAnimal}-${state.emotion}.png`,
        message,
        emotion: state.emotion,
        fallbackPath: `resources/avatars/1056/penguin-${state.emotion}.png`,
        size,
        animal: avatarAnimal
    };
}

/**
 * Створити HTML для відображення стану аватара
 *
 * @param {string} stateType - Тип стану (empty, success, noResults, etc.)
 * @param {Object} options - Додаткові опції
 * @param {string} options.message - Кастомне повідомлення
 * @param {string} options.size - Розмір: 'small', 'medium', 'large'
 * @param {string} options.containerClass - Додатковий клас для контейнера
 * @param {string} options.avatarClass - Додатковий клас для <img>
 * @param {string} options.messageClass - Додатковий клас для <p>
 * @param {boolean} options.showMessage - Показувати повідомлення (за замовчуванням true)
 *
 * @returns {string} HTML string для вставки
 *
 * @example
 * const html = renderAvatarState('empty', {
 *   containerClass: 'my-empty-state',
 *   size: 'large'
 * });
 * container.innerHTML = html;
 */
export function renderAvatarState(stateType, options = {}) {
    const state = getAvatarState(stateType, options);

    if (!state) {
        return '<p>Error: Invalid state</p>';
    }

    const containerClass = options.containerClass || 'avatar-state-container';
    const avatarClass = options.avatarClass || 'avatar-state-image';
    const messageClass = options.messageClass || 'avatar-state-message';
    const showMessage = options.showMessage !== false;

    return `
        <div class="${containerClass}">
            <img
                src="${state.avatarPath}"
                alt="${state.animal} ${state.emotion}"
                class="${avatarClass}"
                style="width: ${state.size}; height: ${state.size};"
                onerror="this.src='${state.fallbackPath}'"
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
    const state = AVATAR_STATES[stateType];
    if (!state) return '';
    return state.messages[Math.floor(Math.random() * state.messages.length)];
}

/**
 * Отримати емоцію для стану
 *
 * @param {string} stateType - Тип стану
 * @returns {string} Назва емоції
 */
export function getStateEmotion(stateType) {
    const state = AVATAR_STATES[stateType];
    return state?.emotion || 'calm';
}
