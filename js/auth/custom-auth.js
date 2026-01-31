/**
 * Custom Authentication Module
 * Власна система логін/пароль замість Google OAuth
 * Сайт працює БЕЗ авторизації, авторизація тільки для доступу до Google Sheets
 */

import { showModal, closeModal } from '../common/ui-modal.js';
import { getAvatarPath } from '../utils/avatar-loader.js';
import { renderAvatarState, getAvatarState } from '../utils/avatar-states.js';

// Константи
const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';
const TOKEN_EXPIRY_KEY = 'token_expiry';

// API endpoints
const AUTH_API_BASE = window.location.origin;
const API_LOGIN = `${AUTH_API_BASE}/api/auth`; // Unified endpoint
const API_VERIFY = `${AUTH_API_BASE}/api/auth`; // Unified endpoint (with action: 'verify')
const API_LOGOUT = `${AUTH_API_BASE}/api/auth`; // Unified endpoint

// Глобальний стан авторизації
window.isAuthorized = false;
window.currentUser = null;

// Глобальна змінна для перевірки чи вже ініціалізовано
window.customAuthInitialized = window.customAuthInitialized || false;

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

  // Перевіряємо наявність токена
  const token = getAuthToken();

  if (token) {
    // Перевіряємо валідність токена
    const isValid = await verifyToken(token);

    if (isValid) {
      window.isAuthorized = true;
      window.currentUser = getUserData();
      updateAuthUI(true);

      // Генеруємо подію зміни стану авторизації
      document.dispatchEvent(new CustomEvent('auth-state-changed', {
        detail: { isAuthorized: true, user: window.currentUser }
      }));

      // Викликаємо callback якщо він визначений
      if (typeof window.onAuthSuccess === 'function') {
        window.onAuthSuccess();
      }
    } else {
      clearAuthData();
      updateAuthUI(false);
    }
  } else {
    updateAuthUI(false);
  }

  // Слухаємо зміни в localStorage (синхронізація між вкладками)
  window.addEventListener('storage', handleStorageChange);
}

/**
 * Вхід користувача
 */
async function handleSignIn(username, password) {
  try {
    const response = await fetch(API_LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Зберігаємо токени та дані користувача
    setAuthToken(data.token);
    setRefreshToken(data.refreshToken);
    setUserData(data.user);

    // Оновлюємо глобальний стан
    window.isAuthorized = true;
    window.currentUser = data.user;

    // Оновлюємо UI
    updateAuthUI(true);

    // Генеруємо подію зміни стану авторизації
    document.dispatchEvent(new CustomEvent('auth-state-changed', {
      detail: { isAuthorized: true, user: data.user }
    }));

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
async function handleSignOut() {
  try {
    const token = getAuthToken();

    if (token) {
      // Повідомляємо backend про вихід
      await fetch(API_LOGOUT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'logout' }),
      });
    }
  } catch (error) {
    console.error('Sign out error:', error);
  } finally {
    // Очищаємо дані незалежно від результату
    clearAuthData();
    window.isAuthorized = false;
    window.currentUser = null;
    updateAuthUI(false);

    // Генеруємо подію зміни стану авторизації
    document.dispatchEvent(new CustomEvent('auth-state-changed', {
      detail: { isAuthorized: false, user: null }
    }));

    // Перезавантажуємо сторінку
    window.location.reload();
  }
}

/**
 * Перевірка валідності токена
 */
async function verifyToken(token) {
  try {
    const response = await fetch(API_VERIFY, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'verify' }),
    });

    const data = await response.json();

    if (data.valid) {
      // Оновлюємо дані користувача
      setUserData(data.user);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
}

/**
 * Оновлення UI в залежності від стану авторизації
 * ВАЖЛИВО: НЕ ховаємо контент сайту, тільки управляємо кнопками!
 */
