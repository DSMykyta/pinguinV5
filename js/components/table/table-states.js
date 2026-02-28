// js/components/table/table-states.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE LEGO - TABLE STATES                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  4 стани порожньої таблиці з аватарами.                                ║
 * ║                                                                        ║
 * ║  СТАНИ:                                                                ║
 * ║  1. auth    — Потрібна авторизація. Немає шапки, тільки аватар.       ║
 * ║               Емоція: suspicion (підозра).                             ║
 * ║  2. loading — Завантаження даних. Немає шапки. Аватар + спінер.       ║
 * ║               Емоція: calm (спокій).                                  ║
 * ║  3. empty   — Даних немає. Шапка є. Сумний аватар із підписом.       ║
 * ║               Емоція: sad (сум).                                      ║
 * ║  4. error   — Помилка сервера. Шапка є. Наляканий аватар.            ║
 * ║               Емоція: angry (злість/переляк).                         ║
 * ║                                                                        ║
 * ║  ВИКОРИСТАННЯ:                                                         ║
 * ║  renderTableState('auth')   → HTML без шапки                          ║
 * ║  renderTableState('loading', { message: '...' })                      ║
 * ║  renderTableState('empty', { message: 'Нічого не знайдено' })        ║
 * ║  renderTableState('error', { message: 'Сервер недоступний' })        ║
 * ║                                                                        ║
 * ║  ЕКСПОРТ:                                                              ║
 * ║  - TABLE_STATES — Конфігурація станів                                 ║
 * ║  - renderTableState(stateType, options) — Генерує HTML                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getAvatarState } from '../avatar/avatar-ui-states.js';

/**
 * Конфігурація 4 станів таблиці.
 *
 * hasHeader — чи зберігати шапку таблиці при цьому стані
 * avatarStateType — тип з avatar-ui-states для отримання аватар-даних
 * avatarSize — розмір аватара (ключ з AVATAR_SIZES)
 * showSpinner — чи показувати спінер поруч з аватаром
 */
export const TABLE_STATES = {
    auth: {
        hasHeader: false,
        avatarStateType: 'authRequired',
        avatarSize: 'xl',
        showSpinner: false
    },
    loading: {
        hasHeader: false,
        avatarStateType: 'loading',
        avatarSize: 'lg',
        showSpinner: true
    },
    empty: {
        hasHeader: true,
        avatarStateType: 'empty',
        avatarSize: 'lg',
        showSpinner: false
    },
    error: {
        hasHeader: true,
        avatarStateType: 'error',
        avatarSize: 'lg',
        showSpinner: false
    }
};

/**
 * Згенерувати HTML для стану таблиці.
 *
 * @param {string} stateType — Один з: 'auth', 'loading', 'empty', 'error'
 * @param {Object} [options] — Додаткові опції
 * @param {string} [options.message] — Кастомне повідомлення (перевизначає дефолтне)
 * @returns {string} HTML-рядок для вставки в .pseudo-table-container
 *
 * @example
 * container.innerHTML = renderTableState('empty', { message: 'Нічого не знайдено' });
 */
export function renderTableState(stateType, options = {}) {
    const config = TABLE_STATES[stateType];
    if (!config) {
        console.warn(`[TableStates] Unknown state: ${stateType}`);
        return '';
    }

    const avatarData = getAvatarState(config.avatarStateType, {
        message: options.message,
        size: config.avatarSize
    });

    if (!avatarData) {
        return `<div class="table-state table-state-${stateType}">
            <p class="table-state-message">${options.message || ''}</p>
        </div>`;
    }

    const spinnerHTML = config.showSpinner
        ? '<div class="spinner"></div>'
        : '';

    return `<div class="table-state table-state-${stateType}">
            <img
                src="${avatarData.avatarPath}"
                alt="${avatarData.animal} ${avatarData.emotion}"
                class="table-state-avatar"
                onerror="this.onerror=null; this.src='${avatarData.fallbackPath}'"
            >
            ${spinnerHTML}
            <p class="table-state-message">${avatarData.message}</p>
        </div>`;
}
