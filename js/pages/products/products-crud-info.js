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
import { formatDate } from '../../utils/common-utils.js';
import { callSheetsAPI } from '../../utils/api-client.js';

// ═══════════════════════════════════════════════════════════════════════════
// USERS CACHE
// ═══════════════════════════════════════════════════════════════════════════

let _usersCache = null; // { username: { display_name, avatar } }

async function loadUsersCache() {
    if (_usersCache) return _usersCache;

    const sheetNames = ['Users', 'Sheet1', 'Лист1', 'Аркуш1', 'users'];
    let result = null;

    for (const sheetName of sheetNames) {
        try {
            result = await callSheetsAPI('get', {
                range: `${sheetName}!A1:H`,
                spreadsheetType: 'users'
            });
            if (result && result.length > 0) break;
        } catch { /* next sheet */ }
    }

    if (!result || result.length <= 1) {
        _usersCache = {};
        return _usersCache;
    }

    const headers = result[0];
    const usernameIdx = headers.findIndex(h => h?.trim().toLowerCase() === 'username');
    const displayNameIdx = headers.findIndex(h => h?.trim().toLowerCase() === 'display_name');
    const avatarIdx = headers.findIndex(h => h?.trim().toLowerCase() === 'avatar');

    _usersCache = {};

    if (usernameIdx === -1 || displayNameIdx === -1 || avatarIdx === -1) {
        return _usersCache;
    }

    for (let i = 1; i < result.length; i++) {
        const row = result[i];
        const username = row[usernameIdx]?.trim();
        const displayName = row[displayNameIdx]?.trim();
        const avatar = row[avatarIdx]?.trim();

        if (username) {
            _usersCache[username] = { display_name: displayName || username, avatar: avatar || '' };
            _usersCache[username.toLowerCase()] = _usersCache[username];
        }
    }

    return _usersCache;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOLVE USER
// ═══════════════════════════════════════════════════════════════════════════

async function resolveUser(username) {
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

    const line = container.querySelector('.content-line');
    if (!line) return;

    if (!username && !dateStr) {
        line.innerHTML = '<span class="body-s">—</span>';
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
    const dateFormatted = dateStr ? formatDate(new Date(dateStr)) : '';

    line.innerHTML = `${avatarHtml}<span class="body-s">${displayName}</span>${dateFormatted ? `<span class="tag c-tertiary">${dateFormatted}</span>` : ''}`;
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
        const line = c?.querySelector('.content-line');
        if (line) line.innerHTML = '<span class="body-s">—</span>';
    });
}
