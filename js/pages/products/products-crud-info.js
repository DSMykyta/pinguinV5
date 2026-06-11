// js/pages/products/products-crud-info.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS CRUD — ІНФОРМАЦІЯ (секція метаданих)              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — секція «Інформація» в модалі товару.
 *
 * Ліва частина (HTML, readonly inputs) — вже в шаблоні.
 * Права частина (метадані) — заповнюється тут:
 *   - Створено: аватар + display_name + дата
 *   - Оновлено: аватар + display_name + дата
 *
 * Резолв юзера:
 *   1. window.currentUser (якщо username збігається)
 *   2. Users spreadsheet (кеш у модулі)
 *   3. Fallback: icon person + username
 */

import { getAvatarPath } from '../../components/avatar/avatar-user.js';
import { formatDate } from '../../utils/utils-date.js';
import { getUserDirectory } from '../../utils/utils-api-client.js';

// ═══════════════════════════════════════════════════════════════════════════
// USERS CACHE
// ═══════════════════════════════════════════════════════════════════════════

let _usersCache = null; // { username: { display_name, avatar } }

async function loadUsersCache() {
    if (_usersCache) return _usersCache;

    _usersCache = {};

    const users = await getUserDirectory();
    users.forEach(user => {
        const username = user.username?.trim();
        if (username) {
            _usersCache[username] = {
                display_name: user.display_name?.trim() || username,
                avatar: user.avatar?.trim() || '',
            };
            _usersCache[username.toLowerCase()] = _usersCache[username];
        }
    });

    return _usersCache;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOLVE USER
// ═══════════════════════════════════════════════════════════════════════════

export async function resolveUser(username) {
    if (!username) return null;

    // 1. window.currentUser
    if (window.currentUser?.username === username) {
        return {
            display_name: window.currentUser.display_name || window.currentUser.username,
            avatar: window.currentUser.avatar || ''
        };
    }

    // 2. Users spreadsheet cache
    const cache = await loadUsersCache();
    const user = cache[username] || cache[username.toLowerCase()];
    if (user) return user;

    // 3. Fallback
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════════════

function renderMetadataBlock(container, user, username, dateStr) {
    if (!container) return;

    const inputBox = container.querySelector('.input-box');
    if (!inputBox) return;

    if (!username && !dateStr) {
        inputBox.innerHTML = '<input class="body-s" type="text" readonly tabindex="-1" value="—">';
        return;
    }

    let avatarHtml;
    if (user?.avatar) {
        const path = getAvatarPath(user.avatar, 'calm');
        avatarHtml = `<img src="${path}" alt="${user.display_name}" class="avatar-sm">`;
    } else {
        avatarHtml = '<span class="material-symbols-outlined">person</span>';
    }

    const displayName = user?.display_name || username || '—';
    const cleanName = displayName.replace(/"/g, '&quot;');
    const dateFormatted = dateStr ? formatDate(new Date(dateStr)) : '';

    inputBox.innerHTML = `${avatarHtml}<input class="body-s" type="text" readonly tabindex="-1" value="${cleanName}">${dateFormatted ? `<span class="tag c-tertiary">${dateFormatted}</span>` : ''}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Заповнити секцію Інформація (метадані)
 * @param {Object} product - Об'єкт товару
 */
export async function fillInfoSection(product) {
    const createdContainer = document.getElementById('product-info-created');
    const updatedContainer = document.getElementById('product-info-updated');

    const [createdUser, updatedUser] = await Promise.all([
        resolveUser(product.created_by),
        resolveUser(product.updated_by)
    ]);

    renderMetadataBlock(createdContainer, createdUser, product.created_by, product.created_at);
    renderMetadataBlock(updatedContainer, updatedUser, product.updated_by, product.updated_at);
}

/**
 * Очистити секцію Інформація
 */
export function clearInfoSection() {
    const createdContainer = document.getElementById('product-info-created');
    const updatedContainer = document.getElementById('product-info-updated');

    [createdContainer, updatedContainer].forEach(c => {
        const inputBox = c?.querySelector('.input-box');
        if (inputBox) inputBox.innerHTML = '<input class="body-s" type="text" readonly tabindex="-1" value="—">';
    });
}
