// js/pages/users/users-main.js

// =========================================================================
// ACCOUNT ADMINISTRATION PAGE
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Окремий admin-only UI для створення акаунтів, ролей, статусів і паролів.
// Видалення акаунтів навмисно відсутнє; backend повторно перевіряє всі права.
// =========================================================================

import {
    createAccount,
    listAccounts,
    resetAccountPassword,
    updateAccount,
} from '../../auth/auth-api.js';
import {
    getUserData,
    promptSignIn,
    syncCurrentUser,
    waitForAuthReady,
} from '../../auth/auth-google.js';
import { getRoleLabel, getStatusLabel, isAdmin } from '../../auth/auth-permissions.js';
import {
    getSelectedAvatar,
    renderAvatarSelector,
} from '../../components/avatar/avatar-selector.js';
import { getAvatarPath } from '../../components/avatar/avatar-user.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';
import { escapeHtml } from '../../utils/utils-text.js';

const state = {
    accounts: [],
    selectedId: null,
    initialized: false,
};

export async function initUsers() {
    await waitForAuthReady();

    if (!window.isAuthorized) {
        document.addEventListener('auth-state-changed', handleAuthState, { once: true });
        await promptSignIn();
        return;
    }

    if (!isAdmin()) {
        showAccessDenied();
        return;
    }

    if (!state.initialized) {
        bindEvents();
        state.initialized = true;
    }

    resetEditor();
    await loadAccounts();
}

async function handleAuthState(event) {
    if (!event.detail?.isAuthorized) return;
    await initUsers();
}

function bindEvents() {
    document.getElementById('users-refresh').addEventListener('click', loadAccounts);
    document.getElementById('users-create').addEventListener('click', resetEditor);
    document.getElementById('users-editor-cancel').addEventListener('click', resetEditor);
    document.getElementById('users-search').addEventListener('input', renderAccounts);
    document.getElementById('users-editor-form').addEventListener('submit', saveAccount);
    document.getElementById('users-reset-password-btn').addEventListener('click', resetPassword);
    document.getElementById('users-list').addEventListener('click', (event) => {
        const row = event.target.closest('[data-account-id]');
        if (row) selectAccount(row.dataset.accountId);
    });
}

async function loadAccounts() {
    const refreshButton = document.getElementById('users-refresh');
    refreshButton.disabled = true;

    try {
        const data = await listAccounts();
        state.accounts = data.accounts || [];
        renderAccounts();

        if (state.selectedId) {
            const selected = state.accounts.find(account => account.id === state.selectedId);
            if (selected) populateEditor(selected);
            else resetEditor();
        }
    } catch (error) {
        showToast(error.message || 'Не вдалося завантажити користувачів', 'error');
    } finally {
        refreshButton.disabled = false;
    }
}

function renderAccounts() {
    const query = document.getElementById('users-search').value.trim().toLowerCase();
    const accounts = state.accounts.filter(account => {
        const haystack = `${account.username} ${account.display_name} ${account.role}`.toLowerCase();
        return !query || haystack.includes(query);
    });

    const container = document.getElementById('users-list');
    if (!accounts.length) {
        container.innerHTML = '<div class="content-bloc-empty">Користувачів не знайдено</div>';
        return;
    }

    container.innerHTML = accounts.map(account => {
        const avatar = getAvatarPath(account.avatar || 'penguin', 'calm');
        const active = account.id === state.selectedId ? ' selected' : '';
        const disabled = account.status === 'disabled' ? ' disabled' : '';

        return `
            <button class="account-row${active}${disabled}" type="button" data-account-id="${escapeHtml(account.id)}">
                <img class="account-row-avatar" src="${avatar}" alt="">
                <span class="account-row-main">
                    <strong>${escapeHtml(account.display_name || account.username)}</strong>
                    <span class="body-s">@${escapeHtml(account.username)}</span>
                </span>
                <span class="account-row-meta">
                    <span class="badge">${escapeHtml(getRoleLabel(account.role))}</span>
                    <span class="dot ${account.status === 'active' ? 'c-green' : 'c-red'}"
                        title="${escapeHtml(getStatusLabel(account.status))}"></span>
                </span>
            </button>
        `;
    }).join('');
}

function selectAccount(id) {
    const account = state.accounts.find(item => item.id === id);
    if (!account) return;
    state.selectedId = id;
    populateEditor(account);
    renderAccounts();
}

