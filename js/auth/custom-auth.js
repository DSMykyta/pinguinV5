/**
 * Custom Authentication Module
 * Власна система логін/пароль замість Google OAuth
 * Сайт працює БЕЗ авторизації, авторизація тільки для доступу до Google Sheets
 */

// Константи
const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';
const TOKEN_EXPIRY_KEY = 'token_expiry';

// API endpoints
const AUTH_API_BASE = window.location.origin;
const API_LOGIN = `${AUTH_API_BASE}/api/auth/login`;
const API_VERIFY = `${AUTH_API_BASE}/api/auth/verify`;
const API_LOGOUT = `${AUTH_API_BASE}/api/auth/logout`;

// Глобальний стан авторизації
window.isAuthorized = false;
window.currentUser = null;

// Глобальна змінна для перевірки чи вже ініціалізовано
window.customAuthInitialized = window.customAuthInitialized || false;

/**
 * Завантажує модал входу з шаблону
 */
async function loadAuthModal() {
  // Перевіряємо чи модал вже існує в DOM
  if (document.getElementById('auth-login-modal')) {
    console.log('Auth modal already exists in DOM');
    return;
  }

  try {
    const response = await fetch('/templates/modals/auth-login-modal.html');
    if (!response.ok) {
      console.error('Failed to load auth modal template');
      return;
    }

    const modalHTML = await response.text();

    // Створюємо обгортку модалу
    const modalWrapper = document.createElement('div');
    modalWrapper.id = 'auth-login-modal';
    modalWrapper.className = 'modal-overlay';

    // Встановлюємо критичні inline стилі для overlay
    modalWrapper.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      justify-content: center;
      align-items: center;
    `;

    // Створюємо контейнер модалу
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-content';
    modalContainer.style.cssText = `
      max-width: 450px;
      width: 90%;
      background: var(--color-surface-container, #fff);
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      position: relative;
    `;

    // Створюємо header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    modalHeader.innerHTML = `
      <div class="modal-title-container">
        <h2 id="modal-title">Вхід</h2>
      </div>
      <div class="header-actions">
        <div class="connected-button-group-square" role="group">
          <button id="auth-modal-close" class="segment modal-close-btn" aria-label="Закрити">
            <div class="state-layer">
              <span class="label">&times;</span>
            </div>
          </button>
        </div>
      </div>
    `;

    // Створюємо body з завантаженим контентом
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body scrollable-panel';
    modalBody.innerHTML = modalHTML;

    // Збираємо модал
    modalContainer.appendChild(modalHeader);
    modalContainer.appendChild(modalBody);
    modalWrapper.appendChild(modalContainer);

    // Додаємо в DOM
    document.body.appendChild(modalWrapper);

    console.log('Auth modal loaded successfully');
    console.log('📍 Модал додано в DOM, перевірка:', {
      modalExists: !!document.getElementById('auth-login-modal'),
      parentElement: modalWrapper.parentElement?.tagName,
      modalInBody: document.body.contains(modalWrapper)
    });
  } catch (error) {
    console.error('Error loading auth modal:', error);
  }
}

/**
 * Ініціалізація системи авторизації
 */
async function initCustomAuth() {
  // Перевіряємо чи вже ініціалізовано
  if (window.customAuthInitialized) {
    console.log('Custom auth already initialized, skipping...');
    return;
  }

  console.log('Initializing custom auth...');
  window.customAuthInitialized = true;

  // Завантажуємо модал входу
  await loadAuthModal();

  // Ініціалізуємо обробники подій ПІСЛЯ завантаження модалу
  setupLoginForm();
  setupLogoutButton();

  // Перевіряємо наявність токена
  const token = getAuthToken();

  if (token) {
    // Перевіряємо валідність токена
    const isValid = await verifyToken(token);

    if (isValid) {
      console.log('Token is valid, user is authorized');
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
      console.log('Token is invalid or expired');
      clearAuthData();
      updateAuthUI(false);
    }
  } else {
    console.log('No token found, user is not authorized');
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

    // Закриваємо модал
    closeLoginModal();

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
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
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

  // Посилання що потребують авторизації
  const authRequiredLinks = document.querySelectorAll('.auth-required');
  const bannedWordsLink = document.querySelector('.banned-words-link');

  if (isAuthorized) {
    // Показуємо інфо про користувача та кнопку виходу
    if (loginTriggerButton) loginTriggerButton.style.display = 'none';
    if (logoutButton) logoutButton.style.display = 'block';
    if (userInfo) userInfo.style.display = 'flex';

    // Заповнюємо дані користувача
    const user = getUserData();
    if (usernameDisplay) usernameDisplay.textContent = user.username || '';
    if (userRoleDisplay) {
      const roleLabels = {
        admin: 'Адміністратор',
        editor: 'Редактор',
        viewer: 'Переглядач',
      };
      userRoleDisplay.textContent = roleLabels[user.role] || user.role;
    }

    // Показуємо посилання що потребують авторизації
    authRequiredLinks.forEach(link => {
      // Заборонені слова тільки для admin
      if (link.classList.contains('banned-words-link')) {
        if (user.role === 'admin') {
          link.style.display = 'flex';
        }
      } else {
        // Інші посилання для всіх авторизованих
        link.style.display = 'flex';
      }
    });
  } else {
    // Показуємо кнопку логіну
    if (loginTriggerButton) loginTriggerButton.style.display = 'block';
    if (logoutButton) logoutButton.style.display = 'none';
    if (userInfo) userInfo.style.display = 'none';

    // Приховуємо посилання що потребують авторизації
    authRequiredLinks.forEach(link => {
      link.style.display = 'none';
    });
  }

  // Оновлюємо кнопки редагування для viewer
  updateEditButtons(isAuthorized ? getUserData().role : null);
}

/**
 * Оновлення кнопок редагування в залежності від ролі
 */
function updateEditButtons(role) {
  if (role === 'viewer') {
    const editButtons = document.querySelectorAll('.btn-edit, .btn-delete, .btn-add');
    editButtons.forEach(btn => {
      btn.style.display = 'none';
    });
  }
}

/**
 * Відкриття модального вікна логіну
 */
function openLoginModal() {
  console.log('📂 openLoginModal() викликано');

  const modal = document.getElementById('auth-login-modal');
  const usernameInput = document.getElementById('auth-username');
  const passwordInput = document.getElementById('auth-password');
  const loginError = document.getElementById('auth-login-error');

  console.log('🔍 Елементи модалу:', {
    modal: !!modal,
    usernameInput: !!usernameInput,
    passwordInput: !!passwordInput,
    loginError: !!loginError
  });

  if (modal) {
    console.log('✅ Відкриваємо модал (display = flex)');
    console.log('📐 Поточні стилі модалу ДО змін:', {
      display: modal.style.display,
      position: modal.style.position,
      zIndex: modal.style.zIndex
    });

    modal.style.display = 'flex';

    console.log('📐 Поточні стилі модалу ПІСЛЯ змін:', {
      display: modal.style.display,
      position: modal.style.position,
      zIndex: modal.style.zIndex,
      top: modal.style.top,
      left: modal.style.left
    });

    console.log('🔍 Computed styles:', window.getComputedStyle(modal).display);

    // Очищаємо поля
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (loginError) loginError.style.display = 'none';

    // Фокус на логін
    setTimeout(() => {
      if (usernameInput) {
        usernameInput.focus();
        console.log('✅ Фокус встановлено на поле логіну');
      }
    }, 100);
  } else {
    console.error('❌ Модал НЕ ЗНАЙДЕНИЙ! Неможливо відкрити');
  }
}

/**
 * Закриття модального вікна логіну
 */
function closeLoginModal() {
  console.log('📁 closeLoginModal() викликано');

  const modal = document.getElementById('auth-login-modal');
  if (modal) {
    console.log('✅ Закриваємо модал (display = none)');
    modal.style.display = 'none';
  } else {
    console.error('❌ Модал НЕ ЗНАЙДЕНИЙ! Неможливо закрити');
  }
}

/**
 * Обробка подій форми логіну
 */
function setupLoginForm() {
  console.log('🔧 setupLoginForm() викликано');

  const loginForm = document.getElementById('auth-login-form');
  const loginTriggerButton = document.getElementById('auth-login-trigger-btn');
  const modalCloseButton = document.getElementById('auth-modal-close');
  const modal = document.getElementById('auth-login-modal');
  const usernameInput = document.getElementById('auth-username');
  const passwordInput = document.getElementById('auth-password');
  const loginButton = document.getElementById('auth-login-btn');
  const loginError = document.getElementById('auth-login-error');

  console.log('🔍 Пошук елементів:', {
    loginForm: !!loginForm,
    loginTriggerButton: !!loginTriggerButton,
    modalCloseButton: !!modalCloseButton,
    modal: !!modal,
    usernameInput: !!usernameInput,
    passwordInput: !!passwordInput,
    loginButton: !!loginButton,
    loginError: !!loginError
  });

  // Відкриття модалу при натисканні "Увійти"
  if (loginTriggerButton) {
    console.log('✅ Додаємо обробник на кнопку "Увійти"');
    loginTriggerButton.addEventListener('click', (e) => {
      console.log('🖱️ КЛІК на кнопку "Увійти"!');
      e.preventDefault();
      openLoginModal();
    });
  } else {
    console.warn('⚠️ Кнопка "Увійти" (#auth-login-trigger-btn) НЕ ЗНАЙДЕНА!');
  }

  // Закриття модалу при натисканні X
  if (modalCloseButton) {
    console.log('✅ Додаємо обробник на кнопку закриття (X)');
    modalCloseButton.addEventListener('click', (e) => {
      console.log('🖱️ КЛІК на кнопку закриття (X)!');
      e.preventDefault();
      closeLoginModal();
    });
  } else {
    console.warn('⚠️ Кнопка закриття (X) НЕ ЗНАЙДЕНА!');
  }

  // Закриття модалу при натисканні кнопки Cancel
  const cancelButton = document.getElementById('auth-modal-cancel');
  if (cancelButton) {
    console.log('✅ Додаємо обробник на кнопку Cancel');
    cancelButton.addEventListener('click', (e) => {
      console.log('🖱️ КЛІК на кнопку Cancel!');
      e.preventDefault();
      closeLoginModal();
    });
  } else {
    console.warn('⚠️ Кнопка Cancel НЕ ЗНАЙДЕНА!');
  }

  // Закриття модалу при кліку поза вікном
  if (modal) {
    console.log('✅ Додаємо обробник на клік поза модалом');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        console.log('🖱️ КЛІК поза модалом!');
        closeLoginModal();
      }
    });
  } else {
    console.warn('⚠️ Модал НЕ ЗНАЙДЕНИЙ!');
  }

  // Submit форми
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = usernameInput?.value?.trim();
      const password = passwordInput?.value;

      // Валідація
      if (!username || !password) {
        showLoginError('Будь ласка, введіть логін та пароль');
        return;
      }

      // Показуємо індикатор завантаження
      if (loginButton) {
        loginButton.disabled = true;
        loginButton.textContent = 'Вхід...';
      }
      if (loginError) loginError.style.display = 'none';

      // Виконуємо вхід
      const result = await handleSignIn(username, password);

      if (result.success) {
        console.log('Login successful');
        // UI оновиться автоматично через updateAuthUI
      } else {
        // Показуємо помилку
        showLoginError(result.error || 'Невірний логін або пароль');

        if (loginButton) {
          loginButton.disabled = false;
          loginButton.textContent = 'Увійти';
        }

        // Очищаємо пароль
        if (passwordInput) passwordInput.value = '';
      }
    });
  }

  // Закриття модалу по Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLoginModal();
    }
  });
}

/**
 * Показати помилку логіну
 */
function showLoginError(message) {
  const loginError = document.getElementById('auth-login-error');
  if (loginError) {
    loginError.textContent = message;
    loginError.style.display = 'block';
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
      console.log('Token removed in another tab, signing out');
      window.location.reload();
    } else {
      // Токен оновлено - перевіряємо його
      console.log('Token updated in another tab, verifying');
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
  // Зберігаємо час експірації (15 хвилин)
  const expiryTime = Date.now() + (15 * 60 * 1000);
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

window.initCustomAuth = initCustomAuth;
window.handleSignIn = handleSignIn;
window.handleSignOut = handleSignOut;
window.setupLoginForm = setupLoginForm;
window.setupLogoutButton = setupLogoutButton;
window.getAuthToken = getAuthToken;
window.getUserData = getUserData;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;

// Автоматична ініціалізація при завантаженні
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initCustomAuth();
    // setupLoginForm() та setupLogoutButton() викликаються всередині initCustomAuth()
  });
} else {
  initCustomAuth();
  // setupLoginForm() та setupLogoutButton() викликаються всередині initCustomAuth()
}

console.log('Custom Auth Module loaded');
