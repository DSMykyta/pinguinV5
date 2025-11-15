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
 * Кеш прав користувача (завантажується з backend)
 */
let cachedPermissions = null;

/**
 * Завантажує права користувача з backend
 * @returns {Promise<string[]>} Масив ключів прав які має користувач
 */
export async function loadUserPermissions() {
    try {
        const user = getCurrentUser();

        // Якщо користувач не авторизований - повертаємо права для guest
        const roleId = user ? user.role : 'guest';

        console.log(`📥 Завантаження прав для ролі: ${roleId}`);

        const response = await window.apiClient.get(`/api/permissions?action=user-permissions&role=${roleId}`);

        if (response.success) {
            cachedPermissions = response.permissions || [];
            console.log(`✅ Завантажено ${cachedPermissions.length} прав для ролі ${roleId}`);
            return cachedPermissions;
        } else {
            console.error('❌ Помилка завантаження прав:', response.error);
            return [];
        }
    } catch (error) {
        console.error('❌ Помилка завантаження прав:', error);
        return [];
    }
}

/**
 * Перевіряє чи користувач має право доступу
 *
 * @param {string} permissionKey - Ключ права (наприклад: "users:create")
 * @returns {boolean}
 * @example
 * hasPermission('users:create') // true якщо користувач має право створювати користувачів
 * hasPermission('page:users-admin') // true якщо користувач має доступ до адмін панелі
 */
export function hasPermission(permissionKey) {
    // Якщо права ще не завантажені - повертаємо false
    if (!cachedPermissions) {
        console.warn('⚠️ Права ще не завантажені. Викличте loadUserPermissions() спочатку.');
        return false;
    }

    const user = getCurrentUser();

    // Admin має всі права
    if (user && user.role === 'admin') {
        return true;
    }

    // Перевірити чи є право в кеші
    return cachedPermissions.includes(permissionKey);
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
 * Ініціалізує систему прав: завантажує права та приховує елементи
 * Викликайте initPermissions() після завантаження сторінки
 * @example
 * HTML: <button data-permission="users:delete">Видалити</button>
 * JS: await initPermissions()
 */
export async function initPermissions() {
    console.log('🔐 Ініціалізація системи прав...');

    // Завантажити права користувача з backend
    await loadUserPermissions();

    // Приховати всі елементи з data-permission які користувач не має
    document.querySelectorAll('[data-permission]').forEach(el => {
        const permission = el.dataset.permission;
        if (!hasPermission(permission)) {
            el.style.display = 'none';
            console.log(`🔒 Приховано елемент з правом: ${permission}`);
        }
    });

    console.log('✅ Система прав ініціалізована');
}

/**
 * Оновлює видимість елементів після зміни авторизації
 * Викликайте після входу/виходу користувача
 */
export async function refreshPermissions() {
    console.log('🔄 Оновлення прав...');

    // Скинути кеш
    cachedPermissions = null;

    // Завантажити права заново
    await loadUserPermissions();

    // Оновити видимість всіх елементів
    document.querySelectorAll('[data-permission]').forEach(el => {
        const permission = el.dataset.permission;
        if (!hasPermission(permission)) {
            el.style.display = 'none';
        } else {
            el.style.display = ''; // Показати якщо є право
        }
    });

    console.log('✅ Права оновлено');
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
