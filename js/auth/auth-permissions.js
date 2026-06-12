// js/auth/auth-permissions.js

// =========================================================================
// FRONTEND AUTH PERMISSIONS
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Єдина точка назв ролей/статусів і простих UI-перевірок доступу.
// Реальна авторизація завжди виконується на backend; цей модуль лише керує UI.
// =========================================================================

export const ROLE_LABELS = Object.freeze({
    admin: 'Адміністратор',
    editor: 'Редактор',
    viewer: 'Переглядач',
});

export const STATUS_LABELS = Object.freeze({
    active: 'Активний',
    disabled: 'Вимкнений',
});

export function getRoleLabel(role) {
    return ROLE_LABELS[role] || role || '—';
}

export function getStatusLabel(status) {
    return STATUS_LABELS[status] || status || '—';
}

export function isAdmin(user = window.currentUser) {
    return user?.role === 'admin';
}
