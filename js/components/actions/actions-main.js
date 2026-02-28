// js/components/actions/actions-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    UNIVERSAL ACTION SYSTEM                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Централізована система обробки дій для кнопок в таблицях та списках.    ║
 * ║  Використовує делегування подій та data-атрибути.                        ║
 * ║                                                                          ║
 * ║  📋 СТАНДАРТНІ ДІЇ:                                                      ║
 * ║  ├── edit     — Редагування елемента                                     ║
 * ║  ├── delete   — Видалення елемента                                       ║
 * ║  ├── view     — Перегляд елемента                                        ║
 * ║  ├── unlink   — Відв'язування від батьківського елемента                 ║
 * ║  ├── unmap    — Видалення маппінгу                                       ║
 * ║  └── copy     — Копіювання елемента                                      ║
 * ║                                                                          ║
 * ║  🎯 ВИКОРИСТАННЯ:                                                        ║
 * ║                                                                          ║
 * ║  HTML:                                                                   ║
 * ║  <button class="btn-icon"                                                ║
 * ║          data-action="edit"                                              ║
 * ║          data-row-id="123"                                               ║
 * ║          data-context="mapper-characteristics">                          ║
 * ║      <span class="material-symbols-outlined">edit</span>                 ║
 * ║  </button>                                                               ║
 * ║                                                                          ║
 * ║  JS:                                                                     ║
 * ║  // Реєстрація обробників для контексту                                  ║
 * ║  registerActionHandlers('mapper-characteristics', {                      ║
 * ║      edit: (rowId, data) => showEditModal(rowId),                        ║
 * ║      delete: (rowId, data) => showDeleteConfirm(rowId)                   ║
 * ║  });                                                                     ║
 * ║                                                                          ║
 * ║  // Ініціалізація на контейнері                                          ║
 * ║  initActionHandlers(container, 'mapper-characteristics');                ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТР ОБРОБНИКІВ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Глобальний реєстр обробників дій
 * Структура: { context: { action: handler } }
 */
const actionRegistry = new Map();

/**
 * Глобальні обробники (fallback для всіх контекстів)
 */
const globalHandlers = new Map();

// ═══════════════════════════════════════════════════════════════════════════
// ПУБЛІЧНЕ API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Зареєструвати обробники дій для контексту
 *
 * @param {string} context - Унікальний ідентифікатор контексту (напр. 'mapper-characteristics')
 * @param {Object} handlers - Об'єкт з обробниками { action: handler }
 *
 * @example
 * registerActionHandlers('mapper-characteristics', {
 *     edit: async (rowId, data) => {
 *         const { showEditCharacteristicModal } = await import('./mapper-characteristics.js');
 *         await showEditCharacteristicModal(rowId);
 *     },
 *     delete: async (rowId, data) => {
 *         await showDeleteConfirm(rowId, data.name);
 *     }
 * });
 */
export function registerActionHandlers(context, handlers) {
    if (!actionRegistry.has(context)) {
        actionRegistry.set(context, new Map());
    }

    const contextHandlers = actionRegistry.get(context);

    Object.entries(handlers).forEach(([action, handler]) => {
        if (typeof handler === 'function') {
            contextHandlers.set(action, handler);
        } else {
            console.warn(`[Actions] Handler for "${action}" in "${context}" is not a function`);
        }
    });

}

/**
 * Зареєструвати глобальний обробник (fallback)
 *
 * @param {string} action - Назва дії
 * @param {Function} handler - Функція-обробник
 */
export function registerGlobalAction(action, handler) {
    if (typeof handler === 'function') {
        globalHandlers.set(action, handler);
    }
}

/**
 * Ініціалізувати обробники дій на контейнері
 * Використовує делегування подій — один обробник на весь контейнер
 *
 * @param {HTMLElement} container - Контейнер для делегування
 * @param {string} defaultContext - Контекст за замовчуванням (якщо не вказано в data-context)
 * @param {Object} options - Додаткові опції
 * @param {Function} options.onBeforeAction - Callback перед виконанням дії
 * @param {Function} options.onAfterAction - Callback після виконання дії
 * @param {Function} options.onError - Callback при помилці
 *
 * @returns {Function} Функція для видалення обробника
 *
 * @example
 * const cleanup = initActionHandlers(tableContainer, 'mapper-characteristics', {
 *     onBeforeAction: (action, rowId) => console.log(`Starting ${action}...`),
 *     onAfterAction: (action, rowId) => console.log(`Finished ${action}`),
 *     onError: (error, action, rowId) => showToast(error.message, 'error')
 * });
 *
 * // Пізніше, для очищення:
 * cleanup();
 */
