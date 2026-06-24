// api/auth/index.js

// =========================================================================
// AUTH API - UNIFIED ENDPOINT
// =========================================================================
// ПРИЗНАЧЕННЯ:
// Об'єднаний ендпоінт для всіх операцій авторизації.
// Використовує HTTP методи та action параметр для роутингу.
//
// ЕНДПОІНТИ:
// - POST /api/auth { action: 'login' }  → авторизація користувача
// - POST /api/auth { action: 'refresh' } → оновлення access/refresh токенів
// - POST /api/auth { action: 'logout' } → вихід користувача
// - POST /api/auth { action: 'verify' } → верифікація токена
// - POST /api/auth { action: 'directory' } → безпечний каталог користувачів
// - POST /api/auth { action: 'profile' | 'updateProfile' | 'changePassword' }
// - POST /api/auth { action: 'listAccounts' | 'createAccount' }
// - POST /api/auth { action: 'updateAccount' | 'resetPassword' }
// - GET  /api/auth/verify               → верифікація токена (legacy)
//
// СТРУКТУРА:
// Всі handler функції винесені в окремі функції для читабельності.
// Головний handler роутить запити до відповідних функцій.
// =========================================================================

const bcrypt = require('bcryptjs');
const { corsMiddleware } = require('../../server/utils/cors');
const {
  AccountError,
  authenticateAccount,
  changePassword,
  createAccount,
  findAccountByUsername,
  loadAccounts,
  resetPassword,
  resolveActiveAccount,
  toAdminAccount,
  toProfile,
  updateAccount,
  updateProfile,
} = require('../../server/accounts');
const {
  generateToken,
  generateRefreshToken,
  verifyToken,
} = require('../../server/utils/jwt');
const { updateValues } = require('../../server/utils/google-sheets');
const { loadUsersDirectory } = require('../../server/users-directory');
const {
  CAPABILITIES,
  isKnownRole,
} = require('../../server/access-policy');

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const DUMMY_PASSWORD_HASH = '$2a$12$xewujj83nIrUng90T3MRDOEyobqVuxRX2MY2j/4BwtF3mHRGBgZKa';
const loginAttempts = new Map();

// =========================================================================
// MAIN ROUTER
// =========================================================================

/**
 * Головний handler для роутингу auth API запитів
 * @param {Object} req - Express request об'єкт
 * @param {Object} res - Express response об'єкт
 * @returns {Promise<Object>} JSON з результатом операції
 */
