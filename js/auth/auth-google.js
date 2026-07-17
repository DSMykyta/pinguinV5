// js/auth/auth-google.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                       AUTH — GOOGLE (CUSTOM)                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Система логін/пароль, токени, UI авторизації                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { showModal, closeModal } from '../components/modal/modal-main.js';
import { getAvatarPath } from '../components/avatar/avatar-user.js';
import { renderAvatarState, getAvatarState } from '../components/avatar/avatar-ui-states.js';
import {
  login,
  logout,
  refreshSession,
  verifyAccessToken,
} from './auth-api.js';
import { getRoleLabel } from './auth-permissions.js';
import {
  disableLocalAuthPreview,
  getLocalAuthPreviewUser,
  isLocalAuthPreviewEnabled,
  LOCAL_AUTH_PREVIEW_TOKEN,
} from './auth-local-preview.js';

// Константи
const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';
const TOKEN_EXPIRY_KEY = 'token_expiry';

// API endpoints
// Глобальний стан авторизації
window.isAuthorized = false;
window.currentUser = null;
window.authStateReady = false;

// Глобальна змінна для перевірки чи вже ініціалізовано
window.customAuthInitialized = window.customAuthInitialized || false;

function notifyAuthState(isAuthorized, user = null) {
  window.authStateReady = true;

  const detail = { isAuthorized, user };
  document.dispatchEvent(new CustomEvent('auth-state-changed', { detail }));
  document.dispatchEvent(new CustomEvent('auth-ready', { detail }));
}

function waitForAuthReady() {
  if (window.authStateReady) {
    return Promise.resolve({
      isAuthorized: window.isAuthorized,
      user: window.currentUser
    });
  }

  return new Promise(resolve => {
    document.addEventListener('auth-ready', event => {
      resolve(event.detail);
    }, { once: true });
  });
}

/**
 * Ініціалізація системи авторизації
 */
async function initCustomAuth() {
  // Перевіряємо чи вже ініціалізовано
  if (window.customAuthInitialized) {
    return;
  }

  window.customAuthInitialized = true;

  // Ініціалізуємо обробники кнопок (logout, login trigger)
  setupLoginTrigger();
  setupLogoutButton();

  // Слухаємо подію відкриття модалу для прив'язки обробників форми
  document.addEventListener('modal-opened', handleModalOpened);

  if (isLocalAuthPreviewEnabled()) {
    window.isAuthorized = true;
    window.currentUser = getLocalAuthPreviewUser();
    await updateAuthUI(true);
    notifyAuthState(true, window.currentUser);
    return;
  }

  // Перевіряємо наявність токена
  const token = getAuthToken();

  if (token) {
    // Перевіряємо валідність токена
    const isValid = await verifyToken(token);

    if (isValid) {
      window.isAuthorized = true;
      window.currentUser = getUserData();
      await updateAuthUI(true);

      // Генеруємо подію зміни стану авторизації
      notifyAuthState(true, window.currentUser);

      // Викликаємо callback якщо він визначений
      if (typeof window.onAuthSuccess === 'function') {
        window.onAuthSuccess();
      }
    } else {
      clearAuthData();
      await updateAuthUI(false);
      await promptSignIn();
      notifyAuthState(false, null);
    }
  } else {
    await updateAuthUI(false);
    await promptSignIn();
    notifyAuthState(false, null);
  }

  // Слухаємо зміни в localStorage (синхронізація між вкладками)
  window.addEventListener('storage', handleStorageChange);
}

/**
 * Вхід користувача
 */