export function initActionHandlers(container, defaultContext, options = {}) {
    if (!container || !(container instanceof HTMLElement)) {
        console.error('[Actions] Container is required');
        return () => {};
    }

    const {
        onBeforeAction = null,
        onAfterAction = null,
        onError = null
    } = options;

    const handleClick = async (e) => {
        // Знаходимо кнопку з data-action
        const button = e.target.closest('[data-action]');
        if (!button) return;

        // Перевіряємо чи кнопка всередині нашого контейнера
        if (!container.contains(button)) return;

        e.stopPropagation();

        const action = button.dataset.action;
        const rowId = button.dataset.rowId;
        const context = button.dataset.context || defaultContext;

        // Збираємо всі data-атрибути як дані
        const data = extractDataAttributes(button);

        // Знаходимо обробник
        const handler = findHandler(context, action);

        if (!handler) {
            console.warn(`[Actions] No handler for action "${action}" in context "${context}"`);
            return;
        }

        try {
            // Callback перед дією
            if (onBeforeAction) {
                const shouldContinue = await onBeforeAction(action, rowId, data, context);
                if (shouldContinue === false) return;
            }

            // Візуальний стан "loading" на кнопці
            const originalContent = button.innerHTML;
            const wasDisabled = button.disabled;
            setButtonLoading(button, true);

            // Виконуємо дію
            await handler(rowId, data, context);

            // Callback після дії
            if (onAfterAction) {
                await onAfterAction(action, rowId, data, context);
            }

            // Відновлюємо кнопку
            setButtonLoading(button, false, originalContent, wasDisabled);

        } catch (error) {
            console.error(`[Actions] Error in "${action}" for "${context}":`, error);

            // Callback помилки
            if (onError) {
                onError(error, action, rowId, data, context);
            }

            // Відновлюємо кнопку
            setButtonLoading(button, false);
        }
    };

    container.addEventListener('click', handleClick);

    // Повертаємо функцію очищення
    return () => {
        container.removeEventListener('click', handleClick);
    };
}

/**
 * Виконати дію програмно
 *
 * @param {string} context - Контекст
 * @param {string} action - Назва дії
 * @param {string} rowId - ID елемента
 * @param {Object} data - Додаткові дані
 */
export async function executeAction(context, action, rowId, data = {}) {
    const handler = findHandler(context, action);

    if (!handler) {
        throw new Error(`No handler for action "${action}" in context "${context}"`);
    }

    return await handler(rowId, data, context);
}

/**
 * Перевірити чи є обробник для дії
 *
 * @param {string} context - Контекст
 * @param {string} action - Назва дії
 * @returns {boolean}
 */
export function hasActionHandler(context, action) {
    return findHandler(context, action) !== null;
}

/**
 * Отримати список зареєстрованих дій для контексту
 *
 * @param {string} context - Контекст
 * @returns {string[]} Масив назв дій
 */
export function getRegisteredActions(context) {
    const contextHandlers = actionRegistry.get(context);
    if (!contextHandlers) return [];
    return Array.from(contextHandlers.keys());
}

/**
 * Очистити обробники для контексту
 *
 * @param {string} context - Контекст
 */
export function clearActionHandlers(context) {
    actionRegistry.delete(context);
}

// ═══════════════════════════════════════════════════════════════════════════
// ДОПОМІЖНІ ФУНКЦІЇ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Знайти обробник для дії
 */
function findHandler(context, action) {
    // Спочатку шукаємо в контексті
    const contextHandlers = actionRegistry.get(context);
    if (contextHandlers && contextHandlers.has(action)) {
        return contextHandlers.get(action);
    }

    // Потім в глобальних
    if (globalHandlers.has(action)) {
        return globalHandlers.get(action);
    }

    return null;
}

/**
 * Витягти всі data-атрибути з елемента
 */
function extractDataAttributes(element) {
    const data = {};

    Array.from(element.attributes).forEach(attr => {
        if (attr.name.startsWith('data-') && attr.name !== 'data-action') {
            // Конвертуємо data-row-id → rowId, data-mapping-id → mappingId
            const key = attr.name
                .replace('data-', '')
                .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
            data[key] = attr.value;
        }
    });

    return data;
}

/**
 * Встановити стан loading на кнопці
 */
