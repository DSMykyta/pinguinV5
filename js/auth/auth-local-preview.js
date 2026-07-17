// Local-only UI preview. The query flag is persisted for the current tab so
// relative navigation keeps the preview active without touching production.

export const LOCAL_AUTH_PREVIEW_TOKEN = 'local-auth-preview';

const QUERY_PARAM = 'local-auth';
const SESSION_KEY = 'pinguin_local_auth_preview';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const LOCAL_PREVIEW_USER = Object.freeze({
    id: 'local-preview-admin',
    username: 'local-preview',
    display_name: 'Локальний перегляд',
    role: 'admin',
    avatar: 'penguin',
    menu: false,
    status: 'active',
    capabilities: Object.freeze([
        'accounts.manage',
        'drive.read',
        'drive.write',
        'sheets.read',
        'sheets.write',
    ]),
});

function isLoopbackHost() {
    return LOCAL_HOSTS.has(window.location.hostname.toLowerCase());
}

function syncQueryFlag() {
    const value = new URLSearchParams(window.location.search).get(QUERY_PARAM);
    if (value === '1') sessionStorage.setItem(SESSION_KEY, '1');
    if (value === '0') sessionStorage.removeItem(SESSION_KEY);
}

export function isLocalAuthPreviewEnabled() {
    if (!isLoopbackHost()) return false;
    syncQueryFlag();
    return sessionStorage.getItem(SESSION_KEY) === '1';
}

export function getLocalAuthPreviewUser() {
    return { ...LOCAL_PREVIEW_USER, capabilities: [...LOCAL_PREVIEW_USER.capabilities] };
}

export function disableLocalAuthPreview() {
    sessionStorage.removeItem(SESSION_KEY);

    const url = new URL(window.location.href);
    url.searchParams.delete(QUERY_PARAM);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}
