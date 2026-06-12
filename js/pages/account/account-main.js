// js/pages/account/account-main.js

// =========================================================================
// ACCOUNT PAGE
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Особистий кабінет поточного користувача: профіль, аватар, меню та пароль.
// Модуль не керує іншими акаунтами і працює лише через закритий /api/auth.
// =========================================================================

import {
    changePassword,
    getProfile,
    updateProfile,
} from '../../auth/auth-api.js';
import {
    getUserData,
    handleSignOut,
    promptSignIn,
    syncCurrentUser,
} from '../../auth/auth-google.js';
import { getRoleLabel } from '../../auth/auth-permissions.js';
import {
    getSelectedAvatar,
    renderAvatarSelector,
} from '../../components/avatar/avatar-selector.js';
import { getAvatarPath } from '../../components/avatar/avatar-user.js';
import { showToast } from '../../components/feedback/toast.js';

export async function initAccount() {
    if (!window.isAuthorized) {
        document.addEventListener('auth-state-changed', handleAuthState, { once: true });
        await promptSignIn();
        return;
    }

    await loadProfile();
    bindProfileForm();
    bindPasswordForm();
}

async function handleAuthState(event) {
    if (!event.detail?.isAuthorized) return;
    await initAccount();
}

async function loadProfile() {
    try {
        const data = await getProfile();
        await syncCurrentUser(data.user);
        renderProfile(data.user);
    } catch (error) {
        showToast(error.message || 'Не вдалося завантажити профіль', 'error');
        const cachedUser = getUserData();
        if (cachedUser) renderProfile(cachedUser);
    }
}

function renderProfile(user) {
    setText('account-summary-name', user.display_name || user.username);
    setText('account-summary-username', `@${user.username}`);
    setText('account-summary-role', getRoleLabel(user.role));
    setText('account-created-at', formatDateTime(user.created_at));
    setText('account-last-login', formatDateTime(user.last_login));

    document.getElementById('account-username').value = user.username || '';
    document.getElementById('account-display-name').value = user.display_name || '';
    document.getElementById('account-menu').checked = user.menu === true;

    const avatar = user.avatar || 'penguin';
    renderAvatarSelector('account-avatar-selector', {
        selectedAvatar: avatar,
        inputId: 'account-avatar',
        onChange: renderSummaryAvatar,
    });
    renderSummaryAvatar(avatar);
}

function bindProfileForm() {
    const form = document.getElementById('account-profile-form');
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = document.getElementById('account-profile-save');
        button.disabled = true;

        try {
            const data = await updateProfile({
                display_name: document.getElementById('account-display-name').value.trim(),
                avatar: getSelectedAvatar('account-avatar-selector') || '',
                menu: document.getElementById('account-menu').checked,
            });
            await syncCurrentUser(data.user);
            renderProfile(data.user);
            showToast('Профіль збережено');
        } catch (error) {
            showToast(error.message || 'Не вдалося зберегти профіль', 'error');
        } finally {
            button.disabled = false;
        }
    });
}

function bindPasswordForm() {
    const form = document.getElementById('account-password-form');
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const currentPassword = document.getElementById('account-current-password').value;
        const newPassword = document.getElementById('account-new-password').value;
        const confirmation = document.getElementById('account-confirm-password').value;

        if (newPassword !== confirmation) {
            showToast('Нові паролі не збігаються', 'error');
            return;
        }

        const button = document.getElementById('account-password-save');
        button.disabled = true;

        try {
            await changePassword(currentPassword, newPassword);
            showToast('Пароль змінено. Увійдіть знову.');
            await handleSignOut();
        } catch (error) {
            showToast(error.message || 'Не вдалося змінити пароль', 'error');
            button.disabled = false;
        }
    });
}

function renderSummaryAvatar(avatar) {
    const container = document.getElementById('account-summary-avatar');
    container.innerHTML = `<img src="${getAvatarPath(avatar || 'penguin', 'calm')}" alt="">`;
}

function setText(id, value) {
    document.getElementById(id).textContent = value || '—';
}

function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('uk-UA', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}