function populateEditor(account) {
    state.selectedId = account.id;
    document.getElementById('users-account-id').value = account.id;
    document.getElementById('users-username').value = account.username;
    document.getElementById('users-username').disabled = true;
    document.getElementById('users-display-name').value = account.display_name || '';
    document.getElementById('users-role').value = account.role;
    document.getElementById('users-status').value = account.status;
    document.getElementById('users-status').disabled = false;
    document.getElementById('users-menu').checked = account.menu === true;
    document.getElementById('users-editor-title').textContent = account.display_name || account.username;
    document.getElementById('users-editor-subtitle').textContent = `@${account.username}`;
    document.getElementById('users-save').textContent = 'Зберегти зміни';
    document.getElementById('users-editor-cancel').classList.remove('u-hidden');
    document.getElementById('users-create-password-group').classList.add('u-hidden');
    document.getElementById('users-create-password').required = false;
    document.getElementById('users-password-reset').classList.remove('u-hidden');

    renderAvatarSelector('users-avatar-selector', {
        selectedAvatar: account.avatar || 'penguin',
        inputId: 'users-avatar',
    });
}

function resetEditor() {
    state.selectedId = null;
    document.getElementById('users-editor-form').reset();
    document.getElementById('users-account-id').value = '';
    document.getElementById('users-username').disabled = false;
    document.getElementById('users-status').value = 'active';
    document.getElementById('users-status').disabled = true;
    document.getElementById('users-editor-title').textContent = 'Новий акаунт';
    document.getElementById('users-editor-subtitle').textContent = 'Заповніть дані користувача';
    document.getElementById('users-save').textContent = 'Створити акаунт';
    document.getElementById('users-editor-cancel').classList.add('u-hidden');
    document.getElementById('users-create-password-group').classList.remove('u-hidden');
    document.getElementById('users-password-reset').classList.add('u-hidden');
    document.getElementById('users-create-password').required = true;
    document.getElementById('users-reset-password').value = '';

    renderAvatarSelector('users-avatar-selector', {
        selectedAvatar: 'penguin',
        inputId: 'users-avatar',
    });
    renderAccounts();
}

async function saveAccount(event) {
    event.preventDefault();
    const button = document.getElementById('users-save');
    button.disabled = true;

    try {
        if (state.selectedId) {
            const data = await updateAccount({
                id: state.selectedId,
                display_name: document.getElementById('users-display-name').value.trim(),
                role: document.getElementById('users-role').value,
                status: document.getElementById('users-status').value,
                avatar: getSelectedAvatar('users-avatar-selector') || '',
                menu: document.getElementById('users-menu').checked,
            });
            if (data.account.id === getUserData()?.id) {
                await syncCurrentUser(data.account);
            }
            showToast('Акаунт оновлено');
        } else {
            const data = await createAccount({
                username: document.getElementById('users-username').value.trim(),
                password: document.getElementById('users-create-password').value,
                display_name: document.getElementById('users-display-name').value.trim(),
                role: document.getElementById('users-role').value,
                avatar: getSelectedAvatar('users-avatar-selector') || '',
                menu: document.getElementById('users-menu').checked,
            });
            state.selectedId = data.account.id;
            showToast('Акаунт створено');
        }

        await loadAccounts();
    } catch (error) {
        showToast(error.message || 'Не вдалося зберегти акаунт', 'error');
    } finally {
        button.disabled = false;
    }
}

async function resetPassword() {
    const password = document.getElementById('users-reset-password').value;
    if (!state.selectedId || !password) {
        showToast('Введіть новий пароль', 'error');
        return;
    }

    const account = state.accounts.find(item => item.id === state.selectedId);
    const confirmed = await showConfirmModal({
        title: 'Скинути пароль?',
        message: `Встановити новий пароль для <span class="c-red">${escapeHtml(account?.username || '')}</span>?`,
        confirmText: 'Скинути пароль',
        avatarState: 'confirmReset',
    });
    if (!confirmed) return;

    const button = document.getElementById('users-reset-password-btn');
    button.disabled = true;

    try {
        await resetAccountPassword(state.selectedId, password);
        document.getElementById('users-reset-password').value = '';
        showToast('Пароль скинуто. Старі сесії користувача недійсні.');
    } catch (error) {
        showToast(error.message || 'Не вдалося скинути пароль', 'error');
    } finally {
        button.disabled = false;
    }
}

function showAccessDenied() {
    document.getElementById('users-workspace').classList.add('u-hidden');
    document.getElementById('users-create').classList.add('u-hidden');
    document.getElementById('users-refresh').classList.add('u-hidden');

    const stateElement = document.getElementById('users-access-state');
    stateElement.classList.remove('u-hidden');
    stateElement.innerHTML = `
        <span class="material-symbols-outlined">lock</span>
        <h3>Доступ лише для адміністратора</h3>
        <a class="btn-primary" href="account.html">Повернутися до кабінету</a>
    `;
}