function setButtonLoading(button, isLoading, originalContent = null, wasDisabled = false) {
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalContent = button.innerHTML;
        button.innerHTML = '<span class="material-symbols-outlined spinning">sync</span>';
    } else {
        button.disabled = wasDisabled;
        if (originalContent) {
            button.innerHTML = originalContent;
        } else if (button.dataset.originalContent) {
            button.innerHTML = button.dataset.originalContent;
            delete button.dataset.originalContent;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ХЕЛПЕРИ ДЛЯ ГЕНЕРАЦІЇ HTML
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Створити HTML для кнопки дії
 *
 * @param {Object} options - Опції кнопки
 * @param {string} options.action - Назва дії (edit, delete, view, unlink, unmap)
 * @param {string} options.rowId - ID рядка
 * @param {string} options.icon - Material icon назва (за замовчуванням з ACTION_ICONS)
 * @param {string} options.tooltip - Текст підказки (за замовчуванням з ACTION_LABELS)
 * @param {string} options.context - Контекст (опціонально)
 * @param {Object} options.data - Додаткові data-атрибути
 * @param {string} options.className - Додаткові CSS класи
 *
 * @returns {string} HTML рядок
 *
 * @example
 * actionButton({ action: 'edit', rowId: '123' })
 * // → <button class="btn-icon" data-action="edit" data-row-id="123" data-tooltip="Редагувати">
 * //       <span class="material-symbols-outlined">edit</span>
 * //   </button>
 *
 * actionButton({
 *     action: 'unlink',
 *     rowId: '123',
 *     data: { name: 'Test', categoryId: '456' }
 * })
 */
export function actionButton(options) {
    const {
        action,
        rowId,
        icon = ACTION_ICONS[action] || action,
        tooltip = ACTION_LABELS[action] || action,
        context = null,
        data = {},
        className = ACTION_CLASSES[action] || ''
    } = options;

    // Формуємо data-атрибути
    const dataAttrs = Object.entries(data)
        .map(([key, value]) => {
            // Конвертуємо camelCase → kebab-case
            const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            return `data-${kebabKey}="${escapeAttr(value)}"`;
        })
        .join(' ');

    const contextAttr = context ? `data-context="${escapeAttr(context)}"` : '';
    const classNames = ['btn-icon', className].filter(Boolean).join(' ');

    return `
        <button class="${classNames}"
                data-action="${escapeAttr(action)}"
                data-row-id="${escapeAttr(rowId)}"
                ${contextAttr}
                ${dataAttrs}
                data-tooltip="${escapeAttr(tooltip)}">
            <span class="material-symbols-outlined">${escapeAttr(icon)}</span>
        </button>
    `.trim().replace(/\s+/g, ' ');
}

/**
 * Створити групу кнопок дій
 *
 * @param {string} rowId - ID рядка
 * @param {Array<string|Object>} actions - Масив дій або об'єктів з опціями
 * @param {Object} options - Загальні опції для всіх кнопок
 *
 * @returns {string} HTML рядок
 *
 * @example
 * actionButtons('123', ['edit', 'delete'])
 *
 * actionButtons('123', [
 *     'edit',
 *     { action: 'unlink', data: { name: 'Test' } }
 * ], { context: 'mapper-characteristics' })
 */
export function actionButtons(rowId, actions, options = {}) {
    return actions.map(actionDef => {
        if (typeof actionDef === 'string') {
            return actionButton({ action: actionDef, rowId, ...options });
        }
        return actionButton({ rowId, ...options, ...actionDef });
    }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// КОНСТАНТИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Стандартні іконки для дій
 */
export const ACTION_ICONS = {
    edit: 'edit',
    delete: 'delete',
    view: 'visibility',
    unlink: 'link_off',
    unmap: 'link_off',
    copy: 'content_copy',
    add: 'add',
    remove: 'remove',
    settings: 'settings',
    info: 'info',
    download: 'download',
    upload: 'upload',
    refresh: 'refresh',
    search: 'search',
    filter: 'filter_list',
    sort: 'sort',
    expand: 'expand_more',
    collapse: 'expand_less',
    close: 'close',
    check: 'check',
    cancel: 'cancel'
};

/**
 * Стандартні CSS класи для дій (шарми)
 */
export const ACTION_CLASSES = {
    delete: 'danger',
    remove: 'danger',
    unlink: 'danger',
    unmap: 'danger'
};

/**
 * Стандартні підписи для дій
 */
export const ACTION_LABELS = {
    edit: 'Редагувати',
    delete: 'Видалити',
    view: 'Переглянути',
    unlink: 'Відв\'язати',
    unmap: 'Відв\'язати',
    copy: 'Копіювати',
    add: 'Додати',
    remove: 'Видалити',
    settings: 'Налаштування',
    info: 'Інформація',
    download: 'Завантажити',
    upload: 'Вивантажити',
    refresh: 'Оновити',
    search: 'Пошук',
    filter: 'Фільтр',
    sort: 'Сортувати',
    expand: 'Розгорнути',
    collapse: 'Згорнути',
    close: 'Закрити',
    check: 'Підтвердити',
    cancel: 'Скасувати'
};

/**
 * Escape для HTML атрибутів
 */
function escapeAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