async function handler(req, res) {
  try {
    // GET /api/auth/verify (legacy support)
    if (req.method === 'GET' && req.url?.includes('/verify')) {
      return await handleVerify(req, res);
    }

    // POST requests with action routing
    if (req.method === 'POST') {
      const { action } = req.body || {};

      if (action === 'login' || !action) {
        // POST /api/auth or POST /api/auth { action: 'login' }
        return await handleLogin(req, res);
      } else if (action === 'refresh') {
        return await handleRefresh(req, res);
      } else if (action === 'logout') {
        return await handleLogout(req, res);
      } else if (action === 'verify') {
        return await handleVerify(req, res);
      } else if (action === 'directory') {
        return await handleDirectory(req, res);
      } else if (action === 'profile') {
        return await handleProfile(req, res);
      } else if (action === 'updateProfile') {
        return await handleUpdateProfile(req, res);
      } else if (action === 'changePassword') {
        return await handleChangePassword(req, res);
      } else if (action === 'listAccounts') {
        return await handleListAccounts(req, res);
      } else if (action === 'createAccount') {
        return await handleCreateAccount(req, res);
      } else if (action === 'updateAccount') {
        return await handleUpdateAccount(req, res);
      } else if (action === 'resetPassword') {
        return await handleResetPassword(req, res);
      } else {
        return res.status(400).json({ error: 'Invalid auth action' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    if (error instanceof AccountError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Auth API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// =========================================================================
// HANDLER: LOGIN
// =========================================================================

/**
 * Авторизація користувача
 * @returns {Promise<Object>} JSON з токенами та інформацією про користувача
 */
async function handleLogin(req, res) {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const attemptKey = getLoginAttemptKey(req, username);
  const retryAfter = getLoginRetryAfter(attemptKey);
  if (retryAfter > 0) {
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }

  const account = await findAccountByUsername(username);
  if (!account || account.status !== 'active' || !isKnownRole(account.role)) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    recordLoginFailure(attemptKey);
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const isPasswordValid = await bcrypt.compare(password, account.passwordHash);
  if (!isPasswordValid) {
    recordLoginFailure(attemptKey);
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  loginAttempts.delete(attemptKey);
  const now = new Date().toISOString();
  await updateValues(`Users!F${account.rowIndex}`, [[now]], 'users');

  return res.status(200).json({
    success: true,
    token: generateToken(account),
    refreshToken: generateRefreshToken(account),
    user: {
      ...toProfile(account),
      last_login: now,
    },
  });
}

function getLoginAttemptKey(req, username) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
  return `${ip}:${String(username).trim().toLowerCase()}`;
}

function getLoginRetryAfter(key) {
  pruneLoginAttempts();
  const attempt = loginAttempts.get(key);
  if (!attempt || attempt.count < LOGIN_MAX_ATTEMPTS) return 0;

  const remaining = LOGIN_WINDOW_MS - (Date.now() - attempt.startedAt);
  if (remaining <= 0) {
    loginAttempts.delete(key);
    return 0;
  }

  return Math.ceil(remaining / 1000);
}

function recordLoginFailure(key) {
  const now = Date.now();
  const attempt = loginAttempts.get(key);

  if (!attempt || now - attempt.startedAt >= LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, startedAt: now });
    return;
  }

  attempt.count += 1;
}

function pruneLoginAttempts() {
  if (loginAttempts.size < 1000) return;

  const now = Date.now();
  for (const [key, attempt] of loginAttempts) {
    if (now - attempt.startedAt >= LOGIN_WINDOW_MS) {
      loginAttempts.delete(key);
    }
  }
}

// =========================================================================
// HANDLER: REFRESH SESSION
// =========================================================================

async function handleRefresh(req, res) {
  const token = req.body?.refreshToken;
  const tokenUser = token ? verifyToken(token) : null;

  if (!tokenUser || tokenUser.type !== 'refresh') {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const account = await resolveActiveAccount(tokenUser);
  return res.status(200).json({
    success: true,
    token: generateToken(account),
    refreshToken: generateRefreshToken(account),
    user: toProfile(account),
  });
}

// =========================================================================
// HANDLER: VERIFY
// =========================================================================

/**
 * Верифікація JWT токена
 * @returns {Promise<Object>} JSON з результатом верифікації
 */
async function handleVerify(req, res) {
  const account = await authenticateAccount(req, res);
  if (!account) return;

  return res.status(200).json({
    valid: true,
    user: toProfile(account),
  });
}

// =========================================================================
// HANDLER: USERS DIRECTORY
// =========================================================================

/**
 * Повертає тільки поля, потрібні frontend для підписів, аватарів і задач.
 * @returns {Promise<Object>} Безпечний каталог користувачів
 */
async function handleDirectory(req, res) {
  if (!await authenticateAccount(req, res)) return;

  try {
    const users = await loadUsersDirectory();
    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Users directory error:', error);
    return res.status(500).json({
      error: 'Failed to load users directory',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// =========================================================================
// HANDLERS: PROFILE
// =========================================================================

async function handleProfile(req, res) {
  const account = await authenticateAccount(req, res);
  if (!account) return;

  return res.status(200).json({
    success: true,
    user: toProfile(account),
  });
}

async function handleUpdateProfile(req, res) {
  const account = await authenticateAccount(req, res);
  if (!account) return;

  const user = await updateProfile(account, req.body || {});
  return res.status(200).json({ success: true, user });
}

async function handleChangePassword(req, res) {
  const account = await authenticateAccount(req, res);
  if (!account) return;

  await changePassword(account, req.body?.currentPassword, req.body?.newPassword);
  return res.status(200).json({
    success: true,
    message: 'Password changed. Please sign in again.',
  });
}

// =========================================================================
// HANDLERS: ADMIN ACCOUNT MANAGEMENT
// =========================================================================

async function handleListAccounts(req, res) {
  if (!await authenticateAccount(req, res, { capability: CAPABILITIES.ACCOUNTS_MANAGE })) return;

  const accounts = await loadAccounts();
  return res.status(200).json({
    success: true,
    accounts: accounts.map(toAdminAccount),
  });
}

async function handleCreateAccount(req, res) {
  const actor = await authenticateAccount(req, res, { capability: CAPABILITIES.ACCOUNTS_MANAGE });
  if (!actor) return;

  const account = await createAccount(req.body || {}, actor);
  return res.status(201).json({ success: true, account });
}

async function handleUpdateAccount(req, res) {
  const actor = await authenticateAccount(req, res, { capability: CAPABILITIES.ACCOUNTS_MANAGE });
  if (!actor) return;

  const account = await updateAccount(req.body?.id, req.body || {}, actor);
  return res.status(200).json({ success: true, account });
}

async function handleResetPassword(req, res) {
  const actor = await authenticateAccount(req, res, { capability: CAPABILITIES.ACCOUNTS_MANAGE });
  if (!actor) return;

  await resetPassword(req.body?.id, req.body?.newPassword, actor);
  return res.status(200).json({ success: true });
}

// =========================================================================
// HANDLER: LOGOUT
// =========================================================================

/**
 * Вихід користувача (фактично нічого не робить на backend)
 * @returns {Promise<Object>} JSON з підтвердженням виходу
 */
async function handleLogout(req, res) {
  try {
    // В майбутньому тут можна додати логіку для інвалідації токенів
    // (наприклад, додавання токена до blacklist в базі даних)

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = corsMiddleware(handler);
