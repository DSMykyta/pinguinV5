// js/common/avatar/avatar-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         AVATAR LEGO SYSTEM                                ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── avatar-main.js      — Точка входу, завантаження плагінів            ║
 * ║  ├── avatar-state.js     — Глобальний стан + hooks система               ║
 * ║  └── avatar-config.js    — Конфігурація (розміри, шляхи, стани)          ║
 * ║                                                                          ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  ├── avatar-user.js      — Рендеринг аватарів користувачів               ║
 * ║  ├── avatar-ui-states.js — UI стани (empty, error, success, etc.)        ║
 * ║  ├── avatar-modal.js     — Автоматичний рендеринг в модалах              ║
 * ║  ├── avatar-selector.js  — Селектор вибору аватара                       ║
 * ║  └── avatar-text.js      — Текстові аватари з ініціалами                 ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ВИКОРИСТАННЯ:
 * import { initAvatarSystem } from './common/avatar/avatar-main.js';
 * await initAvatarSystem();
 *
 * // Або окремі функції з плагінів
 * import { renderAvatar } from './common/avatar/avatar-user.js';
 * import { renderAvatarState } from './common/avatar/avatar-ui-states.js';
 */

import { avatarState, runHook, runHookAsync, setCurrentUser } from './avatar-state.js';
import { AVAILABLE_ANIMALS } from './avatar-config.js';

// ═══════════════════════════════════════════════════════════════════════════
// ПЛАГІНИ - можна видалити будь-який, система працюватиме
// ═══════════════════════════════════════════════════════════════════════════

const PLUGINS = [
    './avatar-user.js',
    './avatar-ui-states.js',
    './avatar-modal.js',
    './avatar-selector.js',
    './avatar-text.js'
];

/**
 * Завантажити плагіни динамічно
 */
async function loadPlugins() {
    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            try {
                result.value.init(avatarState);
            } catch (e) {
                console.error(`[Avatar] ❌ Plugin init error: ${PLUGINS[index]}`, e);
            }
        } else if (result.status === 'rejected') {
            console.warn(`[Avatar] Plugin not loaded: ${PLUGINS[index]}`, result.reason?.message || '');
        }
    });
}

/**
 * Головна функція ініціалізації системи аватарів
 *
 * @returns {Promise<void>}
 *
 * @example
 * // В main-core.js
 * import { initAvatarSystem } from './common/avatar/avatar-main.js';
 * await initAvatarSystem();
 */
export async function initAvatarSystem() {
    if (avatarState.initialized) {
        return;
    }

    // Завантажуємо плагіни
    await loadPlugins();

    // Слухаємо зміни авторизації для оновлення аватара користувача
    document.addEventListener('auth-state-changed', (event) => {
        const { isAuthorized, user } = event.detail;

        if (isAuthorized && user) {
            setCurrentUser({
                avatar: user.avatar,
                displayName: user.display_name || user.username
            });
        } else {
            setCurrentUser({ avatar: null, displayName: null });
        }
    });

    // Перевіряємо чи є вже залогінений користувач
    if (typeof window.getUserData === 'function') {
        const userData = window.getUserData();
        if (userData) {
            setCurrentUser({
                avatar: userData.avatar,
                displayName: userData.display_name || userData.username
            });
        }
    }

    avatarState.initialized = true;

    // Запускаємо хук ініціалізації
    await runHookAsync('onInit');
}

/**
 * Отримати список доступних тварин
 *
 * @returns {Array<Object>} Масив об'єктів з інформацією про аватари
 */
export function getAvailableAvatars() {
    return AVAILABLE_ANIMALS.map(name => ({
        name,
        displayName: capitalizeFirst(name)
    }));
}

/**
 * Перезавантажити систему аватарів
 * (корисно після зміни налаштувань)
 */
export async function reloadAvatarSystem() {
    avatarState.initialized = false;
    avatarState.loadedPlugins.clear();
    await initAvatarSystem();
}

/**
 * Капіталізує першу літеру
 * @private
 */
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORTS для зручного використання
// ═══════════════════════════════════════════════════════════════════════════

export {
    avatarState,
    runHook,
    registerHook,
    setCurrentUser,
    getCurrentUserAvatar,
    getCurrentUserName,
    isValidAnimal
} from './avatar-state.js';

export {
    AVATAR_BASE_PATH,
    AVATAR_HD_PATH,
    AVAILABLE_ANIMALS,
    AVAILABLE_EMOTIONS,
    DEFAULT_ANIMAL,
    DEFAULT_EMOTION,
    AVATAR_SIZES,
    AVATAR_CONTEXTS,
    UI_STATES_CONFIG,
    MODAL_AVATAR_MAPPING
} from './avatar-config.js';