async function handleSignIn(username, password) {
  try {
    const data = await login(username, password);

    // Зберігаємо токени та дані користувача
    setAuthToken(data.token);
    setRefreshToken(data.refreshToken);
    setUserData(data.user);

    // Оновлюємо глобальний стан
    window.isAuthorized = true;
    window.currentUser = data.user;

    // Оновлюємо UI
    await updateAuthUI(true);

    // Генеруємо подію зміни стану авторизації
    notifyAuthState(true, data.user);

    // Закриваємо модал через існуючу систему
    closeModal();

    // Викликаємо callback
    if (typeof window.onAuthSuccess === 'function') {
      window.onAuthSuccess();
    }

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Вихід користувача
 */
async function handleSignOut(options = {}) {
  const { skipServer = false, prompt = true } = options || {};

  if (isLocalAuthPreviewEnabled()) {
    disableLocalAuthPreview();
    clearAuthData();
    window.isAuthorized = false;
    window.currentUser = null;
    await updateAuthUI(false);
    notifyAuthState(false, null);
    if (prompt) await promptSignIn();
    return;
  }

  try {
    const token = getAuthToken();

    if (token && !skipServer) {
      // Повідомляємо backend про вихід
      await logout();
    }
  } catch (error) {
    console.error('Sign out error:', error);
  } finally {
    // Очищаємо дані незалежно від результату
    clearAuthData();
    window.isAuthorized = false;
    window.currentUser = null;
    await updateAuthUI(false);

    // Генеруємо подію зміни стану авторизації
    notifyAuthState(false, null);

    // Повертаємо сторінку в гостьовий стан без hard reload.
    if (prompt) {
      await promptSignIn();
    }
  }
}

/**
 * Перевірка валідності токена
 */
async function verifyToken(token) {
  try {
    const data = await verifyAccessToken(token);

    if (data.valid) {
      // Оновлюємо дані користувача
      setUserData(data.user);
      return true;
    }

    return false;
  } catch (error) {
    try {
      const session = await refreshSession();
      setRefreshToken(session.refreshToken);
      setUserData(session.user);
      return true;
    } catch (refreshError) {
      console.error('Token verification error:', error);
      console.error('Session refresh error:', refreshError);
      return false;
    }
  }
}

/**
 * Оновлення UI в залежності від стану авторизації
 * ВАЖЛИВО: НЕ ховаємо контент сайту, тільки управляємо кнопками!
 */
async function updateAuthUI(isAuthorized) {
  // Кнопки в панелі
  const loginTriggerButton = document.getElementById('auth-login-trigger-btn');
  const userInfo = document.getElementById('auth-user-info');
  const usernameDisplay = document.getElementById('auth-username-display');
  const userRoleDisplay = document.getElementById('auth-user-role-display');

  // Навігація — додаємо/видаляємо з DOM
  const nav = document.getElementById('main-nav');
  const existingNavMain = nav?.querySelector('.nav-main');
  if (isAuthorized && !existingNavMain && nav) {
    // Login: завантажуємо nav.html в тимчасовий контейнер і вставляємо тільки .nav-main
    const tmp = document.createElement('div');
    const { loadHTML } = await import('../utils/utils-html-loader.js');
    await loadHTML('templates/partials/nav.html', tmp);
    const navMainEl = tmp.querySelector('.nav-main');
    if (navMainEl) {
      applyRoleVisibility(navMainEl, getUserData());
      const footer = nav.querySelector('.nav-footer');
      nav.insertBefore(navMainEl, footer);
      // Підсвітити активну сторінку
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      navMainEl.querySelectorAll('a.btn-icon').forEach(link => {
        if (link.getAttribute('href') === currentPage) link.classList.add('active');
      });
    }
  } else if (!isAuthorized && existingNavMain) {
    existingNavMain.remove();
  }

  if (isAuthorized) {
    // Показуємо інфо про користувача (logout кнопка всередині)
    if (loginTriggerButton) loginTriggerButton.classList.add('u-hidden');
    if (userInfo) userInfo.classList.remove('u-hidden');

    // Заповнюємо дані користувача
    const user = getUserData();

    // Показуємо display_name якщо є, інакше username
    const displayText = user.display_name || user.username || '';
    if (usernameDisplay) usernameDisplay.textContent = displayText;

    if (userRoleDisplay) {
      userRoleDisplay.textContent = getRoleLabel(user.role);
    }

    // Оновлюємо аватар
    updateUserAvatar(user.avatar);
  } else {
    // Показуємо кнопку логіну
    if (loginTriggerButton) loginTriggerButton.classList.remove('u-hidden');
    if (userInfo) userInfo.classList.add('u-hidden');
  }
}

function applyRoleVisibility(container, user) {
  container.querySelectorAll('[data-auth-role]').forEach(element => {
    const roles = element.dataset.authRole.split(',').map(role => role.trim());
    element.classList.toggle('u-hidden', !roles.includes(user?.role));
  });
}

/**
 * Оновлює аватар користувача в auth-user-info
 */
function updateUserAvatar(avatarName) {

  // Знаходимо контейнер для аватара (це тепер span.panel-item-icon)
  const avatarContainer = document.getElementById('auth-user-avatar-container');

  if (!avatarContainer) {
    console.warn('⚠️ Avatar container not found');
    return;
  }


  if (avatarName) {
    // Є аватар - показуємо його
    const avatarPath = getAvatarPath(avatarName, 'calm');

    avatarContainer.innerHTML = `
      <div class="auth-avatar">
        <img src="${avatarPath}" alt="Avatar" onerror="this.parentElement.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\'>person</span>'">
      </div>
    `;
  } else {
    // Немає аватара - показуємо іконку person
    avatarContainer.innerHTML = `
      <span class="material-symbols-outlined">person</span>
    `;
  }
}

/**
 * Налаштування кнопки входу (тригер модалу)
 */
function setupLoginTrigger() {

  const loginTriggerButton = document.getElementById('auth-login-trigger-btn');

  if (loginTriggerButton) {
    loginTriggerButton.addEventListener('click', (e) => {
      e.preventDefault();
      promptSignIn();
    });
  } else {
    console.warn('⚠️ Кнопка "Увійти" (#auth-login-trigger-btn) НЕ ЗНАЙДЕНА!');
  }
}

/**
 * Обробка події відкриття модалу
 * Цей обробник викликається коли модал вже завантажений в DOM
 */
function handleModalOpened(event) {
  const { modalId, bodyTarget, modalElement } = event.detail;

  // Перевіряємо чи це наш модал входу
  if (modalId !== 'auth-login-modal') {
    return;
  }

  // Знаходимо елементи в модалі
  const usernameInput = bodyTarget.querySelector('#auth-username');
  const passwordInput = bodyTarget.querySelector('#auth-password');
  const loginButton = modalElement.querySelector('#auth-login-btn');
  const statusMessage = bodyTarget.querySelector('#auth-login-avatar-message');
  const avatarContainer = bodyTarget.querySelector('#auth-login-avatar-container');

  // Рендеримо аватар + рандомне привітання
  const state = getAvatarState('authLogin');
  if (avatarContainer) avatarContainer.innerHTML = renderAvatarState('authLogin', { showMessage: false });
  if (statusMessage) statusMessage.textContent = state.message;

  // Очищаємо поля
  if (usernameInput) usernameInput.value = '';
  if (passwordInput) passwordInput.value = '';

  // Фокус на логін
  setTimeout(() => usernameInput?.focus(), 100);

  const submitLogin = async () => {
    const username = usernameInput?.value?.trim();
    const password = passwordInput?.value;
    if (!username || !password || loginButton?.disabled) return;

    loginButton.disabled = true;
    if (statusMessage) statusMessage.textContent = '';

    const result = await handleSignIn(username, password);

    if (!result.success) {
      if (statusMessage) statusMessage.textContent = result.error || 'Невірний логін або пароль';
      loginButton.disabled = false;
      if (passwordInput) passwordInput.value = '';
      passwordInput?.focus();
    }
  };

  if (loginButton) loginButton.onclick = submitLogin;

  const submitOnEnter = (keyboardEvent) => {
    if (keyboardEvent.key !== 'Enter') return;
    keyboardEvent.preventDefault();
    submitLogin();
  };

  if (usernameInput) usernameInput.onkeydown = submitOnEnter;
  if (passwordInput) passwordInput.onkeydown = submitOnEnter;
}

async function promptSignIn() {
  const existingModal = document.getElementById('modal-auth-login-modal');
  if (existingModal?.classList.contains('open')) return;
  await showModal('auth-login-modal');
}

/**
 * Обробка подій кнопки виходу
 */
function setupLogoutButton() {
  const logoutButton = document.getElementById('auth-logout-btn');

  if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleSignOut();
    });
  }
}

