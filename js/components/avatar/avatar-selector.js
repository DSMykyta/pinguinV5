// js/common/avatar/avatar-selector.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              AVATAR PLUGIN - SELECTOR COMPONENT                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Плагін для селектора вибору аватара.
 * Використовується в модалках додавання/редагування користувачів.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - renderAvatarSelector(containerId, options) - Відрендерити селектор
 * - setSelectedAvatar(containerId, avatarName) - Встановити обраний аватар
 * - getSelectedAvatar(containerId) - Отримати обраний аватар
 */

import { markPluginLoaded, registerHook, runHook } from './avatar-state.js';
import { capitalizeFirst } from '../../utils/common-utils.js';
import {
    AVATAR_BASE_PATH,
    AVAILABLE_ANIMALS,
    DEFAULT_ANIMAL
} from './avatar-config.js';
import { getAvatarPath } from './avatar-user.js';

export const PLUGIN_NAME = 'avatar-selector';

/**
 * Зберігаємо стан селекторів
 */
const selectorStates = new Map();

/**
 * Ініціалізація плагіна
 */
export function init(state) {
    markPluginLoaded(PLUGIN_NAME);
}

/**
 * Відрендерити селектор аватарів
 *
 * @param {string} containerId - ID контейнера для селектора
 * @param {Object} options - Опції
 * @param {string} options.selectedAvatar - Поточно обраний аватар
 * @param {string} options.inputId - ID прихованого input (опціонально)
 * @param {string} options.previewId - ID контейнера превью (опціонально)
 * @param {Function} options.onChange - Callback при зміні вибору
 *
 * @example
 * renderAvatarSelector('avatar-selector', {
 *     selectedAvatar: 'penguin',
 *     inputId: 'selected-avatar',
 *     previewId: 'avatar-preview',
 *     onChange: (avatar) => console.log('Selected:', avatar)
 * });
 */
export function renderAvatarSelector(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`[Avatar Selector] Container not found: ${containerId}`);
        return;
    }

    const {
        selectedAvatar = null,
        inputId = null,
        previewId = null,
        onChange = null
    } = options;

    // Зберігаємо стан
    selectorStates.set(containerId, {
        selectedAvatar,
        inputId,
        previewId,
        onChange
    });

    // Генеруємо HTML
    let html = '<div class="avatar-selector">';

    AVAILABLE_ANIMALS.forEach(animal => {
        const isSelected = animal === selectedAvatar;
        const path = getAvatarPath(animal, 'calm', false);
        const displayName = capitalizeFirst(animal);

        html += `
            <div class="avatar-option ${isSelected ? 'selected' : ''}"
                 data-avatar-name="${animal}"
                 title="${displayName}">
                <img src="${path}" alt="${displayName}">
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Оновлюємо превью якщо є обраний аватар
    if (selectedAvatar && previewId) {
        updatePreview(previewId, selectedAvatar);
    }

    // Оновлюємо input якщо є
    if (inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = selectedAvatar || '';
        }
    }

    // Додаємо обробник кліків (з event delegation)
    setupClickHandler(container, containerId);
}

/**
 * Налаштувати обробник кліків
 */
function setupClickHandler(container, containerId) {
    // Видаляємо старий обробник якщо є
    if (container._avatarClickHandler) {
        container.removeEventListener('click', container._avatarClickHandler);
    }

    container._avatarClickHandler = function(e) {
        const option = e.target.closest('.avatar-option');
        if (!option) return;

        const avatarName = option.dataset.avatarName;
        setSelectedAvatar(containerId, avatarName);
    };

    container.addEventListener('click', container._avatarClickHandler);
}

/**
 * Встановити обраний аватар
 *
 * @param {string} containerId - ID контейнера селектора
 * @param {string} avatarName - Назва тварини
 */
export function setSelectedAvatar(containerId, avatarName) {
    const container = document.getElementById(containerId);
    const state = selectorStates.get(containerId);

    if (!container || !state) {
        return;
    }

    // Оновлюємо візуальне виділення
    container.querySelectorAll('.avatar-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.avatarName === avatarName) {
            opt.classList.add('selected');
        }
    });

    // Оновлюємо стан
    state.selectedAvatar = avatarName;

    // Оновлюємо прихований input
    if (state.inputId) {
        const input = document.getElementById(state.inputId);
        if (input) {
            input.value = avatarName;
        }
    }

    // Оновлюємо превью
    if (state.previewId) {
        updatePreview(state.previewId, avatarName);
    }

    // Викликаємо callback
    if (typeof state.onChange === 'function') {
        state.onChange(avatarName);
    }

    // Dispatch event
    container.dispatchEvent(new CustomEvent('avatar-changed', {
        detail: { avatar: avatarName },
        bubbles: true
    }));

    // Запускаємо хук
    runHook('onAvatarSelect', avatarName, containerId);
}

/**
 * Отримати обраний аватар
 *
 * @param {string} containerId - ID контейнера селектора
 * @returns {string|null} Назва обраного аватара
 */
export function getSelectedAvatar(containerId) {
    const state = selectorStates.get(containerId);
    return state?.selectedAvatar || null;
}

/**
 * Оновити превью аватара
 */
function updatePreview(previewId, avatarName) {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    if (!avatarName) {
        preview.classList.add('u-hidden');
        preview.innerHTML = '';
        return;
    }

    preview.classList.remove('u-hidden');

    const path = getAvatarPath(avatarName, 'calm', false);
    const displayName = capitalizeFirst(avatarName);

    preview.innerHTML = `
        <div class="avatar-preview-image">
            <img src="${path}" alt="${displayName}">
        </div>
        <div class="avatar-preview-text">
            <div class="avatar-preview-label">Обраний аватар</div>
            <div class="avatar-preview-name">${displayName}</div>
        </div>
    `;
}

/**
 * Очистити селектор
 *
 * @param {string} containerId - ID контейнера
 */
export function clearSelector(containerId) {
    const container = document.getElementById(containerId);
    const state = selectorStates.get(containerId);

    if (container) {
        container.innerHTML = '';
        if (container._avatarClickHandler) {
            container.removeEventListener('click', container._avatarClickHandler);
        }
    }

    if (state) {
        if (state.previewId) {
            const preview = document.getElementById(state.previewId);
            if (preview) {
                preview.classList.add('u-hidden');
                preview.innerHTML = '';
            }
        }

        if (state.inputId) {
            const input = document.getElementById(state.inputId);
            if (input) {
                input.value = '';
            }
        }
    }

    selectorStates.delete(containerId);
}


// Ініціалізація викликається з avatar-main.js через init(state)
