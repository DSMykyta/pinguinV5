// js/utils/permissions.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            PERMISSIONS HELPER                                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Утиліти для перевірки прав доступу користувачів.
 * Використовується для умовного відображення UI елементів.
 */

/**
 * Отримує поточного користувача з localStorage
 * @returns {Object|null} Об'єкт користувача або null
 */
function getCurrentUser() {
    try {
        const userDataString = localStorage.getItem('userData');
        if (!userDataString) return null;
        return JSON.parse(userDataString);
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

/**
 * Перевіряє чи користувач авторизований
 * @returns {boolean}
 */
export function isAuthorized() {
    const user = getCurrentUser();
    return !!user;
}

/**
 * Перевіряє чи користувач має певну роль
 * @param {string|string[]} roles - Роль або масив ролей
 * @returns {boolean}
 * @example
 * hasRole('admin') // true якщо користувач - admin
 * hasRole(['admin', 'editor']) // true якщо користувач - admin АБО editor
 */
export function hasRole(roles) {
    const user = getCurrentUser();
    if (!user) return false;

    const rolesArray = Array.isArray(roles) ? roles : [roles];
    return rolesArray.includes(user.role);
}

/**
 * Перевіряє чи користувач має право доступу
 *
 * УВАГА: Наразі це спрощена версія яка працює на основі ролей.
 * В майбутньому можна додати детальну перевірку прав з backend.
 *
 * @param {string} permissionKey - Ключ права (наприклад: "users:create")
 * @returns {boolean}
 * @example
 * hasPermission('users:create') // true якщо користувач має право створювати користувачів
 * hasPermission('page:users-admin') // true якщо користувач має доступ до адмін панелі
 */
export function hasPermission(permissionKey) {
    const user = getCurrentUser();
    if (!user) return false;

    // Admin має всі права
    if (user.role === 'admin') {
        return true;
    }

    // Тимчасова логіка на основі ролей
    // TODO: В майбутньому можна завантажувати права з backend
    const rolePermissions = {
        editor: [
            // Сторінки
            'page:index',
            'page:glossary',
            'page:entities',
            'page:banned-words',
            // Панелі
            'panel:aside-table',
            'panel:aside-text',
            'panel:aside-seo',
            'panel:aside-translate',
            'panel:aside-links',
            // Дії
            'banned-words:add',
            'banned-words:edit',
            'entities:add',
            'entities:edit',
            'entities:delete'
        ],
        viewer: [
            // Сторінки
            'page:index',
            'page:glossary',
            'page:entities',
            // Панелі
            'panel:aside-table'
        ]
    };

    const userPermissions = rolePermissions[user.role] || [];
    return userPermissions.includes(permissionKey);
}

/**
 * Приховує елемент якщо користувач не має права
 * @param {string|HTMLElement} element - Селектор або елемент
 * @param {string} permissionKey - Ключ права
 * @example
 * hideIfNoPermission('#delete-btn', 'users:delete')
 * hideIfNoPermission(buttonEl, 'users:delete')
 */
export function hideIfNoPermission(element, permissionKey) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;

    if (!hasPermission(permissionKey)) {
        el.style.display = 'none';
    }
}

/**
 * Вимикає елемент якщо користувач не має права
 * @param {string|HTMLElement} element - Селектор або елемент
 * @param {string} permissionKey - Ключ права
 * @example
 * disableIfNoPermission('#save-btn', 'entities:edit')
 */
export function disableIfNoPermission(element, permissionKey) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;

    if (!hasPermission(permissionKey)) {
        el.disabled = true;
        el.title = 'У вас немає прав для цієї дії';
    }
}

/**
 * Додає атрибут data-permission для автоматичного приховування
 * Викликайте initPermissions() після завантаження сторінки
 * @example
 * HTML: <button data-permission="users:delete">Видалити</button>
 * JS: initPermissions()
 */
export function initPermissions() {
    document.querySelectorAll('[data-permission]').forEach(el => {
        const permission = el.dataset.permission;
        if (!hasPermission(permission)) {
            el.style.display = 'none';
        }
    });
}

/**
 * Перевіряє чи користувач - гість (неавторизований)
 * @returns {boolean}
 */
export function isGuest() {
    return !isAuthorized();
}

/**
 * Показує контент тільки для гостей
 * @param {string|HTMLElement} element - Селектор або елемент
 * @example
 * showForGuests('#login-btn')
 */
export function showForGuests(element) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;

    if (!isGuest()) {
        el.style.display = 'none';
    }
}

/**
 * Показує контент тільки для авторизованих
 * @param {string|HTMLElement} element - Селектор або елемент
 * @example
 * showForAuthorized('#user-menu')
 */
export function showForAuthorized(element) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;

    if (isGuest()) {
        el.style.display = 'none';
    }
}