/**
 * Обробка змін в localStorage (синхронізація між вкладками)
 */
async function handleStorageChange(event) {
  if (event.key === AUTH_TOKEN_KEY) {
    if (!event.newValue) {
      window.isAuthorized = false;
      window.currentUser = null;
      await updateAuthUI(false);
      await promptSignIn();
      notifyAuthState(false, null);
      return;
    }

    // Повна ініціалізація вже захищена прапорцем, тому між вкладками
    // синхронізуємо auth state без hard reload.
    const isValid = await verifyToken(event.newValue);
    if (!isValid) {
      clearAuthData();
      window.isAuthorized = false;
      window.currentUser = null;
      await updateAuthUI(false);
      await promptSignIn();
      notifyAuthState(false, null);
      return;
    }

    window.isAuthorized = true;
    window.currentUser = getUserData();
    await updateAuthUI(true);

    notifyAuthState(true, window.currentUser);
  }
}

// ============= Утиліти для роботи з localStorage =============

function getAuthToken() {
  if (isLocalAuthPreviewEnabled()) return LOCAL_AUTH_PREVIEW_TOKEN;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  const expiryTime = getTokenExpiry(token) || Date.now();
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
}

function getTokenExpiry(token) {
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded));
    return Number.isFinite(payload.exp) ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setRefreshToken(token) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

function getUserData() {
  if (isLocalAuthPreviewEnabled()) return getLocalAuthPreviewUser();
  const data = localStorage.getItem(USER_DATA_KEY);
  return data ? JSON.parse(data) : null;
}

function setUserData(user) {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
}

async function syncCurrentUser(user, token = null) {
  if (token) setAuthToken(token);
  setUserData(user);
  window.currentUser = user;
  window.isAuthorized = true;
  await updateAuthUI(true);

  document.dispatchEvent(new CustomEvent('auth-user-updated', {
    detail: { user }
  }));
}

function clearAuthData() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

// ============= Експорт функцій =============

// ES6 модульні експорти
export {
  initCustomAuth,
  handleSignIn,
  handleSignOut,
  getAuthToken,
  getUserData,
  promptSignIn,
  syncCurrentUser,
  waitForAuthReady,
};

// Залишаємо window.* для backward compatibility з існуючим кодом
window.initCustomAuth = initCustomAuth;
window.handleSignIn = handleSignIn;
window.handleSignOut = handleSignOut;
window.getAuthToken = getAuthToken;
window.getUserData = getUserData;
window.promptSignIn = promptSignIn;
window.syncCurrentUser = syncCurrentUser;
window.waitForAuthReady = waitForAuthReady;
