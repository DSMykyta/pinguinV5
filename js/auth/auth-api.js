// js/auth/auth-api.js

/*
 * =========================================================================
 * AUTH API CLIENT
 * =========================================================================
 * Єдина frontend-точка для login, profile та account management.
 * Усі приватні actions автоматично отримують Bearer access token.
 * =========================================================================
 */

const AUTH_ENDPOINT = `${window.location.origin}/api/auth`;
const REFRESH_TOKEN_KEY = 'refresh_token';
let refreshRequest = null;

export class AuthApiError extends Error {
    constructor(status, message) {
        super(message);
        this.name = 'AuthApiError';
        this.status = status;
    }
}

export async function authRequest(action, payload = {}, options = {}) {
    const authenticated = options.authenticated !== false;
    let token = options.token || window.getAuthToken?.() || localStorage.getItem('auth_token');
    if (authenticated && !token) throw new AuthApiError(401, 'Authorization required');

    let { response, data } = await executeAuthRequest(action, payload, authenticated ? token : null);

    const canRefresh = authenticated
        && !options.token
        && options.refreshOnUnauthorized !== false
        && response.status === 401
        && isSessionError(data.error);

    if (canRefresh) {
        const session = await refreshSession();
        token = session.token;
        ({ response, data } = await executeAuthRequest(action, payload, token));
    }

    if (!response.ok) {
        throw new AuthApiError(response.status, data.error || `HTTP ${response.status}`);
    }

    return data;
}

export function login(username, password) {
    return authRequest('login', { username, password }, { authenticated: false });
}

export function logout() {
    return authRequest('logout');
}

export function verifyAccessToken(token) {
    return authRequest('verify', {}, { token, refreshOnUnauthorized: false });
}

export function refreshSession() {
    if (!refreshRequest) {
        refreshRequest = performRefresh().finally(() => {
            refreshRequest = null;
        });
    }
    return refreshRequest;
}

export function getProfile() {
    return authRequest('profile');
}

export function updateProfile(profile) {
    return authRequest('updateProfile', profile);
}

export function changePassword(currentPassword, newPassword) {
    return authRequest('changePassword', { currentPassword, newPassword });
}

export function listAccounts() {
    return authRequest('listAccounts');
}

export function createAccount(account) {
    return authRequest('createAccount', account);
}

export function updateAccount(account) {
    return authRequest('updateAccount', account);
}

export function resetAccountPassword(id, newPassword) {
    return authRequest('resetPassword', { id, newPassword });
}

async function performRefresh() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
        throw new AuthApiError(401, 'Refresh token is missing');
    }

    const { response, data } = await executeAuthRequest('refresh', { refreshToken }, null);
    if (!response.ok) {
        throw new AuthApiError(response.status, data.error || `HTTP ${response.status}`);
    }

    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    if (typeof window.syncCurrentUser === 'function') {
        await window.syncCurrentUser(data.user, data.token);
    } else {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
    }

    return data;
}

async function executeAuthRequest(action, payload, token) {
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(AUTH_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, ...payload }),
    });

    return {
        response,
        data: await readJson(response),
    };
}

function isSessionError(message) {
    return [
        'Authentication required',
        'Invalid or expired access token',
        'Account is disabled or no longer exists',
        'Session is no longer valid',
    ].includes(message);
}

async function readJson(response) {
    const text = await response.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        throw new AuthApiError(response.status || 500, 'Invalid server response');
    }
}