function updateAuthUI(isAuthorized) {
  // Кнопки в панелі
  const loginTriggerButton = document.getElementById('auth-login-trigger-btn');
  const logoutButton = document.getElementById('auth-logout-btn');
  const userInfo = document.getElementById('auth-user-info');
  const usernameDisplay = document.getElementById('auth-username-display');
  const userRoleDisplay = document.getElementById('auth-user-role-display');

  if (isAuthorized) {
    // Показуємо інфо про користувача та кнопку виходу
    if (loginTriggerButton) loginTriggerButton.classList.add('u-hidden');
    if (logoutButton) logoutButton.classList.remove('u-hidden');
    if (userInfo) userInfo.classList.remove('u-hidden');

    // Заповнюємо дані користувача
    const user = getUserData();

    // Показуємо display_name якщо є, інакше username
    const displayText = user.display_name || user.username || '';
    if (usernameDisplay) usernameDisplay.textContent = displayText;

    if (userRoleDisplay) {
      const roleLabels = {
        admin: 'Адміністратор',
        editor: 'Редактор',
        viewer: 'Переглядач',
      };
      userRoleDisplay.textContent = roleLabels[user.role] || user.role;
    }

    // Оновлюємо аватар
    updateUserAvatar(user.avatar);
  } else {
    // Показуємо кнопку логіну
    if (loginTriggerButton) loginTriggerButton.classList.remove('u-hidden');
    if (logoutButton) logoutButton.classList.add('u-hidden');
    if (userInfo) userInfo.classList.add('u-hidden');
  }
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

      // Відкриваємо модал (розмір вже вказаний в шаблоні)
      showModal('auth-login-modal');
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
  const { modalId, bodyTarget } = event.detail;

  // Перевіряємо чи це наш модал входу
  if (modalId !== 'auth-login-modal') {
    return;
  }


  // Знаходимо елементи форми в завантаженому модалі
  const loginForm = bodyTarget.querySelector('#auth-login-form');
  const usernameInput = bodyTarget.querySelector('#auth-username');
  const passwordInput = bodyTarget.querySelector('#auth-password');
  const loginButton = bodyTarget.querySelector('#auth-login-btn');
  const loginError = bodyTarget.querySelector('#auth-login-error');
  const avatarContainer = bodyTarget.querySelector('#auth-login-avatar-container');
  const avatarMessage = bodyTarget.querySelector('#auth-login-avatar-message');

    loginForm: !!loginForm,
    usernameInput: !!usernameInput,
    passwordInput: !!passwordInput,
    loginButton: !!loginButton,
    loginError: !!loginError,
    avatarContainer: !!avatarContainer,
    avatarMessage: !!avatarMessage
  });

  if (!loginForm) {
    console.error('❌ Форма входу НЕ ЗНАЙДЕНА в модалі!');
    return;
  }

  // Аватар та повідомлення рендеряться автоматично через ui-modal-avatars.js
  // (див. MODAL_AVATAR_MAPPING в js/common/ui-modal-avatars.js)

  // Очищаємо поля
  if (usernameInput) usernameInput.value = '';
  if (passwordInput) passwordInput.value = '';
  if (loginError) loginError.classList.add('u-hidden');

  // Фокус на логін
  setTimeout(() => {
    if (usernameInput) {
      usernameInput.focus();
    }
  }, 100);

  // Submit форми
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = usernameInput?.value?.trim();
    const password = passwordInput?.value;

    // Валідація
    if (!username || !password) {
      showLoginError('Будь ласка, введіть логін та пароль', loginError);
      return;
    }

    // Показуємо індикатор завантаження
    if (loginButton) {
      loginButton.disabled = true;
      const label = loginButton.querySelector('.label');
      if (label) label.textContent = 'Вхід...';
    }
    if (loginError) loginError.classList.add('u-hidden');

    // Виконуємо вхід
    const result = await handleSignIn(username, password);

    if (result.success) {
      // UI оновиться автоматично через updateAuthUI
      // Модал закриється в handleSignIn()
    } else {
      // Показуємо помилку
      showLoginError(result.error || 'Невірний логін або пароль', loginError);

      if (loginButton) {
        loginButton.disabled = false;
        const label = loginButton.querySelector('.label');
        if (label) label.textContent = 'Увійти';
      }

      // Очищаємо пароль
      if (passwordInput) passwordInput.value = '';
    }
  });
}

/**
 * Показати помилку логіну
 */
function showLoginError(message, loginError) {
  if (loginError) {
    loginError.textContent = message;
    loginError.classList.remove('u-hidden');
  }
}

/**
 * Обробка подій кнопки виходу
 */
function setupLogoutButton() {
  const logoutButton = document.getElementById('auth-logout-btn');

  if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
      e.preventDefault();
      handleSignOut();
    });
  }
}

/**
 * Обробка змін в localStorage (синхронізація між вкладками)
 */
function handleStorageChange(event) {
  if (event.key === AUTH_TOKEN_KEY) {
    if (!event.newValue) {
      // Токен видалено - виходимо
      window.location.reload();
    } else {
      // Токен оновлено - перевіряємо його
      initCustomAuth();
    }
  }
}

// ============= Утиліти для роботи з localStorage =============

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  // Зберігаємо час експірації (8 годин)
  const expiryTime = Date.now() + (8 * 60 * 60 * 1000);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setRefreshToken(token) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

function getUserData() {
  const data = localStorage.getItem(USER_DATA_KEY);
  return data ? JSON.parse(data) : null;
}

function setUserData(user) {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
}

function clearAuthData() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

// ============= Експорт функцій =============

// ES6 модульні експорти
export { initCustomAuth, handleSignIn, handleSignOut, getAuthToken, getUserData };

// Залишаємо window.* для backward compatibility з існуючим кодом
window.initCustomAuth = initCustomAuth;
window.handleSignIn = handleSignIn;
window.handleSignOut = handleSignOut;
window.getAuthToken = getAuthToken;
window.getUserData = getUserData;

